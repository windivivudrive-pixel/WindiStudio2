import {buildFlowUploadRequest,flowUploadedMedia} from './flow-rpc.js';
import {buildFlowImageRequest, parseFlowRpc, flowRpcOriginal, flowPageRpc, flowOriginalBlob, FLOW_RPC_GENERATE} from './flow-rpc.js';
const FLOW_API_ORIGIN = 'https://aisandbox-pa.googleapis.com';
// Public browser-restricted key used by Flow itself. Authentication still
// requires the signed-in user's short-lived Bearer token and reCAPTCHA.
const FLOW_BROWSER_API_KEY = 'AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY';
const FLOW_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
const PROJECT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_MODELS = new Set(['HARBOR_SEAL', 'NARWHAL', 'GEM_PIX_2']);
const ASPECTS = new Map([
  ['portrait', 'IMAGE_ASPECT_RATIO_PORTRAIT'],
  ['landscape', 'IMAGE_ASPECT_RATIO_LANDSCAPE'],
  ['square', 'IMAGE_ASPECT_RATIO_SQUARE'],
  ['3x4', 'IMAGE_ASPECT_RATIO_3_4'],
  ['4x3', 'IMAGE_ASPECT_RATIO_4_3'],
]);

let bearerToken = null;
let browserApiKey = FLOW_BROWSER_API_KEY;
let capturedAt = null;
let reportStatus = async () => {};
const SESSION_STORAGE_KEY = 'windiFlowDirectSessionV1';
const TOKEN_MAX_AGE_MS = 50 * 60 * 1000;

function tokenFresh() {
  return Boolean(bearerToken && capturedAt && Date.now() - Date.parse(capturedAt) < TOKEN_MAX_AGE_MS);
}

async function saveSession() {
  if (!bearerToken || !capturedAt) return;
  await chrome.storage.local.set({ [SESSION_STORAGE_KEY]: { bearerToken, browserApiKey, capturedAt } });
}

async function clearSession() {
  bearerToken = null;
  capturedAt = null;
  await chrome.storage.local.remove(SESSION_STORAGE_KEY);
}

export function flowProjectId(url) {
  try {
    const match = new URL(url).pathname.match(/\/project\/([0-9a-f-]{36})(?:\/|$)/i);
    return match && PROJECT_ID.test(match[1]) ? match[1] : null;
  } catch {
    return null;
  }
}

export function isFlowGenerationUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin === FLOW_API_ORIGIN && /\/flowMedia:batchGenerateImages$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function parseFlowImages(value) {
  const found = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.fifeUrl === 'string' && /^https:\/\//.test(node.fifeUrl)) found.push(node.fifeUrl);
    else if (typeof node.imageUri === 'string' && /^https:\/\//.test(node.imageUri)) found.push(node.imageUri);
    for (const child of Object.values(node)) visit(child);
  };
  visit(value);
  return [...new Set(found)];
}

export function captureFlowSessionHeaders(url, headers = {}) {
  let parsed;
  try { parsed = new URL(url); } catch { return false; }
  if (parsed.origin !== FLOW_API_ORIGIN && parsed.hostname !== 'flow.google.com' && parsed.hostname !== 'labs.google') return false;
  const entries = Array.isArray(headers)
    ? headers.map((header) => [header.name || '', header.value || ''])
    : Object.entries(headers);
  const authorization = String(entries.find(([name]) => name.toLowerCase() === 'authorization')?.[1] || '');
  const token = authorization.match(/^Bearer\s+([^\s]{20,})$/i)?.[1] || null;
  const key = parsed.searchParams.get('key');
  if (!token && !key) return false;
  if (token) {
    bearerToken = token;
    capturedAt = new Date().toISOString();
  }
  if (key) browserApiKey = key;
  void saveSession();
  void reportStatus(publicStatus());
  return Boolean(token);
}

function publicStatus(extra = {}) {
  return {
    strategy: 'direct-api',
    tokenPresent: tokenFresh(),
    apiKeyPresent: Boolean(browserApiKey),
    capturedAt,
    ...extra,
  };
}

export function installFlowSessionCapture(onStatus) {
  reportStatus = onStatus;
  void chrome.storage.local.get(SESSION_STORAGE_KEY).then((stored) => {
    const session = stored?.[SESSION_STORAGE_KEY];
    if (session?.bearerToken && session?.capturedAt && Date.now() - Date.parse(session.capturedAt) < TOKEN_MAX_AGE_MS) {
      bearerToken = session.bearerToken;
      browserApiKey = session.browserApiKey || FLOW_BROWSER_API_KEY;
      capturedAt = session.capturedAt;
    } else if (session) {
      void chrome.storage.local.remove(SESSION_STORAGE_KEY);
    }
    return reportStatus(publicStatus());
  });
  chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      captureFlowSessionHeaders(details.url, details.requestHeaders || []);
    },
    { urls: ['https://aisandbox-pa.googleapis.com/*', 'https://flow.google.com/*', 'https://labs.google/*'] },
    ['requestHeaders', 'extraHeaders'],
  );
  void reportStatus(publicStatus());
}

async function captchaToken(evaluate, tabId, action = 'IMAGE_GENERATION') {
  return evaluate('flow', tabId, async ({ siteKey, action }) => {
    const execute = globalThis.grecaptcha?.enterprise?.execute;
    if (typeof execute !== 'function') return null;
    try {
      return await globalThis.grecaptcha.enterprise.execute(siteKey, { action });
    } catch {
      return null;
    }
  }, { siteKey: FLOW_SITE_KEY, action });
}

async function hasCaptchaRuntime(evaluate, tabId) {
  return Boolean(await evaluate('flow', tabId, () =>
    typeof globalThis.grecaptcha?.enterprise?.execute === 'function', null));
}

export async function flowDirectStatus({ tabId, url, evaluate }) {
  if (new URL(url).origin === 'https://flow.google.com') {
    const projectId = flowProjectId(url);
    const available = await evaluate('flow', tabId, () => Boolean(globalThis.WIZ_global_data?.SNlM0e && typeof globalThis.grecaptcha?.enterprise?.execute === 'function'), null);
    const status = {strategy:'flow-rpc', projectId, ready:Boolean(projectId && available)};
    await reportStatus(status);
    return status;
  }
  if (bearerToken && !tokenFresh()) await clearSession();
  const projectId = flowProjectId(url);
  const captchaAvailable = await hasCaptchaRuntime(evaluate, tabId);
  const ready = Boolean(projectId && browserApiKey && captchaAvailable && tokenFresh());
  const status = publicStatus({ projectId, captchaAvailable, ready });
  await reportStatus(status);
  return status;
}

export async function flowRefreshSession({ tabId, url, evaluate, cdp }) {
  if (!tokenFresh()) {
    await cdp('flow', tabId, 'Network.enable');
    await chrome.tabs.reload(tabId);
    for (let attempt = 0; attempt < 80; attempt++) {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === 'complete' && tokenFresh()) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  const tab = await chrome.tabs.get(tabId);
  return flowDirectStatus({ tabId, url: tab.url || url, evaluate });
}

function clientContext(projectId, token) {
  return {
    projectId,
    tool: 'PINHOLE',
    userPaygateTier: 'PAYGATE_TIER_ONE',
    sessionId: `;${Date.now()}`,
    recaptchaContext: {
      applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB',
      token,
    },
  };
}

export async function flowDirectGenerate({ tabId, url, prompt, aspect, model, seed, references=[], evaluate, downloadOriginal, recordResult = async () => {} }) {
  const projectId = flowProjectId(url);
  if (!projectId) throw new Error('FLOW_WORKSPACE_REQUIRED');
  if (new URL(url).origin === 'https://flow.google.com') {
    const token = await captchaToken(evaluate, tabId);
    if (!token) throw new Error('FLOW_DIRECT_CAPTCHA_UNAVAILABLE');
    const request = buildFlowImageRequest({projectId,prompt,aspect,model,references,seed:seed ?? Math.floor(Math.random()*2147483647),captcha:token,batchId:crypto.randomUUID()});
    let response;
    try { response = await evaluate('flow', tabId, flowPageRpc, {rpcId:FLOW_RPC_GENERATE,request}); }
    catch { throw new Error('BRIDGE_TIMEOUT_RESULT_UNKNOWN'); }
    if (response.status !== 200) throw new Error(response.status >= 500 ? 'BRIDGE_TIMEOUT_RESULT_UNKNOWN' : `FLOW_DIRECT_HTTP_${response.status}`);
    const data = parseFlowRpc(response.text, FLOW_RPC_GENERATE);
    await recordResult(data);
    const original = flowRpcOriginal(data);
    const blob = await evaluate('flow', tabId, flowOriginalBlob, {url:original.url});
    const downloadId = await downloadOriginal(blob.url);
    return {mode:'flow-rpc', downloadId, mediaId:original.mediaId};
  }
  if(references.length)throw new Error('FLOW_REFERENCE_REQUIRES_CURRENT_HOST');
  if (!browserApiKey || !tokenFresh()) throw new Error('FLOW_DIRECT_SESSION_NOT_READY');
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 24000) throw new Error('INVALID_TEXT');
  const token = await captchaToken(evaluate, tabId);
  if (!token) throw new Error('FLOW_DIRECT_CAPTCHA_UNAVAILABLE');
  const selectedModel = IMAGE_MODELS.has(model) ? model : 'NARWHAL';
  const selectedAspect = ASPECTS.get(aspect) || ASPECTS.get('portrait');
  const context = clientContext(projectId, token);
  const request = {
    clientContext: context,
    seed: Number.isInteger(seed) ? seed : Math.floor(Math.random() * 0xffffffff),
    structuredPrompt: { parts: [{ text: prompt.trim() }] },
    imageAspectRatio: selectedAspect,
    imageModelName: selectedModel,
  };
  const endpoint = `${FLOW_API_ORIGIN}/v1/projects/${projectId}/flowMedia:batchGenerateImages?key=${encodeURIComponent(browserApiKey)}`;
  let result;
  try {
    result = await evaluate('flow', tabId, async ({ endpoint, body, authorization }) => {
      const headers = { 'content-type': 'application/json' };
      if (authorization) headers.authorization = `Bearer ${authorization}`;
      const response = await fetch(endpoint, {method:'POST',credentials:'include',headers,body:JSON.stringify(body)});
      return {status:response.status,ok:response.ok,text:await response.text()};
    }, { endpoint, body: { clientContext: context, requests: [request] }, authorization: bearerToken });
  } catch {
    throw new Error('BRIDGE_TIMEOUT_RESULT_UNKNOWN');
  }
  let data;
  try { data = JSON.parse(result.text); } catch { data = { raw: result.text.slice(0, 500) }; }
  if (result.status === 401) {
    await clearSession();
    await reportStatus(publicStatus({ ready: false }));
  }
  if (!result.ok) {
    if (result.status >= 500) throw new Error('BRIDGE_TIMEOUT_RESULT_UNKNOWN');
    throw new Error(`FLOW_DIRECT_HTTP_${result.status}`);
  }
  const [imageUrl] = parseFlowImages(data);
  if (!imageUrl) throw new Error('BRIDGE_TIMEOUT_RESULT_UNKNOWN');
  const downloadId = await downloadOriginal(imageUrl);
  return {
    mode: 'direct-api',
    downloadId,
    remainingCredits: data?.remainingCredits ?? null,
  };
}

export async function flowUploadReference({tabId,url,base64,mime,name,evaluate}) {
  if(new URL(url).origin!=='https://flow.google.com')throw new Error('FLOW_REFERENCE_REQUIRES_CURRENT_HOST');
  const token=await captchaToken(evaluate,tabId,'UPLOAD_IMAGE');
  if(!token)throw new Error('FLOW_DIRECT_CAPTCHA_UNAVAILABLE');
  const request=buildFlowUploadRequest({projectId:flowProjectId(url),base64,mime,name,captcha:token});
  const response=await evaluate('flow',tabId,flowPageRpc,{rpcId:'maseQ',request});
  if(response.status!==200)throw new Error(`FLOW_UPLOAD_HTTP_${response.status}`);
  return {mediaId:flowUploadedMedia(parseFlowRpc(response.text,'maseQ'))};
}

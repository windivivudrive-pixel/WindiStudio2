// Flow Angular protocol observed 2026-09-11. No DOM controls or cookie export.
// Keep this adapter independent: Google's private web protocol can change.
export const FLOW_RPC_GENERATE = 'ogiZ0b';

export function buildFlowImageRequest({projectId, prompt, model, aspect, seed, captcha, batchId, references=[]}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) throw new Error('FLOW_WORKSPACE_REQUIRED');
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 24000) throw new Error('INVALID_TEXT');
  if (!['NARWHAL', 'GEM_PIX_2', 'HARBOR_SEAL'].includes(model)) throw new Error('FLOW_DIRECT_MODEL_UNSUPPORTED');
  const ratio = {square:1, portrait:2, landscape:3, '3x4':4, '4x3':5}[aspect];
  if (!ratio) throw new Error('FLOW_DIRECT_ASPECT_UNSUPPORTED');
  // ClientContext fields: tool=22, project=6, reCAPTCHA=11.
  const context = [null,22,null,null,null,projectId,null,null,null,null,[captcha,1]];
  // ImageRequest: references=3, seed=4, aspect=5, model=6,
  // client context=8, structured prompt=9.
  if (!Array.isArray(references)||references.length>4||references.some(id=>typeof id!=='string'||!id||id.length>512)) throw new Error('INVALID_FLOW_REFERENCES');
  const image = [null,null,references.map(id=>[id,null,null,null,1]),seed,ratio,model,null,context,[[[prompt.trim()]]]];
  return [null,[image],true,context,[batchId]];
}

export function parseFlowRpc(text, rpcId) {
  const matches = [];
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('[')) continue;
    let rows; try { rows = JSON.parse(line); } catch { continue; }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) if (Array.isArray(row) && row[1] === rpcId) matches.push(row);
  }
  if (matches.length !== 1) throw new Error('BRIDGE_TIMEOUT_RESULT_UNKNOWN');
  const row = matches[0];
  if (row[0] === 'er') throw new Error(`FLOW_RPC_ERROR_${Number(row[2]) || 'UNKNOWN'}`);
  if (row[0] !== 'wrb.fr' || typeof row[2] !== 'string') throw new Error('BRIDGE_TIMEOUT_RESULT_UNKNOWN');
  try { return JSON.parse(row[2]); } catch { throw new Error('BRIDGE_TIMEOUT_RESULT_UNKNOWN'); }
}

export function flowRpcOriginal(data) {
  // BatchGenerateImages response field 1 is generated Media[], not a recursive
  // URL search (which could accidentally select an input reference/thumbnail).
  const media = data?.[0];
  if (!Array.isArray(media) || media.length !== 1) throw new Error('FLOW_RPC_RESULT_NEEDS_RECONCILIATION');
  const record = media[0];
  const mediaId = record?.[0];
  const url = record?.[6]?.[0]?.[13];
  if (typeof mediaId !== 'string' || typeof url !== 'string') throw new Error('FLOW_RPC_RESULT_NEEDS_RECONCILIATION');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('INVALID_ORIGINAL_URL');
  // Preserve the generated-media URL byte-for-byte. Flow only rewrites URLs
  // registered in its separate FIFE registry; a blanket '=d' breaks signed
  // flow-content.google originals (verified 403 versus 200 on this session).
  if (!(parsed.hostname.endsWith('.googleusercontent.com') || parsed.hostname === 'flow-content.google' || parsed.hostname === 'storage.googleapis.com')) throw new Error('INVALID_ORIGINAL_URL');
  return {mediaId, url};
}

// Flow's web downloader fetches original bytes in the signed-in page, then
// downloads a blob. Keep signed original URLs intact, including query fields.
export async function flowOriginalBlob({url}) {
  if (location.origin !== 'https://flow.google.com') throw new Error('FLOW_WORKSPACE_REQUIRED');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('INVALID_ORIGINAL_URL');
  if (!['flow-content.google','storage.googleapis.com'].includes(parsed.hostname) && !parsed.hostname.endsWith('.googleusercontent.com')) throw new Error('INVALID_ORIGINAL_URL');
  const response = await fetch(url, {signal:AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`FLOW_ORIGINAL_HTTP_${response.status}`);
  const blob = await response.blob();
  if (!/^image\/(png|jpeg|webp)$/.test(blob.type) || blob.size > 50*1024*1024) throw new Error('INVALID_ORIGINAL_IMAGE');
  const decoded = await createImageBitmap(blob);
  const width=decoded.width,height=decoded.height;decoded.close();
  if (!width || !height) throw new Error('INVALID_ORIGINAL_IMAGE');
  return {url:URL.createObjectURL(blob),width,height,bytes:blob.size};
}

// Executed only in the owned Flow tab. CSRF/session never leave the page.
export async function flowPageRpc({rpcId, request}) {
  if (location.origin !== 'https://flow.google.com') throw new Error('FLOW_WORKSPACE_REQUIRED');
  if (!['cPZSdc','HTrJv','ogiZ0b','maseQ'].includes(rpcId)) throw new Error('UNSUPPORTED_OPERATION');
  const csrf = globalThis.WIZ_global_data?.SNlM0e;
  if (!csrf) return {status:401, text:''};
  const response = await fetch(`/_/AiSandboxAngularFrontend/data/batchexecute?rpcids=${rpcId}`, {
    method:'POST', credentials:'same-origin', redirect:'error',
    headers:{'content-type':'application/x-www-form-urlencoded;charset=UTF-8'},
    body:new URLSearchParams({'f.req':JSON.stringify([[[rpcId,JSON.stringify(request),null,'generic']]]), at:csrf}),
    signal:AbortSignal.timeout(180000),
  });
  return {status:response.status, text:await response.text()};
}

// UploadImage from the official wO1vlb module: context=1, bytes=2,
// MIME=3, user upload=4, hidden=8, filename=9. Reference type 1 is ingredient.
export function buildFlowUploadRequest({projectId,base64,mime,name,captcha}) {
  const context=buildFlowImageRequest({projectId,prompt:'upload',aspect:'square',model:'NARWHAL',captcha})[3];
  if(!['image/png','image/jpeg','image/webp'].includes(mime)||typeof base64!=='string'||!base64.length||base64.length>28*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))throw new Error('INVALID_FLOW_REFERENCE');
  return [context,base64,mime,true,null,null,null,false,String(name||'reference').slice(0,255)];
}
export function flowUploadedMedia(data){
  const id=data?.[0]?.[0];
  if(typeof id!=='string'||!id||id.length>512)throw new Error('FLOW_UPLOAD_RESULT_INVALID');
  return id;
}

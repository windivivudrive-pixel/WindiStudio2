/**
 * Content script — bridge between background.js and injected.js
 * Injects injected.js into MAIN world to access window.grecaptcha
 */
if (!globalThis.__FLOW_AGENT_CONTENT_LOADED__) {
globalThis.__FLOW_AGENT_CONTENT_LOADED__ = true;

(function () {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('injected.js');
  s.onload = () => s.remove();
  (document.head || document.documentElement).appendChild(s);
})();

chrome.runtime.onMessage.addListener((msg, _, reply) => {
  if (msg.type !== 'GET_CAPTCHA') return;

  const { requestId, pageAction } = msg;

  const handler = (e) => {
    if (e.detail?.requestId === requestId) {
      window.removeEventListener('CAPTCHA_RESULT', handler);
      clearTimeout(timer);
      reply({ token: e.detail.token, error: e.detail.error });
    }
  };

  const timer = setTimeout(() => {
    window.removeEventListener('CAPTCHA_RESULT', handler);
    reply({ error: 'CONTENT_TIMEOUT' });
  }, 25000);

  window.addEventListener('CAPTCHA_RESULT', handler);

  window.dispatchEvent(new CustomEvent('GET_CAPTCHA', {
    detail: { requestId, pageAction },
  }));

  return true; // keep channel open for async reply
});

// Text-to-image fallback for the current flow.google.com UI. It deliberately
// stops when the page presents a verification challenge; the user completes
// that challenge and retries the same idempotent job from the backend.
chrome.runtime.onMessage.addListener((msg, _, reply) => {
  if (msg.type !== 'UI_GENERATE_IMAGE') return;
  generateImageInUi(msg).then(reply).catch((error) => reply({ error: error.message }));
  return true;
});

function visible(element) {
  if (!element) return false;
  const box = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return box.width > 1 && box.height > 1 && style.visibility !== 'hidden' && style.display !== 'none';
}

function textOf(element) {
  return (element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function clickControl(label, role) {
  const nodes = [...document.querySelectorAll(role ? `[role="${role}"]` : 'button,[role="button"],[role="radio"]')];
  const target = nodes.find((element) => visible(element) &&
    (textOf(element) === label || element.getAttribute('aria-label') === label));
  if (!target) throw new Error(`UI_CONTROL_NOT_FOUND: ${label}`);
  target.click();
  return target;
}

function hasManualChallenge() {
  return [...document.querySelectorAll('iframe')].some((frame) => {
    const value = `${frame.title || ''} ${frame.src || ''}`.toLowerCase();
    return value.includes('captcha') || value.includes('challenge');
  }) || [...document.querySelectorAll('[role="dialog"]')].some((dialog) =>
    visible(dialog) && /verify|verification|xác minh|captcha/i.test(textOf(dialog)));
}

function imageCandidates() {
  return [...document.images].filter((image) => visible(image) &&
    image.naturalWidth >= 512 && image.naturalHeight >= 512 &&
    !/avatar|profile|logo/i.test(`${image.alt || ''} ${image.src || ''}`));
}

async function waitUntil(check, timeout, interval = 500) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return null;
}

async function toDataUrl(image) {
  if (image.src.startsWith('data:image/')) return image.src;
  const response = await fetch(image.currentSrc || image.src, { credentials: 'include' });
  if (!response.ok) throw new Error(`UI_IMAGE_DOWNLOAD_HTTP_${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('UI_RESULT_NOT_IMAGE');
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('UI_IMAGE_READ_FAILED'));
    reader.readAsDataURL(blob);
  });
}

async function addRecentReferences(count) {
  if (!count) return;
  const ingredientButton = () => [...document.querySelectorAll('button,[role="button"]')]
    .find((element) => visible(element) && element.getAttribute('aria-label') === 'Add ingredients to the prompt box');
  const initiallyOpen = ingredientButton();
  if (initiallyOpen?.getAttribute('aria-expanded') === 'true') {
    initiallyOpen.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  for (let index = 0; index < count; index++) {
    const trigger = ingredientButton();
    if (!trigger) throw new Error('UI_INGREDIENT_BUTTON_NOT_FOUND');
    trigger.click();
    const options = await waitUntil(() => {
      const items = [...document.querySelectorAll('[role="option"]')].filter(visible);
      return items.length >= count ? items : null;
    }, 15000, 300);
    if (!options) throw new Error('UI_RECENT_REFERENCES_NOT_FOUND');
    options[index].click();
    const add = await waitUntil(() => [...document.querySelectorAll('button,[role="button"]')]
      .find((element) => visible(element) && textOf(element) === 'Add to prompt'), 5000, 200);
    if (!add) throw new Error('UI_ADD_REFERENCE_NOT_FOUND');
    add.click();
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
}

async function generateImageInUi({ prompt, aspect, count, referenceCount }) {
  const before = new Set(imageCandidates().map((image) => image.currentSrc || image.src));
  const promptBox = [...document.querySelectorAll('[contenteditable="true"],textarea')]
    .find((element) => visible(element) &&
      (/What do you want to create/i.test(element.getAttribute('aria-label') || '') ||
       /What do you want to create/i.test(element.getAttribute('data-placeholder') || '') ||
       element.getAttribute('contenteditable') === 'true'));
  if (!promptBox) throw new Error('UI_PROMPT_NOT_FOUND');

  promptBox.focus();
  if (promptBox instanceof HTMLTextAreaElement) {
    promptBox.value = prompt;
  } else {
    promptBox.textContent = '';
    document.execCommand('insertText', false, prompt);
  }
  promptBox.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: prompt }));
  await new Promise((resolve) => setTimeout(resolve, 300));

  await addRecentReferences(referenceCount || 0);

  const settings = [...document.querySelectorAll('button,[role="button"]')]
    .find((element) => visible(element) && element.getAttribute('aria-label') === 'Settings trigger');
  if (settings) {
    settings.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const imageMode = [...document.querySelectorAll('[role="radio"],button')]
      .find((element) => visible(element) && textOf(element) === 'Image');
    if (imageMode && imageMode.getAttribute('aria-checked') !== 'true') imageMode.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const labels = {
      IMAGE_ASPECT_RATIO_LANDSCAPE: '16:9', IMAGE_ASPECT_RATIO_4_3: '4:3',
      IMAGE_ASPECT_RATIO_SQUARE: '1:1', IMAGE_ASPECT_RATIO_3_4: '3:4',
      IMAGE_ASPECT_RATIO_PORTRAIT: '9:16',
    };
    const desired = labels[aspect] || '1:1';
    const ratio = [...document.querySelectorAll('[role="radio"],button')]
      .find((element) => visible(element) && textOf(element) === desired);
    if (ratio) ratio.click();
    const amount = [...document.querySelectorAll('[role="radio"],button')]
      .find((element) => visible(element) && textOf(element) === `x${count || 1}`);
    if (amount) amount.click();
    document.body.click();
  }

  await new Promise((resolve) => setTimeout(resolve, 300));
  const start = [...document.querySelectorAll('button,[role="button"]')]
    .find((element) => visible(element) &&
      (element.getAttribute('aria-label') === 'Start generation' || textOf(element) === 'Start generation'));
  if (!start || start.disabled || start.getAttribute('aria-disabled') === 'true') {
    throw new Error('UI_START_NOT_READY');
  }
  start.click();

  const images = await waitUntil(() => {
    if (hasManualChallenge()) return { challenge: true };
    const fresh = imageCandidates().filter((image) => !before.has(image.currentSrc || image.src));
    return fresh.length >= (count || 1) ? { images: fresh.slice(0, count || 1) } : null;
  }, 180000, 1000);
  if (!images) throw new Error('UI_GENERATION_TIMEOUT');
  if (images.challenge) throw new Error('MANUAL_VERIFICATION_REQUIRED');
  return { images: await Promise.all(images.images.map(toDataUrl)) };
}

// ─── TRPC Media URL Monitor ─────────────────────────────────
// Forward intercepted TRPC responses with media URLs to background.js
window.addEventListener('TRPC_MEDIA_URLS', (e) => {
  const { url, body } = e.detail || {};
  if (!body) return;
  chrome.runtime.sendMessage({
    type: 'TRPC_MEDIA_URLS',
    trpcUrl: url,
    body,
  }).catch(() => {});
});

// ─── Video Upload Relay ─────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _, reply) => {
  if (msg.type !== 'UPLOAD_VIDEO') return;

  const { requestId, videoBase64, projectId } = msg;

  const handler = (e) => {
    if (e.detail?.requestId === requestId) {
      window.removeEventListener('UPLOAD_VIDEO_RESULT', handler);
      clearTimeout(timer);
      reply(e.detail);
    }
  };

  const timer = setTimeout(() => {
    window.removeEventListener('UPLOAD_VIDEO_RESULT', handler);
    reply({ error: 'UPLOAD_TIMEOUT' });
  }, 120000); // 2 min timeout for large uploads

  window.addEventListener('UPLOAD_VIDEO_RESULT', handler);

  window.dispatchEvent(new CustomEvent('UPLOAD_VIDEO', {
    detail: { requestId, videoBase64, projectId },
  }));

  return true; // keep channel open for async reply
});
}

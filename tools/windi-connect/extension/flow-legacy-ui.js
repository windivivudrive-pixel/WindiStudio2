// Archived UI adapter for regression/rollback only; not shipped in Windi Connect.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function trustedClick(cdp, tabId, point) {
  if (!point) throw new Error('FLOW_UI_CONTROL_NOT_FOUND');
  await cdp('flow', tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  await wait(120);
  await cdp('flow', tabId, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await cdp('flow', tabId, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}

export async function flowSelectExisting({ tabId, prompt, evaluate, cdp }) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 24000) throw new Error('INVALID_TEXT');
  const findMatch = () => evaluate('flow', tabId, (wantedPrompt) => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const wanted = normalize(wantedPrompt);
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 1 && box.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const isIngredient = (element) => {
      const own = `${element.getAttribute('aria-label') || ''} ${element.getAttribute('alt') || ''}`;
      const button = element.closest('button,[role="button"]');
      const wrapper = button
        ? `${button.getAttribute('aria-label') || ''} ${button.innerText || button.textContent || ''}`
        : '';
      return /ingredient|nguyên liệu/i.test(`${own} ${wrapper}`);
    };
    const isResultSized = (element) => {
      const box = element.getBoundingClientRect();
      return box.width >= 60 && box.height >= 60;
    };
    const textCandidates = [...document.querySelectorAll('div,p,span')]
      .filter(visible)
      // Flow appends actions such as "Reuse prompt" and "Expand prompt" in
      // the same DOM container, so the visible prompt is an exact substring
      // rather than the container's entire text value.
      .filter((element) => normalize(element.innerText || element.textContent).includes(wanted))
      .sort((left, right) => {
        const leftText = normalize(left.innerText || left.textContent);
        const rightText = normalize(right.innerText || right.textContent);
        const textDelta = leftText.length - wanted.length - (rightText.length - wanted.length);
        if (textDelta) return textDelta;
        const a = left.getBoundingClientRect();
        const b = right.getBoundingClientRect();
        return a.width * a.height - b.width * b.height;
      });
    const textElement = textCandidates[0];
    if (!textElement) return null;
    const textBox = textElement.getBoundingClientRect();
    let scope = textElement.parentElement;
    const scopedMedia = [];
    for (let depth = 0; scope && depth < 6; depth++, scope = scope.parentElement) {
      const media = [...scope.querySelectorAll('img,[role="img"]')]
        .filter(visible)
        .filter((element) => !isIngredient(element))
        .filter(isResultSized)
        .filter((element) => !scopedMedia.includes(element));
      scopedMedia.push(...media);
      if (media.length) break;
    }
    const allMedia = scopedMedia.length
      ? scopedMedia
      : [...document.querySelectorAll('img,[role="img"]')].filter(visible).filter((element) => !isIngredient(element)).filter(isResultSized);
    const ranked = allMedia
      .map((element) => {
        const box = element.getBoundingClientRect();
        const horizontal = Math.abs((box.left + box.right) / 2 - (textBox.left + textBox.right) / 2);
        const vertical = box.bottom <= textBox.top + 24
          ? textBox.top - box.bottom
          : Math.abs((box.top + box.bottom) / 2 - (textBox.top + textBox.bottom) / 2) + 500;
        const oversizedPenalty = box.width > 420 || box.height > 420 ? 2000 : 0;
        return { element, box, score: horizontal * 2 + vertical + oversizedPenalty };
      })
      .sort((left, right) => left.score - right.score);
    const selected = ranked[0];
    if (!selected || selected.score > 5000) return null;
    selected.element.scrollIntoView({ block: 'center', inline: 'center' });
    const box = selected.element.getBoundingClientRect();
    return {
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      promptMatched: true,
    };
  }, prompt.trim());
  let match = null;
  for (let attempt = 0; attempt < 60 && !match?.promptMatched; attempt++) {
    match = await findMatch();
    if (!match?.promptMatched) await wait(250);
  }
  if (!match?.promptMatched) throw new Error('FLOW_EXISTING_RESULT_NOT_FOUND');
  await trustedClick(cdp, tabId, match);
  // Flow updates the selected asset and the global download control in
  // separate renders. Give that state transition time to settle so the
  // download action cannot still point at the previously selected image.
  await wait(1500);
  return { selected: true };
}

async function waitForPoint(evaluate, tabId, finder, arg, errorCode, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const point = await evaluate('flow', tabId, finder, arg);
    if (point) return point;
    await wait(250);
  }
  throw new Error(errorCode);
}

/**
 * Download the exact Flow history tile matched by prompt.
 *
 * Flow's global "Download media" button belongs to the root asset. Selecting
 * an edited result in the history does not retarget that button, so using it
 * can silently download a different scene. The tile-local overflow menu is
 * the only UI control that stays bound to the matched generation.
 */
export async function flowDownloadExisting({ tabId, prompt, evaluate, cdp }) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 24000) throw new Error('INVALID_TEXT');
  const wantedPrompt = prompt.trim();
  await flowSelectExisting({ tabId, prompt: wantedPrompt, evaluate, cdp });

  const more = await waitForPoint(evaluate, tabId, (wanted) => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const wantedText = normalize(wanted);
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 1 && box.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const textCandidates = [...document.querySelectorAll('div,p,span')]
      .filter(visible)
      .filter((element) => normalize(element.innerText || element.textContent).includes(wantedText))
      .sort((left, right) => normalize(left.innerText || left.textContent).length - normalize(right.innerText || right.textContent).length);
    const textElement = textCandidates[0];
    if (!textElement) return null;
    const textBox = textElement.getBoundingClientRect();
    const controls = [...document.querySelectorAll('button,[role="button"]')]
      .filter(visible)
      .filter((element) => /more options|thêm tuỳ chọn|thêm tùy chọn/i.test(`${element.getAttribute('aria-label') || ''} ${element.innerText || element.textContent || ''}`))
      .map((element) => {
        const box = element.getBoundingClientRect();
        const dx = Math.abs((box.left + box.right) / 2 - (textBox.left + textBox.right) / 2);
        const dy = box.bottom <= textBox.top + 40 ? textBox.top - box.bottom : Math.abs(box.top - textBox.top) + 500;
        return { element, box, score: dx * 2 + dy };
      })
      .sort((left, right) => left.score - right.score);
    const selected = controls[0];
    if (!selected || selected.score > 2000) return null;
    return { x: selected.box.left + selected.box.width / 2, y: selected.box.top + selected.box.height / 2 };
  }, wantedPrompt, 'FLOW_RESULT_MENU_NOT_FOUND');
  await trustedClick(cdp, tabId, more);

  const download = await waitForPoint(evaluate, tabId, () => {
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 1 && box.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const exact = (value) => /^(download|tải xuống)$/i.test(String(value || '').replace(/\s+/g, ' ').trim());
    const element = [...document.querySelectorAll('button,[role="button"],[role="menuitem"],[role="option"],div,span')]
      .filter(visible)
      .filter((candidate) => exact(candidate.getAttribute('aria-label')) || exact(candidate.innerText || candidate.textContent))
      .sort((left, right) => {
        const a = left.getBoundingClientRect();
        const b = right.getBoundingClientRect();
        return a.width * a.height - b.width * b.height;
      })[0];
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }, null, 'FLOW_RESULT_DOWNLOAD_NOT_FOUND', 30);
  await trustedClick(cdp, tabId, download);

  const original = await waitForPoint(evaluate, tabId, () => {
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 1 && box.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const originalText = (value) => /(^|\s)(1k\s+original size|original size|kích thước gốc)(\s|$)/i.test(String(value || '').replace(/\s+/g, ' ').trim());
    const element = [...document.querySelectorAll('button,[role="button"],[role="menuitem"],[role="option"],div,span')]
      .filter(visible)
      .filter((candidate) => originalText(candidate.getAttribute('aria-label')) || originalText(candidate.innerText || candidate.textContent))
      .sort((left, right) => {
        const a = left.getBoundingClientRect();
        const b = right.getBoundingClientRect();
        return a.width * a.height - b.width * b.height;
      })[0];
    if (!element) return null;
    const box = element.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }, null, 'FLOW_RESULT_ORIGINAL_NOT_FOUND', 30);
  await trustedClick(cdp, tabId, original);
  return { started: true };
}

async function flowControl(evaluate, tabId, kind) {
  return evaluate('flow', tabId, (wanted) => {
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 1 && box.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const point = (element) => {
      if (!element || !visible(element)) return null;
      element.scrollIntoView({ block: 'center', inline: 'center' });
      const box = element.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    };
    const text = (element) => `${element.getAttribute('aria-label') || ''} ${element.innerText || element.textContent || ''}`.replace(/\s+/g, ' ').trim();
    const controls = [...document.querySelectorAll('button,[role="button"],[role="radio"]')].filter(visible);
    if (wanted === 'settings') return point(controls.find((element) => /settings trigger|cài đặt/i.test(text(element))));
    if (wanted === 'image') return point(controls.find((element) => /^(Image|Hình ảnh)(\s+Image|\s+Hình ảnh)?$/i.test(text(element))));
    if (wanted === 'portrait') return point(controls.find((element) => /(^|\s)9:16(\s|$)/.test(text(element))));
    if (wanted === 'one') return point(controls.find((element) => /^(x1|1)$/i.test(text(element))));
    if (wanted === 'start') {
      const element = controls.find((candidate) => /start generation|bắt đầu tạo|^tạo$/i.test(text(candidate)));
      if (!element || element.disabled || element.getAttribute('aria-disabled') === 'true') return null;
      return point(element);
    }
    return null;
  }, kind);
}

async function waitForFlowControl(evaluate, tabId, kind, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const control = await flowControl(evaluate, tabId, kind);
    if (control) return control;
    await wait(250);
  }
  return null;
}

export async function flowUiSubmit({ tabId, prompt, evaluate, cdp }) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 24000) throw new Error('INVALID_TEXT');
  let editor = null;
  for (let attempt = 0; attempt < 60 && !editor; attempt++) {
    editor = await evaluate('flow', tabId, () => {
      const visible = (element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return box.width > 1 && box.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const candidates = [...document.querySelectorAll('[contenteditable="true"],textarea')].filter(visible);
      const element = candidates.find((candidate) => /what do you want to create|bạn muốn tạo/i.test(`${candidate.getAttribute('aria-label') || ''} ${candidate.getAttribute('data-placeholder') || ''} ${candidate.getAttribute('placeholder') || ''}`)) || candidates.find((candidate) => candidate.isContentEditable) || candidates[0];
      if (!element) return null;
      element.focus();
      if (element.isContentEditable) {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      } else element.select();
      return true;
    }, null);
    if (!editor) await wait(250);
  }
  if (!editor) throw new Error('FLOW_UI_PROMPT_NOT_FOUND');
  await cdp('flow', tabId, 'Input.insertText', { text: prompt.trim() });
  await wait(250);

  const settings = await waitForFlowControl(evaluate, tabId, 'settings');
  if (!settings) throw new Error('FLOW_UI_SETTINGS_NOT_FOUND');
  await trustedClick(cdp, tabId, settings);
  await wait(250);
  const image = await waitForFlowControl(evaluate, tabId, 'image', 20);
  if (image) { await trustedClick(cdp, tabId, image); await wait(150); }
  const portrait = await waitForFlowControl(evaluate, tabId, 'portrait', 20);
  if (!portrait) throw new Error('FLOW_UI_PORTRAIT_NOT_FOUND');
  await trustedClick(cdp, tabId, portrait);
  const one = await waitForFlowControl(evaluate, tabId, 'one', 12);
  if (one) await trustedClick(cdp, tabId, one);
  await cdp('flow', tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp('flow', tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await wait(250);
  const start = await waitForFlowControl(evaluate, tabId, 'start', 20);
  if (!start) throw new Error('FLOW_UI_START_NOT_READY');
  await trustedClick(cdp, tabId, start);
  return { mode: 'provider-ui', submitted: true };
}

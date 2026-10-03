import {createReadStream} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import path from 'node:path';

async function latestUserRequest(transcriptPath) {
  if (typeof transcriptPath !== 'string' || !path.isAbsolute(transcriptPath)) return '';
  let latest = '';
  try {
    const lines = createInterface({input: createReadStream(transcriptPath), crlfDelay: Infinity});
    for await (const line of lines) {
      if (!line.includes('"source":"USER_EXPLICIT"') || !line.includes('"type":"USER_INPUT"')) continue;
      try { latest = String(JSON.parse(line).content || ''); } catch { /* Keep the last valid request. */ }
    }
  } catch { return ''; }
  return latest.split('<USER_REQUEST>')[1]?.split('</USER_REQUEST>')[0] || latest;
}

async function workspaceUsesWindi(paths) {
  if (!Array.isArray(paths)) return false;
  for (const root of paths) {
    if (typeof root !== 'string' || !path.isAbsolute(root)) continue;
    try {
      const project = JSON.parse(await readFile(path.join(root, '.windi', 'project.json'), 'utf8'));
      if (['flow', 'chatgpt', 'grok'].includes(project?.defaults?.provider)) return true;
    } catch { /* Other workspaces may not use Windi. */ }
  }
  return false;
}

let input = '';
for await (const chunk of process.stdin) input += chunk;
let payload;
try { payload = JSON.parse(input); } catch { payload = {}; }

let decision = 'allow';
let reason;
if (payload?.toolCall?.name === 'generate_image') {
  const request = await latestUserRequest(payload.transcriptPath);
  const explicitlySwitched = /(?:không|đừng|stop|do not|don't)\s+(?:dùng|use)\s+windi(?:[\s-]*connect)?[\s\S]{0,100}(?:dùng|use)\s+(?:gemini|antigravity)/i.test(request);
  const requestedWindi = /\bwindi(?:[\s-]*connect)?\b/i.test(request) && /(?:tạo|dựng|generate|image|ảnh|hình)/i.test(request);
  if (!explicitlySwitched && (requestedWindi || await workspaceUsesWindi(payload.workspacePaths))) {
    decision = 'deny';
    reason = 'Tác vụ này đã chọn Windi Connect. Chờ đúng job Windi/Flow hoàn tất; nếu lỗi, báo job ID và error code. Không dùng quota generate_image của Antigravity.';
  }
}
process.stdout.write(JSON.stringify({decision, ...(reason ? {reason} : {})}));

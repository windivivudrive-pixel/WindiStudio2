import { hash, repositoryUrl, safeUrl } from './core.mjs';

export const FIT_VERSION = 'nontech-v1';
export const NEEDS = [
  { id: 'video', label: 'Dựng và xử lý video', match: /\b(video edit\w*|video creat\w*|screen record\w*|video generat\w*|shorts|reels|video compress\w*|video convert\w*)\b|视频剪辑|视频生成/i, task: 'Thử tạo hoặc chỉnh một video ngắn bằng nội dung của bạn.' },
  { id: 'audio', label: 'Âm thanh và phụ đề', match: /\b(transcri\w*|subtitles?|speech.to.text|text.to.speech|audio edit\w*|voice.over|vocal remov\w*)\b|字幕|语音转文字/i, task: 'Thử một đoạn ghi âm tiếng Việt, kiểm tra tên riêng và xuất kết quả.' },
  { id: 'image', label: 'Ảnh và thiết kế', match: /\b(image edit\w*|image generat\w*|image upscal\w*|photo edit\w*|background remov\w*|graphic design|inpaint\w*|thumbnail)\b|图像生成|图片编辑/i, task: 'Thử xử lý một ảnh sản phẩm hoặc thiết kế ảnh cho bài đăng.' },
  { id: 'office', label: 'Tài liệu và nghiên cứu', match: /\b(pdf|document manag\w*|note.taking|knowledge base|research assistant|presentation|spreadsheet|ocr)\b|知识库|文档管理/i, task: 'Thử một tài liệu không nhạy cảm và kiểm tra chất lượng kết quả.' },
  { id: 'content', label: 'Nội dung và mạng xã hội', match: /\b(social.media|content creat\w*|copywriting|newsletter|social schedul\w*|content schedul\w*)\b|内容创作/i, task: 'Thử chuẩn bị nội dung cho một tuần và duyệt lại trước khi đăng.' },
  { id: 'automation', label: 'Tự động hóa công việc', match: /\b(no.code|nocode|workflow automation|browser automation|desktop automation)\b|工作流自动化/i, task: 'Thử một tác vụ lặp lại với dữ liệu mẫu và kiểm tra trước khi kết nối tài khoản thật.' },
];
const readable = text => String(text ?? '').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/\[[^\]]*\]\([^)]*\)/g, m => m.slice(1, m.indexOf(']'))).replace(/[`*_#]/g, '').replace(/\s+/g, ' ').trim();
const snippet = (text, pattern) => {
  const match = pattern.exec(text);
  return match ? text.slice(Math.max(0, match.index - 45), match.index + match[0].length + 90).trim() : null;
};
export function needsFor(text) { return NEEDS.filter(n => n.match.test(text)); }

export function parseCreatorList(text, source, fetchedAt) {
  const rows = new Map();
  // Only actual list/table entries, not badge, sponsor or navigation links.
  for (const line of text.split('\n')) {
    if (!/^\s*(?:[-*]\s|\|)/.test(line) || /sponsor|affiliate|utm_campaign|shields\.io/i.test(line)) continue;
    if (!needsFor(readable(line)).length) continue;
    for (const m of line.matchAll(/https:\/\/github\.com\/([\w.-]+\/[\w.-]+)(?=[/#?)\s"<>]|$)/g)) {
      const repo = repositoryUrl(m[0]);
      if (!repo || /\/(?:awesome[^/]*|\.github)$/.test(repo)) continue;
      rows.set(repo, { repo: repo.replace('https://github.com/', ''), sources: [{ id: source.id, url: source.homepage, fetchedAt }], discoveryNeeds: needsFor(readable(line)).map(n => n.id) });
    }
  }
  return [...rows.values()];
}

export function evaluateRepo(repo, readme, { now = Date.now() } = {}) {
  const text = readable(readme?.text || '');
  // Relevance from the project's own summary/introduction, not a directory label or dependency list.
  const intro = readable(`${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${text.slice(0, 3500)}`);
  const needs = needsFor(intro);
  const reasons = []; const unknowns = []; const flags = [];
  const evidence = [];
  const signal = (key, pattern) => {
    const excerpt = snippet(text, pattern);
    if (excerpt) evidence.push({ key, excerpt, url: readme.url, observedAt: readme.fetchedAt });
    return Boolean(excerpt);
  };
  const desktop = signal('desktop', /\b(?:desktop app(?:lication)?|windows installer|download.{0,45}(?:windows|macos)|binaries.{0,50}available)\b|\.(?:dmg|exe|appimage|msi)\b/i)
    || (signal('download', /\bdownload [a-z][a-z -]{1,30}/i) && signal('platforms', /\b(?:supported platforms|macos windows linux)\b/i));
  const hosted = signal('hosted', /\b(hosted version|cloud version|try (?:it )?online|online demo|web demo|try.{0,20}in your browser)\b/i);
  const ui = signal('interface', /\b(gui|graphical user interface|web ui|webui|web interface|drag.and.drop|desktop app(?:lication)?)\b/i);
  const setup = signal('setup', /\b(install(?:ation)?|getting started|quick start|quickstart|how to use|download)\b/i);
  const example = signal('example', /\b(demo|screenshot|examples?|tutorial)\b/i);
  const gpu = signal('gpu', /\b(cuda|vram|nvidia|gpu required|requires? (?:a )?gpu)\b/i);
  const api = signal('api-key', /\b(api[ _-]?key|openai_api_key|anthropic_api_key|paid subscription|billing)\b/i);
  const technical = signal('technical-setup', /\b(docker compose|docker run|pip install|npm install|git clone|conda create)\b/i);
  const extension = signal('extension', /\b(browser extension|chrome extension|firefox add.on|plugin for)\b/i);
  const knownLicense = Boolean(repo.license?.spdx_id && !['NOASSERTION', 'NONE'].includes(repo.license.spdx_id));
  const pushed = Date.parse(repo.pushed_at);
  const ageDays = Number.isFinite(pushed) ? Math.max(0, (now - pushed) / 86400000) : null;
  const reject = repo.private || repo.archived || repo.disabled || /(?:awesome|tutorial|cookbook|(?:^|[-_])(?:course|crack(?:er|ed)?|keygen|prompt.collection|model.zoo)(?:[-_]|$))/i.test(repo.name) || /\b(leaked prompts|prompt leaks)\b/i.test(intro);
  const developerOnly = /\b(sdk|framework|library|ocr toolkits?|data labeling|data annotation|image annotation|benchmark|training framework|mcp server|command.line tool|flutter (?:package|widget)|dart package|react component)\b/i.test(`${repo.name} ${repo.description || ''} ${text.slice(0, 250)}`);
  // A library's example GUI does not turn the library into a consumer application.
  if (reject) reasons.push('Repo ngừng hoạt động, không công khai, bản crack hoặc danh sách/học liệu không phải ứng dụng.');
  if (!needs.length) reasons.push('Chưa thấy công dụng rõ ràng cho creator hoặc người dùng văn phòng.');
  if (developerOnly) reasons.push('Thiên về thư viện, hạ tầng hoặc công cụ lập trình.');
  if (repo.fork) flags.push('FORK_REQUIRES_REVIEW');
  if (!knownLicense) unknowns.push('Chưa xác minh được giấy phép; không được ghi là miễn phí dùng thương mại.');
  if (!text) unknowns.push('Chưa đọc được README chính chủ.');
  if (ageDays === null) unknowns.push('Chưa xác minh thời điểm cập nhật.');
  if (ageDays !== null && ageDays > 365) flags.push('MAINTENANCE_REVIEW');
  if (gpu) flags.push('GPU_MENTIONED_VERIFY_REQUIREMENT');
  if (api) flags.push('API_OR_PAID_SERVICE_MENTIONED');
  if (technical && !desktop && !hosted) flags.push('TECHNICAL_SETUP');
  const access = hosted ? 'WEB_OPTION_CLAIMED' : desktop ? 'DESKTOP_OPTION_CLAIMED' : extension ? 'EXTENSION_OPTION_CLAIMED' : ui ? 'SELF_HOSTED_UI_OR_UNCLEAR' : 'UNKNOWN';
  if (access === 'UNKNOWN') unknowns.push('Chưa có bằng chứng về cách dùng có giao diện.');
  const components = {
    practicalUse: needs.length ? 30 : 0,
    access: hosted || desktop ? 25 : extension ? 18 : ui ? 10 : 0,
    documentation: (setup ? 8 : 0) + (example ? 7 : 0),
    maintenance: ageDays === null ? 0 : ageDays <= 90 ? 15 : ageDays <= 365 ? 10 : ageDays <= 730 ? 3 : 0,
    license: knownLicense ? 10 : 0,
    adoption: repo.stargazers_count >= 1000 ? 5 : repo.stargazers_count >= 100 ? 3 : 0,
  };
  const penalties = (gpu && !hosted ? 12 : 0) + (technical && !hosted && !desktop ? 12 : 0) + (api ? 5 : 0);
  const score = Math.max(0, Object.values(components).reduce((a, b) => a + b, 0) - penalties);
  let lane = 'NEEDS_REVIEW';
  if (reject || !needs.length || developerOnly) lane = 'EXCLUDED';
  else if (knownLicense && text && !repo.fork && ageDays !== null && ageDays <= 365 && score >= 70 && (desktop || hosted || extension)) lane = 'PRIORITY_REVIEW';
  else if (knownLicense && text && (ui || extension || desktop || hosted)) lane = 'GUIDE_REQUIRED';
  if (needs.length) reasons.push(`Ứng dụng dự kiến: ${needs.map(n => n.label).join(', ')}.`);
  return { version: FIT_VERSION, score, components, penalties, lane, access, needs: needs.map(n => n.id), reasons, flags, unknowns, evidence,
    firstTask: needs[0]?.task ?? null,
    reviewChecklist: ['Thử từ đầu trên thiết bị phổ thông; ghi OS và thời gian đến kết quả đầu tiên.', 'Xác minh link dùng thử/tải từ README; thử xuất file có dùng được không.', 'Kiểm tra chi phí, API key, GPU, watermark và giới hạn bản miễn phí.', 'Thử tiếng Việt bằng dữ liệu mẫu; không suy ra từ nhãn multilingual.', 'Kiểm tra quyền truy cập, nơi gửi dữ liệu và giấy phép trước khi viết bài.'],
    vietnameseSupport: 'NOT_TESTED', pricing: 'NOT_VERIFIED', handsOnTest: 'NOT_TESTED', securityReview: 'NOT_REVIEWED' };
}

export function makeCandidate(repo, readme, sources, now) {
  const canonicalUrl = repositoryUrl(repo.html_url);
  if (!canonicalUrl || !Number.isInteger(repo.id) || !repo.full_name) throw new Error('Invalid GitHub repository metadata');
  return { id: `github:${repo.id}`, identity: `repo:${canonicalUrl}`, name: repo.full_name, canonicalUrl,
    status: 'CANDIDATE', windiScore: null, editorialBadges: [], sources,
    metadata: { githubId: repo.id, description: cleanDescription(repo.description), license: repo.license?.spdx_id ?? null, homepage: safeUrl(repo.homepage), pushedAt: repo.pushed_at, stars: repo.stargazers_count, forks: repo.forks_count || 0, fork: repo.fork, archived: repo.archived },
    readme: readme ? { url: readme.url, observedAt: readme.fetchedAt, sha256: hash(readme.text) } : null,
    fit: evaluateRepo(repo, readme, { now }) };
}

function cleanDescription(value) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200);
}

export function selectCreatorCandidates(rows, { limit = 30, perNeed = 8, perOwner = 2 } = {}) {
  const counts = new Map(); const owners = new Map(); const selected = [];
  const eligible = rows.filter(r => r.fit.lane === 'PRIORITY_REVIEW').sort((a, b) => b.fit.score - a.fit.score || a.name.localeCompare(b.name));
  for (const row of eligible) {
    if (selected.length >= limit) break;
    const owner = row.name.split('/')[0].toLowerCase();
    const need = row.fit.needs.find(n => (counts.get(n) || 0) < perNeed);
    if (!need || (owners.get(owner) || 0) >= perOwner) continue;
    selected.push({ ...row, selectedNeed: need });
    counts.set(need, (counts.get(need) || 0) + 1); owners.set(owner, (owners.get(owner) || 0) + 1);
  }
  return selected;
}

import { mkdir, readFile, open, unlink, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHttp, atomicJson, repositoryUrl } from './ingestion/core.mjs';
import { CREATOR_SOURCES, SEARCH_LANES } from './ingestion/creator-sources.mjs';
import { FIT_VERSION, NEEDS, parseCreatorList, makeCandidate, selectCreatorCandidates, needsFor } from './ingestion/creator-fit.mjs';
import { RANKING_VERSION, rankDiscoveryCandidates, selectReviewBatch } from './ingestion/discovery-ranking.mjs';
import { buildDiscoveryPayload, enqueueDiscoveryRun, loadDiscoveryDatabaseState } from './ingestion/supabase-discovery.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'data/catalog/nontech');
const ACCESS_LABELS = { WEB_OPTION_CLAIMED: 'Có bản web theo README', DESKTOP_OPTION_CLAIMED: 'Có bản desktop theo README', EXTENSION_OPTION_CLAIMED: 'Có tiện ích/plugin theo README', SELF_HOSTED_UI_OR_UNCLEAR: 'Có giao diện, cần kiểm tra cách cài', UNKNOWN: 'Chưa rõ cách dùng' };
const FLAG_LABELS = { FORK_REQUIRES_REVIEW: 'Cần kiểm tra bản fork', MAINTENANCE_REVIEW: 'Cần xem lại bảo trì', GPU_MENTIONED_VERIFY_REQUIREMENT: 'Có nhắc GPU, cần kiểm tra yêu cầu máy', API_OR_PAID_SERVICE_MENTIONED: 'Có nhắc API/dịch vụ trả phí', TECHNICAL_SETUP: 'Cần thao tác cài đặt kỹ thuật' };
const escape = value => String(value ?? '').replace(/[|\n\r<>\[\]`]/g, ' ');

export function verifyCreatorRun(run) {
  if (run.schemaVersion !== 1 || run.fitVersion !== FIT_VERSION || !Array.isArray(run.candidates) || !Array.isArray(run.shortlist)) throw new Error('Invalid creator run schema');
  const ids = new Set();
  for (const row of run.candidates) {
    if (ids.has(row.id) || row.status !== 'CANDIDATE' || row.windiScore !== null || row.editorialBadges.length || repositoryUrl(row.canonicalUrl) !== row.canonicalUrl) throw new Error('Invalid identity or publication boundary');
    ids.add(row.id);
    if (!row.sources?.length || !row.sources.every(s => Number.isFinite(Date.parse(s.fetchedAt)))) throw new Error('Missing provenance');
    if (!Number.isFinite(row.fit.score) || row.fit.score < 0 || row.fit.score > 100 || row.fit.handsOnTest !== 'NOT_TESTED') throw new Error('Invalid fit evidence');
  }
  const selected = new Set();
  for (const row of run.shortlist) {
    if (!ids.has(row.id) || selected.has(row.id) || row.fit.lane !== 'PRIORITY_REVIEW') throw new Error('Invalid shortlist');
    selected.add(row.id);
  }
  if (!Number.isInteger(run.rejectedSkippedCount) || run.rejectedSkippedCount < 0) throw new Error('Invalid rejected-resource exclusion count');
  if (run.rejectionSnapshot !== null && (!Number.isInteger(run.rejectionSnapshot.count) || !Number.isFinite(Date.parse(run.rejectionSnapshot.fetchedAt)))) throw new Error('Invalid rejection snapshot');
  if (!Array.isArray(run.queueSelection) || run.queueSelection.length > 10 || (run.queueSelection.length > 0 && run.queueSelection.length < 5)) throw new Error('Invalid review-queue selection');
  if (run.queueSelection.some(row => row.ranking?.version !== RANKING_VERSION || row.fit?.lane !== 'PRIORITY_REVIEW')) throw new Error('Unqualified review-queue candidate');
  if (run.databaseWritten && (run.databaseResult?.resourceStatus !== 'CANDIDATE' || run.databaseResult.insertedCount > 10)) throw new Error('Invalid database review-queue result');
  return true;
}

export function renderCreatorReport(run) {
  const lines = ['# Repo dành cho người dùng nontech — hàng chờ biên tập', '', `Thu thập: ${run.generatedAt}. Trạng thái: ${run.status}.`, '',
    `${run.discoveryCount} đầu mối; ${run.candidates.length} repo đã đánh giá; ${run.shortlist.length} mục ưu tiên thử. ${run.rejectedSkippedCount} repo từng bị từ chối trong Supabase đã được loại trước khi chấm. ${run.deferredCount} đầu mối chờ lượt sau vì giới hạn lượt chạy.`, '',
    'Điểm phù hợp là bộ lọc heuristic từ tài liệu, không phải Windi Score, kiểm chứng an toàn hoặc kết quả dùng thử. Mọi mục vẫn là CANDIDATE. Không tự xuất bản hoặc sửa danh mục đang dùng.', '',
    '## Ưu tiên thử trước', '', '| Repo | Nhu cầu | Điểm sơ bộ | Cách tiếp cận theo README | Việc nên thử | Lưu ý |', '|---|---|---:|---|---|---|'];
  for (const row of run.shortlist) lines.push(`| [${escape(row.name)}](${row.canonicalUrl}) | ${row.fit.needs.map(id => NEEDS.find(n => n.id === id)?.label || id).join(', ')} | ${row.fit.score} | ${ACCESS_LABELS[row.fit.access]} | ${escape(row.fit.firstTask)} | ${escape(row.fit.flags.map(f => FLAG_LABELS[f] || f).join('; ') || 'Chi phí và tiếng Việt chưa thử')} |`);
  if (!run.shortlist.length) lines.push('| Chưa đủ bằng chứng để ưu tiên mục nào | | | | | |');
  lines.push('', '## Đợt đề xuất đưa vào hàng chờ Supabase', '', '| Repo | Tổng điểm | Hữu dụng | Hot | Tăng stars/ngày | Khoảng trống danh mục |', '|---|---:|---:|---:|---:|---:|');
  for (const row of run.queueSelection) lines.push(`| [${escape(row.name)}](${row.canonicalUrl}) | ${row.ranking.total} | ${row.ranking.components.usefulness} | ${row.ranking.components.hotness} | ${row.ranking.starsPerDay ?? 'Chưa có lịch sử'} | ${row.ranking.components.catalogGap} |`);
  if (!run.queueSelection.length) lines.push('| Chưa đủ ít nhất 5 repo đạt ngưỡng | | | | | |');
  lines.push('', run.databaseWritten ? `Đã ghi ${run.databaseResult.insertedCount} repo mới vào trạng thái CANDIDATE (chờ duyệt).` : 'Lượt này chỉ xem trước; chưa ghi DB. Automation 6 giờ sử dụng --enqueue để ghi hàng chờ.');
  for (const [lane, title] of [['GUIDE_REQUIRED', 'Có ích nhưng cần hướng dẫn'], ['NEEDS_REVIEW', 'Cần bổ sung bằng chứng'], ['EXCLUDED', 'Loại khỏi đợt đề xuất này']]) {
    lines.push('', `## ${title}`, '', '| Repo | Điểm | Lý do / thông tin thiếu |', '|---|---:|---|');
    for (const r of run.candidates.filter(r => r.fit.lane === lane)) lines.push(`| [${escape(r.name)}](${r.canonicalUrl}) | ${r.fit.score} | ${escape([...r.fit.reasons, ...r.fit.unknowns, ...r.fit.flags.map(f => FLAG_LABELS[f] || f)].join(' '))} |`);
  }
  lines.push('', '## Nguồn và lỗi', '', '| Nguồn | Trạng thái | Số repo |', '|---|---|---:|');
  for (const s of run.sources) lines.push(`| ${escape(s.id)} | ${escape(s.status)} | ${s.count || 0} |`);
  for (const r of run.unresolvedRepos || []) lines.push(`- ${escape(r.repo)}: ${escape(r.reason)}.`);
  for (const e of run.errors) lines.push(`- ${escape(e.id)}: ${escape(e.message)}`);
  lines.push('', '## Trước khi đăng', '', 'Mở ứng dụng thật, thử một tác vụ phổ biến bằng tiếng Việt, xác minh giá/thiết bị/quyền truy cập và viết hướng dẫn bắt đầu. README chỉ là lời mô tả của tác giả. Mục đã có trong danh mục được đánh dấu existingCatalog để biên tập cập nhật, không tạo bài trùng.', '');
  return lines.join('\n');
}

/**
 * @param {{http: (url: string, options?: object) => Promise<{text: string, url: string, fetchedAt: string}>, existing?: any[], rejectedIdentities?: Set<string>, rejectionSnapshot?: {count:number, fetchedAt:string}, limit?: number, listLimit?: number, now?: number, refreshExisting?: boolean, progress?: (message: string) => void}} options
 */
export async function collectCreatorRun({ http, existing = [], rejectedIdentities = new Set(), rejectionSnapshot = null, limit = 60, listLimit = 36, now = Date.now(), refreshExisting = false, progress = () => {} }) {
  const sources = []; const errors = []; const unresolvedRepos = []; const leads = new Map(); const metadata = new Map();
  const rejectedSkipped = new Set();
  function rejectedIdentity(repository) {
    const canonical = repositoryUrl(repository.startsWith('https://') ? repository : `https://github.com/${repository}`);
    return canonical ? `repo:${canonical}` : null;
  }
  function add(lead) {
    const identity = rejectedIdentity(lead.repo);
    if (identity && rejectedIdentities.has(identity)) {
      rejectedSkipped.add(identity);
      return false;
    }
    const key = lead.repo.toLowerCase();
    const prev = leads.get(key);
    if (prev) {
      for (const s of lead.sources) if (!prev.sources.some(p => p.id === s.id && p.url === s.url)) prev.sources.push(s);
    } else leads.set(key, lead);
  }
  const existingByUrl = new Map(existing.map(r => [repositoryUrl(r.repository_url || r.canonical_url), r]));
  async function search(id, query, count = 20, sort = 'stars') {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=${count}`;
    const res = await http(url, { github: true });
    const body = JSON.parse(res.text);
    if (!Array.isArray(body.items) || body.incomplete_results) throw new Error('Incomplete/schema-invalid GitHub search');
    for (const repo of body.items) {
      if (!repo.full_name || !repositoryUrl(repo.html_url)) continue;
      const key = repo.full_name.toLowerCase();
      metadata.set(key, { repo, source: { id: 'github-metadata', url: res.url, fetchedAt: res.fetchedAt } });
      add({ repo: repo.full_name, sources: [{ id, url: res.url, fetchedAt: res.fetchedAt }] });
    }
    return body.items;
  }
  if (refreshExisting) {
    for (const r of existing) {
      const url = repositoryUrl(r.repository_url || r.canonical_url);
      if (url) add({ repo: url.replace('https://github.com/', ''), sources: [] });
    }
  } else {
    const buckets = [];
    for (const source of CREATOR_SOURCES) {
      try {
        const res = await http(source.url);
        const rows = parseCreatorList(res.text, source, res.fetchedAt);
        if (!rows.length) throw new Error('No direct relevant GitHub links parsed; review source format');
        const diversified = [];
        const groups = SEARCH_LANES.map(l => rows.filter(r => r.discoveryNeeds.includes(l.id)));
        const seen = new Set();
        for (let i = 0; groups.some(g => i < g.length); i++) for (const g of groups) if (g[i] && !seen.has(g[i].repo)) { diversified.push(g[i]); seen.add(g[i].repo); }
        buckets.push(diversified); sources.push({ id: source.id, status: 'SUCCESS', count: rows.length });
      } catch (e) { errors.push({ id: source.id, message: e.message }); sources.push({ id: source.id, status: 'FAILED', count: 0 }); }
    }
    // Interleave directories; a large first source cannot consume the whole budget.
    for (let i = 0; buckets.some(b => i < b.length); i++) for (const b of buckets) if (b[i]) add(b[i]);
    const since = new Date(now - 365 * 86400000).toISOString().slice(0, 10);
    for (const lane of SEARCH_LANES) {
      try {
        const rows = await search(`search:${lane.id}`, `${lane.query} in:name,description stars:>=50 archived:false fork:false pushed:>=${since}`);
        sources.push({ id: `search:${lane.id}`, status: 'SUCCESS', count: rows.length });
        progress(`${lane.label}: ${rows.length} repo`);
      } catch (e) { errors.push({ id: lane.id, message: e.message }); sources.push({ id: `search:${lane.id}`, status: 'FAILED', count: 0 }); }
    }
  }
  const unresolved = [...leads.values()].filter(l => !metadata.has(l.repo.toLowerCase())).slice(0, refreshExisting ? limit : listLimit);
  for (let i = 0; i < unresolved.length; i += 8) {
    const group = unresolved.slice(i, i + 8);
    try {
      // GitHub canonical redirects/renames are not guessed from an unmatched search result.
      await search('directory-resolution', group.map(l => `repo:${l.repo}`).join(' '), 100, 'stars');
      for (const lead of group) if (!metadata.has(lead.repo.toLowerCase())) {
        try {
          const res = await http(`https://api.github.com/repos/${lead.repo}`, { github: true });
          const repo = JSON.parse(res.text);
          if (!repo.full_name || !repositoryUrl(repo.html_url)) throw new Error('Invalid canonical metadata');
          const canonical = repo.full_name.toLowerCase();
          add({ repo: repo.full_name, sources: lead.sources });
          metadata.set(canonical, { repo, source: { id: 'github-canonical-resolution', url: res.url, fetchedAt: res.fetchedAt } });
          if (canonical !== lead.repo.toLowerCase()) leads.delete(lead.repo.toLowerCase());
        } catch (e) {
          if (/HTTP (404|410|451)/.test(e.message)) unresolvedRepos.push({ repo: lead.repo, reason: 'Unavailable public repository; held outside shortlist' });
          else errors.push({ id: lead.repo, message: e.message });
        }
      }
    } catch (e) { errors.push({ id: `metadata-batch-${i}`, message: e.message }); }
  }
  const matched = [...metadata.values()].filter(({repo}) => leads.has(repo.full_name.toLowerCase()));
  // Most useful summaries first; popularity is deliberately only a tie breaker.
  matched.sort((a, b) => Number(needsFor(`${b.repo.description} ${(b.repo.topics || []).join(' ')}`).length > 0) - Number(needsFor(`${a.repo.description} ${(a.repo.topics || []).join(' ')}`).length > 0) || (b.repo.stargazers_count || 0) - (a.repo.stargazers_count || 0));
  const candidates = []; const seen = new Set();
  for (const { repo, source } of matched.slice(0, limit)) {
    if (seen.has(repo.id)) continue;
    seen.add(repo.id);
    let readme = null;
    if (!repo.archived && !repo.private && /^[\w.-]+\/[\w.-]+$/.test(repo.full_name) && repo.default_branch) {
      const branch = repo.default_branch.split('/').map(encodeURIComponent).join('/');
      for (const filename of ['README.md', 'readme.md', 'README.MD', 'README.rst']) {
        try {
          readme = await http(`https://raw.githubusercontent.com/${repo.full_name}/${branch}/${filename}`); break;
        } catch (e) {
          if (!e.message.includes('404')) { errors.push({ id: repo.full_name, message: e.message }); break; }
        }
      }
      if (!readme) {
        try {
          const res = await http(`https://api.github.com/repos/${repo.full_name}/readme`, { github: true });
          const body = JSON.parse(res.text);
          if (body.encoding !== 'base64' || typeof body.content !== 'string') throw new Error('Invalid README API response');
          readme = { text: Buffer.from(body.content, 'base64').toString('utf8'), url: res.url, fetchedAt: res.fetchedAt };
        } catch (e) {
          if (!/HTTP 404/.test(e.message)) errors.push({ id: repo.full_name, message: e.message });
          // A confirmed missing README is a review disposition, not a source outage.
          unresolvedRepos.push({ repo: repo.full_name, reason: 'README unavailable; held for review' });
        }
      }
    }
    const lead = leads.get(repo.full_name.toLowerCase());
    const row = makeCandidate(repo, readme, [...lead.sources, source], now);
    const previous = existingByUrl.get(row.canonicalUrl);
    row.existingCatalog = Boolean(previous);
    row.readmeChanged = previous?.import_metadata?.creatorCatalog?.readme?.sha256 && row.readme ? previous.import_metadata.creatorCatalog.readme.sha256 !== row.readme.sha256 : null;
    candidates.push(row);
    progress(`${candidates.length}/${Math.min(limit, matched.length)} ${row.name}: ${row.fit.lane} (${row.fit.score})`);
  }
  const run = { schemaVersion: 1, fitVersion: FIT_VERSION, generatedAt: new Date(now).toISOString(), mode: refreshExisting ? 'refresh-existing' : 'discovery',
    unresolvedRepos, status: candidates.length === 0 ? 'FAILED' : errors.length ? 'PARTIAL' : 'SUCCESS', sources, errors, discoveryCount: leads.size,
    deferredCount: Math.max(0, leads.size - candidates.length), candidates, shortlist: selectCreatorCandidates(candidates),
    rejectedSkippedCount: rejectedSkipped.size,
    rejectionSnapshot: rejectionSnapshot ? { count: rejectionSnapshot.count, fetchedAt: rejectionSnapshot.fetchedAt } : null,
    queueSelection: [], rankingVersion: RANKING_VERSION, databaseWritten: false, databaseResult: null, published: false, scheduled: process.env.WINDI_SCHEDULED === 'true' || process.argv.includes('--scheduled') };
  verifyCreatorRun(run);
  return run;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  if (process.argv.includes('--verify')) {
    const run = JSON.parse(await readFile(join(OUT, 'latest.json'), 'utf8')); verifyCreatorRun(run);
    console.log(`PASS: ${run.candidates.length} candidates, ${run.shortlist.length} priority reviews; no auto-publication.`); return;
  }
  let limit = 60;
  const arg = process.argv.find(a => a.startsWith('--limit='));
  if (arg) limit = Number(arg.split('=')[1]);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error('--limit must be an integer between 1 and 200');
  const lockPath = join(OUT, '.lock');
  const lock = await open(lockPath, 'wx', 0o600).catch(() => { throw new Error('Creator crawl already locked; inspect process before removing stale lock'); });
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    const database = await loadDiscoveryDatabaseState();
    const rejectionSnapshot = { count: database.rejectedIdentities.size, fetchedAt: database.fetchedAt };
    const run = await collectCreatorRun({ http: createHttp({ cacheDir: join(ROOT, '.cache/windi-ingestion'), fresh: process.argv.includes('--fresh') }), existing: database.resources, rejectedIdentities: database.rejectedIdentities, rejectionSnapshot, limit, refreshExisting: process.argv.includes('--refresh-existing'), progress: console.log });
    const ranked = rankDiscoveryCandidates(run.candidates, database);
    run.queueSelection = selectReviewBatch(ranked);
    run.databaseSnapshot = { resourceCount: database.resources.length, rejectedCount: database.rejectedIdentities.size, previousObservationCount: database.previousStars.size, fetchedAt: database.fetchedAt };
    let enqueueError = null;
    if (process.argv.includes('--enqueue')) {
      if (run.status !== 'SUCCESS') enqueueError = new Error('Incomplete crawl is not allowed to add review candidates');
      else {
        try {
          const payload = buildDiscoveryPayload(run, run.queueSelection);
          run.databaseResult = await enqueueDiscoveryRun(payload, { config: database.config });
          run.databaseWritten = true;
        } catch (error) { enqueueError = error; }
      }
    }
    verifyCreatorRun(run);
    const runDir = join(ROOT, 'data/ingestion/runs', `nontech-${run.generatedAt.replace(/[:.]/g, '-')}`);
    await mkdir(runDir, { recursive: true });
    await atomicJson(join(runDir, 'run.json'), run);
    await writeFile(join(runDir, 'REVIEW.md'), renderCreatorReport(run));
    // The latest attempt exposes failures; the last fully successful run remains available.
    await atomicJson(join(OUT, 'latest.json'), run);
    await writeFile(join(OUT, 'REVIEW.md'), renderCreatorReport(run));
    if (run.status === 'SUCCESS') await atomicJson(join(OUT, 'last-success.json'), run);
    console.log(JSON.stringify({ status: run.status, evaluated: run.candidates.length, priority: run.shortlist.length, selectedForReview: run.queueSelection.length, insertedForReview: run.databaseResult?.insertedCount || 0, rejectedSkipped: run.rejectedSkippedCount, deferred: run.deferredCount, errors: run.errors.length, report: join(OUT, 'REVIEW.md') }));
    if (enqueueError) throw enqueueError;
    if (run.status !== 'SUCCESS') process.exitCode = 1;
  } finally { await lock.close(); await unlink(lockPath); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exitCode = 1; });

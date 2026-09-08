import { mkdir, readFile, open, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCE_ORDER, atomicJson, createHttp, mergeCandidates, selectCandidates, safeUrl } from './ingestion/core.mjs';
import { discoverSource } from './ingestion/adapters.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const destination = join(root, 'data/catalog');
const catalogPath = join(destination, 'candidates.json');

export function verifyCatalog(catalog) {
  if (catalog.candidates?.length !== 200) throw new Error('Expected exactly 200 candidates');
  const keys = new Set();
  for (const row of catalog.candidates) {
    if (keys.has(row.identity)) throw new Error('Duplicate candidate identity');
    keys.add(row.identity);
    if (!safeUrl(row.canonicalUrl) || !row.sources?.length || row.status !== 'CANDIDATE' || row.windiScore !== null || row.editorialBadges.length) throw new Error('Invalid candidate/publication boundary');
    if (!row.sources.every(s => SOURCE_ORDER.includes(s.source) && safeUrl(s.sourceUrl) && safeUrl(s.listingUrl) && Number.isFinite(Date.parse(s.fetchedAt)))) throw new Error('Missing source provenance');
    if (!row.metrics.every(m => Number.isFinite(m.value) && m.value >= 0 && Number.isFinite(Date.parse(m.observedAt)))) throw new Error('Invalid metric evidence');
  }
  return true;
}

function markdown(catalog) {
  const escape = text => String(text).replace(/[|\[\]<>\n\r]/g, ' ').replace(/`/g, '');
  const lines = [
    '# WindiStudio — 200 ứng viên công cụ', '', `Thu thập: ${catalog.generatedAt}.`, '',
    'Đây là danh sách nghiên cứu, chưa phải danh mục đã duyệt. Tất cả ở trạng thái CANDIDATE; chưa thử cài đặt, kiểm toán bảo mật hoặc chấm Windi Score. Không tự xuất bản lên website.', '',
    'Thứ tự nguồn: Skills.sh → Awesome Agent Skills (VoltAgent) → Trendshift → Official MCP Registry → GitHub Search. Dùng Official MCP Registry cho nhánh Registry/Glama; chưa lấy Glama.', '',
    'Chọn theo thứ tự nguồn, tối đa 5 skills/publisher; MCP luân phiên theo 17 nhóm tìm kiếm (browser, database, search, memory, integrations…). Đây không phải bảng xếp hạng chất lượng. Không bao quát hết mỗi nguồn; editor cần lọc tiếp.', '',
    'Skills chỉ lấy source owner/repo; Awesome chỉ lấy link GitHub trực tiếp để tránh suy đoán canonical từ directory alias. Trendshift được đối chiếu repository public, giấy phép và tín hiệu liên quan AI/tooling qua GitHub. GitHub Search bỏ repo archived/fork, license chưa rõ và tên học liệu/danh sách phổ biến.', '',
    'Tên, URL và chỉ số có dấu thời gian đến từ nguồn; không sao chép mô tả hàng loạt. “Đã thấy ở nguồn” không có nghĩa đã kiểm tra từng link đích, license của mọi file, hoặc tool an toàn. Dedupe theo identity; alias/mirror chưa biết vẫn cần kiểm tra.', '',
  ];
  let index = 0;
  for (const source of SOURCE_ORDER) {
    const group = catalog.candidates.filter(r => r.source === source);
    lines.push(`## ${source} — ${group.length} mục`, '', '| # | Công cụ / liên kết | Loại | Nguồn kiểm chứng |', '|---|---|---|---|');
    for (const row of group) {
      const evidence = [...new Map(row.sources.map(s => [s.source, s])).values()];
      lines.push(`| ${++index} | [${escape(row.name)}](<${row.canonicalUrl}>) | ${row.type} | ${evidence.map(s => `[${s.source}](<${s.sourceUrl}>)`).join(', ')} |`);
    }
    lines.push('');
  }
  lines.push('## Giới hạn và bước duyệt', '', '- Xác nhận canonical/subpath, giấy phép, mức độ bảo trì và độ phù hợp với Windi.', '- Đọc hướng dẫn cài đặt ở nguồn, không thực thi trong crawler. Kiểm tra quyền, network, secret handling trong môi trường cô lập.', '- Viết nhận xét tiếng Việt có căn cứ; chấm riêng từng thành phần, lưu người duyệt và lý do.', '- Workflow/Stack phải được biên tập và thử nghiệm; không tự ghép thành công cụ giả để đủ 200.', '- `candidates.json` giữ provenance nhiều nguồn, metric snapshots, identity và metadata để nhập hàng đợi sau khi DB an toàn.', '');
  return lines.join('\n');
}

async function main() {
  if (process.argv.includes('--verify')) {
    verifyCatalog(JSON.parse(await readFile(catalogPath, 'utf8')));
    console.log('PASS: 200 unique candidates, provenance, metrics and no auto-publication.'); return;
  }
  await mkdir(destination, { recursive: true });
  const lockPath = join(destination, '.collection.lock');
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); }
  catch { throw new Error('Collector lock exists. Check running process before removing a stale lock.'); }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    const startedAt = new Date().toISOString();
    const http = createHttp({ cacheDir: join(root, '.cache/windi-ingestion'), fresh: process.argv.includes('--fresh') });
    const results = []; const rows = [];
    for (const source of SOURCE_ORDER) {
      try {
        const candidates = await discoverSource(source, http);
        rows.push(...candidates);
        results.push({ source, status: 'SUCCESS', count: candidates.length });
        console.log(`${source}: ${candidates.length} source listings`);
      } catch (error) {
        results.push({ source, status: 'FAILED', message: error.message });
        console.log(`${source}: FAILED (${error.message})`);
      }
    }
    const pool = mergeCandidates(rows);
    const candidates = selectCandidates(pool);
    const generatedAt = new Date().toISOString();
    const report = { startedAt, generatedAt, sources: results, rawCount: rows.length, uniqueCount: pool.length, selectedCount: candidates.length, countsByPrimarySource: Object.fromEntries(SOURCE_ORDER.map(s => [s, candidates.filter(c => c.source === s).length])), scheduled: process.env.WINDI_SCHEDULED === 'true', databaseWritten: false, published: false };
    const runDir = join(root, 'data/ingestion/runs', startedAt.replace(/[:.]/g, '-'));
    await mkdir(runDir, { recursive: true });
    await atomicJson(join(runDir, 'report.json'), report);
    await atomicJson(join(runDir, 'candidate-pool.json'), pool);
    // Never replace the last successful catalog when a source is unavailable or parsing drifts.
    if (results.some(s => s.status !== 'SUCCESS') || candidates.length !== 200) {
      throw new Error(`Incomplete collection; previous catalog preserved. See ${runDir}/report.json`);
    }
    const catalog = { schemaVersion: 1, generatedAt, ...report, candidates };
    verifyCatalog(catalog);
    await atomicJson(catalogPath, catalog);
    await atomicJson(join(destination, 'collection-report.json'), report);
    await writeFile(join(destination, 'CATALOG.md'), markdown(catalog));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await lock.close(); await unlink(lockPath);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

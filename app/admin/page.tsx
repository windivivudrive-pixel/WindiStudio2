import Link from 'next/link';
import { requireEditor } from '@/lib/editorial';
import { RetroBadge, RetroWindow } from '@/windi/ui/retro';
import { creatorBrief, normalizeSearch, popularityLabel, purposeCategories, purposeLabel, validPurpose } from '@/lib/creator-catalog';
import { PublishFromQueue } from './publish-from-queue';

export const metadata = { title: 'Duyệt công cụ · Windi', robots: { index: false, follow: false } };

const states = ['ALL', 'CANDIDATE', 'REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const;
const stateLabels: Record<(typeof states)[number], string> = {
  ALL: 'Tất cả trạng thái', CANDIDATE: 'Chờ duyệt', REVIEW: 'Đang xem',
  PUBLISHED: 'Đã public', REJECTED: 'Không dùng', ARCHIVED: 'Lưu trữ',
};
const notices: Record<string, string> = {
  published: 'Đã public. Công cụ sẽ xuất hiện trong danh mục công khai.',
  rejected: 'Đã từ chối công cụ. Hồ sơ đã chuyển sang mục Không dùng và không hiện ở hàng chờ nữa.',
  changed: 'Hồ sơ vừa được sửa ở phiên khác. Danh sách đã tải lại.',
  save_error: 'Chưa lưu được. Tải lại danh sách rồi thử lại.',
  invalid: 'Không nhận diện được hồ sơ cần duyệt.', not_found: 'Không tìm thấy hồ sơ này trong danh mục.',
  forbidden: 'Tài khoản này không có quyền xuất bản.',
};
type AdminParams = { status?: string; q?: string; page?: string; purpose?: string; collection?: string; sort?: string; badge?: string; notice?: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<AdminParams> }) {
  const { client, allowed } = await requireEditor();
  if (!allowed) return <div className="page narrow-page"><h1>Tài khoản chưa có quyền biên tập</h1><p>Trang này chỉ dành cho tài khoản được quản trị viên cấp quyền.</p><Link className="retro-button" href="/login?next=/admin">Đăng nhập bằng tài khoản khác</Link></div>;

  const params = await searchParams;
  const status = states.includes(params.status as (typeof states)[number]) ? params.status as (typeof states)[number] : 'CANDIDATE';
  const query = (params.q || '').trim().slice(0, 120);
  const page = Math.max(1, Math.min(1000, Number.parseInt(params.page || '1') || 1));
  const purpose = validPurpose(params.purpose) ? params.purpose : '';
  const collection = params.collection === 'all' ? 'all' : 'creator100';
  const badge = params.badge === 'hot' || params.badge === 'trending' ? params.badge : '';
  const sort = params.sort === 'stars' ? 'stars' : 'priority';
  const [{ data: all, error }, { data: easyPrompts, error: easyPromptError }] = await Promise.all([
    client.from('resources').select('id,name,type,status,slug,tagline,description,owner_name,import_metadata,editorial_revision').order('id').limit(1000),
    client.from('resource_easy_prompts').select('resource_id,status').limit(1000),
  ]);
  if (error) {
    console.error('AdminPage resources query error:', error);
    throw new Error(`Không tải được danh sách chờ duyệt: ${error.message}`);
  }
  if (easyPromptError) {
    console.warn('AdminPage easy prompts query warning:', easyPromptError);
  }
  const easyPromptByResource = new Map((easyPrompts || []).map(row => [row.resource_id, row.status]));

  const scoped = (all || []).map(row => ({ ...row, brief: creatorBrief(row.import_metadata), easyPromptStatus: easyPromptByResource.get(row.id) || 'PENDING' })).filter(row => collection === 'all' || row.brief?.selected || (Boolean((row.import_metadata as { autoDiscovery?: unknown } | null)?.autoDiscovery) && ['CANDIDATE', 'REVIEW'].includes(row.status)));
  const hotIds = new Set(scoped.filter(row => row.brief).sort((a, b) => (b.brief?.github.stars || 0) - (a.brief?.github.stars || 0)).slice(0, 20).map(row => row.id));
  const trendingIds = new Set(scoped.filter(row => row.brief?.trending).map(row => row.id));
  const filtered = scoped.filter(row => (status === 'ALL' || row.status === status) && (!purpose || row.brief?.categories.includes(purpose)) && (!badge || (badge === 'hot' ? hotIds.has(row.id) : trendingIds.has(row.id))) && normalizeSearch([row.name, row.tagline, row.description, ...(row.brief?.categories.map(purposeLabel) || [])].join(' ')).includes(normalizeSearch(query)));
  filtered.sort((a, b) => sort === 'stars' ? (b.brief?.github.stars || 0) - (a.brief?.github.stars || 0) : (a.brief?.rank || 9999) - (b.brief?.rank || 9999) || a.name.localeCompare(b.name));
  const count = filtered.length;
  const data = filtered.slice((page - 1) * 25, page * 25);
  const href = (nextStatus: string, nextPage = 1, nextBadge: string | undefined = badge) => `/admin?status=${nextStatus}&q=${encodeURIComponent(query)}&page=${nextPage}&purpose=${purpose}&collection=${collection}&sort=${sort}${nextBadge ? `&badge=${nextBadge}` : ''}`;
  const returnTo = href(status, page);

  return <div className="page">
    <header className="page-intro"><span className="eyebrow">EDITOR DESK · CREATOR FIRST</span><h1>Thấy hữu ích? Public ngay.</h1><p>{scoped.length} công cụ trong bộ đang xem. Bạn chỉ cần quyết định repo có đáng đưa cho người mới hay không; lịch sử duyệt được ghi tự động.</p></header>
    {params.notice && <p className={`editor-notice ${params.notice === 'published' || params.notice === 'rejected' ? 'is-success' : ''}`} role="status">{notices[params.notice] || 'Danh sách đã được cập nhật.'}</p>}
    <div className="filter-row">{states.map(item => <Link className={status === item && !badge ? 'is-active' : ''} key={item} href={href(item)}>{stateLabels[item]} · {item === 'ALL' ? scoped.length : scoped.filter(row => row.status === item).length}</Link>)}</div>
    <div className="filter-row badge-filter" aria-label="Lọc theo tín hiệu GitHub"><span>TÍN HIỆU</span><Link className={badge === 'hot' ? 'is-active' : ''} href={href(status, 1, 'hot')}>HOT · {hotIds.size}</Link><Link className={badge === 'trending' ? 'is-active' : ''} href={href(status, 1, 'trending')}>TRENDING · {trendingIds.size}</Link>{badge && <Link href={href(status, 1, '')}>Xóa tín hiệu</Link>}<small className="signal-note">HOT = 20 hồ sơ nhiều sao nhất trong bộ; TRENDING chỉ hiện khi có thứ hạng được đối chiếu.</small></div>
    <form className="editor-search creator-filters" action="/admin"><input type="hidden" name="status" value={status} /><input type="hidden" name="badge" value={badge} /><label>Tìm nội dung<input name="q" defaultValue={query} placeholder="Ví dụ: phụ đề, newsletter…" /></label><label>Mục đích<select name="purpose" defaultValue={purpose}><option value="">Mọi mục đích</option>{purposeCategories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label><label>Bộ sưu tập<select name="collection" defaultValue={collection}><option value="creator100">100 repo cho creator</option><option value="all">Toàn bộ, kể cả lưu trữ</option></select></label><label>Sắp xếp<select name="sort" defaultValue={sort}><option value="priority">Thứ tự biên tập</option><option value="stars">Nhiều sao GitHub</option></select></label><button className="retro-button">Lọc</button></form>
    <RetroWindow title="HỒ SƠ CHỜ DUYỆT" accent="yellow"><div className="editor-queue">{data.map(row => <article className="editor-row" key={row.id}><Link href={`/admin/resources/${row.id}`} className="editor-row-copy" aria-label={`Mở hồ sơ ${row.name}`}><strong>{row.name}</strong><p>{row.tagline || row.owner_name || 'Chưa có mô tả'}</p>{row.brief && <><div className="editor-signals"><span className="creator-purpose">{row.brief.categories.map(purposeLabel).join(' · ')}</span>{hotIds.has(row.id) && <RetroBadge accent="orange">HOT</RetroBadge>}{row.brief.trending && <RetroBadge accent="pink">TRENDING #{row.brief.trending.rank}</RetroBadge>}</div><p className="editor-popularity">{popularityLabel(row.brief)} · Kiểm tra {new Date(row.brief.github.observedAt).toLocaleDateString('vi-VN')}</p><p>{row.description}</p></>}</Link><aside className="editor-row-actions" aria-label={`Thao tác với ${row.name}`}><span className={`editor-status editor-status-${row.status.toLowerCase()}`}>{stateLabels[row.status as keyof typeof stateLabels] || row.status}</span><span className={`easy-prompt-status easy-prompt-status-${row.easyPromptStatus.toLowerCase()}`}>{row.easyPromptStatus === 'GENERATED' ? 'Easy Prompt sẵn sàng' : row.easyPromptStatus === 'STALE' ? 'Easy Prompt cần tạo lại' : row.easyPromptStatus === 'FAILED' ? 'Easy Prompt lỗi' : 'Easy Prompt đang chuẩn bị'}</span>{(row.status === 'CANDIDATE' || row.status === 'REVIEW') && <PublishFromQueue id={row.id} revision={row.editorial_revision} returnTo={returnTo} />}<Link className="editor-open-link" href={`/admin/resources/${row.id}`}>Mở hồ sơ</Link></aside></article>)}{!data.length && <p>Không có công cụ ở bộ lọc này.</p>}</div></RetroWindow>
    <nav aria-label="Phân trang" className="detail-actions">{page > 1 && <Link className="retro-button" href={href(status, page - 1)}>Trang trước</Link>}<span>Trang {page} · {count} kết quả</span>{page * 25 < count && <Link className="retro-button" href={href(status, page + 1)}>Trang sau</Link>}</nav>
  </div>;
}

import {purposeCategories,type CreatorBrief} from './creator-catalog';
export type ResourceType = 'SKILL' | 'MCP' | 'OPEN_SOURCE' | 'WORKFLOW' | 'STACK';
export type ResourceStatus = 'CANDIDATE' | 'REVIEW' | 'PUBLISHED' | 'REJECTED' | 'DEPRECATED' | 'ARCHIVED';

export interface ScoreBreakdown {
  utility: number;      // Tính thực dụng & hiệu quả (0 - 50)
  setup: number;        // Cài đặt dễ dàng (0 - 10)
  originality: number;  // Độc đáo & sáng tạo (0 - 20)
  adoption: number;     // Mức độ đón nhận (0 - 20)
  maintenance?: number;
  security?: number;
  documentation?: number;
  compatibility?: number;
}

export interface WindiResource {
  id?: string;
  slug: string;
  type: ResourceType;
  name: string;
  tagline: string;
  description: string;
  longDescription?: string;
  whyWindiRecommends?: string;
  installCommand?: string;
  categoryGroup?: 'DESIGN' | 'CODING' | 'RESEARCH' | 'CONTENT' | 'AUTOMATION';
  stackTools?: Array<{ name: string; role: string; type: ResourceType; slug?: string }>;
  purposes?: string[];
  creatorBrief?: CreatorBrief | null;
  canonicalUrl: string;
  repositoryUrl?: string;
  source: string;
  tags: string[];
  agents: string[];
  score: ScoreBreakdown | null;
  metricLabel: string;
  updatedLabel: string;
  badges: Array<'EDITOR' | 'OFFICIAL' | 'RISING' | 'SECURITY' | 'HOT'>;
  status: ResourceStatus;
}

export const resourceTypes: Array<{ type: ResourceType; label: string; href: string }> = [
  { type: 'SKILL', label: 'Skills', href: '/skills' },
  { type: 'MCP', label: 'MCP', href: '/mcp' },
  { type: 'OPEN_SOURCE', label: 'Open Source', href: '/open-source' },
  { type: 'WORKFLOW', label: 'Workflows', href: '/workflows' },
  { type: 'STACK', label: 'Stacks', href: '/stacks' },
];

export const resources: WindiResource[] = [
  {
    slug: 'ui-ux-pro-max',
    type: 'SKILL',
    name: 'UI UX Pro Max',
    tagline: 'Design intelligence & reasoning rules cho coding agents.',
    description: 'Skill giúp Codex, Claude và Cursor thiết kế UI chuyên nghiệp với 79 phong cách, 192 bảng màu theo từng ngành và checklist kiểm tra UX/accessibility tự động.',
    whyWindiRecommends: 'Cung cấp cho AI một bộ tiêu chuẩn thiết kế có căn cứ (contrast, responsive, typography) thay vì để AI sinh ra các giao diện generic, màu tím neon nhàm chán.',
    installCommand: 'npx skills add nextlevelbuilder/ui-ux-pro-max-skill',
    categoryGroup: 'DESIGN',
    canonicalUrl: 'https://github.com/nextlevelbuilder/ui-ux-pro-max-skill',
    source: 'GitHub',
    tags: ['Design', 'UI/UX', 'Frontend', 'Tailwind'],
    agents: ['Codex', 'Claude', 'Cursor'],
    score: { utility: 48, setup: 10, originality: 19, adoption: 19 },
    metricLabel: '★ 24.8K',
    updatedLabel: 'Cập nhật hôm nay',
    badges: ['HOT', 'EDITOR', 'RISING'],
    status: 'PUBLISHED',
  },
  {
    slug: 'frontend-design-skill',
    type: 'SKILL',
    name: 'Frontend Design Skill',
    tagline: 'Bổ sung visual quality, micro-interactions và spacing nhịp nhàng.',
    description: 'Bộ quy chuẩn frontend chi tiết giúp agent căn lề, điều chỉnh nhịp mắt, font scale và animation CSS mượt mà theo chuẩn web hiện đại.',
    whyWindiRecommends: 'Giải quyết triệt để lỗi visual alignment thô ráp mà các coding model thường gặp khi chỉ sinh code logic.',
    installCommand: 'npx skills add frontend-design',
    categoryGroup: 'DESIGN',
    canonicalUrl: 'https://github.com/topics/frontend-design',
    source: 'Community',
    tags: ['CSS', 'Design', 'Animation'],
    agents: ['Codex', 'Cursor'],
    score: { utility: 44, setup: 9, originality: 17, adoption: 17 },
    metricLabel: '★ 11.2K',
    updatedLabel: 'Cập nhật tuần này',
    badges: ['EDITOR'],
    status: 'PUBLISHED',
  },
  {
    slug: 'playwright-mcp',
    type: 'MCP',
    name: 'Playwright MCP',
    tagline: 'Browser automation có ngữ cảnh và khả năng tự kiểm chứng UI.',
    description: 'MCP server chính thức cho phép AI agent mở browser, chụp ảnh màn hình, tương tác form và xác minh kết quả hiển thị thực tế.',
    whyWindiRecommends: 'Công cụ quan trọng nhất để đóng vòng lặp phát triển web: Agent tự code, tự mở browser xem trang và tự sửa lỗi UI trước khi bàn giao.',
    installCommand: 'npx -y @modelcontextprotocol/server-playwright',
    categoryGroup: 'CODING',
    canonicalUrl: 'https://github.com/microsoft/playwright-mcp',
    source: 'Microsoft',
    tags: ['Browser', 'Testing', 'Automation', 'QA'],
    agents: ['Codex', 'Claude', 'Cursor'],
    score: { utility: 49, setup: 9, originality: 18, adoption: 19 },
    metricLabel: '★ 28.1K',
    updatedLabel: 'Cập nhật hôm nay',
    badges: ['HOT', 'EDITOR', 'OFFICIAL'],
    status: 'PUBLISHED',
  },
  {
    slug: 'context7-mcp',
    type: 'MCP',
    name: 'Context7 MCP',
    tagline: 'Trích xuất context tài liệu thư viện mới nhất theo thời gian thực.',
    description: 'Cho phép coding agent tra cứu chính xác API docs và version changelog mới nhất mà không bị ảo giác dữ liệu cũ.',
    whyWindiRecommends: 'Giúp agent không dùng các hàm deprecated của Next.js, Tailwind v4 hay React 19.',
    installCommand: 'npx -y @upstash/context7-mcp',
    categoryGroup: 'CODING',
    canonicalUrl: 'https://github.com/upstash/context7',
    source: 'Upstash',
    tags: ['Docs', 'Context', 'Developer'],
    agents: ['Codex', 'Claude'],
    score: { utility: 46, setup: 9, originality: 18, adoption: 17 },
    metricLabel: '★ 8.9K',
    updatedLabel: 'Cập nhật 2 ngày trước',
    badges: ['RISING'],
    status: 'PUBLISHED',
  },
  {
    slug: 'supabase-mcp',
    type: 'MCP',
    name: 'Supabase MCP',
    tagline: 'Quản lý schema, migration, RLS policy và SQL queries cho agent.',
    description: 'Kết nối an toàn giữa AI agent và database Supabase, hỗ trợ generate typescript types, apply migrations và quản lý auth.',
    whyWindiRecommends: 'Biến agent thành fullstack engineer thực thụ, xử lý backend và database migrations hoàn toàn tự động.',
    installCommand: 'npx -y @supabase/mcp-server',
    categoryGroup: 'CODING',
    canonicalUrl: 'https://github.com/supabase/supabase-mcp',
    source: 'Supabase',
    tags: ['Database', 'Postgres', 'Backend'],
    agents: ['Codex', 'Claude', 'Cursor'],
    score: { utility: 48, setup: 8, originality: 19, adoption: 19 },
    metricLabel: '★ 16.5K',
    updatedLabel: 'Cập nhật hôm qua',
    badges: ['OFFICIAL', 'EDITOR'],
    status: 'PUBLISHED',
  },
  {
    slug: 'browser-qa-workflow',
    type: 'WORKFLOW',
    name: 'Browser QA Workflow',
    tagline: 'Quy trình kiểm tra visual regression, broken links và console errors.',
    description: 'Workflow tự động hóa việc rà soát giao diện web trên nhiều viewport (Mobile, Tablet, Desktop) và xuất báo cáo lỗi chi tiết.',
    whyWindiRecommends: 'Đảm bảo sản phẩm cuối cùng không bị bể giao diện trên màn hình nhỏ hoặc phát sinh lỗi JavaScript ngầm.',
    installCommand: 'windi workflow add browser-qa',
    categoryGroup: 'AUTOMATION',
    canonicalUrl: 'https://windistudio.app/workflows/browser-qa',
    source: 'Windi Editorial',
    tags: ['QA', 'Testing', 'Workflow'],
    agents: ['Codex', 'Claude'],
    score: { utility: 43, setup: 9, originality: 17, adoption: 16 },
    metricLabel: '★ 5.4K',
    updatedLabel: 'Đánh giá tuần này',
    badges: ['EDITOR'],
    status: 'PUBLISHED',
  },
  {
    slug: 'deep-research-skill',
    type: 'SKILL',
    name: 'Deep Research Skill',
    tagline: 'Duyệt web đa tầng, chắt lọc dữ liệu và đối chiếu nguồn độc lập.',
    description: 'Trang bị cho AI năng lực nghiên cứu sâu, phân tích báo cáo kỹ thuật và tổng hợp tài liệu chuyên sâu không bias.',
    whyWindiRecommends: 'Thay vì chỉ tìm kiếm bề nổi Google, skill này đào sâu các tài liệu PDF, GitHub và whitepapers khoa học.',
    installCommand: 'npx skills add deep-research',
    categoryGroup: 'RESEARCH',
    canonicalUrl: 'https://github.com/topics/deep-research',
    source: 'Community',
    tags: ['Research', 'Search', 'Analysis'],
    agents: ['Claude', 'Codex'],
    score: { utility: 47, setup: 9, originality: 19, adoption: 18 },
    metricLabel: '★ 18.2K',
    updatedLabel: 'Cập nhật 3 ngày trước',
    badges: ['EDITOR'],
    status: 'PUBLISHED',
  },
  {
    slug: 'seo-audit-skill',
    type: 'SKILL',
    name: 'SEO & Technical Content Skill',
    tagline: 'Tối ưu metadata, cấu trúc heading, schema JSON-LD và nội dung tìm kiếm.',
    description: 'Hướng dẫn agent viết bài và xây dựng landing page đáp ứng tiêu chí SEO kỹ thuật cao nhất của Google Search.',
    whyWindiRecommends: 'Tạo nội dung có cấu trúc rõ ràng, đúng intent người dùng và dễ xếp hạng organic search.',
    installCommand: 'npx skills add seo-audit',
    categoryGroup: 'CONTENT',
    canonicalUrl: 'https://github.com/topics/seo',
    source: 'Community',
    tags: ['SEO', 'Content', 'Writing'],
    agents: ['Codex', 'Claude'],
    score: { utility: 44, setup: 9, originality: 17, adoption: 17 },
    metricLabel: '★ 14.3K',
    updatedLabel: 'Cập nhật 4 ngày trước',
    badges: ['RISING'],
    status: 'PUBLISHED',
  },
  {
    slug: 'remotion-best-practices',
    type: 'SKILL',
    name: 'Remotion Best Practices',
    tagline: 'Thiết kế video bằng code, có cấu trúc và đúng nhịp.',
    description: 'Bộ hướng dẫn dành cho creator muốn tạo video programmatic với Remotion mà không hy sinh nhịp kể chuyện.',
    whyWindiRecommends: 'Biến AI thành editor video tự động bằng code React, tạo hàng loạt clip ngắn chất lượng cao.',
    installCommand: 'npx skills add remotion-best-practices',
    categoryGroup: 'CONTENT',
    canonicalUrl: 'https://www.remotion.dev/',
    source: 'GitHub',
    tags: ['Video', 'TypeScript', 'Creator'],
    agents: ['Codex', 'Claude Code'],
    score: { utility: 46, setup: 8, originality: 19, adoption: 18 },
    metricLabel: '★ 12.4K',
    updatedLabel: 'Cập nhật 3 ngày trước',
    badges: ['EDITOR', 'OFFICIAL'],
    status: 'PUBLISHED',
  },
  {
    slug: 'openai-agents-sdk',
    type: 'OPEN_SOURCE',
    name: 'OpenAI Agents SDK',
    tagline: 'Nền tảng để điều phối agent theo các bước có thể quan sát.',
    description: 'SDK mã nguồn mở cho agent orchestration, tools, handoff và tracing trong các ứng dụng AI thực tế.',
    whyWindiRecommends: 'Kiến trúc gọn nhẹ, chuẩn hóa luồng giao việc giữa nhiều agent con.',
    installCommand: 'pip install openai-agents',
    categoryGroup: 'CODING',
    canonicalUrl: 'https://github.com/openai/openai-agents-python',
    source: 'GitHub',
    tags: ['Agents', 'Python', 'Orchestration'],
    agents: ['OpenAI', 'Codex'],
    score: { utility: 45, setup: 8, originality: 18, adoption: 18 },
    metricLabel: '★ 9.6K',
    updatedLabel: 'Cập nhật 1 ngày trước',
    badges: ['OFFICIAL', 'SECURITY'],
    status: 'PUBLISHED',
  },
  {
    slug: 'skills-sh',
    type: 'OPEN_SOURCE',
    name: 'skills.sh',
    tagline: 'Khám phá agent skills qua tín hiệu cộng đồng.',
    description: 'Nền tảng tham khảo giúp đội ngũ tìm và đánh giá skill phù hợp trước khi đưa vào workflow.',
    whyWindiRecommends: 'Hệ sinh thái chia sẻ skill công khai đáng tin cậy.',
    installCommand: 'npx skills-cli list',
    categoryGroup: 'RESEARCH',
    canonicalUrl: 'https://skills.sh/',
    source: 'skills.sh',
    tags: ['Skills', 'Directory', 'Discovery'],
    agents: ['Codex', 'Claude Code', 'Cursor'],
    score: { utility: 42, setup: 10, originality: 17, adoption: 17 },
    metricLabel: '★ 15.1K',
    updatedLabel: 'Cập nhật tuần này',
    badges: ['RISING'],
    status: 'PUBLISHED',
  },
  // --- CURATED STACKS ---
  {
    slug: 'ai-designer-stack',
    type: 'STACK',
    name: 'AI Designer Stack',
    tagline: 'Bộ công cụ toàn diện biến coding agent thành Senior Product Designer.',
    description: 'Kết hợp UI UX Pro Max, Frontend Design, Playwright MCP và Browser QA Workflow để tạo ra website chuẩn chỉ từ bản vẽ đến code chạy thực tế.',
    whyWindiRecommends: 'Muốn AI dựng landing page đẹp, chuẩn responsive và tự kiểm tra lỗi hiển thị thì phối hợp 4 công cụ này là tối ưu nhất.',
    categoryGroup: 'DESIGN',
    canonicalUrl: 'https://windistudio.app/stack/ai-designer-stack',
    source: 'Windi Editorial',
    tags: ['Design', 'Frontend', 'Testing', 'Full-Setup'],
    agents: ['Codex', 'Claude', 'Cursor'],
    stackTools: [
      { name: 'UI UX Pro Max', role: 'Skill chính định hình phong cách & UX rules', type: 'SKILL', slug: 'ui-ux-pro-max' },
      { name: 'Frontend Design Skill', role: 'Bổ sung visual alignment & micro-spacing', type: 'SKILL', slug: 'frontend-design-skill' },
      { name: 'Playwright MCP', role: 'Mở browser thật để agent tự kiểm chứng UI', type: 'MCP', slug: 'playwright-mcp' },
      { name: 'Browser QA Workflow', role: 'Rà soát visual regression đa thiết bị', type: 'WORKFLOW', slug: 'browser-qa-workflow' },
    ],
    score: { utility: 49, setup: 9, originality: 19, adoption: 18 },
    metricLabel: '1.8K saves',
    updatedLabel: 'Cập nhật tuần này',
    badges: ['EDITOR', 'OFFICIAL'],
    status: 'PUBLISHED',
  },
  {
    slug: 'codex-power-user-stack',
    type: 'STACK',
    name: 'Codex Power User Stack',
    tagline: 'Hệ thống fullstack tối thượng: Docs cập nhật, Database & Browser QA.',
    description: 'Stack do Windi tuyển chọn cho người dùng Codex chuyên nghiệp: Context7 tra cứu API mới, Supabase xử lý database và Playwright xác thực code.',
    whyWindiRecommends: 'Muốn làm app Next.js fullstack với Codex mà không bị lỗi thư viện cũ hay sai sót backend, đây là bộ đồ nghề chuẩn mực.',
    categoryGroup: 'CODING',
    canonicalUrl: 'https://windistudio.app/stack/codex-power-user-stack',
    source: 'Windi Editorial',
    tags: ['Codex', 'Developer', 'Fullstack', 'Database'],
    agents: ['Codex'],
    stackTools: [
      { name: 'Context7 MCP', role: 'Trích xuất docs Next.js & Tailwind mới nhất', type: 'MCP', slug: 'context7-mcp' },
      { name: 'Supabase MCP', role: 'Tự động sinh schema, types và migrations', type: 'MCP', slug: 'supabase-mcp' },
      { name: 'Playwright MCP', role: 'Chạy automated e2e test trên trình duyệt', type: 'MCP', slug: 'playwright-mcp' },
      { name: 'UI UX Pro Max', role: 'Đảm bảo giao diện chuẩn accessibility', type: 'SKILL', slug: 'ui-ux-pro-max' },
    ],
    score: { utility: 49, setup: 9, originality: 19, adoption: 19 },
    metricLabel: '2.4K saves',
    updatedLabel: 'Cập nhật hôm nay',
    badges: ['EDITOR'],
    status: 'PUBLISHED',
  },
  {
    slug: 'seo-agent-stack',
    type: 'STACK',
    name: 'SEO & Content Agent Stack',
    tagline: 'Nghiên cứu từ khóa, kiểm tra đối thủ và sáng tạo bài viết chuẩn SEO.',
    description: 'Kết hợp Deep Research Skill với SEO Technical Skill để xây dựng cỗ máy sáng tạo nội dung tự động có dẫn chứng và dữ liệu xác thực.',
    whyWindiRecommends: 'Muốn làm SEO với Claude hoặc Codex thì dùng 4 công cụ này cùng nhau để bài viết vừa sâu sắc vừa đạt thứ hạng cao.',
    categoryGroup: 'CONTENT',
    canonicalUrl: 'https://windistudio.app/stack/seo-agent-stack',
    source: 'Windi Editorial',
    tags: ['SEO', 'Content', 'Research', 'Marketing'],
    agents: ['Claude', 'Codex'],
    stackTools: [
      { name: 'Deep Research Skill', role: 'Thu thập tài liệu và nghiên cứu đề tài', type: 'SKILL', slug: 'deep-research-skill' },
      { name: 'SEO & Technical Content Skill', role: 'Tối ưu on-page, heading và schema', type: 'SKILL', slug: 'seo-audit-skill' },
      { name: 'Playwright MCP', role: 'Thu thập kết quả Google Search thực tế', type: 'MCP', slug: 'playwright-mcp' },
    ],
    score: { utility: 46, setup: 9, originality: 18, adoption: 18 },
    metricLabel: '1.5K saves',
    updatedLabel: 'Cập nhật 2 ngày trước',
    badges: ['EDITOR', 'RISING'],
    status: 'PUBLISHED',
  },
];

export const categories = purposeCategories;

export const stacks = resources.filter((item) => item.type === 'STACK');

export function getResource(slug: string) {
  return resources.find((item) => item.slug === slug);
}

export function findResources(query = '', type?: string) {
  const normalized = query.trim().toLocaleLowerCase('vi');
  return resources.filter((item) => {
    const inType = !type || item.type === type;
    const haystack = [item.name, item.tagline, item.description, ...item.tags, ...item.agents].join(' ').toLocaleLowerCase('vi');
    return inType && (!normalized || haystack.includes(normalized));
  });
}

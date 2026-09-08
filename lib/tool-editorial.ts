import type { WindiResource } from './windi-data';

// Compose from the reviewed dossier; never invent popularity or promised results.
export function toolIntroduction(resource: WindiResource) {
  const brief = resource.creatorBrief;
  return {
    hook: brief?.hook || resource.tagline,
    summary: resource.description,
    features: brief?.highlights || [],
    example: brief?.example || '',
    setup: brief?.setup || '',
    limitations: brief?.limitations || '',
    detail: !brief ? resource.longDescription || '' : '',
  };
}

export function facebookPost(resource: WindiResource, origin: string) {
  const intro = toolIntroduction(resource);
  const topics: Record<string,string> = {social:'SocialMedia',content:'SangTaoNoiDung',video:'LamVideo',audio:'GiongNoiAI',image:'ThietKeAnh',seo:'SEO',design:'ThietKe',research:'NghienCuu',automation:'TuDongHoa',tech:'CongCuAI'};
  const hashtags = [...new Set(['WindiStudio','CongCuAI',...(resource.purposes || []).slice(0,2).map(p=>topics[p]).filter(Boolean)])];
  const url = new URL(`/tool/${encodeURIComponent(resource.slug)}`,origin);
  url.searchParams.set('utm_source','facebook');
  url.searchParams.set('utm_medium','social');
  url.searchParams.set('utm_campaign','tool_intro');
  return [intro.hook, `${resource.name}\n${intro.summary}`,
    intro.features.length ? `Điểm nổi bật:\n${intro.features.map(f=>`• ${f}`).join('\n')}` : intro.detail,
    intro.example ? `Thử ngay với công việc của bạn:\n${intro.example}` : '',
    intro.setup ? `Bắt đầu thế nào?\n${intro.setup}` : '',
    intro.limitations ? `Cần biết: ${intro.limitations}` : '',
    `Xem hướng dẫn và copy Easy Prompt để bắt đầu trên WindiStudio 👇\n${url}`,
    hashtags.map(t=>`#${t}`).join(' '),
  ].filter(Boolean).join('\n\n');
}

export function simpleToolPrompt(resource: WindiResource, english = false) {
  const brief = resource.creatorBrief;
  const officialUrl = resource.canonicalUrl || resource.repositoryUrl || 'https://windistudio.app';
  if (english) {
    return `${officialUrl}
Read the instructions from the official README of this repository and accomplish the task for me:

1. High quality output: Produce one focused, professional deliverable based on the documented features.
2. Factual fidelity: Preserve 100% of my original facts, metrics, and core intent without inventing details.
3. Easy workflow: Explain the simple steps to review and reproduce the result whenever needed.
4. Data privacy: Keep all provided information confidential and secret; do not share externally.

My project input:
[Paste your project brief, source text, or inputs here]`;
  }
  return `${officialUrl}
Hãy đọc kỹ hướng dẫn từ README của repo trên và giúp tôi thực hiện nhiệm vụ: ${brief?.example || resource.description}

1. Thực hiện đúng mục tiêu: Tạo ra kết quả mẫu hoàn chỉnh, bám sát các tính năng chuẩn từ tài liệu chính chủ.
2. Tối ưu câu từ & trải nghiệm: Trình bày tự nhiên, ngắn gọn, dễ hiểu và không dùng thuật ngữ kỹ thuật phức tạp.
3. Bảo toàn thông điệp: Giữ nguyên vẹn số liệu, tên riêng và các nội dung quan trọng của tôi.
4. Bảo mật dữ liệu: Giữ bí mật và an toàn cho toàn bộ thông tin tôi cung cấp, không chia sẻ ra bên ngoài.

Dữ liệu đầu vào của tôi:
[Dán nội dung, kịch bản hoặc yêu cầu của bạn vào đây]`.trim();
}


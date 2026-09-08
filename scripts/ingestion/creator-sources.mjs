// Source lists provide discovery leads only; repository README and metadata decide fit.
export const CREATOR_SOURCES = [
  { id: 'awesome-selfhosted', name: 'Awesome Selfhosted', url: 'https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted/master/README.md', homepage: 'https://github.com/awesome-selfhosted/awesome-selfhosted', note: 'Ứng dụng web cho tài liệu, nội dung, ảnh và tự động hóa; tự host không đồng nghĩa dễ cài.' },
  { id: 'awesome-mac', name: 'Awesome Mac', url: 'https://raw.githubusercontent.com/jaywcjlove/awesome-mac/master/README.md', homepage: 'https://github.com/jaywcjlove/awesome-mac', note: 'Ứng dụng có giao diện; phải ghi rõ giới hạn macOS và kiểm tra Windows riêng.' },
  { id: 'awesome-generative-ai', name: 'Awesome Generative AI', url: 'https://raw.githubusercontent.com/steven2358/awesome-generative-ai/main/README.md', homepage: 'https://github.com/steven2358/awesome-generative-ai', note: 'Nhánh ảnh, video, âm thanh; chỉ lấy liên kết repo trực tiếp. Lọc lại research, framework và yêu cầu GPU.' },
];
export const SEARCH_LANES = [
  { id: 'video', query: 'video editor', label: 'Dựng và xử lý video' },
  { id: 'audio', query: 'transcription GUI', label: 'Phụ đề và ghi âm thành chữ' },
  { id: 'image', query: 'image AI desktop', label: 'Ảnh và thiết kế' },
  { id: 'office', query: 'PDF document', label: 'Tài liệu và công việc hằng ngày' },
  { id: 'content', query: 'social media scheduling', label: 'Nội dung và mạng xã hội' },
  { id: 'automation', query: 'no-code automation', label: 'Tự động hóa có giao diện' },
];

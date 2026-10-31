import type { Metadata } from 'next';

export const VOICE_STUDIO_URL = 'https://windistudio.app/';
export const VOICE_STUDIO_TITLE = 'Clone giọng & Voice AI giàu cảm xúc | WindiStudio';
export const VOICE_STUDIO_DESCRIPTION = 'Clone giọng nói, tạo giọng AI tiếng Việt giàu cảm xúc với WindiStudio. Chuyển văn bản thành giọng nói cho video, podcast, kể chuyện. Nghe mẫu và trải nghiệm ngay.';

export const voiceStudioMetadata: Metadata = {
  title: { absolute: VOICE_STUDIO_TITLE },
  description: VOICE_STUDIO_DESCRIPTION,
  alternates: { canonical: VOICE_STUDIO_URL },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'WindiStudio',
    url: VOICE_STUDIO_URL,
    title: VOICE_STUDIO_TITLE,
    description: VOICE_STUDIO_DESCRIPTION,
    images: [{
      url: '/voice-studio-og.png',
      width: 1200,
      height: 630,
      alt: 'WindiStudio Voice Studio — Clone giọng, tạo voice AI giàu cảm xúc',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: VOICE_STUDIO_TITLE,
    description: VOICE_STUDIO_DESCRIPTION,
    images: [{ url: '/voice-studio-og.png', alt: 'Clone giọng, tạo voice AI giàu cảm xúc với WindiStudio' }],
  },
};

export const voiceStudioFaqs = [
  {
    question: 'Clone giọng là gì? Khác gì với giọng AI có sẵn?',
    answer: 'Clone giọng là tạo một giọng AI dựa trên bản thu giọng nói của bạn để đọc nội dung mới với chất giọng riêng. Giọng AI có sẵn cho phép bạn chọn từ thư viện và chuyển văn bản thành giọng nói mà không cần thu mẫu. Voice Studio hỗ trợ cả hai cách.',
  },
  {
    question: 'Voice AI giàu cảm xúc hoạt động như thế nào?',
    answer: 'Windi Clone Pro 3.0 dựa vào ngữ cảnh lời thoại để điều chỉnh ngữ điệu, nhịp đọc và sắc thái. Bạn nên viết câu rõ ý, đặt dấu câu phù hợp và nghe thử từng đoạn. Mức độ biểu cảm và độ giống giọng phụ thuộc vào giọng được chọn, chất lượng mẫu thu và nội dung văn bản.',
  },
  {
    question: 'Cần chuẩn bị gì để clone giọng nói của mình?',
    answer: 'Hãy chuẩn bị một bản thu chỉ có một người nói, rõ lời, âm lượng đều, không có nhạc nền hay tiếng vọng. Bạn có thể bắt đầu với khoảng 10–30 giây nói tự nhiên. Chỉ sử dụng giọng của chính bạn hoặc giọng mà bạn đã được chủ sở hữu cho phép sử dụng.',
  },
  {
    question: 'Voice Studio có tạo giọng AI tiếng Việt được không?',
    answer: 'Có. Bạn có thể nhập văn bản tiếng Việt, chọn giọng đọc từ thư viện hoặc giọng đã clone, điều chỉnh tốc độ rồi tạo âm thanh. Công cụ phù hợp với lời dẫn video TikTok, YouTube, podcast, đọc sách và kể chuyện.',
  },
  {
    question: 'Có tải giọng đọc AI thành file MP3 được không?',
    answer: 'Có. Sau khi tạo âm thanh thành công, bạn có thể nghe lại và tải file MP3 để đưa vào phần mềm dựng video hoặc biên tập podcast. Các bản ghi cũng có thể được mở lại trong mục Lịch sử của tài khoản.',
  },
] as const;

// Use the same answers in the visible FAQ and structured data.
export const voiceStudioStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${VOICE_STUDIO_URL}#organization`,
      name: 'WindiStudio',
      url: VOICE_STUDIO_URL,
      logo: `${VOICE_STUDIO_URL}favicon.png`,
    },
    {
      '@type': 'WebSite',
      '@id': `${VOICE_STUDIO_URL}#website`,
      url: VOICE_STUDIO_URL,
      name: 'WindiStudio',
      alternateName: 'Windi Studio',
      inLanguage: 'vi-VN',
      publisher: { '@id': `${VOICE_STUDIO_URL}#organization` },
    },
    {
      '@type': 'WebApplication',
      '@id': `${VOICE_STUDIO_URL}#voice-studio`,
      name: 'WindiStudio Voice Studio',
      url: VOICE_STUDIO_URL,
      description: VOICE_STUDIO_DESCRIPTION,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      browserRequirements: 'Requires JavaScript',
      inLanguage: 'vi-VN',
      image: `${VOICE_STUDIO_URL}voice-studio-og.png`,
      featureList: ['Clone giọng nói', 'Tạo giọng AI tiếng Việt', 'Voice AI giàu cảm xúc theo ngữ cảnh', 'Chuyển văn bản thành giọng nói', 'Tải âm thanh MP3'],
      provider: { '@id': `${VOICE_STUDIO_URL}#organization` },
    },
    {
      '@type': ['WebPage', 'FAQPage'],
      '@id': `${VOICE_STUDIO_URL}#webpage`,
      url: VOICE_STUDIO_URL,
      name: VOICE_STUDIO_TITLE,
      description: VOICE_STUDIO_DESCRIPTION,
      inLanguage: 'vi-VN',
      isPartOf: { '@id': `${VOICE_STUDIO_URL}#website` },
      about: { '@id': `${VOICE_STUDIO_URL}#voice-studio` },
      mainEntity: voiceStudioFaqs.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ],
};

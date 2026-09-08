import { createHash } from 'node:crypto';

export const EASY_PROMPT_COMPOSER_VERSION = 'easy-prompt-v3-nontech';

const typeInstructions = {
  SKILL: {
    vi: 'Tìm đúng skill liên quan trong nguồn chính chủ, nạp theo hướng dẫn README và dùng skill đó cho nhiệm vụ đầu tiên.',
    en: 'Locate the skill in the official source, install it using the README method, and use it for the first deliverable.',
  },
  MCP: {
    vi: 'Kiểm tra agent hiện tại có hỗ trợ MCP không; nếu có, cấu hình server theo tài liệu chính chủ và xác minh bằng thao tác demo an toàn.',
    en: 'Check whether the current agent supports MCP; if so, configure the server from official docs and verify with a safe demo.',
  },
  OPEN_SOURCE: {
    vi: 'Chọn cách cài đặt tối giản nhất phù hợp với dự án hiện tại, rồi tạo một bản demo hoặc tích hợp tối thiểu có thể chạy được.',
    en: 'Choose the minimal installation path that fits the current project, then create a runnable minimal demo or integration.',
  },
  WORKFLOW: {
    vi: 'Chuyển workflow này thành các bước cụ thể trong dự án hiện tại và hoàn thành bước đầu tiên có kết quả xem lại.',
    en: 'Turn this workflow into concrete steps inside the current project and complete the first step with an output to review.',
  },
  STACK: {
    vi: 'Đọc từng thành phần trong stack, đề xuất thứ tự thiết lập tối giản và chỉ cài những phần cần thiết cho kết quả đầu tiên.',
    en: 'Inspect each stack component, propose the minimal setup order, and install only what is necessary for the first result.',
  },
};

const categoryInputs = {
  social: 'Dán bài nháp, ý tưởng hoặc chủ đề bạn muốn AI triển khai',
  content: 'Dán bản nháp, kịch bản hoặc tài liệu bạn muốn tối ưu câu từ',
  video: 'Dán ý tưởng, kịch bản thoại hoặc transcript video cần xử lý',
  audio: 'Dán kịch bản voice-over hoặc yêu cầu giọng đọc/âm thanh cần tinh chỉnh',
  image: 'Mô tả hình ảnh, phong cách hoặc đối tượng đồ họa bạn muốn tạo',
  seo: 'Dán từ khóa, bài viết hoặc liên kết trang web cần tối ưu',
  design: 'Mô tả yêu cầu giao diện, màu sắc, đối tượng người dùng hoặc cấu trúc trang',
  research: 'Dán chủ đề, tài liệu hoặc câu hỏi nghiên cứu cần tổng hợp',
  automation: 'Mô tả quy trình, dữ liệu đầu vào và kết quả bạn muốn tự động hóa',
  tech: 'Dán mã nguồn, yêu cầu kỹ thuật hoặc lỗi cần xử lý',
};

const categoryInputsEn = {
  social: 'Paste your draft, topic idea, or audience context here',
  content: 'Paste your draft text, script, or material to refine here',
  video: 'Paste your video script, transcript, or concept here',
  audio: 'Paste your voice-over script or audio specifications here',
  image: 'Describe the desired visual style, elements, or layout here',
  seo: 'Paste your target keywords, URL, or article for analysis here',
  design: 'Describe your UI/UX layout requirements or design tokens here',
  research: 'Paste your research subject, questions, or raw text here',
  automation: 'Describe the workflow, input trigger, and expected outcome here',
  tech: 'Paste your code snippet, technical requirements, or environment here',
};

const englishFirstOutcomes = {
  social: 'plan and produce one focused social-content deliverable that can be reviewed before publishing',
  content: 'produce a first useful content draft that can be reviewed before sharing',
  video: 'produce one small, reviewable video or captioning deliverable',
  audio: 'produce one small, reviewable voice or audio deliverable',
  image: 'produce one visual draft that can be reviewed before use',
  seo: 'produce one evidence-backed SEO or analytics deliverable for review',
  design: 'produce one small, reviewable design or interface deliverable',
  research: 'produce one source-backed research output that can be reviewed',
  automation: 'automate one small, observable step and show its result',
  tech: 'produce one minimal, verifiable technical result without broad changes',
};

const categoryGoals = {
  content: {
    vi: 'áp dụng bộ quy tắc biên tập của nó để hoàn thiện nội dung cho tôi:',
    en: 'apply its editorial guidelines and best practices to refine my content:',
    stepsVi: [
      'Tối ưu câu từ: Loại bỏ hoàn toàn giọng điệu máy móc, câu từ sáo rỗng; làm cho lời văn tự nhiên, mượt mà và gần gũi như người thật trò chuyện.',
      'Bảo toàn nội dung: Giữ nguyên 100% số liệu, tên riêng, ý chính và cấu trúc ban đầu; không tự ý bịa thêm chi tiết.',
      'Học giọng cá nhân: Nếu tôi có đính kèm đoạn văn mẫu, hãy viết lại theo đúng nhịp điệu và phong thái xưng hô đó.',
      'Bảo mật dữ liệu: Giữ bí mật và an toàn cho toàn bộ thông tin tôi cung cấp, không chia sẻ ra bên ngoài.',
    ],
    stepsEn: [
      'Natural wording: Eliminate artificial phrasing, cliches, and robotic cadence; make the prose sound genuine, clear, and engaging.',
      'Factual fidelity: Preserve 100% of facts, metrics, names, and original intent without inventing details.',
      'Voice adaptation: If a sample is provided, match its rhythm, tone, and stylistic quirks.',
      'Data privacy: Keep all provided information strictly confidential and secret; do not share externally.',
    ],
    sampleSlotVi: 'Đoạn văn mẫu tham khảo giọng (tùy chọn):\n[Dán 1-2 đoạn văn theo phong cách riêng của bạn nếu muốn AI bắt chước]\n\n',
    sampleSlotEn: 'Reference voice sample (optional):\n[Paste 1-2 paragraphs of your writing style here]\n\n',
    inputLabelVi: 'Nội dung cần tối ưu:',
    inputLabelEn: 'Content to refine:',
    inputPlaceholderVi: '[Dán bài viết, bản nháp hoặc kịch bản cần tối ưu vào đây]',
    inputPlaceholderEn: '[Paste your draft, article, or script here]',
  },
  social: {
    vi: 'lên ý tưởng và tối ưu bài viết mạng xã hội thu hút cho tôi:',
    en: 'develop and format high-converting social media content for me:',
    stepsVi: [
      'Gây ấn tượng: Tạo mở đầu (hook) cuốn hút, giữ chân người đọc và tối ưu định dạng dễ đọc lướt trên di động.',
      'Tự nhiên, thực tế: Tránh văn phong quảng cáo sáo rỗng; tập trung chia sẻ giá trị thực tế và góc nhìn sâu sắc.',
      'Kêu gọi hành động: Đề xuất câu hỏi thảo luận hoặc lời kêu gọi tương tác tự nhiên ở cuối bài.',
      'Bảo mật dữ liệu: Giữ bí mật toàn bộ thông tin và kế hoạch truyền thông tôi cung cấp.',
    ],
    stepsEn: [
      'High engagement: Craft compelling hooks, readable mobile-friendly formatting, and strong narrative pacing.',
      'Authentic voice: Avoid marketing fluff; focus on actionable value and genuine insights.',
      'Clear call-to-action: Include natural conversational prompts to invite meaningful community engagement.',
      'Data privacy: Keep all campaign plans and brand notes strictly confidential and secret.',
    ],
    inputLabelVi: 'Chủ đề hoặc bản nháp bài đăng:',
    inputLabelEn: 'Topic or draft post:',
    inputPlaceholderVi: '[Dán ý tưởng, bài nháp hoặc thông điệp bài viết vào đây]',
    inputPlaceholderEn: '[Paste your topic, draft post, or key takeaways here]',
  },
  video: {
    vi: 'lên kịch bản và tối ưu nội dung video cuốn hút cho tôi:',
    en: 'produce an engaging video script and workflow for me:',
    stepsVi: [
      'Kịch bản tự nhiên: Viết lời thoại ngắn gọn, ngắt nhịp tự nhiên như văn nói đời thường, sẵn sàng để thu âm voice-over.',
      'Móc câu giữ chân: Thiết kế 3 giây đầu tiên kích thích tò mò, kèm gợi ý visual/hình ảnh minh họa cho từng phân cảnh.',
      'Hướng dẫn rõ ràng: Trình bày kịch bản theo 2 cột (Lời thoại / Khung hình) để tôi dễ quay dựng nhất.',
      'Bảo mật dữ liệu: Giữ bí mật toàn bộ kịch bản và ý tưởng video của tôi.',
    ],
    stepsEn: [
      'Natural dialogue: Write conversational, rhythmically paced spoken lines ready for voice-over recording.',
      'Hook and retention: Create an arresting opening 3 seconds with visual cues for each scene.',
      'Structured layout: Organize output into two clear columns (Audio / Visuals) for seamless editing.',
      'Data privacy: Keep all video concepts and scripts confidential and secret.',
    ],
    inputLabelVi: 'Ý tưởng hoặc tài liệu video:',
    inputLabelEn: 'Video concept or source notes:',
    inputPlaceholderVi: '[Dán chủ đề, dàn ý hoặc nội dung video cần chuyển thành kịch bản]',
    inputPlaceholderEn: '[Paste your video topic, outline, or source text here]',
  },
  audio: {
    vi: 'tối ưu kịch bản thu âm và xử lý âm thanh tự nhiên cho tôi:',
    en: 'optimize my voice-over script and audio production workflow:',
    stepsVi: [
      'Ngữ điệu tự nhiên: Điều chỉnh câu từ phù hợp với giọng đọc thực tế, thêm ký hiệu ngắt nghỉ và nhấn nhá cảm xúc.',
      'Phát âm chuẩn: Hướng dẫn phiên âm các thuật ngữ, tên riêng hoặc tiếng Anh để đọc trôi chảy, không vấp.',
      'Chất lượng âm thanh: Đưa ra các gợi ý thiết lập tối ưu để giọng đọc trong trẻo và chuyên nghiệp nhất.',
      'Bảo mật dữ liệu: Giữ bí mật và an toàn cho toàn bộ bản ghi âm và nội dung của tôi.',
    ],
    stepsEn: [
      'Spoken cadence: Adjust wording for natural human speech, adding pacing cues and emotional inflection.',
      'Pronunciation guide: Provide phonetic pronunciations for technical terms, proper names, or foreign words.',
      'Audio quality: Propose practical configuration settings to achieve crisp, studio-grade vocal output.',
      'Data privacy: Keep all audio transcripts and source recordings confidential and secret.',
    ],
    inputLabelVi: 'Kịch bản hoặc yêu cầu giọng đọc:',
    inputLabelEn: 'Voice-over script or specifications:',
    inputPlaceholderVi: '[Dán kịch bản thoại hoặc yêu cầu âm thanh cần xử lý vào đây]',
    inputPlaceholderEn: '[Paste your voice-over script or audio requirements here]',
  },
  image: {
    vi: 'tạo prompt hình ảnh và định hình phong cách đồ họa chuyên nghiệp cho tôi:',
    en: 'generate visual prompts and design assets for me:',
    stepsVi: [
      'Mô tả chi tiết: Xây dựng câu lệnh (prompt) hình ảnh sắc nét về ánh sáng, góc máy, bố cục và bảng màu đồng nhất.',
      'Đúng chuẩn nền tảng: Tối ưu tỷ lệ khung hình và độ phân giải phù hợp cho website, thumbnail hoặc mạng xã hội.',
      'Dễ tinh chỉnh: Đưa ra 2-3 biến thể phong cách khác nhau để tôi dễ dàng lựa chọn bản ưng ý nhất.',
      'Bảo mật dữ liệu: Giữ bí mật các ý tưởng hình ảnh và nhận diện thương hiệu của tôi.',
    ],
    stepsEn: [
      'Detailed prompting: Formulate precise visual prompts covering lighting, composition, camera angles, and color palettes.',
      'Platform ready: Optimize aspect ratios and render parameters for websites, thumbnails, or social feeds.',
      'Creative variations: Offer 2-3 distinct style variations so I can pick the most compelling look.',
      'Data privacy: Keep all proprietary brand assets and visual concepts confidential and secret.',
    ],
    inputLabelVi: 'Mô tả hình ảnh bạn muốn tạo:',
    inputLabelEn: 'Description of the visuals you need:',
    inputPlaceholderVi: '[Mô tả nội dung, phong cách hoặc đối tượng đồ họa bạn muốn AI thiết kế]',
    inputPlaceholderEn: '[Describe the subject, mood, style, or graphic elements here]',
  },
  design: {
    vi: 'hướng dẫn và tạo giải pháp thiết kế giao diện (UI/UX) trực quan cho tôi:',
    en: 'create an intuitive UI/UX design specification for me:',
    stepsVi: [
      'Bố cục khoa học: Thiết kế phân cấp thị giác rõ ràng, khoảng cách hợp lý và thân thiện với người dùng trên di động lẫn máy tính.',
      'Hệ thống nhất quán: Gợi ý bảng màu (palette), phông chữ (typography) và các thành phần giao diện tái sử dụng.',
      'Hướng dẫn triển khai: Trình bày cấu trúc chi tiết, dễ hiểu để tôi hoặc lập trình viên có thể đưa vào thực tế ngay.',
      'Bảo mật dữ liệu: Giữ bí mật các thông tin sản phẩm và ý tưởng thiết kế của tôi.',
    ],
    stepsEn: [
      'Clean hierarchy: Structure visual priorities, accessible spacing, and responsive mobile-first layouts.',
      'Design tokens: Specify coherent color palettes, typography scales, and reusable interface components.',
      'Actionable specs: Provide clean, developer-friendly specifications that can be implemented immediately.',
      'Data privacy: Keep all product concepts and interface assets confidential and secret.',
    ],
    inputLabelVi: 'Yêu cầu thiết kế giao diện:',
    inputLabelEn: 'Interface design requirements:',
    inputPlaceholderVi: '[Mô tả tính năng, đối tượng người dùng hoặc cấu trúc trang bạn muốn thiết kế]',
    inputPlaceholderEn: '[Describe the feature, user persona, or page structure you want to design]',
  },
  seo: {
    vi: 'phân tích và tối ưu SEO nội dung để đạt thứ hạng cao cho tôi:',
    en: 'audit and optimize my content for top search visibility:',
    stepsVi: [
      'Ý định tìm kiếm: Phân tích đúng Search Intent của người dùng và đề xuất cấu trúc bài viết chuẩn SEO (tiêu đề, heading H2/H3).',
      'Tối ưu tự nhiên: Lồng ghép từ khóa chính và từ khóa phụ một cách mượt mà, giữ trọn vẹn trải nghiệm đọc thú vị cho con người.',
      'Checklist thực chiến: Cung cấp thẻ meta title, meta description và gợi ý liên kết nội bộ để áp dụng ngay.',
      'Bảo mật dữ liệu: Giữ bí mật toàn bộ chiến lược từ khóa và thông tin website của tôi.',
    ],
    stepsEn: [
      'Search intent: Map queries to user intent and outline high-ranking content structures (H2/H3 headings).',
      'Natural integration: Integrate primary and secondary keywords smoothly while prioritizing reader experience.',
      'Actionable checklist: Deliver optimized meta titles, meta descriptions, and internal linking recommendations.',
      'Data privacy: Keep all target keywords and website strategy confidential and secret.',
    ],
    inputLabelVi: 'Từ khóa hoặc bài viết cần tối ưu SEO:',
    inputLabelEn: 'Target keywords or article to optimize:',
    inputPlaceholderVi: '[Dán từ khóa mục tiêu, bài viết hoặc link trang web cần tối ưu]',
    inputPlaceholderEn: '[Paste your target keywords, article draft, or URL to optimize]',
  },
  research: {
    vi: 'nghiên cứu, tổng hợp và rút trích thông tin quan trọng cho tôi:',
    en: 'research, synthesize, and extract key insights for me:',
    stepsVi: [
      'Tổng hợp súc tích: Chắt lọc các luận điểm cốt lõi, loại bỏ thông tin râu ria và trình bày dưới dạng gạch đầu dòng dễ hiểu.',
      'Dẫn chứng xác thực: Đảm bảo mọi số liệu, trích dẫn và sự kiện đều có căn cứ rõ ràng, không suy đoán vô căn cứ.',
      'Gợi ý hành động: Đưa ra 3-5 bài học hoặc bước hành động thiết thực từ tài liệu nghiên cứu.',
      'Bảo mật dữ liệu: Giữ bí mật toàn bộ tài liệu và câu hỏi nghiên cứu của tôi.',
    ],
    stepsEn: [
      'Concise synthesis: Distill key findings, filter out noise, and organize insights into clear bullet points.',
      'Evidence-backed: Ensure all statistics, quotes, and claims are grounded in source documentation without speculation.',
      'Actionable takeaways: Outline 3-5 concrete action steps derived from the research findings.',
      'Data privacy: Keep all research materials and project questions confidential and secret.',
    ],
    inputLabelVi: 'Tài liệu hoặc chủ đề nghiên cứu:',
    inputLabelEn: 'Research material or topic:',
    inputPlaceholderVi: '[Dán chủ đề nghiên cứu, câu hỏi hoặc tài liệu cần tổng hợp vào đây]',
    inputPlaceholderEn: '[Paste your research subject, raw notes, or documents here]',
  },
  automation: {
    vi: 'thiết lập và hướng dẫn quy trình tự động hóa công việc cho tôi:',
    en: 'configure and guide an automated workflow for me:',
    stepsVi: [
      'Quy trình đơn giản: Thiết kế luồng tự động từng bước mạch lạc, chọn phương án dễ làm và ít phát sinh lỗi nhất.',
      'Hướng dẫn cụ thể: Giải thích cách kết nối trigger (kích hoạt) và action (hành động) bằng ngôn ngữ đời thường, không thuật ngữ khó hiểu.',
      'Kiểm thử an toàn: Cung cấp kịch bản chạy thử với dữ liệu mẫu để xác nhận kết quả trước khi đưa vào vận hành thật.',
      'Bảo mật dữ liệu: Giữ bí mật thông tin tài khoản, khóa truy cập (API) và dữ liệu khách hàng.',
    ],
    stepsEn: [
      'Streamlined flow: Design an intuitive step-by-step automation path with minimal points of failure.',
      'Plain-language guide: Explain trigger and action connections clearly without confusing jargon.',
      'Safe test run: Provide a test procedure with sample data to verify outcomes before live deployment.',
      'Data privacy: Keep all credentials, API keys, and sensitive data confidential and secret.',
    ],
    inputLabelVi: 'Quy trình bạn muốn tự động hóa:',
    inputLabelEn: 'Workflow you want to automate:',
    inputPlaceholderVi: '[Mô tả các bước công việc bạn muốn tự động hóa và kết quả mong đợi]',
    inputPlaceholderEn: '[Describe the manual tasks you want to automate and the desired output]',
  },
  tech: {
    vi: 'hướng dẫn giải pháp kỹ thuật tối giản và hiệu quả cho tôi:',
    en: 'provide a minimal, verifiable technical solution for me:',
    stepsVi: [
      'Giải pháp tối giản: Chọn cách xử lý ngắn gọn, chuẩn chỉ và chạy được ngay trong dự án hiện tại.',
      'Hướng dẫn từng bước: Giải thích rõ ràng các lệnh hoặc thao tác cần làm, tránh thay đổi lan man không cần thiết.',
      'Kiểm tra kết quả: Hướng dẫn tôi cách tự kiểm tra để đảm bảo mọi thứ hoạt động chính xác.',
      'Bảo mật dữ liệu: Giữ bí mật cấu hình máy chủ, biến môi trường và mã nguồn dự án.',
    ],
    stepsEn: [
      'Minimal footprint: Choose the cleanest, most maintainable solution that runs immediately in the current project.',
      'Step-by-step guidance: Explain commands and adjustments plainly without broad unnecessary modifications.',
      'Verification check: Provide an easy sanity check to verify the fix or implementation works as expected.',
      'Data privacy: Keep all environment variables, credentials, and source code confidential and secret.',
    ],
    inputLabelVi: 'Yêu cầu kỹ thuật hoặc mã nguồn:',
    inputLabelEn: 'Technical requirement or code snippet:',
    inputPlaceholderVi: '[Dán mã nguồn, thông báo lỗi hoặc yêu cầu kỹ thuật cần giải quyết]',
    inputPlaceholderEn: '[Paste your code snippet, error message, or technical specification]',
  },
};

function isHttps(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}

function clean(value, fallback = '') {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() || fallback : fallback;
}

function sourceUrl(resource) {
  const value = resource.repository_url || resource.canonical_url || resource.documentation_url;
  if (!isHttps(value)) throw new Error(`${resource.name || resource.identity}: missing safe official URL`);
  return value;
}

export function easyPromptSourceHash(resource) {
  const brief = resource.import_metadata?.creatorCatalog || {};
  const input = {
    identity: clean(resource.identity), type: clean(resource.type), name: clean(resource.name),
    canonicalUrl: clean(resource.canonical_url), repositoryUrl: clean(resource.repository_url), documentationUrl: clean(resource.documentation_url),
    license: clean(resource.license), description: clean(resource.description),
    example: clean(brief.example), setup: clean(brief.setup), limitations: clean(brief.limitations),
    readme: clean(brief.readme?.url),
  };
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export function buildEasyPrompt(resource) {
  const brief = resource.import_metadata?.creatorCatalog;
  if (!brief || !clean(resource.identity)) throw new Error(`${resource.name || resource.identity}: incomplete Creator profile`);
  const officialUrl = sourceUrl(resource);
  const cat = categoryGoals[brief.primaryCategory] || categoryGoals.content;

  const sampleSectionVi = cat.sampleSlotVi || '';
  const promptVi = `${officialUrl}
Hãy đọc kỹ hướng dẫn từ README của repo trên và ${cat.vi}

1. ${cat.stepsVi[0]}
2. ${cat.stepsVi[1]}
3. ${cat.stepsVi[2]}
4. ${cat.stepsVi[3]}

${sampleSectionVi}${cat.inputLabelVi}
${cat.inputPlaceholderVi}`;

  const sampleSectionEn = cat.sampleSlotEn || '';
  const promptEn = `${officialUrl}
Read the instructions from the official README of this repository and ${cat.en}

1. ${cat.stepsEn[0]}
2. ${cat.stepsEn[1]}
3. ${cat.stepsEn[2]}
4. ${cat.stepsEn[3]}

${sampleSectionEn}${cat.inputLabelEn}
${cat.inputPlaceholderEn}`;

  return {
    external_identity: resource.identity,
    source_url: resource.canonical_url,
    source_hash: easyPromptSourceHash(resource),
    composer_version: EASY_PROMPT_COMPOSER_VERSION,
    prompt_vi: promptVi,
    prompt_en: promptEn,
  };
}

export function validateEasyPrompt(row) {
  const problems = [];
  if (!clean(row?.external_identity)) problems.push('missing external identity');
  if (!isHttps(row?.source_url)) problems.push('unsafe source URL');
  if (!/^[a-f0-9]{64}$/.test(row?.source_hash || '')) problems.push('invalid source hash');
  if (row?.composer_version !== EASY_PROMPT_COMPOSER_VERSION) problems.push('unexpected composer version');
  for (const [language, prompt] of [['vi', row?.prompt_vi], ['en', row?.prompt_en]]) {
    if (typeof prompt !== 'string' || prompt.length < 450 || prompt.length > 8000) problems.push(`${language}: invalid length (${prompt?.length || 0})`);
    if (typeof prompt === 'string' && (!prompt.includes(row.source_url) || !/README/i.test(prompt) || !/(secret|bí mật)/i.test(prompt))) problems.push(`${language}: missing safety or source context`);
  }
  return problems;
}

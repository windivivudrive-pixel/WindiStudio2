import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');
}

async function extractOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<meta[^>]+property=["\x27]og:image["\x27][^>]+content=["\x27]([^"\x27]+)["\x27]/i)
      || html.match(/<meta[^>]+content=["\x27]([^"\x27]+)["\x27][^>]+property=["\x27]og:image["\x27]/i)
      || html.match(/<meta[^>]+name=["\x27]twitter:image["\x27][^>]+content=["\x27]([^"\x27]+)["\x27]/i);
    let img = match?.[1]?.replace(/&amp;/g, '&');
    if (img && img.startsWith('//')) img = 'https:' + img;
    return img || null;
  } catch {
    return null;
  }
}

const defaultImages = {
  github: 'https://github.blog/wp-content/uploads/2026/09/Screenshot-2026-09-02-at-12.28.34-PM.png?fit=1242%2C698',
  deepmind: 'https://storage.googleapis.com/gweb-uniblog-publish-prod/images/agentic-video___keyword__blog-header.width-1300.png',
  openai: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  anthropic: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
  general: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80'
};

/**
 * Editorial curated rewrites for candidate articles so non-tech readers can understand
 * immediately what the feature does, how it helps them, and how to use it.
 */
const editorialProfiles = [
  {
    urlMatch: 'github-copilot-app-for-beginners-run-several-agents-at-once',
    category: 'AI AGENTS',
    slug: 'github-copilot-chay-nhieu-agent-song-song',
    titleVi: 'GitHub Copilot cho phép chạy nhiều trợ lý AI cùng lúc: Phân chia công việc như một nhóm nhân sự',
    summaryVi: 'Thay vì bắt một trợ lý AI làm từ đầu đến cuối dễ gây nhầm lẫn, GitHub hướng dẫn cách chia nhỏ dự án cho nhiều AI agent làm việc độc lập song song.',
    takeaways: [
      'Không cần kỹ thuật phức tạp: Bạn có thể coi mỗi AI agent như một nhân viên ảo có nhiệm vụ riêng biệt.',
      'Tránh xung đột: Một agent lo tìm kiếm tài liệu, một agent lo viết nháp, một agent thứ ba kiểm tra lỗi.',
      'Tiết kiệm thời gian: Các tác vụ diễn ra đồng thời thay vì phải ngồi chờ từng bước.'
    ],
    nontechGuide: 'Hãy tưởng tượng bạn đang tổ chức một sự kiện. Nếu chỉ giao một người vừa đi chợ, vừa nấu ăn, vừa trang trí thì rất dễ hỏng việc. Kỹ thuật mới của GitHub giúp bạn mở nhiều "cửa sổ làm việc" riêng cho từng trợ lý AI, mỗi người tập trung một phần việc mà không dẫm chân lên nhau.',
    actionableTip: 'Khi dùng AI cho công việc hàng ngày, hãy tách yêu cầu: Giao phiên 1 tóm tắt dữ liệu, phiên 2 viết nội dung dựa trên tóm tắt đó, và phiên 3 đóng vai khách hàng khó tính để chấm điểm.',
    readingTime: 2
  },
  {
    urlMatch: 'introducing-agentic-video-in-gemini',
    category: 'VIDEO AI',
    slug: 'gemini-hieu-video-kieu-agent',
    titleVi: 'Google DeepMind nâng cấp Gemini: AI đã có thể “xem và hiểu trọn vẹn video” thay vì chỉ nhìn từng khung hình',
    summaryVi: 'Cập nhật đột phá giúp AI theo dõi toàn bộ diễn biến câu chuyện trong video, nhận biết đồ vật di chuyển và tự động cắt ghép phân cảnh theo ý muốn.',
    takeaways: [
      'Hiểu nội dung video có chiều sâu: AI không chỉ nhận biết mặt người mà hiểu được ngữ cảnh đang xảy ra chuyện gì.',
      'Dễ dàng tạo video ngắn: Bạn chỉ cần yêu cầu "Cắt đoạn cao trào nhất của bài thuyết trình", AI sẽ tự tìm đúng giây đó.',
      'Hỗ trợ sáng tạo nội dung: Tự động trích xuất kịch bản, lời thoại và đề xuất góc quay bổ sung.'
    ],
    nontechGuide: 'Trước đây, AI phân tích video bằng cách chụp từng bức ảnh rời rạc nên hay đoán sai ý đồ câu chuyện. Với công nghệ "Agentic Video", Gemini xem video giống hệt con người: ghi nhớ sự việc từ đầu đến cuối, biết trước đó đã xảy ra chuyện gì và chuyện tiếp theo có ý nghĩa ra sao.',
    actionableTip: 'Dành cho các nhà sáng tạo nội dung: Sau này bạn có thể ném một video dài 1 tiếng vào AI và yêu cầu tạo ngay 5 video ngắn TikTok/Reels với phụ đề và hiệu ứng chuẩn xác.',
    readingTime: 3
  },
  {
    urlMatch: 'daybreak-for-frontline-defenders',
    category: 'AN TOÀN AI',
    slug: 'openai-daybreak-bao-ve-ha-tang',
    titleVi: 'OpenAI cam kết 1 tỷ USD hỗ trợ các bệnh viện và dịch vụ công cộng phòng chống tấn công mạng',
    summaryVi: 'Chương trình Daybreak cung cấp AI bảo mật cao cấp hoàn toàn miễn phí cho các cơ quan thiết yếu như y tế, trường học và hệ thống cấp điện nước.',
    takeaways: [
      'Bảo vệ dữ liệu y tế và người dân: Các bệnh viện và trường học sẽ được AI quét lỗ hổng bảo mật 24/7.',
      'Ngăn chặn lừa đảo tinh vi: Sử dụng các mô hình AI mới nhất để phát hiện email giả mạo và phần mềm tống tiền.',
      'Đào tạo nhân sự không chuyên: Cung cấp trợ lý ảo giúp người quản trị thông thường cũng có thể bảo vệ hệ thống an toàn.'
    ],
    nontechGuide: 'Tin tặc ngày càng dùng AI để tấn công vào các cơ quan công cộng như bệnh viện khiến dữ liệu bệnh án bị rò rỉ hoặc hệ thống bị đóng băng. Chương trình Daybreak của OpenAI đóng vai trò như việc "trang bị camera và bảo vệ tinh nhuệ" cho các nơi này, giúp họ chống lại tội phạm mạng mà không tốn chi phí khổng lồ.',
    actionableTip: 'Nhắc nhở quan trọng cho người dùng cá nhân: Khi sử dụng các công cụ AI, hãy chú ý không chia sẻ mật khẩu hoặc thông tin thẻ ngân hàng vào khung chat của bất kỳ ứng dụng nào.',
    readingTime: 2
  },
  {
    urlMatch: 'improving-alignment-security-efforts',
    category: 'AN TOÀN AGENT',
    slug: 'anthropic-kiem-soat-an-toan-ai-agent',
    titleVi: 'Anthropic siết chặt cơ chế “hộp cát” bảo vệ: Ngăn AI tự ý bấm nhầm hoặc xóa file trên máy tính',
    summaryVi: 'Anthropic công bố các tiêu chuẩn kiểm soát mới giúp người dùng yên tâm khi để AI can thiệp vào file làm việc mà không lo bị mất dữ liệu ngoài ý muốn.',
    takeaways: [
      'Chỉ cấp quyền khi bạn đồng ý: AI chỉ được mở hoặc sửa các tệp bạn chỉ định, không thể tự ý lục lọi toàn bộ máy tính.',
      'Có cơ chế hoàn tác: Nếu AI thực hiện sai một thao tác, hệ thống sẽ lưu bản sao lưu để bạn quay lại phiên bản cũ.',
      'Minh bạch quy trình: Người dùng luôn nhìn thấy AI đang định làm gì trước khi nhấn nút cho phép.'
    ],
    nontechGuide: 'Khi bạn cho một người lạ vào nhà giúp dọn dẹp, bạn sẽ muốn họ chỉ ở phòng khách chứ không được mở ngăn kéo phòng ngủ. Cơ chế "Sandbox" (Hộp cát) của Anthropic hoạt động y như vậy: tạo ra một không gian cách ly an toàn để AI làm việc, ngăn ngừa mọi rủi ro làm xáo trộn các phần mềm khác trên máy tính của bạn.',
    actionableTip: 'Khi cài đặt các công cụ AI Agent hoặc MCP, luôn đọc kỹ các thông báo yêu cầu cấp quyền và chỉ cấp quyền vào thư mục dự án thay vì cả ổ đĩa máy tính.',
    readingTime: 2
  },
  {
    urlMatch: 'chatgpt-connects-health-records-and-healthcare-sources',
    category: 'ỨNG DỤNG Y TẾ',
    slug: 'chatgpt-ket-noi-ho-so-y-te-ehr',
    titleVi: 'ChatGPT chính thức cho phép bác sĩ tra cứu hồ sơ bệnh án điện tử an toàn: Giảm tải việc nhập liệu giấy tờ',
    summaryVi: 'OpenAI ra mắt kết nối an toàn giữa ChatGPT và hệ thống dữ liệu bệnh viện, giúp bác sĩ tóm tắt nhanh tiền sử bệnh nhân chỉ trong vài giây.',
    takeaways: [
      'Tiết kiệm hàng giờ nhập liệu: Bác sĩ dành nhiều thời gian hơn để khám chữa bệnh thay vì gõ báo cáo.',
      'Bảo mật theo chuẩn y tế cao nhất (HIPAA): Dữ liệu bệnh nhân được mã hóa riêng biệt, không dùng để huấn luyện mô hình chung.',
      'Hạn chế sai sót: AI đối chiếu các loại thuốc điều trị để cảnh báo dị ứng hoặc xung đột thuốc.'
    ],
    nontechGuide: 'Mỗi lần đi viện, bạn thường phải mang theo tập hồ sơ dày cộp và kể lại lịch sử bệnh tật. Khi bệnh viện tích hợp tính năng này, trợ lý AI sẽ tự động đọc hiểu toàn bộ lịch sử khám bệnh từ trước đến nay để báo cho bác sĩ biết ngay các điểm lưu ý quan trọng.',
    actionableTip: 'Khi đi khám bệnh, bạn có thể chủ động dùng ứng dụng ghi chú để lưu lại chỉ dẫn của bác sĩ và nhờ AI tóm tắt thành lịch uống thuốc hàng ngày.',
    readingTime: 3
  },
  {
    urlMatch: 'introducing-gemini-3-8-flash',
    category: 'MÔ HÌNH MỚI',
    slug: 'google-ra-mat-gemini-3-8-flash',
    titleVi: 'Google ra mắt Gemini 3.8 Flash: Tốc độ phản hồi tức thì với chi phí rẻ hơn 70%',
    summaryVi: 'Phiên bản Gemini mới nhất của Google đạt tốc độ phản hồi cực nhanh, phục vụ cho các ứng dụng dịch thuật, trợ lý ảo hàng ngày và xử lý văn bản quy mô lớn.',
    takeaways: [
      'Tốc độ chớp mắt: Câu trả lời hiển thị gần như ngay lập tức sau khi bạn bấm Enter.',
      'Chi phí siêu tiết kiệm: Rẻ hơn 70% so với các thế hệ trước, giúp người dùng phổ thông tiếp cận công nghệ AI tiên tiến.',
      'Xử lý tài liệu dài: Đọc hiểu các cuốn sách hoặc bản kế hoạch dày hàng trăm trang mà không bị sót ý.'
    ],
    nontechGuide: 'Nếu các mô hình AI lớn trước đây giống như một cỗ xe tải cồng kềnh mất vài giây để khởi động, thì Gemini 3.8 Flash giống như một chiếc xe máy điện lướt nhẹ: sẵn sàng trả lời ngay các câu hỏi ngắn, giải thích từ vựng hoặc chỉnh sửa email trong tích tắc.',
    actionableTip: 'Nếu bạn cần sửa lỗi chính tả, dịch nhanh một bức thư tiếng Anh hoặc tóm tắt một bài báo, hãy chọn các phiên bản "Flash" để có kết quả ngay tức thì.',
    readingTime: 2
  },
  {
    urlMatch: 'how-canvases-make-agentic-workflows-visible',
    category: 'AI WORKFLOW',
    slug: 'giao-dien-canvas-cho-ai-workflow',
    titleVi: 'Giao diện Canvas cho AI: Biến quy trình làm việc phức tạp thành sơ đồ trực quan ai cũng nhìn hiểu',
    summaryVi: 'GitHub giới thiệu phương pháp hiển thị quy trình tự động hóa dạng bảng vẽ (Canvas), giúp người dùng không biết lập trình vẫn dễ dàng theo dõi và can thiệp vào các bước của AI.',
    takeaways: [
      'Trực quan hóa công việc: Thay vì màn hình dòng lệnh đen sì, bạn nhìn thấy từng bước như các ô hình chữ nhật nối nhau.',
      'Dễ dàng can thiệp: Bạn có thể nhấn dừng lại ở một ô bất kỳ để sửa nội dung trước khi AI chạy bước tiếp theo.',
      'Tiết kiệm chi phí: Nhìn rõ bước nào tốn kém hoặc không cần thiết để cắt giảm.'
    ],
    nontechGuide: 'Trước đây, để biết AI đang làm gì bên trong máy tính, bạn phải biết đọc code. Với giao diện Canvas, mọi thứ được vẽ thành sơ đồ cây rõ ràng: Bước 1 tìm tài liệu -> Bước 2 viết bài -> Bước 3 gửi email. Bạn chỉ việc nhìn hình là biết ngay công việc đang chạy tới đâu.',
    actionableTip: 'Hãy thử các công cụ thiết kế quy trình kéo thả dạng Canvas (như Windi Workflows hay n8n) để tự tạo quy trình tự động đăng bài social mà không cần biết viết một dòng code nào.',
    readingTime: 3
  },
  {
    urlMatch: 'ai-native-company-workflows',
    category: 'XU HƯỚNG AI',
    slug: 'doanh-nghiep-ai-native-van-hanh-ra-sao',
    titleVi: 'Doanh nghiệp thời đại AI vận hành ra sao: 3 bài học giúp người kinh doanh nhỏ tinh gọn bộ máy',
    summaryVi: 'OpenAI chia sẻ câu chuyện từ các công ty thế hệ mới: chỉ với đội ngũ 5–10 người nhưng tạo ra doanh thu ngang ngửa các công ty hàng trăm nhân viên nhờ ứng dụng AI bài bản.',
    takeaways: [
      'AI làm việc lặp lại, người làm việc sáng tạo: Tự động hóa khâu trả lời câu hỏi thường gặp và phân loại đơn hàng.',
      'Chuẩn hóa tài liệu nội bộ: Đưa toàn bộ quy trình công ty vào thư mục để AI đọc và hỗ trợ nhân viên mới.',
      'Tập trung vào trải nghiệm khách hàng: Tốc độ phản hồi khách hàng giảm từ 4 tiếng xuống còn 30 giây.'
    ],
    nontechGuide: 'Một quán cà phê hay một shop bán hàng online thường tốn rất nhiều thời gian trả lời tin nhắn: "Còn size không?", "Ship bao nhiêu tiền?". Các công ty AI-native cài đặt trợ lý AI trả lời các câu này 24/7, giúp chủ shop có thêm thời gian nghiên cứu sản phẩm mới và chăm sóc khách quen.',
    actionableTip: 'Bắt đầu bằng việc viết ra danh sách 3 việc bạn ghét làm nhất hàng ngày (như soạn báo cáo, trả lời tin nhắn mẫu, gõ số liệu) và thử tìm một công cụ AI để tự động hóa 1 trong 3 việc đó ngay trong tuần này.',
    readingTime: 3
  }
];

async function main() {
  const envContent = await readFile('.env.local', 'utf8');
  const env = parse(envContent);
  const base = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!base || !serviceKey) throw new Error('Missing Supabase configuration');

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const res = await fetch(`${base}/rest/v1/news_items?select=*`, { headers });
  if (!res.ok) throw new Error(`Fetch news_items failed: ${res.status}`);
  const items = await res.json();

  console.log(`Found ${items.length} total news items in database.`);

  let publishedCount = 0;

  for (const profile of editorialProfiles) {
    const matched = items.find(item => item.canonical_url.includes(profile.urlMatch));
    if (!matched) {
      console.warn(`Profile match not found for: ${profile.urlMatch}`);
      continue;
    }

    console.log(`Processing & publishing: [${matched.source_name}] ${profile.titleVi.slice(0, 45)}...`);

    // Extract image
    let imageUrl = await extractOgImage(matched.canonical_url);
    if (!imageUrl) {
      const srcLow = matched.source_name.toLowerCase();
      if (srcLow.includes('github')) imageUrl = defaultImages.github;
      else if (srcLow.includes('deepmind') || srcLow.includes('google')) imageUrl = defaultImages.deepmind;
      else if (srcLow.includes('openai')) imageUrl = defaultImages.openai;
      else if (srcLow.includes('anthropic')) imageUrl = defaultImages.anthropic;
      else imageUrl = defaultImages.general;
    }

    const rawPayload = {
      ...(matched.raw_payload || {}),
      slug: profile.slug,
      image_url: imageUrl,
      image_alt: profile.titleVi,
      takeaways: profile.takeaways,
      nontech_guide: profile.nontechGuide,
      actionable_tip: profile.actionableTip,
      reading_time_minutes: profile.readingTime,
      ticker: profile.titleVi,
    };

    const updateBody = {
      title_vi: profile.titleVi,
      summary_vi: profile.summaryVi,
      category: profile.category,
      status: 'PUBLISHED',
      reviewed_at: new Date().toISOString(),
      published_to_windi_at: new Date().toISOString(),
      raw_payload: rawPayload,
      updated_at: new Date().toISOString()
    };

    const updateRes = await fetch(`${base}/rest/v1/news_items?id=eq.${matched.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(updateBody)
    });

    if (!updateRes.ok) {
      console.error(`Failed to update ${matched.id}:`, await updateRes.text());
    } else {
      publishedCount++;
    }
  }

  console.log(`\nSuccessfully published and enriched ${publishedCount} high-quality non-tech news articles.`);
}

main().catch(console.error);

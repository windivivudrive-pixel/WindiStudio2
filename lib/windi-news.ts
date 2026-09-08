export type WindiNewsItem = {
  id?: string;
  slug: string;
  category: string;
  sourceName: string;
  sourceUrl: string;
  originalTitle: string;
  title: string;
  summary: string;
  imageUrl: string;
  imageAlt?: string;
  takeaways: string[];
  nontechGuide: string;
  contentHtml?: string;
  actionableTip?: string;
  ticker: string;
  publishedAt: string;
  shortDate: string;
  readingTimeMinutes: number;
};

/**
 * First source-checked news batch with images, non-tech rewrites and source attribution.
 * The collector updates this with reviewed database rows.
 */
export const latestNews: WindiNewsItem[] = [
  {
    slug: 'google-ra-mat-google-pics-canh-tranh-canva',
    category: 'THIẾT KẾ AI',
    sourceName: 'Google Workspace',
    sourceUrl: 'https://workspace.google.com/products/pics/',
    originalTitle: 'Google Pics: AI Image Generator and Editor | Google Workspace',
    title: 'Google ra mắt Google Pics: Công cụ tạo và chỉnh sửa ảnh AI đột phá trong Workspace, cạnh tranh trực tiếp với Canva',
    summary: 'Google chính thức công bố Google Pics — công cụ thiết kế đồ họa và tạo ảnh AI tích hợp trực tiếp vào Google Docs, Slides và Drive, cho phép tạo ấn phẩm từ câu lệnh và chỉnh sửa chuẩn xác từng vật thể.',
    imageUrl: 'https://lh3.googleusercontent.com/mD70974tvT_1bkGo7tb4c8mahiInjmRcCGOT9cbfq_D8zumJXKD6PBvA0fTJzmAvoZFtUNMmDfKwPsoPN6_syejOskR0vwoxLZfW=e365-pa-nu-s0-rw',
    imageAlt: 'Google Pics - AI Image Generator and Editor tích hợp trực tiếp trong Google Workspace đối đầu Canva',
    takeaways: [
      'Sáng tạo đồ họa bằng câu lệnh (Prompt-to-Design): Tự động tạo poster, banner sự kiện và slide trình chiếu hoàn chỉnh mà không cần mất công tìm kiếm mẫu dựng sẵn.',
      'Chấm dứt thời "cầu may" nhờ Object-based Editing: Chọn trực tiếp từng vật thể trong ảnh để đổi màu, thay chi tiết, chỉnh bối cảnh mà không làm méo mó các thành phần xung quanh.',
      'Tích hợp sâu trong Google Workspace: Chỉnh sửa và chèn ảnh trực tiếp trong Google Docs, Google Slides và quản lý tệp tập trung trên Google Drive qua lối tắt pics.new.',
      'Hỗ trợ Upscale 4K và cộng tác thời gian thực: Chia sẻ canvas thiết kế với đồng đội để cùng chỉnh sửa như trên văn bản Docs thông thường.'
    ],
    nontechGuide: 'Google Pics đưa sức mạnh của AI tạo sinh vào thẳng bộ công cụ làm việc hàng ngày của Google Workspace. Thay vì phải rời trang để sang các phần mềm như Canva, người dùng có thể mô tả ý tưởng bằng tiếng Việt để tạo ra ấn phẩm đồ họa chuyên nghiệp và tinh chỉnh từng chi tiết ngay trên file Docs hay Slides.',
    actionableTip: 'Bạn có thể mở ngay trình duyệt và gõ pics.new để trải nghiệm công cụ. Thử bắt đầu bằng lệnh: "Poster quảng cáo workshop trà đạo phong cách tối giản Nhật Bản, màu xanh matcha, tỷ lệ 16:9" để khám phá khả năng của AI.',
    ticker: 'Google Workspace ra mắt Google Pics: AI thiết kế đồ họa đối đầu Canva, tích hợp Docs & Slides',
    publishedAt: '2026-09-04T12:00:00Z',
    shortDate: '04.09',
    readingTimeMinutes: 6,
  },
  {
    slug: 'github-copilot-chay-nhieu-agent-song-song',
    category: 'AI AGENTS',
    sourceName: 'GitHub Blog',
    sourceUrl: 'https://github.blog/ai-and-ml/github-copilot/github-copilot-app-for-beginners-run-several-agents-at-once/',
    originalTitle: 'GitHub Copilot app for Beginners: Run several agents at once',
    title: 'GitHub Copilot cho phép chạy nhiều trợ lý AI cùng lúc: Phân chia công việc như một nhóm nhân sự',
    summary: 'Thay vì bắt một trợ lý AI làm từ đầu đến cuối dễ gây nhầm lẫn, GitHub hướng dẫn cách chia nhỏ dự án cho nhiều AI agent làm việc độc lập song song.',
    imageUrl: 'https://github.blog/wp-content/uploads/2026/09/Screenshot-2026-09-02-at-12.28.34-PM.png?fit=1242%2C698',
    imageAlt: 'Giao diện chạy nhiều agent song song của GitHub Copilot',
    takeaways: [
      'Không cần kỹ thuật phức tạp: Bạn có thể coi mỗi AI agent như một nhân viên ảo có nhiệm vụ riêng biệt.',
      'Tránh xung đột: Một agent lo tìm kiếm tài liệu, một agent lo viết nháp, một agent thứ ba kiểm tra lỗi.',
      'Tiết kiệm thời gian: Các tác vụ diễn ra đồng thời thay vì phải ngồi chờ từng bước.',
    ],
    nontechGuide: 'Hãy tưởng tượng bạn đang tổ chức một sự kiện. Nếu chỉ giao một người vừa đi chợ, vừa nấu ăn, vừa trang trí thì rất dễ hỏng việc. Kỹ thuật mới của GitHub giúp bạn mở nhiều "cửa sổ làm việc" riêng cho từng trợ lý AI, mỗi người tập trung một phần việc mà không dẫm chân lên nhau.',
    actionableTip: 'Khi dùng AI cho công việc hàng ngày, hãy tách yêu cầu: Giao phiên 1 tóm tắt dữ liệu, phiên 2 viết nội dung dựa trên tóm tắt đó, và phiên 3 đóng vai khách hàng khó tính để chấm điểm.',
    ticker: 'GitHub: Hướng dẫn chạy nhiều trợ lý AI độc lập trong cùng một dự án',
    publishedAt: '2026-09-03T12:00:00Z',
    shortDate: '03.09',
    readingTimeMinutes: 2,
  },
  {
    slug: 'gemini-hieu-video-kieu-agent',
    category: 'VIDEO AI',
    sourceName: 'Google DeepMind',
    sourceUrl: 'https://deepmind.google/blog/introducing-agentic-video-in-gemini/',
    originalTitle: 'Introducing agentic video understanding with Gemini',
    title: 'Google DeepMind nâng cấp Gemini: AI đã có thể “xem và hiểu trọn vẹn video” thay vì chỉ nhìn từng khung hình',
    summary: 'Cập nhật đột phá giúp AI theo dõi toàn bộ diễn biến câu chuyện trong video, nhận biết đồ vật di chuyển và tự động cắt ghép phân cảnh theo ý muốn.',
    imageUrl: 'https://storage.googleapis.com/gweb-uniblog-publish-prod/images/agentic-video___keyword__blog-header.width-1300.png',
    imageAlt: 'Gemini agentic video understanding blog header',
    takeaways: [
      'Hiểu nội dung video có chiều sâu: AI không chỉ nhận biết mặt người mà hiểu được ngữ cảnh đang xảy ra chuyện gì.',
      'Dễ dàng tạo video ngắn: Bạn chỉ cần yêu cầu "Cắt đoạn cao trào nhất của bài thuyết trình", AI sẽ tự tìm đúng giây đó.',
      'Hỗ trợ sáng tạo nội dung: Tự động trích xuất kịch bản, lời thoại và đề xuất góc quay bổ sung.',
    ],
    nontechGuide: 'Trước đây, AI phân tích video bằng cách chụp từng bức ảnh rời rạc nên hay đoán sai ý đồ câu chuyện. Với công nghệ "Agentic Video", Gemini xem video giống hệt con người: ghi nhớ sự việc từ đầu đến cuối, biết trước đó đã xảy ra chuyện gì và chuyện tiếp theo có ý nghĩa ra sao.',
    actionableTip: 'Dành cho các nhà sáng tạo nội dung: Sau này bạn có thể ném một video dài 1 tiếng vào AI và yêu cầu tạo ngay 5 video ngắn TikTok/Reels với phụ đề và hiệu ứng chuẩn xác.',
    ticker: 'Google DeepMind: Gemini có thể hiểu sâu diễn biến và cấu trúc video dài',
    publishedAt: '2026-09-01T00:00:00Z',
    shortDate: '01.09',
    readingTimeMinutes: 3,
  },
  {
    slug: 'openai-daybreak-bao-ve-ha-tang',
    category: 'AN TOÀN AI',
    sourceName: 'OpenAI',
    sourceUrl: 'https://openai.com/index/daybreak-for-frontline-defenders/',
    originalTitle: 'Daybreak for Frontline Defenders: $1B to protect essential services',
    title: 'OpenAI cam kết 1 tỷ USD hỗ trợ các bệnh viện và dịch vụ công cộng phòng chống tấn công mạng',
    summary: 'Chương trình Daybreak cung cấp AI bảo mật cao cấp hoàn toàn miễn phí cho các cơ quan thiết yếu như y tế, trường học và hệ thống cấp điện nước.',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'An ninh mạng và bảo vệ hạ tầng thiết yếu với AI',
    takeaways: [
      'Bảo vệ dữ liệu y tế và người dân: Các bệnh viện và trường học sẽ được AI quét lỗ hổng bảo mật 24/7.',
      'Ngăn chặn lừa đảo tinh vi: Sử dụng các mô hình AI mới nhất để phát hiện email giả mạo và phần mềm tống tiền.',
      'Đào tạo nhân sự không chuyên: Cung cấp trợ lý ảo giúp người quản trị thông thường cũng có thể bảo vệ hệ thống an toàn.',
    ],
    nontechGuide: 'Tin tặc ngày càng dùng AI để tấn công vào các cơ quan công cộng như bệnh viện khiến dữ liệu bệnh án bị rò rỉ hoặc hệ thống bị đóng băng. Chương trình Daybreak của OpenAI đóng vai trò như việc "trang bị camera và bảo vệ tinh nhuệ" cho các nơi này, giúp họ chống lại tội phạm mạng mà không tốn chi phí khổng lồ.',
    actionableTip: 'Nhắc nhở quan trọng cho người dùng cá nhân: Khi sử dụng các công cụ AI, hãy chú ý không chia sẻ mật khẩu hoặc thông tin thẻ ngân hàng vào khung chat của bất kỳ ứng dụng nào.',
    ticker: 'OpenAI: Chương trình Daybreak 1 tỷ USD bảo vệ bệnh viện và dịch vụ công',
    publishedAt: '2026-09-03T00:00:00Z',
    shortDate: '03.09',
    readingTimeMinutes: 2,
  },
  {
    slug: 'anthropic-kiem-soat-an-toan-ai-agent',
    category: 'AN TOÀN AGENT',
    sourceName: 'Anthropic',
    sourceUrl: 'https://www.anthropic.com/news/improving-alignment-security-efforts',
    originalTitle: 'Improving our alignment and security practices',
    title: 'Anthropic siết chặt cơ chế “hộp cát” bảo vệ: Ngăn AI tự ý bấm nhầm hoặc xóa file trên máy tính',
    summary: 'Anthropic công bố các tiêu chuẩn kiểm soát mới giúp người dùng yên tâm khi để AI can thiệp vào file làm việc mà không lo bị mất dữ liệu ngoài ý muốn.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Biện pháp cô lập và giám sát an toàn cho AI Agent của Anthropic',
    takeaways: [
      'Chỉ cấp quyền khi bạn đồng ý: AI chỉ được mở hoặc sửa các tệp bạn chỉ định, không thể tự ý lục lọi toàn bộ máy tính.',
      'Có cơ chế hoàn tác: Nếu AI thực hiện sai một thao tác, hệ thống sẽ lưu bản sao lưu để bạn quay lại phiên bản cũ.',
      'Minh bạch quy trình: Người dùng luôn nhìn thấy AI đang định làm gì trước khi nhấn nút cho phép.',
    ],
    nontechGuide: 'Khi bạn cho một người lạ vào nhà giúp dọn dẹp, bạn sẽ muốn họ chỉ ở phòng khách chứ không được mở ngăn kéo phòng ngủ. Cơ chế "Sandbox" (Hộp cát) của Anthropic hoạt động y như vậy: tạo ra một không gian cách ly an toàn để AI làm việc, ngăn ngừa mọi rủi ro làm xáo trộn các phần mềm khác trên máy tính của bạn.',
    actionableTip: 'Khi cài đặt các công cụ AI Agent hoặc MCP, luôn đọc kỹ các thông báo yêu cầu cấp quyền và chỉ cấp quyền vào thư mục dự án thay vì cả ổ đĩa máy tính.',
    ticker: 'Anthropic: Tăng cường cơ chế cách ly an toàn khi AI làm việc trực tiếp trên máy tính',
    publishedAt: '2026-08-31T00:00:00Z',
    shortDate: '31.08',
    readingTimeMinutes: 2,
  },
];

export const newsUpdatedAt = '2026-09-04T12:00:00+07:00';

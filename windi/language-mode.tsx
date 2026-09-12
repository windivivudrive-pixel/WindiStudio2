'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { catalogTranslations } from './catalog-translations';
import { homeTranslations } from './home-translations';

export type WindiLanguage = 'vi' | 'en';
export type LanguageContextValue = {
  language: WindiLanguage;
  setLanguage: (language: WindiLanguage) => void;
  t: (key: string) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = 'windi-language';

// Vietnamese remains the source copy. English reader mode provides instant translation.
const english: Record<string, string> = {
  "Điều hướng chính": "Main navigation",
  "Đăng nhập": "Sign in",
  "Tin mới về AI và công cụ": "Latest AI and tool news",
  "Tin AI đáng biết,": "AI news worth knowing,",
  "để dùng được ngay.": "so you can use it right away.",
  "Không phải feed AI vô tận. Đây là các cập nhật có thể làm thay đổi cách bạn chọn tool, giao việc cho agent hoặc dựng workflow.": "Not an endless AI feed. These are updates that can change how you choose a tool, delegate to an agent, or build a workflow.",
  "Đợt quét đầu tiên:": "First source check:",
  "Crawler quét nguồn mới mỗi 2 giờ. Tin mới vào hàng duyệt trước khi lên trang.": "The crawler checks new sources every 2 hours. New items enter review before appearing on the site.",
  "GitHub hướng dẫn chạy nhiều AI agent song song trong cùng một dự án": "GitHub explains how to run multiple AI agents in parallel on one project",
  "GitHub mô tả cách tách các nhiệm vụ thành những phiên Copilot độc lập để agent không dẫm chân nhau. Với người dùng Windi, đây là cách dễ áp dụng khi muốn một agent tìm tool, một agent cài, và một agent kiểm tra kết quả.": "GitHub describes splitting tasks into independent Copilot sessions so agents do not step on each other. For Windi users, this is a practical pattern: one agent finds a tool, one installs it, and one verifies the outcome.",
  "Tiêu đề gốc:": "Original title:",
  "Nguồn gốc": "Original source",
  "Google DeepMind đưa “agentic video understanding” của Gemini vào danh sách cập nhật mới": "Google DeepMind adds Gemini’s agentic video understanding to its latest updates",
  "Google DeepMind vừa đưa bài giới thiệu về khả năng hiểu video theo kiểu agent lên trang News. Đây là tín hiệu đáng theo dõi cho Video Kits: các công cụ làm video đang dịch chuyển từ “tạo từng asset” sang hiểu và xử lý cả quy trình.": "Google DeepMind has added an introduction to agentic video understanding to its News page. For Video Kits, this is worth watching: video tools are moving from generating single assets toward understanding and handling an entire workflow.",
  "OpenAI công bố Daybreak hỗ trợ các đội ngũ bảo vệ hạ tầng thiết yếu": "OpenAI announces Daybreak support for teams protecting essential infrastructure",
  "OpenAI giới thiệu Daybreak for Frontline Defenders, một chương trình kết hợp quyền truy cập, đào tạo và hỗ trợ kỹ thuật cho các tổ chức bảo vệ hạ tầng thiết yếu. Tin này nhắc người dùng Windi rằng với các tool có quyền truy cập hệ thống, an toàn luôn phải đi cùng hiệu quả.": "OpenAI introduces Daybreak for Frontline Defenders, combining access, training, and technical support for organizations protecting essential infrastructure. It is a reminder that tools with system access need safety alongside usefulness.",
  "Anthropic cập nhật các biện pháp giám sát và cô lập cho AI agent": "Anthropic updates monitoring and isolation practices for AI agents",
  "Anthropic chia sẻ các thay đổi về giám sát, sandbox và quy trình đánh giá agent sau các sự cố trong môi trường kiểm thử. Đây là checklist nền tảng khi dùng agent cài repo hoặc chạy workflow: chỉ cấp quyền vừa đủ và luôn xem lại đầu ra.": "Anthropic shares changes to monitoring, sandboxes, and agent evaluations following incidents in test environments. The practical checklist when an agent installs a repo or runs a workflow: grant only necessary access and always review the result.",
  "Ưu tiên tin chính chủ, có ích cho người dùng.": "Prioritize first-party news that helps users.",
  "Windi không biến News thành chỗ tổng hợp tin giật gân. Mỗi tin phải có nguồn trực tiếp và một lý do rõ ràng: nó giúp bạn dùng tool, làm video hoặc giao việc cho AI tốt hơn thế nào.": "Windi does not turn News into a clickbait feed. Every item needs a direct source and a clear reason: how it helps you use a tool, make a video, or delegate to AI better.",
  "Windi không biến News thành chỗ tổng hợp tin giật gân. Crawler chỉ đọc nguồn đã whitelist; bài mới nằm trong hàng duyệt, không tự xuất bản.": "Windi does not turn News into a clickbait feed. The crawler only reads whitelisted sources; new items stay in review and are never auto-published.",
  "Đăng nhập bằng tài khoản khác": "Sign in with another account",
  "Submit": "Submit",
  "Submit resource": "Submit a resource",
  "Ủng hộ Windi": "Support Windi",
  "Tìm kiếm": "Search",
  "Tìm công cụ AI cho công việc mỗi ngày.": "Find AI tools for your everyday work.",
  "Mở menu": "Open menu",
  "Đóng menu": "Close menu",
  "CÔNG CỤ AI CHO CÔNG VIỆC MỖI NGÀY": "AI TOOLS FOR EVERYDAY WORK",
  "Tìm đúng AI.": "Find the right AI.",
  "Nhẹ việc hơn.": "Make work lighter.",
  "Viết bài, làm video, tạo giọng đọc hay phát triển kênh — chọn công cụ phù hợp và xem cách bắt đầu bằng tiếng Việt.": "Write, make videos, create voice-overs, or grow your channel — choose a suitable tool and see how to get started.",
  "công cụ để khám phá": "tools to explore",
  "TÌM CÔNG CỤ": "FIND A TOOL",
  "Bạn đang muốn làm gì?": "What do you want to do?",
  "Làm video": "Make videos",
  "Viết bài": "Write content",
  "Mạng xã hội": "Social media",
  "Tạo giọng đọc": "Create voice-overs",
  "Thiết kế": "Design",
  "Tìm bằng công việc bạn cần làm hoặc tên công cụ.": "Search by the work you need to do or by a tool name.",
  "THEO MỤC ĐÍCH": "BROWSE BY GOAL",
  "Bạn muốn làm gì hôm nay?": "What would you like to do today?",
  "Mọi danh mục": "All categories",
  "HOT · Nhiều sao GitHub": "HOT · Most GitHub stars",
  "KHÁM PHÁ": "EXPLORE",
  "Một công cụ cho việc bạn đang cần.": "A tool for the work you need.",
  "Xem tất cả": "View all",
  "LẦN ĐẦU ĐẾN WINDI?": "NEW TO WINDI?",
  "Bắt đầu từ một việc nhỏ.": "Start with one small task.",
  "Tìm công cụ của bạn": "Find your tool",
  "Chọn việc bạn cần làm, mở công cụ để xem ví dụ áp dụng, rồi làm theo phần hướng dẫn bắt đầu. Chi phí, tài khoản và yêu cầu cài đặt nằm trong phần “Cần biết trước khi dùng”.": "Pick a task, open a tool to see an example, then follow the getting-started guide. Costs, accounts, and setup requirements are in “Things to know first.”",
  "Chọn việc bạn cần làm, mở công cụ để xem ví dụ áp dụng, rồi lưu vào Toolbox cá nhân hoặc xem lệnh cài đặt 1-click cho AI Agent của bạn.": "Pick a task, open the tool to view use cases, then save it to your personal Toolbox or view 1-click install commands for your AI Agent.",
  "Không chỉ tìm tool.": "Don’t just find tools.",
  "Bắt đầu làm video.": "Start making videos.",
  "VIDEO KITS · SẮP RA MẮT": "VIDEO KITS · COMING SOON",
  "Khám phá Video Kits": "Explore Video Kits",
  "Một không gian riêng cho bộ quy trình làm video: từ chuẩn bị môi trường đến thành phẩm. Khám phá bản xem trước trong lúc Windi hoàn thiện kit đầu tiên.": "A dedicated space for a video-making workflow: from setting up your environment to the finished result. Explore the preview while Windi completes its first kit.",
  "Bạn cần AI giúp việc gì?": "What do you need AI to help with?",
  "Chọn mục đích, xem công cụ phù hợp và tìm hiểu cách bắt đầu.": "Choose a goal, see suitable tools, and learn how to get started.",
  "Mọi mục đích": "All goals",
  "Lọc thêm theo loại công cụ": "Filter by tool type",
  "Tất cả loại": "All types",
  "Xóa bộ lọc HOT": "Clear HOT filter",
  "Xóa bộ lọc TRENDING": "Clear TRENDING filter",
  "công cụ": "tools",
  "CÔNG CỤ NÀY GIÚP GÌ?": "WHAT DOES THIS TOOL DO?",
  "Xem cách bắt đầu": "See how to get started",
  "Mở trang công cụ": "Open tool website",
  "BẮT ĐẦU DÀNH CHO NGƯỜI MỚI": "GET STARTED FOR BEGINNERS",
  "Dùng khi nào?": "When should you use it?",
  "Bắt đầu ra sao?": "How do you start?",
  "Cần biết trước khi dùng": "Things to know first",
  "Mở hướng dẫn cài đặt chính chủ": "Open the official setup guide",
  "ĐIỂM ĐÁNG CHÚ Ý": "KEY HIGHLIGHTS",
  "TÁC GIẢ & NGUỒN THAM KHẢO": "AUTHOR & SOURCES",
  "Số liệu ngày": "Figures recorded on",
  "Dự án cập nhật:": "Project updated:",
  "Trang GitHub của tác giả": "Author’s GitHub page",
  "Tài liệu hướng dẫn gốc": "Original documentation",
  "THÔNG TIN THÊM": "MORE INFO",
  "TRẢI NGHIỆM TỪ CỘNG ĐỒNG": "COMMUNITY EXPERIENCES",
  "Xem cách mọi người sử dụng công cụ qua ảnh, video và chia sẻ thực tế.": "See how people use this tool through images, videos, and real-world stories.",
  "Gửi một tool đáng được kiểm tra.": "Submit a tool worth reviewing.",
  "Submission là miễn phí. Resource chỉ xuất hiện công khai sau khi được duyệt.": "Submissions are free. Resources only appear publicly once approved.",
  "ĐANG TẢI": "LOADING",
  "Đang tìm công cụ cho bạn…": "Finding tools for you…",
  "THỬ LẠI NHÉ": "PLEASE TRY AGAIN",
  "Chưa tải được trang": "This page could not be loaded",
  "Bạn thử tải lại sau một lát nhé.": "Please try again in a moment.",
  "Thử lại": "Try again",
  "Cài đặt tài khoản và trải nghiệm.": "Account and experience settings.",
  "Bạn chưa lưu resource nào.": "You have not saved any resources.",
  "Tạo stack đầu tiên của bạn.": "Create your first stack.",
  "Danh mục theo mục đích": "Browse by goal",
  "Công cụ được quan tâm": "Popular tools",
  "Liên kết cuối trang": "Footer links",
  "Bắn vịt pixel": "Shoot pixel duck",
  "Tắt chuyển động trang trí": "Turn off decorative motion",
  "Bật chuyển động trang trí": "Turn on decorative motion",
  "sao GitHub": "GitHub stars",
  "fork": "forks",
  "WINDI STUDIO  · Tìm công cụ AI cho công việc mỗi ngày.": "WINDI STUDIO · Find AI tools for your everyday work.",
  "Social & Marketing": "Social & Marketing",
  "Content & Viết lách": "Content & Writing",
  "Video & Phụ đề": "Video & Captions",
  "Voice & Âm nhạc": "Voice & Music",
  "Ảnh & Đồ họa AI": "AI Images & Graphics",
  "SEO & Analytics": "SEO & Analytics",
  "Design & Frontend": "Design & Frontend",
  "Research & Ý tưởng": "Research & Ideas",
  "Tự động hóa": "Automation",
  "Tech & Bảo mật": "Tech & Security",
  "Mở Toolbox cá nhân": "Open personal Toolbox",
  "Tài khoản cá nhân": "User account",
  "Đăng xuất": "Log out",
  "Điều hướng di động": "Mobile navigation",
  "USER PROFILE": "USER PROFILE",
  "My Toolbox": "My Toolbox",
  "Submit Tool": "Submit Tool",
  "Đăng nhập bằng tài khoản Google của bạn.": "Sign in with your Google account.",
  "Chào mừng trở lại.": "Welcome back.",
  "ACCOUNT ACCESS": "ACCOUNT ACCESS",
  "Đăng nhập chưa hoàn tất. Vui lòng thử lại.": "Sign-in could not be completed. Please try again.",
  "My Toolbox · Hộp đồ nghề AI cá nhân": "My Toolbox · Personal AI Toolbox",
  "My Toolbox · Hộp đồ nghề AI": "My Toolbox · AI Toolbox",
  "Quản lý, tổng hợp và xuất lệnh cho toàn bộ Skill, MCP, Workflow trong bộ công cụ AI của bạn.": "Manage, aggregate, and export commands for all Skills, MCPs, and Workflows in your toolbox.",
  "Quản lý bộ công cụ AI cá nhân của bạn trên Windi.": "Manage your personal AI toolset on Windi.",
  "Bộ công cụ AI cá nhân của bạn.": "Your personal AI toolkit.",
  "Chưa có công cụ nào trong Toolbox của bạn.": "No tools in your Toolbox yet.",
  "TOOLBOX ĐANG TRỐNG": "TOOLBOX IS EMPTY",
  "COPY TẤT CẢ LỆNH CÀI ĐẶT": "COPY ALL INSTALL COMMANDS",
  "ĐÃ COPY TẤT CẢ LỆNH!": "ALL COMMANDS COPIED!",
  "ĐÃ TẢI FILE JSON!": "JSON FILE DOWNLOADED!",
  "Đã kết nối tài khoản & đồng bộ Cloud": "Account connected & Cloud synced",
  "trình duyệt tạm": "temporary browser",
  "Bạn có chắc muốn dọn sạch Toolbox cá nhân?": "Are you sure you want to clear your personal Toolbox?",
  "Dọn sạch Toolbox": "Clear Toolbox",
  "Xuất JSON": "Export JSON",
  "Xóa khỏi Toolbox": "Remove from Toolbox",
  "Thêm vào Toolbox": "Add to Toolbox",
  "Đã có trong Toolbox": "In Toolbox",
  "+ THÊM VÀO TOOLBOX ĐỂ GHÉP STACK": "+ ADD TO TOOLBOX TO ASSEMBLE STACK",
  "ĐÃ THÊM VÀO MY TOOLBOX": "ADDED TO MY TOOLBOX",
  "ĐÃ THÊM VÀO TOOLBOX": "ADDED TO TOOLBOX",
  "ĐÃ CÓ TRONG TOOLBOX": "IN TOOLBOX",
  "Xem nhanh": "Quick view",
  "Mở trang đầy đủ": "Open full page",
  "Đóng cửa sổ": "Close window",
  "Tương thích Agent:": "Agent compatibility:",
  "Về công cụ này": "About this tool",
  "CÀI ĐẶT NHANH (CLI / AGENT)": "QUICK INSTALL (CLI / AGENT)",
  "CÀI ĐẶT NHANH (TERMINAL)": "QUICK INSTALL (TERMINAL)",
  "Lệnh cài đặt cho Coding Agents": "Install command for Coding Agents",
  "ĐÃ COPY": "COPIED",
  "Sao chép câu lệnh dưới đây và dán vào terminal của dự án hoặc cửa sổ chat của AI Assistant.": "Copy the command below and paste it into your project terminal or AI assistant chat window.",
  "Gõ lệnh trên trực tiếp trong terminal hoặc nhập trong chat": "Run the command above directly in terminal or enter in chat",
  "Hướng dẫn cài đặt chi tiết": "Detailed installation guide",
  "Hướng dẫn theo Agent:": "Agent guide:",
  "Cấu hình file": "File configuration",
  "Tải MCP server tương ứng qua Settings hoặc đưa rules vào file": "Install corresponding MCP server via Settings or add rules to config file",
  "Cách phối hợp trong một Stack": "How to combine in a Stack",
  "Khởi tạo & Chỉ thị": "Init & Instructions",
  "Định hình & Chỉ thị": "Shape & Instruct",
  "Thực thi & Tự kiểm chứng": "Execute & Self-verify",
  "Kiểm thử & Xác thực": "Test & Validate",
  "Đóng gói & Lưu trữ": "Package & Archive",
  "Tạo sức mạnh cộng hưởng": "Create synergy",
  "Một công cụ riêng lẻ khó có thể tự kiểm tra hoặc hoàn tất toàn bộ quy trình. Bộ Stack này được ghép lại để các công cụ bổ trợ cho nhau một cách nhịp nhàng.": "A single tool rarely covers the entire workflow. This Stack is assembled so tools complement each other smoothly.",
  "Agent thực hiện công việc và sử dụng browser automation để kiểm tra kết quả hiển thị thực tế.": "Agent performs the task and uses browser automation to verify the actual UI output.",
  "Kết hợp cùng Playwright MCP hoặc QA Workflow để kiểm tra sản phẩm thực tế.": "Combine with Playwright MCP or QA Workflow to test real-world products.",
  "Lưu tổ hợp này vào Stack cá nhân trong": "Save this combination to your personal Stack in",
  "Lưu vào Stack": "Save to Stack",
  "để dùng lại bất kỳ lúc nào.": "to reuse anytime.",
  "để ghép thành Stack tái sử dụng.": "to assemble into reusable Stacks.",
  "ĐÃ DUYỆT": "APPROVED",
  "Được kiểm định độc lập": "Independently verified",
  "Chưa chấm điểm": "Unscored",
  "Ghi chú từ Biên tập viên Windi": "Notes from Windi Editor",
  "Công cụ đã được đội ngũ Windi kiểm định kỹ lưỡng về độ bảo mật, tính cập nhật và giá trị thực tế cho quy trình AI coding.": "Thoroughly audited by the Windi team for security, freshness, and real-world value in AI coding workflows.",
  "Công cụ hoạt động ổn định trên Node 18+ và Python 3.10+. Khuyến nghị kiểm tra cấu hình mạng nếu chạy trong môi trường sandbox cô lập.": "Runs stably on Node 18+ and Python 3.10+. Check network configuration when running inside isolated sandboxes.",
  "Thiết lập theo công cụ bạn sử dụng:": "Configure according to your chosen tool:",
  "Hoạt động tốt với:": "Works well with:",
  "Kiểm định An toàn": "Safety Verified",
  "Đường dẫn": "Path",
  "Công cụ hỗ trợ coding agent tối ưu hóa quy trình làm việc, loại bỏ các lỗi thiết kế phổ biến và nâng cao chất lượng code tự sinh.": "Helps coding agents optimize workflows, eliminate common design bugs, and elevate the quality of generated code.",
  "ĐÃ COPY LINK!": "LINK COPIED!",
  "ĐÃ COPY TẤT CẢ!": "ALL COPIED!",
  "Đang tìm kiếm…": "Searching…",
  "Chưa có công cụ được duyệt phù hợp.": "No matching approved tools found.",
  "Chưa tải được danh mục. Vui lòng thử lại.": "Failed to load catalog. Please try again.",
  "Tìm kiếm Windi": "Search Windi",
  "Tìm Skills, MCPs, workflows...": "Search Skills, MCPs, workflows...",
  "Tìm trong Windi": "Search within Windi",
  "Đóng tìm kiếm": "Close search",
  "Gợi ý tác vụ phổ biến:": "Popular suggested tasks:",
  "VD: Tôi muốn Codex thiết kế website đẹp hơn...": "E.g., I want Codex to design prettier websites...",
  "🎨 Thiết kế website đẹp với Codex": "🎨 Design great websites with Codex",
  "⚡ Fullstack App với Supabase": "⚡ Fullstack App with Supabase",
  "🎬 Làm video bằng code Remotion": "🎬 Make videos with Remotion code",
  "📈 Tự động hóa SEO & Deep Research": "📈 Automated SEO & Deep Research",
  "TỔ HỢP ĐỀ XUẤT CHO BẠN": "RECOMMENDED SUITE FOR YOU",
  "Tôi muốn Codex thiết kế website đẹp hơn": "I want Codex to design prettier websites",
  "Bộ 4 công cụ chuẩn định hình visual, bổ sung micro-spacing và tự kiểm tra lỗi hiển thị.": "4-tool suite to shape visuals, add micro-spacing, and verify UI regressions.",
  "Lập trình Fullstack web có database và authentication": "Fullstack web development with database and authentication",
  "Tối ưu cho coding agent: Tra cứu docs mới nhất, sinh migration database và tự động test code.": "Optimized for coding agents: Fetch latest docs, generate database migrations, and test code.",
  "Tạo video tự động bằng code React": "Automated video creation using React code",
  "Quy trình tạo video programmatic bằng code có cấu trúc, nhịp kể chuyện tốt và tự review khung hình.": "Programmatic video workflow with clean code, storytelling rhythm, and frame verification.",
  "Nghiên cứu tài liệu sâu và viết bài chuẩn SEO": "Deep research and SEO-optimized technical writing",
  "Biến AI thành chuyên gia nghiên cứu độc lập và sản xuất nội dung kỹ thuật xếp hạng organic search cao.": "Turn AI into an independent research specialist producing organic high-ranking technical content.",
  "Đã duyệt": "Approved",
  "Đóng popup": "Close popup",
  "Xóa tìm kiếm": "Clear search",
  "Skill chính": "Primary skill",
  "Thiết kế đồ họa": "Graphic design",
  "Chuẩn hóa UI/UX": "UI/UX standardization",
  "Định hình phong cách, màu sắc và checklist UX": "Define style, palette, and UX checklist",
  "Tinh chỉnh micro-interactions và spacing nhịp nhàng": "Tune micro-interactions and refined spacing",
  "Bổ sung visual quality": "Enhance visual quality",
  "Cho agent mở browser thật để chụp màn hình và test UI": "Let agents open real browsers to screenshot and test UI",
  "Kiểm thử thực tế": "Real-world testing",
  "Tự động dò lỗi responsive và visual regression": "Auto-detect responsive bugs and visual regressions",
  "Review tự động": "Automated review",
  "Trích xuất docs mới": "Extract fresh docs",
  "Tra cứu API Next.js 16 và React 19 không bị lỗi cũ": "Lookup Next.js 16 and React 19 APIs without outdated hallucinations",
  "Quản lý Backend": "Manage Backend",
  "Tự sinh schema, RLS policies và migration an toàn": "Auto-generate schema, safe RLS policies, and migrations",
  "Chạy automated test các luồng đăng nhập, thanh toán": "Run automated tests for auth and checkout flows",
  "Kiểm thử E2E": "E2E Testing",
  "Tạo form và dashboard chuẩn responsive, accessible": "Build responsive, accessible forms and dashboards",
  "Cấu trúc component video React chuẩn nhịp timeline": "Structure React video components on timeline rhythm",
  "Kiểm tra khung hình": "Frame inspection",
  "Đảm bảo render video không bị giật lag hay sai lệch": "Ensure smooth video rendering without jitter or drift",
  "Tạo typography và hiệu ứng chuyển cảnh mượt": "Craft typography and smooth transition effects",
  "Nghiên cứu sâu": "Deep Research",
  "Đào sâu tài liệu PDF, GitHub và whitepapers khoa học": "Drill into PDFs, GitHub repos, and scientific whitepapers",
  "Thu thập thực tế": "Live collection",
  "Quét dữ liệu bảng xếp hạng tìm kiếm Google thực tế": "Fetch real-time Google search rankings data",
  "Tối ưu kỹ thuật SEO": "Technical SEO optimization",
  "Chuẩn hóa cấu trúc heading, meta tags và schema JSON-LD": "Standardize headings, meta tags, and JSON-LD schema",
  "Tìm theo tên tool, mục đích, kỹ năng...": "Search by tool name, purpose, skill...",
  "Tìm công cụ": "Find tools",
  "Tìm": "Search",
  "Tìm nội dung": "Search content",
  "bài": "articles",
  "giao diện": "interfaces",
  "thiết kế": "design",
  "viết": "write",
  "CHẾ ĐỘ MÀN HÌNH LÀM VIỆC:": "WORKSPACE DESKTOP MODE:",
  "Màn hình làm việc cá nhân hóa cho workflow của bạn.": "Personalized desktop for your AI workflow.",
  "Những bộ công cụ hoàn chỉnh để giải quyết một bài toán.": "Complete tool suites designed to solve a single problem.",
  "Thịnh hành": "Trending",
  "5 ĐỀ XUẤT MỚI CHO CODEX": "5 NEW RECOMMENDATIONS FOR CODEX",
  "“Muốn làm việc này với Codex/Claude thì dùng các thứ này cùng nhau.”": "“If you want to do this with Codex or Claude, use these together.”",
  "KEEP WINDI ONLINE ♥": "KEEP WINDI ONLINE ♥",
  "✦ DONATE FOR INDEPENDENCE": "✦ DONATE FOR INDEPENDENCE",
  "Help us test more tools, review more repos and keep Windi independent.": "Help us test more tools, review more repos and keep Windi independent.",
  "Ủng hộ để Windi tiếp tục trải nghiệm thực tế từng công cụ AI, rà soát repo độc lập và hoàn toàn không nhận tài trợ thiên vị.": "Support Windi to keep hands-on testing every AI tool, auditing repos independently with zero sponsored bias.",
  "CHỌN MỨC ỦNG HỘ // PRESET": "CHOOSE SUPPORT LEVEL // PRESET",
  "1 ly cà phê ☕": "1 cup of coffee ☕",
  "2 ly cà phê ☕☕": "2 cups of coffee ☕☕",
  "Server & AI ⚡": "Server & AI ⚡",
  "[ Tùy chọn ]": "[ Custom ]",
  "Số tiền khác": "Other amount",
  "Nhập số tiền muốn ủng hộ (VNĐ):": "Enter donation amount (VND):",
  "Ví dụ: 50.000": "E.g., 50,000",
  "Tên / Nickname (tùy chọn):": "Name / Nickname (optional):",
  "Ẩn danh / Bạn bè Windi...": "Anonymous / Friend of Windi...",
  "Lời nhắn gửi (tùy chọn):": "Message (optional):",
  "Gửi một lời nhắn động viên tới tác giả...": "Send an encouraging message to the author...",
  "Số tiền tối thiểu là 10.000đ.": "Minimum amount is 10,000 VND.",
  "QUÉT MÃ VIETQR QUA APP NGÂN HÀNG HOẶC MOMO": "SCAN VIETQR WITH BANKING APP OR MOMO",
  "Cảm ơn bạn đã tiếp sức cho Windi!": "Thank you for supporting Windi!",
  "Mở ứng dụng ngân hàng hoặc ví điện tử bất kỳ và quét mã bên dưới:": "Open any banking app or e-wallet and scan the QR code below:",
  "Số tiền:": "Amount:",
  "Ngân hàng:": "Bank:",
  "Số tài khoản:": "Account number:",
  "Chủ tài khoản:": "Account holder:",
  "Nội dung CK:": "Transfer memo:",
  "Chép": "Copy",
  "Đã chép": "Copied",
  "Chọn lại mức khác": "Choose another amount",
  "Đã chuyển khoản xong ♥": "Transfer completed ♥",
  "Cảm ơn bạn rất nhiều!": "Thank you very much!",
  "Sự đồng hành và ủng hộ từ bạn là nguồn năng lượng quý giá nhất giúp Windi giữ trọn cam kết:": "Your companionship and support are the most valuable fuel helping Windi stay true to our pledge:",
  "biên tập độc lập, kiểm nghiệm trung thực và không ngừng săn tìm công cụ hữu ích.": "independent curation, honest testing, and relentlessly hunting useful tools.",
  "Người bạn ẩn danh": "Anonymous friend",
  "Ủng hộ thêm lần nữa": "Support again",
  "Keep Windi Online ♥ · Ủng hộ Windi Studio": "Keep Windi Online ♥ · Support Windi Studio",
  "Help us test more tools, review more repos and keep Windi independent. Ủng hộ Windi trải nghiệm thực tế và tuyển chọn công cụ AI.": "Help us test more tools, review more repos and keep Windi independent. Support Windi in hands-on testing and curated AI tooling.",
  "Giữ Windi luôn độc lập & hữu ích.": "Keep Windi independent & genuinely useful.",
  "CAM KẾT ĐỘC LẬP // TRANSPARENCY PLEDGE": "INDEPENDENCE PLEDGE // TRANSPARENCY PLEDGE",
  "Không mua bán vị trí hay điểm số": "No paid rankings or bought scores",
  "Chi phí được dùng vào đâu?": "Where do funds go?",
  "Cộng đồng là cốt lõi": "Community at our core",
  "Tất cả các công cụ xuất hiện trên Windi đều trải qua quy trình đánh giá dựa trên tài liệu thực tế và trải nghiệm sử dụng. Không có bất kỳ công ty nào có thể trả tiền để được lên trang chủ hay nâng điểm Windi Score.": "All tools featured on Windi undergo an evaluation process based on actual documentation and real usage. No company can pay to get featured on the homepage or inflate their Windi Score.",
  "100% kinh phí ủng hộ được dùng để duy trì server, tài khoản API kiểm thử các model mới, chi trả cho các dịch vụ crawl/kiểm định và hỗ trợ đội ngũ biên tập nội dung chuyên sâu.": "100% of donation funds go directly toward maintaining servers, funding API accounts to test new models, paying for crawl/verification infrastructure, and supporting our in-depth editorial team.",
  "Windi ra đời từ mong muốn giúp anh em làm AI tiết kiệm hàng chục giờ thử nghiệm công cụ rác. Phản hồi và sự đóng góp của cộng đồng chính là la bàn duy nhất định hình danh mục này.": "Windi was born to help fellow AI practitioners save dozens of hours avoiding junk tools. Community feedback and contributions are the sole compass shaping this catalog.",
  "Video Kits — Bản xem trước": "Video Kits — Early Preview",
  "Không gian riêng cho các bộ quy trình làm video của Windi. Xem trước các chặng từ môi trường, ý tưởng, kịch bản đến dựng và xuất video.": "Dedicated space for Windi video workflows. Preview milestones from environment, ideation, scripting to editing and rendering.",
  "KHÔNG GIAN MỚI · BẢN XEM TRƯỚC": "NEW SPACE · EARLY PREVIEW",
  "Một bộ kit.": "One kit.",
  "Cả quy trình video.": "A full video workflow.",
  "Không phải danh sách công cụ rời rạc. Đây là nơi dành cho các bộ hướng dẫn và dự án khởi đầu, để bạn đi từ ý tưởng đến video của riêng mình.": "Not a disconnected list of tools. This is home to step-by-step guides and starter projects to take you from idea to finished video.",
  "KIT ĐẦU TIÊN ĐANG ĐƯỢC CHUẨN BỊ": "FIRST KIT UNDER PREPARATION",
  "Xem hướng đi trước.": "Explore the roadmap ahead.",
  "Quy trình hoàn chỉnh sẽ đến sau.": "Complete workflow coming soon.",
  "Các chặng ở trên chỉ là minh họa. Hướng dẫn cài đặt, bộ công cụ, dự án mẫu và file tải xuống sẽ được bổ sung sau khi quy trình chính thức được hoàn thiện và kiểm thử.": "The steps above are illustrations. Setup guides, tool packages, starter projects, and downloads will be added once the official workflow is finalized and tested.",
  "← Trở lại danh mục công cụ": "← Back to tool catalog",
  "Các chặng minh họa": "Sample milestones",
  "Môi trường": "Environment",
  "Ý tưởng": "Ideation",
  "Kịch bản": "Scripting",
  "Hình ảnh": "Visuals",
  "Phụ đề": "Subtitles",
  "Dựng & xuất": "Edit & Render",
  "Chặng tiếp theo": "Next milestone",
  "Xem lại từ đầu": "Restart preview",
  "Không tải xuống, không chạy tool, không phát sinh phí.": "No download, no local execution, no fees.",
  "Chỗ dành cho hướng dẫn cài môi trường, kiểm tra máy và mở dự án mẫu. Bộ công cụ và cách cài chính thức sẽ được bổ sung cùng kit.": "Space for environment setup, machine verification, and starter template. Official toolkits and install scripts will arrive with the kit.",
  "Kiểm tra yêu cầu máy": "Check hardware specs",
  "Cài các công cụ cần thiết": "Install required tools",
  "Mở dự án mẫu": "Open starter project",
  "Bắt đầu từ điều người xem cần.": "Start from what viewers need.",
  "Minh họa bước chọn chủ đề, đối tượng và mục tiêu của video trước khi viết lời thoại.": "Illustrates choosing topic, target audience, and video objective before drafting scripts.",
  "Chủ đề & người xem": "Topic & audience",
  "Góc kể chuyện": "Story angle",
  "Thông điệp chính": "Core takeaway",
  "Mỗi cảnh đều có nhiệm vụ.": "Every scene has a purpose.",
  "Kịch bản dự kiến gắn lời thoại với hình ảnh, chữ trên màn hình và mục đích của từng cảnh.": "Draft script aligns voiceover with visuals, on-screen text, and scene intent.",
  "01 / Mở câu chuyện": "01 / Hook & Opening",
  "02 / Giải thích & ví dụ": "02 / Breakdown & Examples",
  "03 / Kết & hành động": "03 / Conclusion & Action",
  "Lời thoại đã duyệt": "Approved voiceover draft",
  "Bản thu / giọng tổng hợp": "Recording / Synthesized voice",
  "Chuẩn bị lời đọc và bản thu cho video. Nhà cung cấp voice, chất giọng và các bước kiểm tra sẽ được chốt trong quy trình chính thức.": "Prepare script and recording. Voice provider, tone, and verification steps will be confirmed in official workflow.",
  "Kiểm tra phát âm & nhịp": "Check pronunciation & pacing",
  "Để lời kể quyết định nhịp.": "Let narration dictate the pace.",
  "Hình ảnh đồng nhất": "Consistent visuals",
  "Khu vực minh họa việc chuẩn bị prompt, chọn hình và sắp media theo từng cảnh. Chưa kết nối dịch vụ tạo hình.": "Demonstrates prompt drafting, visual curation, and media staging. Image services not connected yet.",
  "Prompt theo cảnh": "Prompt per scene",
  "Giữ một nhận diện xuyên suốt.": "Maintain unified visual identity.",
  "Chuẩn bị một lần, dùng cho nhiều video.": "Prepare once, use for many videos.",
  "Đối chiếu quyền sử dụng": "Verify licensing rights",
  "Đồng bộ theo lời đọc": "Sync to voiceover",
  "Minh họa bước dùng Whisper để lấy timestamp từ voice và kiểm tra lại phụ đề trước khi dựng.": "Demonstrates using Whisper to extract timestamps and refine subtitles before editing.",
  "Chữ xuất hiện đúng lúc được nói.": "Words appear right as spoken.",
  "Kiểm tra chữ & ngắt dòng": "Review text & line breaks",
  "Ghép lại thành một câu chuyện.": "Assemble into a coherent story.",
  "Remotion là một phần trong hướng dựng dự kiến: ghép hình, voice và phụ đề, xem trước rồi xuất video. Chưa có bản render hay gói tải trong demo này.": "Remotion is part of the roadmap: composite visuals, voiceover, and captions, preview, and render. No local render in this demo.",
  "Timeline hình + voice + chữ": "Visual + Voice + Captions timeline",
  "Xem trước & kiểm tra": "Preview & inspect",
  "Xuất video hoàn chỉnh": "Export finished video",
  "Người dùng": "User",
  "Tác giả / đội ngũ tool": "Author / Tool team",
  "Chưa rõ quan hệ với tool": "Unspecified relationship",
  "Có liên kết thương mại": "Commercial affiliation",
  "Điểm hữu ích:": "Helpful takeaway:",
  "Giới hạn:": "Limitations:",
  "Đọc feedback và thảo luận gốc": "Read original feedback & discussion",
  "Xem ảnh/video trong bài gốc": "View media in original post",
  "Không tải được ảnh. Xem bài gốc.": "Failed to load image. View source post.",
  "Nhấn để tải nội dung từ nền tảng gốc.": "Click to load content from source platform.",
  "Các community thread sẽ dùng resource-centric comments, votes và report workflow sau khi data layer hoạt động.": "Community threads will support resource-centric comments, upvotes, and reporting once the data layer is active.",
  "Submit Resource · Gửi công cụ AI vào Windi Studio": "Submit Resource · Submit an AI tool to Windi Studio",
  "Đề xuất Skill, MCP, Open Source hoặc Workflow cho cộng đồng AI power users.": "Suggest a Skill, MCP, Open Source repo, or Workflow for the AI power user community.",
  "Gửi để biên tập review": "Submit for editorial review",
  "Đang kiểm tra & lưu vào hàng đợi...": "Validating & queuing submission...",
  "Creator / Tác giả chính thức": "Creator / Official Author",
  "Contributor / Người đóng góp code": "Contributor / Code Contributor",
  "User / Người trải nghiệm thực tế": "User / Real-world practitioner",
  "Khác": "Other",
  "SKILL (Hướng dẫn / Quy tắc cho Coding Agent)": "SKILL (Instructions / Rules for Coding Agent)",
  "OPEN SOURCE (Dự án mã nguồn mở)": "OPEN SOURCE (Open-source project)",
  "WORKFLOW (Quy trình mẫu tự động hóa)": "WORKFLOW (Automated workflow template)",
  "Tool này giải quyết vấn đề gì, bạn hay cộng đồng dùng nó hiệu quả thế nào?": "What problem does this tool solve, and how do you or the community use it effectively?",
  "Duyệt công cụ · Windi": "Review Tools · Windi",
  "Biên tập công cụ · Windi": "Edit Tool · Windi",
  "Tất cả trạng thái": "All statuses",
  "Chờ duyệt": "Pending review",
  "Đang xem": "Under review",
  "Đã public": "Published",
  "Không dùng": "Deprecated",
  "Lưu trữ": "Archived",
  "Từ chối": "Reject",
  "Public ngay": "Publish now",
  "Xem trang công khai": "View public page",
  "ĐỐI CHIẾU NGUỒN": "SOURCE CROSS-CHECK",
  "LỊCH SỬ DUYỆT": "REVIEW AUDIT LOG",
  "← Hàng đợi": "← Back to queue",
  "Không có quyền biên tập.": "No editorial permissions.",
  "Không tải được công cụ.": "Failed to load tool.",
  "Tài khoản chưa có quyền biên tập": "Account does not have editorial permissions",
  "Trang này chỉ dành cho tài khoản được quản trị viên cấp quyền.": "This page is restricted to admin-approved accounts.",
  "Bộ sưu tập": "Collection",
  "Sắp xếp": "Sort",
  "Thứ tự biên tập": "Editorial order",
  "Nhiều sao GitHub": "Most GitHub stars",
  "Toàn bộ, kể cả lưu trữ": "All, including archived",
  "Chưa có mô tả": "No description yet",
  "Danh sách đã được cập nhật.": "List updated successfully.",
  "Chưa có quyết định biên tập.": "No editorial decisions yet.",
  "Chưa lưu được. Tải lại danh sách rồi thử lại.": "Failed to save. Reload the list and try again.",
  "Hồ sơ vừa được sửa ở phiên khác. Danh sách đã tải lại.": "Resource was modified in another session. List reloaded.",
  "Không nhận diện được hồ sơ cần duyệt.": "Cannot identify resource to review.",
  "Không tìm thấy hồ sơ này trong danh mục.": "Resource not found in catalog.",
  "Đã public. Công cụ sẽ xuất hiện trong danh mục công khai.": "Published. The tool will appear in the public catalog.",
  "Đã từ chối công cụ. Hồ sơ đã chuyển sang mục Không dùng và không hiện ở hàng chờ nữa.": "Rejected. Resource moved to Deprecated and removed from queue.",
  "Easy Prompt sẵn sàng": "Easy Prompt ready",
  "Easy Prompt cần tạo lại": "Easy Prompt stale",
  "Easy Prompt lỗi": "Easy Prompt failed",
  "Easy Prompt đang chuẩn bị": "Easy Prompt generating",
  "Tài khoản này không có quyền xuất bản.": "This account does not have publishing permissions.",
  "Thấy hữu ích? Public ngay.": "Looks good? Publish now.",
  "Xóa tín hiệu": "Clear signal",
  "Trang trước": "Previous page",
  "Bàn làm việc AI.": "AI Workspace.",
  "Bắt đầu từ công việc bạn đang làm.": "Start from the work you are doing.",
  "Kho ứng dụng AI được tuyển chọn": "Curated AI App Catalog",
  "Lấy đúng Tool. Ghép đúng Stack.": "Pick the right Tools. Assemble the right Stacks.",
  "Ứng dụng AI dành cho bạn": "AI Apps for your workflow",
  "Trải nghiệm thật, có bài nguồn.": "Real experience, cited sources.",
  "Mỗi Skill, MCP hay Workflow được trình bày như một phần mềm nhỏ — chọn công cụ, lưu vào Toolbox cá nhân và kết hợp thành quy trình hoàn chỉnh.": "Every Skill, MCP, or Workflow is structured like a lightweight app — pick your tool, save it to your Toolbox, and connect it into an end-to-end workflow.",
  "Chọn mục đích, mở ứng dụng để kiểm tra tiêu chuẩn và thêm vào My Toolbox để ghép Stack.": "Pick a goal, inspect standards, and add to My Toolbox to assemble Stacks.",
  "Lọc theo mục đích": "Filter by goal",
  "Lọc thêm theo loại ứng dụng (.EXE)": "Filter by app type (.EXE)",
  "Lọc theo tín hiệu GitHub": "Filter by GitHub signals",
  "Chưa tìm thấy công cụ phù hợp.": "No matching tools found.",
  "Thử một từ khóa ngắn hơn hoặc chọn loại resource khác.": "Try a shorter keyword or choose another resource category.",
  "Tải lại danh mục": "Reload catalog",
  "Công cụ mới sẽ sớm có mặt.": "New tools coming soon.",
  "Bạn có thể quay lại sau để khám phá thêm công cụ.": "You can return later to discover more tools.",
  "PRICING": "PRICING",
  "SUPPORT WINDI": "SUPPORT WINDI",
  "Public knowledge vẫn là free.": "Public knowledge remains free.",
  "Giúp Windi review thêm tool tốt.": "Help Windi review more quality tools.",
  "Thanh toán mới chưa mở. Editorial score không phụ thuộc khoản ủng hộ.": "New payments not open yet. Editorial score never depends on donations.",
  "ONE-TIME SUPPORT": "ONE-TIME SUPPORT",
  "FREE": "FREE",
  "WINDI PRO": "WINDI PRO",
  "Khám phá dữ liệu công khai đã được biên tập.": "Explore curated public data.",
  "Chưa kích hoạt thanh toán cho gói này.": "Checkout not yet activated for this tier.",
  "Sắp mở": "Coming soon",
  "Miễn phí": "Free",
  "Windi Pro · 99.000đ/tháng": "Windi Pro · 99,000 VND/month",
  "Windi Pro · 790.000đ/năm": "Windi Pro · 790,000 VND/year",
  "49.000đ": "49,000 VND",
  "99.000đ": "99,000 VND",
  "199.000đ": "199,000 VND",
  "499.000đ": "499,000 VND",
  "Windi Score không thể được mua.": "Windi Score cannot be bought.",
  "Utility, maintenance, adoption, security, documentation, originality, compatibility và setup đều được lưu riêng, có lịch sử thay đổi và lý do editor override.": "Utility, maintenance, adoption, security, documentation, originality, compatibility, and setup are stored separately with audit trails and editor override justifications.",
  "4 ○ 4": "4 ○ 4",
  "RESOURCE NOT FOUND": "RESOURCE NOT FOUND",
  "Có vẻ resource này đã thoát khỏi toolbox.": "Looks like this resource left the toolbox.",
  "Quay lại Trang chủ": "Back to Homepage",
  "Không tải được danh mục.": "Failed to load catalog.",
  "Không tải được danh mục Supabase.": "Failed to load Supabase catalog.",
  "Chức năng này chưa hoàn tất kết nối dữ liệu. Các tác vụ chỉ được bật khi backend và quyền truy cập tương ứng đã được kiểm thử.": "This feature has not finalized data connectivity. Actions will only be enabled after backend and permissions testing.",
  "Dán vào Claude, Codex hoặc Antigravity để bắt đầu.": "Paste this into Claude, Codex, or Antigravity to get started.",
  "Easy Prompt bằng tiếng Việt": "Easy Prompt in Vietnamese",
  "Đã sao chép": "Copied",
  "Sao chép Easy Prompt": "Copy Easy Prompt",
  "Nguồn chính chủ ↗": "Official source ↗",
  "Tài liệu chính chủ bổ sung ↗": "Additional official documentation ↗",
  "Bấm để bắn · Enter / Space khi dùng bàn phím": "Click to shoot · Enter / Space with keyboard",
  "Chuyển động: bật": "Motion: On",
  "Chuyển động: tắt": "Motion: Off",
  "Giảm chuyển động": "Reduced motion",
  "Chuyển động đã giảm theo cài đặt thiết bị": "Motion reduced per device settings",
  "Lên lịch bài, phát triển kênh và nuôi cộng đồng.": "Schedule posts, grow channels, and build community.",
  "Ý tưởng, giọng thương hiệu, kịch bản và bài viết.": "Ideas, brand voice, scripts, and articles.",
  "Tạo, dựng, dịch và tái sử dụng video.": "Create, edit, subtitle, and repurpose video.",
  "Thuyết minh, nhận diện lời nói và xử lý âm thanh.": "Voice-overs, speech recognition, and audio processing.",
  "Tạo ảnh, chỉnh sửa, nâng chất lượng và hình đại diện.": "Generate images, edit, upscale, and create avatars.",
  "Tìm cơ hội tìm kiếm, đo hiệu quả và tối ưu nội dung.": "Find search opportunities, measure results, and optimize content.",
  "Landing page, slide, sơ đồ và thiết kế giao diện.": "Landing pages, slides, diagrams, and UI design.",
  "Đọc nguồn, tìm đề tài và tổng hợp nghiên cứu.": "Read sources, brainstorm topics, and synthesize research.",
  "Nối các bước thành quy trình làm việc có kiểm soát.": "Chain steps into controlled, reliable workflows.",
  "Một số công cụ kỹ thuật nổi bật được chọn lọc.": "Curated high-impact technical and security utilities.",
  "Design intelligence & reasoning rules cho coding agents.": "Design intelligence & reasoning rules for coding agents.",
  "Skill giúp Codex, Claude và Cursor thiết kế UI chuyên nghiệp với 79 phong cách, 192 bảng màu theo từng ngành và checklist kiểm tra UX/accessibility tự động.": "Skill that helps Codex, Claude, and Cursor design pro UIs with 79 styles, 192 domain palettes, and automated UX/accessibility checklists.",
  "Cung cấp cho AI một bộ tiêu chuẩn thiết kế có căn cứ (contrast, responsive, typography) thay vì để AI sinh ra các giao diện generic, màu tím neon nhàm chán.": "Provides AI with principled design standards (contrast, responsive, typography) instead of generic, neon-purple templates.",
  "Quản lý schema, migration, RLS policy và SQL queries cho agent.": "Manage schema, migrations, RLS policies, and SQL queries for agents.",
  "Kết nối an toàn giữa AI agent và database Supabase, hỗ trợ generate typescript types, apply migrations và quản lý auth.": "Secure connection between AI agents and Supabase, supporting TypeScript type generation, migrations, and auth management.",
  "Biến agent thành fullstack engineer thực thụ, xử lý backend và database migrations hoàn toàn tự động.": "Turns your agent into a true fullstack engineer, handling backend operations and database migrations autonomously.",
  "Browser automation có ngữ cảnh và khả năng tự kiểm chứng UI.": "Context-aware browser automation with autonomous UI self-verification.",
  "MCP server chính thức cho phép AI agent mở browser, chụp ảnh màn hình, tương tác form và xác minh kết quả hiển thị thực tế.": "Official MCP server enabling AI agents to launch browsers, take screenshots, interact with forms, and verify actual UI render.",
  "Công cụ quan trọng nhất để đóng vòng lặp phát triển web: Agent tự code, tự mở browser xem trang và tự sửa lỗi UI trước khi bàn giao.": "The most crucial tool to close the web loop: Agent codes, inspects live pages in a real browser, and fixes UI bugs before delivery.",
  "Bộ quy chuẩn frontend chi tiết giúp agent căn lề, điều chỉnh nhịp mắt, font scale và animation CSS mượt mà theo chuẩn web hiện đại.": "Detailed frontend standards helping agents align visuals, adjust eye-flow, scale fonts, and craft smooth modern CSS animations.",
  "Giải quyết triệt để lỗi visual alignment thô ráp mà các coding model thường gặp khi chỉ sinh code logic.": "Thoroughly fixes unpolished visual alignment issues common when coding models only produce logical code.",
  "Trích xuất context tài liệu thư viện mới nhất theo thời gian thực.": "Extract real-time fresh library documentation context.",
  "Cho phép coding agent tra cứu chính xác API docs và version changelog mới nhất mà không bị ảo giác dữ liệu cũ.": "Allows coding agents to query accurate, up-to-date API docs and changelogs without hallucinating obsolete APIs.",
  "Giúp agent không dùng các hàm deprecated của Next.js, Tailwind v4 hay React 19.": "Prevents agents from using deprecated functions from Next.js, Tailwind v4, or React 19.",
  "Bộ hướng dẫn dành cho creator muốn tạo video programmatic với Remotion mà không hy sinh nhịp kể chuyện.": "Guide for creators wanting programmatic video generation with Remotion without sacrificing narrative rhythm.",
  "Biến AI thành editor video tự động bằng code React, tạo hàng loạt clip ngắn chất lượng cao.": "Turns AI into an automated video editor using React code, generating batches of high-quality short clips.",
  "Trang bị cho AI năng lực nghiên cứu sâu, phân tích báo cáo kỹ thuật và tổng hợp tài liệu chuyên sâu không bias.": "Equips AI with deep research capabilities, technical report analysis, and unbiased synthesis of specialized documents.",
  "Thay vì chỉ tìm kiếm bề nổi Google, skill này đào sâu các tài liệu PDF, GitHub và whitepapers khoa học.": "Instead of shallow Google queries, this skill delves into PDFs, GitHub repos, and scientific whitepapers.",
  "Hướng dẫn agent viết bài và xây dựng landing page đáp ứng tiêu chí SEO kỹ thuật cao nhất của Google Search.": "Guides agents to craft articles and landing pages meeting the highest technical SEO criteria for Google Search.",
  "Tạo nội dung có cấu trúc rõ ràng, đúng intent người dùng và dễ xếp hạng organic search.": "Creates well-structured content tailored to search intent and ready to rank organically.",
  "Stack do Windi tuyển chọn cho người dùng Codex chuyên nghiệp: Context7 tra cứu API mới, Supabase xử lý database và Playwright xác thực code.": "Windi curated stack for pro Codex users: Context7 fetches modern APIs, Supabase handles database, and Playwright verifies code.",
  "Muốn làm app Next.js fullstack với Codex mà không bị lỗi thư viện cũ hay sai sót backend, đây là bộ đồ nghề chuẩn mực.": "To build Next.js fullstack apps with Codex without deprecated libraries or backend errors, this is the gold standard.",
  "Kết hợp UI UX Pro Max, Frontend Design, Playwright MCP và Browser QA Workflow để tạo ra website chuẩn chỉ từ bản vẽ đến code chạy thực tế.": "Combines UI UX Pro Max, Frontend Design, Playwright MCP, and Browser QA Workflow to build pixel-perfect sites from concept to running code.",
  "Muốn AI dựng landing page đẹp, chuẩn responsive và tự kiểm tra lỗi hiển thị thì phối hợp 4 công cụ này là tối ưu nhất.": "For AI to build beautiful, responsive landing pages and autonomously catch UI bugs, combining these 4 tools is optimal.",
  "Kết hợp Deep Research Skill với SEO Technical Skill để xây dựng cỗ máy sáng tạo nội dung tự động có dẫn chứng và dữ liệu xác thực.": "Combines Deep Research Skill with SEO Technical Skill to build an automated content engine with verified sources and data.",
  "Muốn làm SEO với Claude hoặc Codex thì dùng 4 công cụ này cùng nhau để bài viết vừa sâu sắc vừa đạt thứ hạng cao.": "To execute SEO with Claude or Codex, use these 4 tools together for articles that are both deeply researched and high-ranking.",
  "Workflow tự động hóa việc rà soát giao diện web trên nhiều viewport (Mobile, Tablet, Desktop) và xuất báo cáo lỗi chi tiết.": "Automated workflow that audits web layouts across multiple viewports (Mobile, Tablet, Desktop) and outputs detailed bug reports.",
  "Đảm bảo sản phẩm cuối cùng không bị bể giao diện trên màn hình nhỏ hoặc phát sinh lỗi JavaScript ngầm.": "Ensures the final product does not break on small screens or throw silent JavaScript exceptions.",
  "Skill chính định hình phong cách & UX rules": "Primary skill defining styling & UX rules",
  "Bổ sung visual quality, micro-interactions và spacing nhịp nhàng.": "Adds visual polish, micro-interactions, and refined spacing.",
  "Bổ sung visual alignment & micro-spacing": "Adds visual alignment & micro-spacing",
  "Mở browser thật để agent tự kiểm chứng UI": "Opens real browser for agent UI verification",
  "Rà soát visual regression đa thiết bị": "Cross-device visual regression audits",
  "Trích xuất docs Next.js & Tailwind mới nhất": "Extracts latest Next.js & Tailwind docs",
  "Tự động sinh schema, types và migrations": "Auto-generates schema, types, and migrations",
  "Chạy automated e2e test trên trình duyệt": "Runs automated e2e browser tests",
  "Thu thập tài liệu và nghiên cứu đề tài": "Collects documents and researches topics",
  "Tối ưu metadata, cấu trúc heading, schema JSON-LD và nội dung tìm kiếm.": "Optimizes metadata, heading structure, JSON-LD schema, and search copy.",
  "Thu thập kết quả Google Search thực tế": "Fetches live Google Search results",
  "Tối ưu on-page, heading và schema": "On-page, heading, and schema optimization",
  "Duyệt web đa tầng, chắt lọc dữ liệu và đối chiếu nguồn độc lập.": "Multi-layer web crawling, data distillation, and independent source verification.",
  "Nghiên cứu từ khóa, kiểm tra đối thủ và sáng tạo bài viết chuẩn SEO.": "Keyword research, competitor analysis, and SEO article creation.",
  "Đảm bảo giao diện chuẩn accessibility": "Ensures accessibility compliance",
  "Thiết kế video bằng code, có cấu trúc và đúng nhịp.": "Code-based video design, well-structured and properly paced.",
  "Nền tảng để điều phối agent theo các bước có thể quan sát.": "Platform to orchestrate agents across observable steps.",
  "SDK mã nguồn mở cho agent orchestration, tools, handoff và tracing trong các ứng dụng AI thực tế.": "Open-source SDK for agent orchestration, tools, handoff, and tracing in production AI apps.",
  "Khám phá agent skills qua tín hiệu cộng đồng.": "Discover agent skills through community signals.",
  "Nền tảng tham khảo giúp đội ngũ tìm và đánh giá skill phù hợp trước khi đưa vào workflow.": "Reference platform helping teams evaluate suitable skills before production adoption.",
  "Kiến trúc gọn nhẹ, chuẩn hóa luồng giao việc giữa nhiều agent con.": "Lightweight architecture standardizing delegation between subagents.",
  "Bộ công cụ toàn diện biến coding agent thành Senior Product Designer.": "Comprehensive toolkit turning coding agents into Senior Product Designers.",
  "Hệ thống fullstack tối thượng: Docs cập nhật, Database & Browser QA.": "Ultimate fullstack suite: Fresh docs, Database, and Browser QA.",
  "Quy trình kiểm tra visual regression, broken links và console errors.": "Auditing workflow for visual regression, broken links, and console errors.",
  "Chưa tải được danh mục.": "Failed to load catalog.",
  "Cập nhật 1 ngày trước": "Updated 1 day ago",
  "Cập nhật 2 ngày trước": "Updated 2 days ago",
  "Cập nhật 3 ngày trước": "Updated 3 days ago",
  "Cập nhật 4 ngày trước": "Updated 4 days ago",
  "Cập nhật hôm nay": "Updated today",
  "Cập nhật hôm qua": "Updated yesterday",
  "Cập nhật tuần này": "Updated this week",
  "HOT = 20 hồ sơ nhiều sao nhất trong bộ; TRENDING chỉ hiện khi có thứ hạng được đối chiếu.": "HOT = top 20 most-starred profiles; TRENDING appears only when rank is verified.",
  "Hệ sinh thái chia sẻ skill công khai đáng tin cậy.": "Trusted public ecosystem for sharing agent skills.",
  "Không có công cụ ở bộ lọc này.": "No tools match this filter.",
  "Không tải được nguồn đối chiếu, Easy Prompt hoặc lịch sử duyệt. Vui lòng thử lại.": "Failed to load sources, Easy Prompt, or review audit. Please try again.",
  "Lọc": "Filter",
  "Minh họa định hướng, chưa phải quy trình phát hành.": "Directional illustration, not the production workflow.",
  "Mở hồ sơ": "Open profile",
  "Mở một tool để xem ảnh/video, bối cảnh sử dụng và cả những giới hạn người dùng gặp phải. Các ví dụ liên quan đến dự án gốc được ghi nhãn riêng.": "Open a tool to view screenshots/videos, usage context, and real user constraints. Examples from original repos are explicitly labeled.",
  "Mục đích": "Purpose",
  "Phân trang": "Pagination",
  "TPBank (Tiên Phong Bank)": "TPBank (Tien Phong Bank)",
  "Tab / phím mũi tên để chọn · Esc để đóng.": "Tab / arrow keys to navigate · Esc to close.",
  "Ví dụ: phụ đề, newsletter…": "E.g., subtitles, newsletters…",
  "· Kiểm tra": "· Checked on",
  "· bản": "· rev",
  "Đánh giá tuần này": "Reviewed this week",
  "Thao tác": "Actions",
  "Hàng đợi": "Queue",
  "Không nhận diện được": "Cannot identify",
  "Trang sau": "Next page",
  "Toàn bộ": "All",
  "Đã lưu": "Saved",
  "Đã lưu!": "Saved!",
  "Lưu": "Save",
  "Bỏ lưu": "Unsave",
  "Tìm kiếm...": "Search...",
  "Tìm kiếm…": "Search…",
  "QUACK // CẶP CẶP": "QUACK // QUACK QUACK",
  "CẶP CẶP": "QUACK QUACK",
  "cặp": "quack",
  "cặp cặp": "quack quack",
  "cặp cặp cặp": "quack quack quack",
  "[ Tùy tâm ]": "[ Custom ]",
  "Tùy tâm": "Custom",
  "cccccc": "custom",
  "cccccc (VNĐ):": "Custom amount (VND):",
  "Tùy tâm (VNĐ):": "Custom amount (VND):",
  "Số tiền tùy tâm (VNĐ):": "Custom amount (VND):",
  "HOẶC ỦNG HỘ QUA": "OR SUPPORT VIA",
  "OR SUPPORT VIA": "OR SUPPORT VIA",
  "Không quét được VietQR? Ủng hộ quốc tế qua:": "Can't scan VietQR? Support internationally via:",
  "Đã ủng hộ ♥": "Donated ♥",
  "ỦNG HỘ VIETQR": "DONATE VIA VIETQR",
  "Trúng vịt!": "Hit duck!",
  "Để sau": "Maybe later",
  "Bỏ qua": "Dismiss",
  "Quay lại": "Back"
};

Object.assign(english, catalogTranslations, homeTranslations);

// Lowercase lookup cache for fuzzy matching
const englishLower: Record<string, string> = {};
for (const [k, v] of Object.entries(english)) {
  englishLower[k.toLowerCase()] = v;
}

export function translateText(value: string, language: WindiLanguage): string {
  if (language !== 'en' || !value) return value;
  const leading = value.match(/^\s*/)?.[0] ?? '';
  const trailing = value.match(/\s*$/)?.[0] ?? '';
  const trimmed = value.trim();
  if (!trimmed) return value;

  // 1. Exact match
  if (english[trimmed]) {
    return leading + english[trimmed] + trailing;
  }

  // 1b. Normalized whitespace match (collapses JSX newlines and indentation)
  const normalized = trimmed.replace(/\s+/g, ' ');
  if (english[normalized]) {
    return leading + english[normalized] + trailing;
  }

  // 2. Case-insensitive match
  const lower = trimmed.toLowerCase();
  if (englishLower[lower]) {
    return leading + englishLower[lower] + trailing;
  }
  const normLower = normalized.toLowerCase();
  if (englishLower[normLower]) {
    return leading + englishLower[normLower] + trailing;
  }

  // 3. Match without trailing punctuation (. : ! ? …)
  const punctMatch = normalized.match(/^(.+?)([.:!?…]+)$/);
  if (punctMatch && punctMatch[1] && english[punctMatch[1]]) {
    return leading + english[punctMatch[1]] + punctMatch[2] + trailing;
  }

  // 4. Dynamic pattern replacements
  let res = normalized;

  // Selection reason pattern
  const reasonMatch = res.match(/^Phù hợp\s+(.*?):\s+(.*?)\s+(README chính chủ và số liệu GitHub đã được đối chiếu\. Thứ tự này là ưu tiên biên tập, không phải bảng xếp hạng toàn GitHub\.|Có README chính chủ và số liệu GitHub đã đối chiếu; thứ tự là ưu tiên biên tập, không phải xếp hạng toàn GitHub\.)$/);
  if (reasonMatch) {
    const cat = translateText(reasonMatch[1], 'en');
    const hook = translateText(reasonMatch[2], 'en');
    const disclaimer = 'Official README and GitHub metrics cross-checked. Order reflects editorial priority, not overall GitHub ranking.';
    return `${leading}Suitable for ${cat}: ${hook} ${disclaimer}${trailing}`;
  }

  // X sao · Y fork
  res = res.replace(/([\d.,]+)\s*sao\s*·\s*([\d.,]+)\s*fork/g, '$1 stars · $2 forks');
  // X sao GitHub
  res = res.replace(/([\d.,]+)\s*sao\s*GitHub/g, '$1 GitHub stars');
  // X sao
  res = res.replace(/([\d.,]+[kK]?)\s*sao(?!\S)/g, '$1 stars');
  // X công cụ
  res = res.replace(/([\d.,]+)\s*công cụ(?!\S)/g, '$1 tools');
  // X kết quả
  res = res.replace(/([\d.,]+)\s*kết quả(?!\S)/g, '$1 results');
  // Cập nhật X ngày/tháng trước
  res = res.replace(/Cập nhật\s*(\d+)\s*ngày trước/g, 'Updated $1 days ago');
  res = res.replace(/Cập nhật\s*(\d+)\s*tháng trước/g, 'Updated $1 months ago');
  res = res.replace(/Cập nhật\s*hôm nay/g, 'Updated today');
  res = res.replace(/Cập nhật\s*hôm qua/g, 'Updated yesterday');
  res = res.replace(/Cập nhật\s*tuần này/g, 'Updated this week');
  // Dự án cập nhật:
  res = res.replace(/Dự án cập nhật:\s*/g, 'Project updated: ');
  // Số liệu ngày
  res = res.replace(/Số liệu ngày\s*/g, 'Figures recorded on ');
  // Đăng bởi ... · Đối chiếu nguồn
  res = res.replace(/Đăng bởi\s*(.*?)\s*·\s*Đối chiếu nguồn\s*/g, 'Posted by $1 · Cross-checked on ');
  // Kiểm tra
  res = res.replace(/^Kiểm tra\s+/g, 'Checked on ');
  // Trúng vịt! X điểm.
  res = res.replace(/Trúng vịt!\s*(\d+)\s*điểm\.?/g, 'Hit duck! $1 points.');
  // Mã QR Donate Windi Xđ
  res = res.replace(/Mã QR Donate Windi\s*/g, 'VietQR Donate Windi ');
  // Mở hồ sơ / Thao tác với
  res = res.replace(/^Mở hồ sơ\s+/g, 'Open profile ');
  res = res.replace(/^Thao tác với\s+/g, 'Actions for ');
  // Trang X · Y kết quả
  res = res.replace(/Trang\s*(\d+)\s*·\s*(\d+)\s*kết quả/g, 'Page $1 · $2 results');

  if (res !== trimmed) {
    return leading + res + trailing;
  }

  return value;
}

type OriginalText = Text & { __windiOriginal?: string; __windiCurrent?: string };

const originalAttributes = new WeakMap<HTMLElement, Record<string, string>>();

function translateTree(root: Node, language: WindiLanguage) {
  if (root.nodeType === Node.TEXT_NODE) {
    const text = root as OriginalText;
    if (text.parentElement?.closest('[data-windi-no-translate]')) return;
    if (language === 'vi') {
      if (text.__windiOriginal !== undefined && text.nodeValue !== text.__windiOriginal) {
        text.nodeValue = text.__windiOriginal;
      }
      return;
    }
    const currentVal = text.nodeValue ?? '';
    // If React updated text in the meantime, update original
    if (text.__windiCurrent === undefined || currentVal !== text.__windiCurrent) {
      text.__windiOriginal = currentVal;
    }
    const source = text.__windiOriginal ?? currentVal;
    const nextVal = translateText(source, language);
    if (text.nodeValue !== nextVal) {
      text.__windiCurrent = nextVal;
      text.nodeValue = nextVal;
    }
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node as OriginalText;
    if (text.parentElement?.closest('[data-windi-no-translate]')) continue;
    if (language === 'vi') {
      if (text.__windiOriginal !== undefined && text.nodeValue !== text.__windiOriginal) {
        text.nodeValue = text.__windiOriginal;
      }
      continue;
    }
    const currentVal = text.nodeValue ?? '';
    if (text.__windiCurrent === undefined || currentVal !== text.__windiCurrent) {
      text.__windiOriginal = currentVal;
    }
    const source = text.__windiOriginal ?? currentVal;
    const nextVal = translateText(source, language);
    if (text.nodeValue !== nextVal) {
      text.__windiCurrent = nextVal;
      text.nodeValue = nextVal;
    }
  }

  if (!(root instanceof HTMLElement)) return;
  for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    if (element.closest('[data-windi-no-translate]')) continue;
    for (const name of ['aria-label', 'title', 'placeholder']) {
      const key = `windi${name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())}Original`;
      const attributes = originalAttributes.get(element) ?? {};
      const original = attributes[key];
      const current = element.getAttribute(name);
      if (!original && current && language !== 'vi') {
        attributes[key] = current;
        originalAttributes.set(element, attributes);
      }
      if (language === 'vi') {
        if (original && current !== original) element.setAttribute(name, original);
      } else {
        const source = original ?? current;
        if (source) {
          const nextVal = translateText(source, language);
          if (element.getAttribute(name) !== nextVal) {
            element.setAttribute(name, nextVal);
          }
        }
      }
    }
  }
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'vi',
      setLanguage: () => {},
      t: (key: string) => key,
    };
  }
  return context;
}

export function LanguageProvider({
  children,
  initialLanguage = 'vi',
}: {
  children?: ReactNode;
  initialLanguage?: WindiLanguage;
}) {
  const [language, setLanguage] = useState<WindiLanguage>(initialLanguage);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === 'en') {
        setLanguage('en');
      }
    } catch {
      /* Optional preference. */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(storageKey, language);
    } catch {
      /* Optional preference. */
    }

    if (typeof document !== 'undefined') {
      // Update document title if needed
      if (language === 'en') {
        document.title = translateText(document.title, 'en');
      }
      translateTree(document.body, language);
    }

    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'childList') {
          for (const node of record.addedNodes) {
            translateTree(node, language);
          }
        } else if (record.type === 'characterData') {
          translateTree(record.target, language);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  const t = (key: string): string => translateText(key, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

import { describe, it, expect } from 'vitest';
import { translateText } from '../windi/language-mode';

describe('Language translation engine', () => {
  it('preserves Vietnamese text when language is vi', () => {
    expect(translateText('Đăng nhập', 'vi')).toBe('Đăng nhập');
    expect(translateText('Ủng hộ Windi', 'vi')).toBe('Ủng hộ Windi');
    expect(translateText('46.743 sao · 7.278 fork', 'vi')).toBe('46.743 sao · 7.278 fork');
  });

  it('translates static navigation and shell copy to English', () => {
    expect(translateText('Đăng nhập', 'en')).toBe('Sign in');
    expect(translateText('Đăng xuất', 'en')).toBe('Log out');
    expect(translateText('Ủng hộ Windi', 'en')).toBe('Support Windi');
    expect(translateText('Mở menu', 'en')).toBe('Open menu');
    expect(translateText('Đóng menu', 'en')).toBe('Close menu');
    expect(translateText('Điều hướng chính', 'en')).toBe('Main navigation');
  });

  it('translates donation modal and footer copy', () => {
    expect(translateText('CHỌN MỨC ỦNG HỘ // PRESET', 'en')).toBe('CHOOSE SUPPORT LEVEL // PRESET');
    expect(translateText('1 ly cà phê ☕', 'en')).toBe('1 cup of coffee ☕');
    expect(translateText('2 ly cà phê ☕☕', 'en')).toBe('2 cups of coffee ☕☕');
    expect(translateText('Chép', 'en')).toBe('Copy');
    expect(translateText('Đã chép', 'en')).toBe('Copied');
    expect(translateText('Số tiền:', 'en')).toBe('Amount:');
    expect(translateText('Ngân hàng:', 'en')).toBe('Bank:');
    expect(translateText('Số tài khoản:', 'en')).toBe('Account number:');
    expect(translateText('Chủ tài khoản:', 'en')).toBe('Account holder:');
    expect(translateText('Cảm ơn bạn rất nhiều!', 'en')).toBe('Thank you very much!');
    expect(translateText('QUACK // CẶP CẶP', 'en')).toBe('QUACK // QUACK QUACK');
    expect(translateText('cặp', 'en')).toBe('quack');
    expect(translateText('cặp cặp', 'en')).toBe('quack quack');
    expect(translateText('cặp cặp cặp', 'en')).toBe('quack quack quack');
    expect(translateText('[ Tùy tâm ]', 'en')).toBe('[ Custom ]');
    expect(translateText('HOẶC ỦNG HỘ QUA', 'en')).toBe('OR SUPPORT VIA');
    expect(translateText('Không quét được VietQR? Ủng hộ quốc tế qua:', 'en')).toBe("Can't scan VietQR? Support internationally via:");
    expect(translateText('Bắn vịt pixel', 'en')).toBe('Shoot pixel duck');
    expect(translateText('Trúng vịt!', 'en')).toBe('Hit duck!');
  });

  it('translates tool cards, shelf, search, and detail views', () => {
    expect(translateText('Thêm vào Toolbox', 'en')).toBe('Add to Toolbox');
    expect(translateText('Đã có trong Toolbox', 'en')).toBe('In Toolbox');
    expect(translateText('Xóa khỏi Toolbox', 'en')).toBe('Remove from Toolbox');
    expect(translateText('CÀI ĐẶT NHANH (TERMINAL)', 'en')).toBe('QUICK INSTALL (TERMINAL)');
    expect(translateText('Được kiểm định độc lập', 'en')).toBe('Independently verified');
    expect(translateText('Tương thích Agent:', 'en')).toBe('Agent compatibility:');
  });

  it('translates purpose categories and descriptions', () => {
    expect(translateText('Content & Viết lách', 'en')).toBe('Content & Writing');
    expect(translateText('Video & Phụ đề', 'en')).toBe('Video & Captions');
    expect(translateText('Voice & Âm nhạc', 'en')).toBe('Voice & Music');
    expect(translateText('Tự động hóa', 'en')).toBe('Automation');
    expect(translateText('Tech & Bảo mật', 'en')).toBe('Tech & Security');
  });

  it('handles dynamic pattern substitutions', () => {
    expect(translateText('46.743 sao · 7.278 fork', 'en')).toBe('46.743 stars · 7.278 forks');
    expect(translateText('149.000 sao · 12.000 fork', 'en')).toBe('149.000 stars · 12.000 forks');
    expect(translateText('100.000 sao GitHub', 'en')).toBe('100.000 GitHub stars');
    expect(translateText('12 công cụ', 'en')).toBe('12 tools');
    expect(translateText('25 kết quả', 'en')).toBe('25 results');
    expect(translateText('Cập nhật hôm nay', 'en')).toBe('Updated today');
    expect(translateText('Cập nhật tuần này', 'en')).toBe('Updated this week');
    expect(translateText('Cập nhật 3 ngày trước', 'en')).toBe('Updated 3 days ago');
    expect(translateText('Dự án cập nhật: 12/03/2026', 'en')).toBe('Project updated: 12/03/2026');
    expect(translateText('Số liệu ngày 04/09/2026', 'en')).toBe('Figures recorded on 04/09/2026');
    expect(translateText('Đăng bởi win · Đối chiếu nguồn 01/01/2026', 'en')).toBe('Posted by win · Cross-checked on 01/01/2026');
  });

  it('preserves leading and trailing whitespace', () => {
    expect(translateText('  Thêm vào Toolbox  ', 'en')).toBe('  Add to Toolbox  ');
    expect(translateText(' 12 công cụ', 'en')).toBe(' 12 tools');
  });

  it('handles multiline JSX strings with internal newlines and indentation', () => {
    const rawJsxText = `\n            Chọn việc bạn cần làm, mở công cụ để xem ví dụ áp dụng, rồi lưu vào Toolbox cá nhân hoặc\n            xem lệnh cài đặt 1-click cho AI Agent của bạn.\n          `;
    const translated = translateText(rawJsxText, 'en');
    expect(translated.trim()).toBe('Pick a task, open the tool to view use cases, then save it to your personal Toolbox or view 1-click install commands for your AI Agent.');
    expect(translated.startsWith('\n            ')).toBe(true);
    expect(translated.endsWith('\n          ')).toBe(true);
  });

  it('translates tool taglines and descriptions from Creator-100 catalog', () => {
    // Activepieces
    expect(translateText('Tự động hóa các việc nhỏ quanh content bằng flow nhìn được và có bước duyệt.', 'en'))
      .toBe('Automate small content tasks with visual flows and human approval steps.');
    expect(translateText('Activepieces là nền tảng automation với các khối tích hợp gọi là pieces. Có builder trực quan cho người ít code và khả năng mở rộng cho người có kỹ thuật. Creator có thể nối bảng kế hoạch, RSS, AI và thông báo mà không tự viết mọi kết nối từ đầu.', 'en'))
      .toBe('Activepieces is an automation platform with modular integrations called pieces. Features an intuitive visual builder for non-coders and extensibility for developers. Creators can connect planning boards, RSS, AI, and notifications without writing custom integrations from scratch.');

    // Dify
    expect(translateText('Đưa tài liệu thương hiệu vào một trợ lý nội dung có workflow và lịch sử kiểm tra.', 'en'))
      .toBe('Bring brand documentation into a content assistant with structured workflows and audit trails.');

    // FreshRSS
    expect(translateText('Một hộp thư cho nguồn tin, không bị feed mạng xã hội quyết định thứ bạn đọc.', 'en'))
      .toBe('An inbox for your reading sources, free from social media algorithmic feeds.');

    // Karakeep
    expect(translateText('Lưu được một ý tưởng hay chưa đủ. phải tìm lại được lúc cần viết.', 'en'))
      .toBe("Saving a great idea isn't enough; you need to find it when it's time to write.");
  });

  it('translates tool selection reasons dynamically', () => {
    const reason = 'Phù hợp Social & Marketing: Tự động hóa các việc nhỏ quanh content bằng flow nhìn được và có bước duyệt. README chính chủ và số liệu GitHub đã được đối chiếu. Thứ tự này là ưu tiên biên tập, không phải bảng xếp hạng toàn GitHub.';
    expect(translateText(reason, 'en')).toBe(
      'Suitable for Social & Marketing: Automate small content tasks with visual flows and human approval steps. Official README and GitHub metrics cross-checked. Order reflects editorial priority, not overall GitHub ranking.'
    );
  });

  it('translates home page hero, arcade, voice, layouts, connect and news to English', () => {
    // Navigation & Shell
    expect(translateText('Công cụ', 'en')).toBe('Tools');
    expect(translateText('Tin tức', 'en')).toBe('News');
    expect(translateText('Hồ sơ của tôi', 'en')).toBe('My profile');
    expect(translateText('Công cụ sáng tạo.', 'en')).toBe('Creative tools.');

    // Workflow Hero
    expect(translateText('Bạn chốt hướng.', 'en')).toBe('You set the direction.');
    expect(translateText('Windi làm', 'en')).toBe('Windi crafts the');
    expect(translateText('Một video đáng xem không bắt đầu từ nút render.', 'en')).toBe("A great video doesn't start with the render button.");
    expect(translateText('Nó bắt đầu từ một hướng kể đủ đúng để người ta muốn xem tiếp.', 'en')).toBe('It starts with a storyline compelling enough to keep people watching.');
    expect(translateText('Bắt đầu với Video Kits', 'en')).toBe('Get started with Video Kits');
    expect(translateText('Sở hữu Video Kits', 'en')).toBe('Get Video Kits');
    expect(translateText('Nghe thử Voice Studio', 'en')).toBe('Preview Voice Studio');
    expect(translateText('CHỐT Ý TƯỞNG', 'en')).toBe('SHAPE THE IDEA');
    expect(translateText('CHỌN LAYOUT', 'en')).toBe('CHOOSE A LAYOUT');
    expect(translateText('DUYỆT KỊCH BẢN', 'en')).toBe('APPROVE SCRIPT');
    expect(translateText('Không đốt quota vào một hướng chưa chốt.', 'en')).toBe("Don't burn quota on an unconfirmed direction.");
    expect(translateText('Bạn duyệt ba điểm quan trọng. Windi lo phần còn lại.', 'en')).toBe('You approve three key gates. Windi handles the rest.');

    // Voice Feature
    expect(translateText('Đừng chỉ đọc.', 'en')).toBe("Don't just read.");
    expect(translateText('Hãy khiến người ta nghe tiếp.', 'en')).toBe('Make people keep listening.');
    expect(translateText('Khám phá Voice Studio', 'en')).toBe('Explore Voice Studio');
    expect(translateText('01 / CHỮA LÀNH', 'en')).toBe('01 / HEALING & CALM');
    expect(translateText('Nghe mẫu giọng Chữa Lành', 'en')).toBe('Listen to Healing voice sample');
    expect(translateText('Ấm áp · chậm rãi · giàu khoảng lặng', 'en')).toBe('Warm · gentle · rich in pauses');

    // Layouts
    expect(translateText('03 / CHỌN PHONG CÁCH', 'en')).toBe('03 / CHOOSE A STYLE');
    expect(translateText('Một câu chuyện.', 'en')).toBe('One story.');
    expect(translateText('Một cảm giác rất khác.', 'en')).toBe('A distinctly different feeling.');
    expect(translateText('Chọn cách kể', 'en')).toBe('Choose storytelling style');
    expect(translateText('Biến điều', 'en')).toBe('Turn complex');
    expect(translateText('phức tạp thành', 'en')).toBe('ideas into');
    expect(translateText('thứ ai cũng hiểu.', 'en')).toBe('what anyone can understand.');
    expect(translateText('Rõ ý. Có nhịp. Không hề nhạt.', 'en')).toBe('Clear intent. In rhythm. Never dull.');
    expect(translateText('Khi mỗi cảnh', 'en')).toBe('When every scene');
    expect(translateText('đều phải khiến', 'en')).toBe('demands to make');
    expect(translateText('người ta dừng lại.', 'en')).toBe('viewers stop and watch.');
    expect(translateText('Điện ảnh. Dày cảm xúc. Có dư âm.', 'en')).toBe('Cinematic. Emotionally rich. Resonant.');

    // Windi Connect
    expect(translateText('04 / WINDI CONNECT', 'en')).toBe('04 / WINDI CONNECT');
    expect(translateText('Đừng để ý tưởng', 'en')).toBe("Don't let ideas");
    expect(translateText('chết trong một tab.', 'en')).toBe('die inside a tab.');
    expect(translateText('Xem Windi Connect hoạt động', 'en')).toBe('See how Windi Connect works');
    expect(translateText('Windi Connect đưa ảnh vào đúng cảnh của video', 'en')).toBe('Windi Connect routes visuals into the right video scene');
    expect(translateText('SẴN SÀNG', 'en')).toBe('READY');
    expect(translateText('Cảnh 04', 'en')).toBe('Scene 04');
    expect(translateText('prompt đã chốt', 'en')).toBe('approved prompt');
    expect(translateText('hoặc Google Flow', 'en')).toBe('or Google Flow');
    expect(translateText('ẢNH ĐÃ THÊM', 'en')).toBe('IMAGE ADDED');
    expect(translateText('Cảnh 04 đã sẵn sàng để dựng', 'en')).toBe('Scene 04 is ready for assembly');
    expect(translateText('✓ Không cần chép file thủ công', 'en')).toBe('✓ No manual file copying needed');

    // Arcade Console & Controls
    expect(translateText('Quy trình làm video cùng Windi', 'en')).toBe('Video creation workflow with Windi');
    expect(translateText('BẠN', 'en')).toBe('YOU');
    expect(translateText('✓ ĐÃ DUYỆT', 'en')).toBe('✓ APPROVED');
    expect(translateText('CHỌN LẠI', 'en')).toBe('RESET');
    expect(translateText('DUYỆT', 'en')).toBe('APPROVE');
    expect(translateText('TIẾP TỤC', 'en')).toBe('CONTINUE');
    expect(translateText('Ⅱ TẠM DỪNG', 'en')).toBe('Ⅱ PAUSE');
    expect(translateText('▶ XEM TIẾP', 'en')).toBe('▶ PLAY');
    expect(translateText('↺ XEM LẠI', 'en')).toBe('↺ REPLAY');
    expect(translateText('Giảm chuyển động', 'en')).toBe('Reduce motion');
    expect(translateText('Một chủ đề có thể thành video đáng xem.', 'en')).toBe('Any topic can become a compelling video.');
    expect(translateText('Một điều ít ai biết', 'en')).toBe('Little-known fact');

    // News & Ticker
    expect(translateText('Tin mới cho người làm sáng tạo', 'en')).toBe('Latest news for creators');
    expect(translateText('Google Workspace ra mắt Google Pics: AI thiết kế đồ họa đối đầu Canva, tích hợp Docs & Slides', 'en'))
      .toBe('Google Workspace launches Google Pics: AI graphic design challenging Canva, built into Docs & Slides');
  });

  it('translates English text back to Vietnamese when language is vi', () => {
    // Navigation and Shell
    expect(translateText('Sign in', 'vi')).toBe('Đăng nhập');
    expect(translateText('Log out', 'vi')).toBe('Đăng xuất');
    expect(translateText('Sign out', 'vi')).toBe('Đăng xuất');
    expect(translateText('Support Windi', 'vi')).toBe('Ủng hộ Windi');
    expect(translateText('Tools', 'vi')).toBe('Công cụ');
    expect(translateText('News', 'vi')).toBe('Tin tức');
    expect(translateText('My profile', 'vi')).toBe('Hồ sơ của tôi');
    expect(translateText('Open menu', 'vi')).toBe('Mở menu');
    expect(translateText('Close menu', 'vi')).toBe('Đóng menu');
    expect(translateText('Main navigation', 'vi')).toBe('Điều hướng chính');
    expect(translateText('Mobile navigation', 'vi')).toBe('Điều hướng di động');
    expect(translateText('Footer links', 'vi')).toBe('Liên kết cuối trang');
    expect(translateText('Creative tools.', 'vi')).toBe('Công cụ sáng tạo.');

    // Workflow Hero
    expect(translateText('You set the direction.', 'vi')).toBe('Bạn chốt hướng.');
    expect(translateText('Windi crafts the video.', 'vi')).toBe('Windi làm video.');
    expect(translateText("A great video doesn't start with the render button.", 'vi')).toBe('Một video đáng xem không bắt đầu từ nút render.');
    expect(translateText('It starts with a storyline compelling enough to keep people watching.', 'vi')).toBe('Nó bắt đầu từ một hướng kể đủ đúng để người ta muốn xem tiếp.');
    expect(translateText('Get started with Video Kits', 'vi')).toBe('Bắt đầu với Video Kits');
    expect(translateText('Get Video Kits', 'vi')).toBe('Sở hữu Video Kits');
    expect(translateText('Preview Voice Studio', 'vi')).toBe('Nghe thử Voice Studio');
    expect(translateText('SHAPE THE IDEA', 'vi')).toBe('CHỐT Ý TƯỞNG');
    expect(translateText('CHOOSE LAYOUT', 'vi')).toBe('CHỌN LAYOUT');
    expect(translateText('CHOOSE A LAYOUT', 'vi')).toBe('CHỌN LAYOUT');
    expect(translateText('APPROVE SCRIPT', 'vi')).toBe('DUYỆT KỊCH BẢN');
    expect(translateText("Don't burn quota on an unconfirmed direction.", 'vi')).toBe('Không đốt quota vào một hướng chưa chốt.');
    expect(translateText('You approve three key gates. Windi handles the rest.', 'vi')).toBe('Bạn duyệt ba điểm quan trọng. Windi lo phần còn lại.');

    // Arcade Console
    expect(translateText('YOU DECIDE', 'vi')).toBe('BẠN QUYẾT');
    expect(translateText('Video creation workflow with Windi', 'vi')).toBe('Quy trình làm video cùng Windi');
    expect(translateText('✓ APPROVED', 'vi')).toBe('✓ ĐÃ DUYỆT');
    expect(translateText('RESET', 'vi')).toBe('CHỌN LẠI');
    expect(translateText('APPROVE', 'vi')).toBe('DUYỆT');
    expect(translateText('CONTINUE', 'vi')).toBe('TIẾP TỤC');
    expect(translateText('Ⅱ PAUSE', 'vi')).toBe('Ⅱ TẠM DỪNG');
    expect(translateText('▶ PLAY', 'vi')).toBe('▶ XEM TIẾP');
    expect(translateText('↺ REPLAY', 'vi')).toBe('↺ XEM LẠI');
    expect(translateText('Reduce motion', 'vi')).toBe('Giảm chuyển động');

    // Dynamic patterns in reverse
    expect(translateText('46.743 stars · 7.278 forks', 'vi')).toBe('46.743 sao · 7.278 fork');
    expect(translateText('100.000 GitHub stars', 'vi')).toBe('100.000 sao GitHub');
    expect(translateText('12 tools', 'vi')).toBe('12 công cụ');
    expect(translateText('25 results', 'vi')).toBe('25 kết quả');
    expect(translateText('Updated today', 'vi')).toBe('Cập nhật hôm nay');
    expect(translateText('Updated this week', 'vi')).toBe('Cập nhật tuần này');
    expect(translateText('Updated 3 days ago', 'vi')).toBe('Cập nhật 3 ngày trước');
    expect(translateText('Project updated: 12/03/2026', 'vi')).toBe('Dự án cập nhật: 12/03/2026');
    expect(translateText('Hit duck! 100 points.', 'vi')).toBe('Trúng vịt! 100 điểm.');
  });

  it('guarantees round-trip two-way translation (VI -> EN -> VI)', () => {
    const samples = [
      'Đăng nhập',
      'Ủng hộ Windi',
      'Công cụ',
      'Tin tức',
      'Hồ sơ của tôi',
      'Bạn chốt hướng.',
      'Windi làm video.',
      'Một video đáng xem không bắt đầu từ nút render.',
      'Bắt đầu với Video Kits',
      'Sở hữu Video Kits',
      'Nghe thử Voice Studio',
      'CHỐT Ý TƯỞNG',
      'DUYỆT KỊCH BẢN',
      'BẠN QUYẾT',
      '12 công cụ',
      '46.743 sao · 7.278 fork',
      'Cập nhật hôm nay',
      'Dự án cập nhật: 12/03/2026',
    ];

    for (const vi of samples) {
      const en = translateText(vi, 'en');
      expect(en).not.toBe(vi);
      const backToVi = translateText(en, 'vi');
      expect(backToVi).toBe(vi);
    }
  });
});


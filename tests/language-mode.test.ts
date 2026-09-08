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
});

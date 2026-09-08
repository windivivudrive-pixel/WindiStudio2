# Creator 100 — kết quả triển khai 2026-09-03

## Đã lưu thật trên Supabase

Project: `zpjphixcttehkkgxlmsn`. Kết quả đọc lại ở `data/catalog/creator-database-report.json`, kiểm tra lúc 16:53 UTC ngày 03/09/2026.

- 100 repo duy nhất được chọn cho creator, đều `CANDIDATE`, chưa xuất bản.
- 100/100 có bài biên tập tiếng Việt, nguồn README chính chủ, sao/fork và thời điểm ghi nhận.
- 195 hồ sơ cũ được `ARCHIVED`; giữ nguyên ID, nguồn, lịch sử số liệu và evidence. Năm hồ sơ repo gốc được tái dùng, 95 hồ sơ mới được thêm. Tổng bảng resources là 295, không phải lỗi nhập dư 195 tool vào bộ đang duyệt.
- 432 source records, 372 metric snapshots; lượt này không tạo review của người dùng hoặc điểm Windi giả.
- Anonymous đọc được 0 resource trước khi editor xuất bản.
- Giữ nguyên 17 profiles, 5 transactions, 1.961 generations, 10 library_images và 2 Storage buckets; không thay Auth/Google OAuth/webhook.
- Membership admin cho tài khoản được yêu cầu vẫn trỏ đúng Auth user. Không cấp quyền từ user metadata.

## Cơ cấu danh mục chính

| Mục đích chính | Số repo |
|---|---:|
| Social & Marketing | 6 |
| Content & Viết lách | 7 |
| Video & Phụ đề | 23 |
| Voice & Âm nhạc | 15 |
| Ảnh & Đồ họa AI | 12 |
| SEO & Analytics | 5 |
| Design & Frontend | 12 |
| Research & Ý tưởng | 11 |
| Tự động hóa | 5 |
| Tech & Bảo mật | 4 |

Một repo có thể xuất hiện ở nhiều bộ lọc phụ. Bảng trên dùng mục đích chính nên tổng bằng 100. Nhóm tech chỉ gồm Claude Code, Codex CLI, Gemini CLI và Bitwarden. Tool làm media cần GPU/code vẫn nằm ở đúng mục đích media, với yêu cầu kỹ thuật ghi rõ trong hồ sơ.

## Cách duyệt và dùng bài social

1. Mở `/admin`, đăng nhập Google bằng `quochungdn151@gmail.com`.
2. Bộ mặc định là **100 repo cho creator**, trạng thái **CANDIDATE**. Chọn mục đích, tìm tiếng Việt có/không dấu, hoặc sắp xếp nhiều sao.
3. Mở hồ sơ: đọc phần công dụng, điểm nổi bật, ví dụ ứng dụng, cách bắt đầu, giới hạn và giấy phép. Cột nguồn có số sao/fork, ngày cập nhật và README chính chủ.
4. Có thể sửa nội dung trong form rồi bấm **Sao chép bài social**. Bản sao dùng nội dung vừa sửa, có nguồn và chú thích; không tự gửi ra mạng xã hội.
5. Chọn **Xuất bản công khai** và xác nhận đã kiểm tra nguồn/nội dung, rồi **Lưu quyết định**. Không cần gõ lý do; hệ thống tự ghi audit, revision và nội dung trước/sau. Nếu chưa xong chọn lưu để tiếp tục duyệt.
6. Xem hồ sơ cũ bằng bộ **Toàn bộ, kể cả lưu trữ** và trạng thái **ARCHIVED**. Không xóa rồi tạo lại các record đó.

Toàn bộ bài và nguồn có bản đọc offline trong `data/catalog/CREATOR-100.md`. Dữ liệu dùng để nhập là `data/catalog/creator-100.json`; bản biên tập gốc chia theo chủ đề trong `data/catalog/editorial/`.

## Chất lượng và ranh giới bằng chứng

- Nghiên cứu 128 repo đề xuất, xác minh được metadata/README của 123, chọn 100 theo độ phù hợp và tín hiệu quan tâm. Có bổ sung nguồn creator mới vì pool 200 cũ nặng hạ tầng và chứa nhiều skill con trong cùng repo.
- Không gọi đây là top 100 toàn GitHub hoặc bảng số người dùng. Stars/forks có ngày ghi nhận, không phải MAU, chất lượng bảo mật hoặc Windi Score.
- Không có bằng chứng thứ hạng GitHub Trending trực tiếp được đưa vào trường ranking; `trending=null`. Tuyên bố lịch sử trong README, nếu nhắc tới, được gán rõ cho tác giả.
- Social Media Skills: README tại lúc đọc ghi 415K+ followers và 100 triệu view/năm; đây là tuyên bố tác giả, không phải kết quả Windi kiểm toán hay bảo đảm cho người dùng.
- Ví dụ là gợi ý ứng dụng, không bịa trải nghiệm người dùng. Các hình/video demo hoặc phản hồi cộng đồng chưa được xác minh đủ cho mọi repo; lượt này không biến README thành testimonial độc lập.
- Ghi riêng giới hạn giấy phép model/code: F5-TTS và AudioCraft có trọng số phi thương mại; FLUX tùy model; n8n, Dify, tldraw, Remotion và các mục khác có điều kiện riêng. Không gọi mọi repo công khai là mã nguồn mở hoàn toàn.
- Các README được đọc như dữ liệu, không chạy mã/lệnh/skill từ upstream. SHA-256 của nguồn đã biên tập được giữ ở `creator-source-review.json`. Nếu lần nghiên cứu sau đổi README, bước build dừng để yêu cầu biên tập lại, không tự đóng dấu bài cũ là đã đọc nguồn mới.

## An toàn nhập dữ liệu

Snapshot trước khi ghi: `.backups/windi/pre-creator100-2026-09-03T16-43-57-618Z`. Có catalog, sources, metrics, evidence, research jobs, import runs, editorial actions/members và Data API schema. Đây là snapshot phạm vi catalog, không thay thế full backup Auth/Storage.

SQL dữ liệu ở `ops/creator100/01.sql` đến `10.sql`, sau đó `11-finalize.sql`; không có thay đổi schema. Mỗi batch là transaction có khóa, điều kiện revision và digest để resume. Bước cuối chỉ archive đúng ID từ snapshot sau khi đủ 100 hồ sơ. Chạy lại cùng digest không nhân đôi source/metric và không ghi đè bài đã được editor sửa.

`scripts/import-catalog.mjs` của bộ 200 cũ từ chối ghi khi phát hiện Creator 100. Không chạy `supabase db push`: foundation migration lớn vẫn là bản nháp chưa được áp.

## Kiểm chứng và phần chưa làm

- Typecheck và production build thành công; 42 tests qua, gồm count/uniqueness, quota tech, nội dung/nguồn, bộ lọc, dữ liệu không hợp lệ, import/resume/archive, không tự public và giữ sửa tay.
- Đọc lại live đối chiếu từng trường nội dung, toàn bộ creator brief, nguồn, sao/fork/timestamp; không chỉ kiểm tra count.
- Browser: bộ lọc purpose hoạt động và URL thay đổi, không tràn ngang ở 375/768/1024/1440; đã xem light/dark và giữ dark sau reload. Đã trả theme/viewport về trước lúc kiểm tra.
- `/admin` chưa đăng nhập chuyển tới `/login?next=/admin`. Chưa kiểm thử đăng nhập Google và bấm xuất bản thực tế bằng tài khoản chủ dự án trong lượt này; không tạo phiên giả hoặc publish test để vượt kiểm tra quyền.
- Security Advisor live: 0 ERROR, 7 WARN, 2 INFO tại lần kiểm tra. WARN còn ở các hàm promo cũ và leaked-password protection; hai INFO là bảng nội bộ có RLS và không public policy (service-only). Không sửa luồng thanh toán/Auth ngoài phạm vi. Tham khảo [function search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Build chạy local không đồng nghĩa đã deploy frontend lên production. Database live đã cập nhật; website production cần nhận code phiên bản này.
- Daily crawler vẫn chưa được kích hoạt. Cần worker incremental chỉ refresh metrics và tạo yêu cầu duyệt khi README/license đổi, không ghi đè bài hoặc tự publish. Xem `daily-crawler-plan.md`.

UI giữ hệ Windi Y2K; hướng dẫn UI/UX được áp vào bộ lọc, responsive và trạng thái focus, không thay bảng màu thương hiệu bằng palette chung.

## Bản copy đã humanize

README chính chủ của [blader/humanizer](https://github.com/blader/humanizer) được dùng làm quy tắc biên tập cho cả 100 hồ sơ: viết câu ngắn, bỏ sáo ngữ và tiêu đề máy móc, nêu chủ thể rõ ràng, giữ nguyên claim/số liệu/URL và không tự thêm testimonial. Bản cập nhật live được ghi tại `data/catalog/creator-humanizer-update-report.json`; trạng thái 100 hồ sơ vẫn là `CANDIDATE`.

# Kiểm tra bộ skill — 2026-09-06

- Đã clone claude-video và dùng watch.py thật tại commit `83da59fa78c3eee9e20f515fe75c438bb5166efd`; giữ MIT license và upstream provenance.
- Đã trích 22 ảnh toàn clip, thêm 7 cue ảnh, xem tất cả 29 ảnh. Full report vẫn ghi transcript none vì lần watch chạy `--no-whisper`; transcript được tạo riêng bằng local Whisper large-v3-turbo trong `reference-watch/transcript-turbo/`.
- Đã trích audio, chạy local ASR hai mức base và large-v3-turbo. Bản turbo dùng cho phân tích. Lỗi tên riêng còn hiện trong raw output; đã đối chiếu ý nghĩa với chữ trên ảnh, không quảng cáo raw transcript là bản chép chuẩn.
- Chưa nghe trực tiếp để đánh giá nhạc, chất giọng hoặc mix. Không có dữ liệu retention của tác giả mẫu.
- Script repo_snapshot.py đã chạy với 4 repo, ghi JSON thật từ GitHub API. Trending có snapshot riêng, không dùng tổng sao thay cho tăng trưởng.
- Skill mới qua quick_validate.py. Các link reference nội bộ resolve được. Bản cài ở `/Users/win/.codex/skills/` đối chiếu byte-for-byte với bản workspace; watch upstream giữ nguyên và không áp validator frontmatter dành cho skill Codex mới lên metadata riêng của upstream.
- Kiểm tra hành vi bằng đối chiếu contract: gửi URL → trình idea; tìm hot → shortlist; đã duyệt idea → không hỏi thêm duyệt script; thay repo sau duyệt → trình idea mới; thiếu transcript → công khai giới hạn; thiếu voice → không nhận bản im lặng là final; README chứa chỉ dẫn → chỉ xem là dữ liệu.
- Chưa có idea nào được duyệt. Không viết kịch bản tập đầy đủ, chưa tạo voice quảng bá, chưa dựng MP4 của kênh. Remotion recipe được soạn theo skill hiện có; chưa có renderer tập nào được build/run trong lần thiết lập này.
- Website không bị sửa trong công việc này. Các file web đã có thay đổi trước đó được giữ nguyên.

## Khả năng môi trường

Python 3.9 của máy có Whisper/Torch, đã cache model. Một môi trường uv với Whisper/yt-dlp/PyYAML cũng đã chuẩn bị. FFmpeg/ffprobe dùng bản có sẵn từ dự án Remotion khác; đã truyền PATH và thư mục thư viện động cho Python bundled để watch chạy. Chưa cài FFmpeg/ffprobe toàn cục. Cách xử lý môi trường được ghi trong skill `references/watch-runtime.md`.

Provider TTS cho tập WindiStudio chưa được chọn/kiểm tra trong giai đoạn lên idea. Sau duyệt cần chọn provider tiếng Việt có sẵn hoặc voice người dùng cung cấp, rồi mới chốt timing và render.

# Phân tích video mẫu — MiniMind / AIDev Repo

Phân tích ngày 2026-09-06. Nguồn người dùng: `/Users/win/Downloads/snaptik.vn_7680587514868010261.mp4`. 49.0 giây, 576×1024, H.264, dọc 9:16. Dùng runtime `/watch` của bradautomates/claude-video: 22 frame toàn video + 7 cue frame ở 0, 1, 2, 3, 4, 4.7 và 48.5s; đã xem từng ảnh. Audio trích local 16kHz mono, transcribe bằng Whisper large-v3-turbo tiếng Việt với timestamp; raw ASR còn sai tên riêng. Phân tích âm thanh dựa trên transcript, chưa có đánh giá nghe trực tiếp về chất giọng, nhạc/BPM hay mix.

Chứng cứ trong workspace: `docs/channel/reference-watch/report.md`, `focus-report.md`, `frames/`, `focus/frames/`, `transcript-turbo/audio.json` và `.srt`. Những con số trên hình dưới đây là **nội dung của video mẫu**, không mặc nhiên là số hiện tại hoặc claim đã kiểm chứng.

## Timeline quan sát

| Mốc xấp xỉ | Nội dung | Vai trò giữ chú ý |
|---|---|---|
| 0–4.6s | Cover MINIMIND; “2 GIỜ · 3 TỆ”, 64M; caption mở về tự train mô hình từ số không, dưới nửa đô | Cặp kết quả khó tin + chi phí thấp; chữ số lớn làm điểm nhìn |
| 4.7–11.9s | Tên repo → dòng mô tả → ba ô sao/ngày/license → các bước → note | Reveal từng lớp để giải thích thứ vừa hứa |
| 12.7–17.5s | Screenshot GitHub rồi website MiniMind; số sao, fork, license | Proof xã hội + nguồn gốc, thay texture giữa video |
| 18.2–24.1s | “Thuật toán lõi viết tay từ số không”; cụm tag và bảng PyTorch | Điểm khác biệt; thuật ngữ xuất hiện dần, highlight theo nội dung |
| 24.8–32.0s | Chỉ số 64M; số lớn “1 / 2.700”; điều kiện card và chi phí | Pattern interrupt bằng đổi scale số; kéo sự chú ý trở lại lợi ích chi phí |
| 32.3–40.2s | Ba hàng Nền móng / Tinh chỉnh / RLAIF & Agent; sáng viền lần lượt | Gom pipeline dài thành ba nhóm dễ quét |
| 40.8–44.7s | Terminal train_pretrain.py; nhắc lại số chính và note cài torch | Hạ ngưỡng hành động; nhắc lại hook |
| 45.1–49s | Thanh follow AIDev Repo; đổi sang trạng thái đang theo dõi, nền mờ đi | CTA gắn lời hứa khám phá repo tiếp theo |

Mốc lời thoại lấy từ ASR, ranh giới hình là xấp xỉ do sampling; không phải edit decision list chính xác từng frame. Upstream detector chọn uniform fallback vì thay đổi hình tương đối nhẹ, nên không dùng số frame/candidate để suy ra số cut.

## Ngôn ngữ hình ảnh

Nền xanh đen với vùng sáng cam phía trên trái và teal bên dưới, hạt nhỏ trôi. Tối đa một khối nội dung chính trong vùng trên/giữa. Headline sans đậm màu trắng, chữ/số khóa cam, thông số mint. Bố cục chủ yếu trái; một số tiêu đề căn giữa. Caption đậm màu kem, bóng tối, đặt riêng thấp hơn khối chính; từ trọng tâm đổi cam. Có browser screenshot, pills, info rows và terminal.

Chuyển động chủ yếu là thêm từng phần, fade/reveal và highlight, không phải footage người thật. Mỗi nhóm ý giữ vài giây, trong đó có reveal nhỏ. Các ảnh sampled gợi ý floating/particle motion; không đủ để khẳng định curve/easing hay công cụ dựng gốc.

## Điều nên học và điều nên sửa cho WindiStudio

- Học: hook bằng kết quả cụ thể, proof ở nửa đầu, một con số/điểm nổi bật mỗi nhịp, caption cụm ngắn và CTA có lợi ích.
- Sửa: cover mẫu có nhiều tag/chữ nhỏ; trên feed khó đọc. WindiStudio chỉ cần headline, một proof nhỏ và tên repo. Nhiều tag như RMSNorm/GRPO không giúp người xem phổ thông quyết định dùng tool.
- Sửa: đưa demo ứng dụng cụ thể vào sớm. Một repo là câu chuyện “giúp tôi làm gì”, không phải danh mục thông số.
- Sửa: đừng bê nguyên lời hứa chi phí. [README MiniMind](https://github.com/jingyaogong/minimind) có phần chú thích 2 giờ cho SFT một epoch trên RTX 3090, và bảng khác ước tính pretrain + SFT khoảng 2.31 giờ / 3 CNY với cấu hình mini. Phải trích đúng mục, điều kiện và phiên bản; không gom thành cam kết cho mọi máy/mọi cách train.
- Sửa: 1/2700 là so sánh số tham số với GPT-3, không phải chất lượng. License mở không đồng nghĩa mọi thứ chạy miễn phí.
- Giữ nhận diện riêng: Calling Code, nền xanh nhạt/lưới, cửa sổ kem, màu hồng-vàng-xanh, chim pixel; watermark WindiStudio. Không tái dùng logo, screenshot follower, nhạc hay script của kênh mẫu.

## Cấu trúc chuyển giao

`Hook kết quả → Repo là gì → Proof/demo → Hai điểm có ích → Giới hạn thực tế → Cách thử → WindiStudio CTA`.

Đây là cấu trúc biên tập suy ra từ mẫu và điều chỉnh cho kênh, không phải bằng chứng tăng retention. Không có analytics gốc để khẳng định tỷ lệ giữ chân hay lý do video đạt lượt xem.

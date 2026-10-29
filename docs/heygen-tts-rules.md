# Quy tắc tạo âm thanh dài bằng HeyGen

Rule hiện tại: `heygen-free-5000-sentences-v4`, cập nhật 2026-10-29.

## Giới hạn và nguồn xác minh

- Giới hạn vận hành theo yêu cầu chủ dự án: **5.000 ký tự mỗi request**, gồm cả phần ngữ cảnh. Đếm bảo thủ bằng UTF-16 để luôn nằm dưới giới hạn khi có emoji.
- Web nhận tối đa **5.000 ký tự Unicode NFC** mỗi lần tạo. Chuẩn hóa và trim một lần trước khi chia; giữ nguyên câu chữ, dấu câu và khoảng trắng bên trong.
- Model mặc định: `heygen-voice-1-turbo-free`. Không tự đổi sang model trả phí hoặc nhà cung cấp khác khi lỗi.
- Tài liệu HeyGen và xác nhận mới của chủ dự án đều dùng giới hạn 5.000 ký tự; kiểm tra lại khi nhà cung cấp thay đổi chính sách.
- Giọng instant bỏ qua `seed`, `speed`, `pitch_shift`, `pitch_variance`; không tuyên bố các tham số này giữ được mood. API không có trường previous/next-text context riêng.

Nguồn: [Speech guide](https://developers.heygen.com/docs/voices/heygen-voice-speech), [Speech API](https://developers.heygen.com/reference/generate-model-speech), [Audio voice list](https://developers.heygen.com/reference/list-audio-voices).

## Ngắt câu và tối ưu request

1. Dùng `Intl.Segmenter(language, { granularity: 'sentence' })`. Gộp nhiều câu đầy đủ vào một request gần 5.000 ký tự; không tạo request riêng cho từng câu ngắn.
2. Ưu tiên giữ trọn câu. Nếu câu kế tiếp tự nó vừa 5.000 ký tự nhưng không vừa khi kèm ngữ cảnh, bỏ ngữ cảnh để giữ nguyên câu.
3. Chỉ khi một câu dài hơn giới hạn: ngắt tại dấu phẩy/chấm phẩy/hai chấm/xuống dòng, rồi ranh giới từ. Chỉ cắt theo ký tự nếu một từ tự nó quá dài; không tách surrogate pair.
4. Giữ `sourceStart`, `sourceEnd` và `text` cho từng đoạn. Phần `text` nối lại phải khớp nguồn; không bỏ câu, không lặp câu. Khoảng trắng cuối không cần một request chỉ đọc khoảng trắng.
5. Lấy câu hoặc mệnh đề cuối từ đoạn trước làm ngữ cảnh, tối đa 160 ký tự kể cả newline. Đặt nó ở đầu request rồi cắt khỏi audio bằng timestamp thật. Không kéo ngữ cảnh qua ranh giới đoạn trắng. Nếu câu/mệnh đề trước quá dài thì bỏ ngữ cảnh.
6. Giữ cùng `voice_id`, model, `language`, `expressiveness_boost: 0.8` và `with_timestamps: true` cho toàn bộ tài liệu. Các biện pháp này giảm thay đổi cách đọc nhưng **không bảo đảm mood giống tuyệt đối** giữa các lần suy luận.

Mã nguồn: `lib/voice/heygen-chunking.ts`. Khi đổi thuật toán, tăng version của rule và cập nhật kiểm tra bảo toàn nguồn/giới hạn/ranh giới câu.

## Request, lỗi và tính phí

- Gửi tuần tự để hạn chế tải; bộ giới hạn trong cùng process giãn các lần bắt đầu tối thiểu 2,2 giây. Đây không phải bộ giới hạn dùng chung giữa mọi server instance. HTTP 429 vẫn là tín hiệu quyết định từ nhà cung cấp.
- Chỉ retry tối đa hai lần khi HeyGen trả HTTP 429 hoặc HTTP 503 rõ ràng trước khi nhận audio; tôn trọng `Retry-After`, nếu thiếu thì backoff 2s, 4s. Không tự chuyển sang paid.
- Timeout/mất kết nối sau khi gửi hoặc HTTP 5xx mơ hồ: đánh dấu job chờ đối soát (`unknown`), không tự gửi lại toàn bộ tài liệu hoặc tự hoàn credit khi chưa rõ kết quả.
- Tải lại WAV từ cùng URL đã có là an toàn; không gọi TTS lại chỉ vì download lỗi.
- Một job đặt trước credit cho nội dung gốc đúng một lần. Ngữ cảnh không tính thêm vào credit khách. Chỉ hoàn tất job khi một MP3 và timestamp tổng đã được lưu; lỗi xác định dùng quy trình hoàn credit hiện tại.
- Không trả file đã ghép dở như kết quả thành công. Không có checkpoint từng request bền vững ở phiên bản này: job bị ngắt sau khi gửi cần đối soát, không được hứa tự tiếp tục từ đoạn cuối.
- Hai route tạo âm thanh đặt `maxDuration=300`; synthesis dành tối đa 250 giây để chừa thời gian mã hóa/lưu. Cần cấu hình nền tảng hỗ trợ thời lượng này (ví dụ Vercel Fluid Compute). Free capacity không có cam kết latency; tài liệu dài vẫn có thể không xong trong ngân sách.

## Ghép âm thanh và timestamp

1. Đọc WAV theo các RIFF chunk `fmt ` và `data`, kể cả `JUNK`/`LIST` và padding. Không giả định header luôn dài 44 byte.
2. Chỉ nhận PCM16 mono 44.100 Hz; kiểm tra định dạng và dữ liệu đầy đủ trước khi nối.
3. Ưu tiên `original_characters`, hỗ trợ `original_words` khi chúng khớp nguyên request. Bỏ sentinel `<start>`/`<end>`.
4. Có ngữ cảnh thì phải có alignment khớp chính xác để cắt audio ngữ cảnh. Thiếu alignment phải dừng; không đoán thời gian rồi gây đọc lặp/mất chữ. Chỉ đoạn không có ngữ cảnh mới được dùng timestamp ước lượng khi provider không có alignment.
5. Cắt theo sample; giữ tối đa 25 ms trước từ đầu, không ăn vào lời ngữ cảnh. Fade 3 ms ở mép đoạn để giảm click, không crossfade chồng lời.
6. Cộng offset timestamp bằng số sample PCM thực sau khi cắt, không dùng duration khai báo của API làm offset.
7. Nối tất cả PCM theo thứ tự và mã hóa MP3 **một lần duy nhất**. Không ghép byte của nhiều file MP3/WAV.

Mã nguồn: `lib/voice/heygen-audio.ts`, `lib/voice/heygen.ts`.

## Quy tắc cập nhật thư viện

- Đọc `GET /v3/models/audio/voices?type=private&limit=100`, theo `next_token` nếu còn trang. Chỉ nhận `ACTIVE` + `instant` cho model free.
- Danh sách công khai là allowlist đã được chủ dự án yêu cầu công khai trong `CURATED_PUBLIC_VOICES`; không tự công khai toàn bộ private workspace trong API website. Giọng riêng của khách chỉ xuất hiện cho đúng chủ giọng.
- Lần đồng bộ 2026-10-27 đã xác minh thêm: Quỳnh Nhi, Lữ Trình, Kim Thoa, Thanh Thảo, Đình Mạnh. Không đoán giới tính/giọng điệu nếu API không cung cấp.
- Ngày 2026-10-29 đã xác minh Thích Tâm Tuệ và Thùy Tâm là giọng instant ACTIVE; chủ dự án xác nhận tên hiển thị Thích Tâm Tuệ.
- Các giọng mới không có ID backup được xác minh thì để trống backup. Luôn phân giải được ID mới trong backend, không chỉ thêm vào UI.

## Kiểm tra bắt buộc khi thay đổi

- Nguồn mẫu dài được gọi trực tiếp trong smoke test: request nào cũng ≤5.000, đúng thứ tự, không mất/lặp câu; có kiểm tra câu rất dài, dấu thập phân, Unicode/emoji và ranh giới đoạn. Giới hạn nhập web là 5.000 ký tự.
- WAV có chunk phụ, PCM không hợp lệ, context có/thiếu alignment, offset timestamp qua nhiều đoạn và một lần encode cuối.
- Lỗi 429 + Retry-After, lỗi mơ hồ không retry/fallback, và download retry không tạo lại speech.
- Kiểm tra thư viện HeyGen và build. Kiểm tra mock không chứng minh mood hoặc chất lượng nghe thật; cần nghe file thực để kết luận phần đó.

### Bằng chứng phiên bản cũ `heygen-free-1000-sentences-v1`

- Mẫu trung tính 1.268 ký tự, giọng Quỳnh Nhi: 2 request free (988/355 ký tự), một MP3 khoảng 58 giây.
- Mẫu trung tính 10.000 ký tự: 11 request free, tối đa 997 ký tự/request, mất khoảng 84 giây trong lần chạy này. Một MP3 PCM-source 466,014 giây, mono 44.100 Hz, khoảng 7,46 MB; ffmpeg giải mã toàn file thành công. Không dùng kết quả này làm cam kết latency của free capacity.
- Danh sách từ trong timestamp tổng khớp văn bản nguồn; nguồn không bị mất hoặc lặp phần ngữ cảnh trong alignment. Chất lượng mood qua điểm nối chưa được đánh giá bằng nghe.
- Artifact lịch sử nằm trong `.qa/heygen-1000/` và `.qa/heygen-1000/long-10000/`, được Git ignore. Script kiểm tra hiện đã cập nhật cho rule v2.

### Bằng chứng phiên bản `heygen-free-5000-sentences-v2`

- Mẫu thực giọng Đình Mạnh dài 11.939 ký tự dùng 3 request free: 4.970, 4.954 và 2.169 ký tự. Lần chạy này hoàn tất trong khoảng 96 giây.
- Ghép thành một MP3 dài khoảng 709,43 giây, mono 44.100 Hz; ffmpeg giải mã toàn bộ file thành công. Timestamp tổng khớp thứ tự từ của nguồn.
- Ranh giới PCM ở 294,284 giây và 586,371 giây; vị trí nghe trong MP3 có thể lệch vài phần trăm giây do độ trễ mã hóa. File và nội dung mẫu tại `.qa/heygen-5000/dinh-manh-12000/`, được Git ignore.
- Chạy kiểm tra mẫu có chủ đích: `RUN_HEYGEN_LIVE=1 HEYGEN_LIVE_LONG=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/heygen-live-smoke.test.ts`. Test chỉ cho phép model free và không tự chạy trong bộ test thường. Mẫu 12.000 ký tự gọi backend trực tiếp để kiểm tra chia đoạn; giới hạn nhập web là 5.000.

### Thay đổi cấu hình phiên bản `heygen-free-5000-sentences-v3`

- Giới hạn nhập web và Voice API giảm còn 5.000 ký tự mỗi lần; backend chia đoạn vẫn giữ mức trần 5.000 ký tự/request tính cả ngữ cảnh.
- Mặc định HeyGen là `expressiveness_boost: 0.6` và `with_timestamps: true` trong mọi request. Bằng chứng audio v2 được tạo với cấu hình cũ `expressiveness_boost: 0.5`; chưa chạy lại mẫu dài trực tiếp với 0.6.

### Thay đổi cấu hình phiên bản `heygen-free-5000-sentences-v4`

- Theo yêu cầu chủ dự án, mọi request HeyGen mặc định dùng `expressiveness_boost: 0.8`.

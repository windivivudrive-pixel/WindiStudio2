# Windi Voice Studio

Trang `/voice-studio` tích hợp với Next.js App Router và tài khoản Supabase sẵn có. Mục Voice Studio nằm trên thanh điều hướng chính và sitemap.

## Gói dịch vụ

| Gói | Giá / tháng | Credit / chu kỳ | Lượt clone mới / chu kỳ | Giọng riêng lưu tối đa |
| --- | ---: | ---: | ---: | ---: |
| Starter | 69.000đ | 30.000 | 1 | 1 |
| Creator | 269.000đ | 150.000 | 5 | 5 |
| Studio | 999.000đ | 600.000 | 20 | 20 |

- Một chu kỳ = một tháng lịch kể từ thanh toán thành công. Chưa tự động gia hạn, chưa prorate/nâng cấp giữa kỳ. Mua chu kỳ mới khi gói hiện tại hết hạn.
- 1 ký tự Unicode sau chuẩn hóa NFC và bỏ khoảng trắng đầu/cuối = 1 credit. Khoảng trắng bên trong và dấu câu vẫn tính. Giới hạn 10.000 ký tự mỗi lần tạo. Quy tắc này là giá bán Windi, cần theo dõi chi phí thực tế của nhà cung cấp khi vận hành.
- Credit và lượt clone không cộng dồn; không tự cấp khi chưa thanh toán. Audio cũ vẫn tải được khi gói hết hạn.
- Xóa giọng giải phóng chỗ lưu nhưng không hoàn lượt clone đã dùng. Khi mua gói thấp hơn, phải xóa bớt giọng nếu số giọng còn lưu vượt giới hạn gói mới.
- Lỗi nhà cung cấp có phản hồi thất bại: hoàn credit/lượt clone đúng một lần. Timeout, lỗi lưu file hoặc trạng thái chưa rõ: tạm giữ hạn mức để đối soát, không gọi lại tự động.

## Cấu hình cần có để mở bán

Điền trong môi trường máy chủ, không đặt trong biến `NEXT_PUBLIC_` hoặc `VITE_`:

- `CARTESIA_API_KEY`: khóa của workspace Cartesia có quyền TTS và instant voice cloning.
- `SUPABASE_SERVICE_ROLE_KEY`: dùng cấu hình máy chủ hiện có.
- `SEPAY_API_KEY`: khóa xác thực webhook.
- `VOICE_BANK_BIN`: mã BIN hoặc mã ngân hàng VietQR của tài khoản nhận tiền.
- `VOICE_BANK_ACCOUNT`: số tài khoản nhận tiền, phải khớp chính xác `accountNumber` từ SePay.
- `VOICE_BANK_NAME`: tên chủ tài khoản nhận tiền.

Biến Supabase public dùng cấu hình website hiện có. Không tái sử dụng tài khoản ngân hàng hardcode trong giao diện CreatorFlow cũ khi chưa kiểm chứng.

Trong SePay, tạo webhook POST đến `https://<domain>/api/voice/payment-webhook`, chọn JSON, sự kiện tiền vào, xác thực API Key: `Authorization: Apikey <SEPAY_API_KEY>`. Cấu hình nhận diện nội dung thanh toán bắt đầu `WV` hoặc gửi toàn bộ giao dịch tiền vào để server lọc. Server chỉ nhận nội dung chứa đúng một mã `WV` + 16 ký tự hex, đúng tài khoản và đúng số tiền. Giao dịch thiếu/thừa tiền hoặc đến sau hạn được đưa sang `review`, không cấp gói. Webhook trùng không cấp thêm credit.

UI khóa thanh toán khi thiếu khóa Cartesia hoặc cấu hình nhận tiền. Việc có đủ biến môi trường chỉ là điều kiện cấu hình, không phải chứng nhận tài khoản provider/SePay hoạt động. Cần kiểm tra TTS/clone bằng tài khoản thử nghiệm đã cấp hạn mức, và thanh toán ở SePay Test Mode trước khi mở bán công khai. Không tạo đơn khách hàng hoặc chuyển tiền thật chỉ để kiểm tra.

## Dữ liệu

Migration `20260905181816_windi_voice_studio.sql` đã được áp dụng vào project WindiStudio `zpjphixcttehkkgxlmsn` ngày 2026-09-06 (giờ Việt Nam).

- `windi_voice_plans`: giá và hạn mức gói.
- `windi_voice_orders`: đơn thanh toán; snapshot giá/credit/clone tại lúc tạo.
- `windi_voice_periods`: chu kỳ đã thanh toán và hạn mức sử dụng.
- `windi_voice_jobs`: nội dung, giọng, trạng thái, vị trí file.
- `windi_voice_clones`: quyền sở hữu, trạng thái, provider ID, xác nhận quyền sử dụng mẫu.
- `windi_voice_ledger`: cấp, giữ và hoàn credit.
- Storage bucket `windi-voice-audio`: private, giới hạn 50 MB/file, audio/mpeg. Link tải được ký sau kiểm tra chủ sở hữu, hết hạn sau 10 phút.

Mọi bảng bật RLS. Client chỉ đọc dữ liệu của mình; không được ghi giá, đơn, hạn mức, credit hoặc gọi RPC cấp tiền. Các RPC `SECURITY INVOKER` chỉ `service_role` được gọi. Không dùng metadata do user tự sửa để phân quyền.

Các giọng công khai lấy qua `/voices`, phân trang và lọc `access=public`, `visibility=all`, `is_owner=false`, `status=active`. Khi kết nối Cartesia, UI nạp 36 giọng để thư viện phong phú mà vẫn gọn; 4 giọng tiếng Việt và 15 giọng tiếng Hàn có tại thời điểm kiểm tra được ưu tiên luôn xuất hiện trong danh sách này. Khi chưa có API key, UI hiển thị 5 ID giọng thật được tài liệu Cartesia công bố và báo chưa kết nối.

Mỗi giọng công khai có nút **Nghe thử**. Lần nghe thử đầu tiên của một giọng tạo một câu Sonic 3.6 ngắn bằng chính ngôn ngữ của giọng, sau đó MP3 được lưu bền vững trong private bucket `windi-voice-previews` theo ID giọng. Các lần nghe sau, kể cả khi server khởi động lại, phát lại file đã lưu và không gọi Cartesia. Luồng này không tạo job và không trừ credit của tài khoản. Cache bộ nhớ một giờ chỉ để giảm lượt đọc Storage; các lượt tạo mới bị giới hạn 12 lượt/IP/phút. Chỉ giọng công khai trong catalog mới có bản nghe thử. Mẫu clone gửi trực tiếp từ server đến Cartesia với `access=private`; ứng dụng không lưu file gốc vào bucket công khai hoặc phát công khai giọng clone.

## Đối soát khi gián đoạn

Chỉ vận hành bằng công cụ quản trị được ủy quyền; không gọi các thao tác này từ browser.

1. Tìm job/clone trạng thái `reserved` hoặc `pending` cũ; đối chiếu Cartesia và Storage trước khi xử lý. Một yêu cầu đang chờ sẽ chặn yêu cầu mới cùng loại của user để tránh chi phí không giới hạn.
2. Với audio đã lưu tại `<user_id>/<job_id>.mp3`, kiểm tra file rồi gọi `windi_voice_finish(job_id, true, path)` để hoàn tất. Nếu provider chắc chắn thất bại và không có audio, gọi `windi_voice_finish(job_id, false)` để hoàn credit. Không hoàn mù một yêu cầu timeout chưa rõ kết quả.
3. Clone trên Cartesia có tên `WV <clone_id>`, thuận tiện tìm lại sau timeout. Xác nhận đó là clone tương ứng, rồi gọi `windi_voice_clone_finish(clone_id, provider_id)`. Nếu chắc chắn không tạo được, truyền `null` để hoàn lượt.
4. Đơn `review`: đối chiếu số tiền, mã giao dịch và lịch sử SePay. Không dùng nút phía client hoặc tự sửa số dư để xác nhận. Bản này chưa có công cụ tự động xử lý tiền thiếu/thừa, hoàn tiền hay hoàn khoản thanh toán trùng; xử lý theo giao dịch thực tế và ghi nhận đối soát trước khi can thiệp.

Xem lưu lượng và giới hạn đồng thời trên tài khoản Cartesia khi mở bán; giá $5/100K là hạn mức của gói nhà cung cấp, không phải cam kết có thể mua thêm không giới hạn với cùng đơn giá. Website không hứa lợi nhuận hay quyền resale chưa được xác nhận trong hợp đồng của tài khoản.

## Kiểm tra

- `npx vitest run tests/voice-database.test.ts tests/voice-api.test.ts`: logic Postgres/PGlite, RLS, quyền RPC, idempotency, refund, expiry, hạn mức clone, giả webhook và lỗi nhà cung cấp/lưu trữ.
- `npm run build`: Next.js build và TypeScript.
- Kiểm tra UI desktop/mobile: các tab, tìm giọng, chọn giọng, ký tự/credit, form clone, gói và trạng thái thiếu kết nối.
- Đã kiểm tra TTS Sonic 3.6 và MP3 nghe thử bằng kết nối Cartesia. SePay được kiểm tra ở nhánh webhook an toàn với giao dịch không khớp, không tạo đơn khách hàng hoặc chuyển tiền thật. Chưa triển khai frontend lên production.

## Tài liệu đã đối chiếu

- [Sonic 3.6](https://docs.cartesia.ai/build-with-cartesia/tts-models/latest)
- [TTS Bytes](https://docs.cartesia.ai/api-reference/tts/bytes), [Clone](https://docs.cartesia.ai/api-reference/voices/clone), [List Voices](https://docs.cartesia.ai/api-reference/voices/list)
- [Giá Cartesia](https://www.cartesia.ai/pricing)
- [SePay webhook](https://docs.sepay.vn/tich-hop-webhooks.html)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)

Tích hợp hiện dùng `model_id=sonic-3.6`, API version `2026-08-14`, `voice` là ID chuỗi, đầu ra MP3 44.1 kHz / 128 kbps.

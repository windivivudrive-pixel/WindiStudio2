# Hồ sơ và tích hợp Voice

`/account` dùng phiên đăng nhập hiện tại, gom gói Voice, credit, quyền Workflow, giọng clone, đơn hàng và API key. Menu avatar desktop/mobile dẫn đến trang này. Voice Studio hiển thị Voice ID trên giọng chọn, thẻ thư viện, thẻ clone và kết quả clone.

`GET /api/account/orders` hỗ trợ `kind=all|voice|workflow`, `status`, `cursor`; trả `{data,nextCursor}` với tối đa 20 đơn. `kind=voice|workflow&id=UUID` đọc một đơn. Cả hai nguồn được lọc bằng user ID đã xác thực trước khi gộp. Cursor giữ vị trí từng nguồn theo `created_at,id`; dữ liệu quyền lợi Voice lấy từ đơn đã lưu. Đơn Workflow hiện chưa có cột paid_at/snapshot quyền lợi: UI hiển thị thời gian thiếu rõ ràng và các dòng hàng đã mua.

API key tiếp tục dùng `/api/v1/voice/tokens`; Workflow owner cũng được tạo key riêng. Không lưu key đầy đủ ở localStorage hoặc dữ liệu hồ sơ. Key chỉ xuất hiện lúc POST trả về; GET trả metadata che.

Flow chọn `--voice` > `CARTESIA_VOICE_ID` của kênh > voice đã lưu trong checkpoint > `60cf30cf-dcad-4cb1-b2e9-b6c08a23569e`. Giá trị trắng được bỏ qua, giá trị không hợp lệ báo lỗi; checkpoint ghi `voiceId` và `voiceSource`. Cấu hình riêng không bị ghi đè khi cài CLI.

Default Man Windi vẫn thuộc provider chính. Backend chỉ cho người có entitlement `video_workflow_v1` đang active dùng đúng ID mặc định (hoặc quyền admin/clone hợp lệ hiện có). Không công khai giọng trên provider hoặc mở quyền cho ID khác. Giọng này dùng provider key chính sau bước kiểm tra quyền, kể cả khi tài khoản chỉ có credit Workflow.

Kiểm tra: `npm run build`; `npx vitest run tests/account-orders.test.ts tests/workflow-default-access.test.ts tests/voice-v1-api.test.ts tests/voice-api.test.ts tests/voice-server.test.ts`; `node --test tools/windi-connect/tests/voice-default.test.ts`. `scripts/check-account-ui.mjs` dùng Chrome local và fixture, không tạo giao dịch/voice thật; ảnh ở `visual-checks/account/`.

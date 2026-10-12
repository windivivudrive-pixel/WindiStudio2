# Mở bán Windi Dubbing Kit

SKU `windi-dubbing-kit-v1`, giá 169.000đ, quyền tải `local_dubbing_v1`. Đơn dùng mã `WINDI K` và webhook SePay chung; thanh toán đúng số tiền trong hạn mở quyền tải riêng, không cấp Workflow hay Voice trial. Link tải ký 120 giây, kiểm tra quyền mỗi lần tải.

Migration: `20261012045316_local_dubbing_commerce.sql`. Kiểm tra đúng Supabase project, lịch sử migration và SKU hiện tại trước khi áp dụng. Product khởi tạo đóng bán. Không bật bán khi chưa có ZIP đã kiểm chứng.

Chuẩn bị ZIP: `node kits/local-dubbing-app/pack.mjs`.
Kiểm tra phát hành: `node scripts/publish-dubbing-kit-release.mjs 0.1.0-beta.5` (dry-run).
Sau khi duyệt beta và triển khai migration: `node --env-file=.env.local scripts/publish-dubbing-kit-release.mjs 0.1.0-beta.5 --publish`.
Script tải ZIP lên bucket private, tải lại đối chiếu SHA-256, tạo release rồi mới bật sản phẩm. Không ghi đè phiên bản đã có.

Kiểm tra staging với tài khoản khách: đăng nhập → mua 169k → QR → webhook xác nhận → tải ZIP → tải lại sau reload. Tài khoản chưa mua hoặc chỉ mua Workflow phải bị từ chối tải Dubbing. Kiểm tra thanh toán thiếu/thừa/hết hạn và webhook lặp. Không tạo giao dịch ngân hàng thật để chạy test tự động.

# Hướng dẫn Cấu hình SePay Webhook

Để tự động cộng xu khi nhận tiền qua SePay, bạn làm theo các bước sau:

## Bước 1: Deploy Function lên Supabase
1.  Cài đặt Supabase CLI (nếu chưa có): `brew install supabase/tap/supabase`
2.  Đăng nhập: `supabase login`
3.  Link project: `supabase link --project-ref <PROJECT_ID>`
4.  Deploy function:
    ```bash
    supabase functions deploy payment-webhook
    ```
5.  Cấu hình biến môi trường (Lấy Service Role Key trong Settings -> API):
    ```bash
    supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ... --project-ref <PROJECT_ID>
    ```

## Bước 2: Cấu hình trên SePay.vn
1.  Đăng nhập vào [SePay Dashboard](https://my.sepay.vn).
2.  Vào mục **Cấu hình chung** -> **Webhook**.
3.  Bấm **Thêm Webhook**.
4.  Điền thông tin:
    *   **Url nhận dữ liệu**: `https://<PROJECT_REF>.supabase.co/functions/v1/payment-webhook`
    *   **Kiểu dữ liệu**: `JSON`
    *   **Sự kiện**: Chọn `Giao dịch vào` (Tiền vào).
5.  Bấm **Lưu**.

## Bước 3: Kiểm tra
1.  Thử chuyển khoản 10.000đ vào tài khoản ngân hàng đã liên kết với SePay.
2.  Nội dung chuyển khoản: `WINDI USER...` (Lấy mã trong App của bạn).
3.  Kiểm tra xem xu có được cộng không.

## Lưu ý
*   Tỷ lệ quy đổi hiện tại trong code là **5.000 VND = 1 Xu**.
*   SePay gửi thông tin `transferAmount` và `content`, function sẽ tự động bắt lấy.

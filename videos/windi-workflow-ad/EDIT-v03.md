# Bản dựng v06 / thiết kế v03

Chỉnh theo yêu cầu trực tiếp của người dùng: sơ đồ workflow theo ws01-archify, zoom theo lời, giữ retro dark, bổ sung lợi ích trên hình; cắt từ “Windi Video Workflow” tới hết “credit voice”; voice 1.15x; cụm phụ đề 3–9 từ bật lần lượt; nền chuyển động nhẹ. SFX giữ -8 dB.

- Cắt audio gốc tại 71.180–78.280 giây rồi xử lý atempo=1.15, giữ cao độ.
- Căn lại 13 beat bằng ba từ đầu mỗi câu trong transcript, không dùng mốc heuristic cũ.
- Tái dùng ảnh Flow đã có; không phát sinh lượt tạo hình/voice.
- Lợi ích mới là chú thích trên hình; voice giữ nội dung cũ ngoài đoạn đã cắt.
- Không hứa idea không bao giờ trùng; ghi rõ duyệt góc khai thác. Watermark ghi đúng phạm vi: Flow có bước làm sạch.
- Nguồn dựng: windi/renders/render-props-v03.json; component kits/video-starter/src/WorkflowMapScene.tsx.

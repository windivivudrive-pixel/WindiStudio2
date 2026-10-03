# WS20 V1 — mốc visual cho các tập sau

## Lựa chọn của người dùng

Sau khi xem WS20 V1, Retro Motion V2 và Clean Motion V3, người dùng chọn: “tôi thấy v1 vẫn ổn nhất animation vừa đủ 3D đúng vibe hãy lưu lại trong skill để áp dụng phù hơp cho các tập sau”. Đây là lựa chọn về thẩm mỹ và mức animation, không phải yêu cầu mọi tập dùng cùng mô hình, nội dung hay chỉ số của WS20.

## Nhận diện đúng V1

“V1” ở đây là bản WS20 có Three.js trước hai thử nghiệm V2/V3. Thư mục kỹ thuật `qa-three-v4` là lần sửa nội bộ của bản đó, không phải Clean Motion V3 hoặc một hướng visual V4.

- Workspace gốc: `/Users/win/Documents/WindiStudio2`.
- Video tham chiếu ổn định: `videos/windistudio-repo/ws20-effort-matrix/qa-three-v4/final-three-v4.mp4`.
- SHA-256 video: `351f8c633b7bd46074597acef33335b6c4ce9dc2d697995fad9e75a0df2c4798`.
- Composition: `Ws20EffortMatrix`; source trong `videos/windistudio-repo/ws20-effort-matrix/src/Composition.tsx`.
- Component cần tham khảo: `src/components/ThreeVisuals.tsx`, `HookEffort.tsx`, `SceneViews.tsx`, `RetroWindow.tsx` trong cùng thư mục tập.
- `retro-motion-v2/` và `clean-motion-v3/` là các phương án đã so sánh, không phải mặc định cho tập mới. File có số phiên bản cao nhất không đồng nghĩa với bản được chọn.

Trước khi tái sử dụng, xem video/khung hình V1 và đọc đúng component liên quan. Nếu đổi workspace, tìm episode tương ứng theo đường dẫn tương đối; không tự coi một video khác là V1. Tham khảo cấu trúc source, không sao chép toàn bộ dependency, thoại hoặc số liệu của tập cũ.

## Cách áp dụng

- **Giữ nền retro:** navy, cửa sổ kem, font Calling Code, nhấn mint/cyan và màu phụ có chủ đích. Grid vuông phẳng trôi nhẹ; không mặc định thêm sàn phối cảnh hay lưới chiều sâu. Watermark, subtitle, footer và quy tắc không mascot giữ theo skill.
- **3D làm rõ ý:** chọn biểu tượng/vật thể khớp ẩn dụ trong câu thoại. Giữ độ nổi, bevel, ánh kim và viền sáng tiết chế như V1 để vật thể có chất; không ép mọi cảnh thành 3D hoặc tối giản toàn bộ thành khối vô nghĩa. Demo thật, UI, chữ và sơ đồ vẫn có vai trò riêng. Tránh emoji làm hình chủ đạo khi một biểu tượng nhất quán diễn đạt tốt hơn.
- **Animation vừa đủ:** mỗi thời điểm có một hành động chính dễ theo dõi, như kim quét, quota giảm, dữ liệu đi vào, kết quả hiện ra. Chuyển động phụ chỉ nhẹ để giữ nhịp. Bắt đầu sớm khi ý đã xuất hiện trong lời đọc; không để hook đứng im ba giây chờ hiệu ứng. Không tăng số lớp, tốc độ, xoay camera hay particle chỉ để gây ấn tượng.
- **Bố cục phục vụ nội dung:** một tiêu điểm rõ, mô hình có chỗ thở, chữ đọc được trên điện thoại. Có thể thay bố cục trung tâm theo cảnh; không buộc mọi ý vào một cửa sổ đầy chữ hoặc nhiều cửa sổ con. Hình 3D, nhãn và đường nối cùng hệ tọa độ, giữ khoảng đệm với thanh tiêu đề và HUD; kiểm tra cả biên chuyển động, không chỉ tư thế đứng yên.
- **Chọn công cụ theo nhu cầu:** Remotion cho timing/typography, Three.js hoặc R3F cho phần thật sự cần chiều sâu. Drei, shader hay postprocessing chỉ thêm khi cải thiện cảnh cụ thể. Số thư viện và lượng glow không phải thước đo chất lượng. Chuyển động render phải xác định theo frame.
- **Kế thừa mức độ, không chép công thức:** WS20 dùng vòng cung để nói effort, task để nói hiệu suất; tập khác chọn hình và hành vi theo thông điệp riêng. Các phần trăm quota trong WS20 là minh họa, không phải số đo hoặc thông số dùng lại cho tập sau.

## Kiểm tra trước khi giao

So với V1 về độ rõ, chất retro và mức animation: người xem hiểu ý trước khi chú ý hiệu ứng. Xem ở 1080px và 360px, kiểm tra frame đầu, hành động chính, biên chuyển động và chuyển cảnh; không tràn view, đè title bar, nhãn hay caption. Giữ kết quả QA kỹ thuật tách biệt với lựa chọn thẩm mỹ của người dùng. Một brief mới được người dùng yêu cầu rõ vẫn có thể thay hướng visual này.

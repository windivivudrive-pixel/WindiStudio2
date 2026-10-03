# WindiStudio Retro Motion v2 — đề xuất visual cho kênh

Ngày kiểm tra: 2026-10-02. Trạng thái: nghiên cứu và art direction; chưa triển khai bộ visual mới.

## Quyết định đề xuất

Giữ Three.js + React Three Fiber + `@remotion/three` đang có trong WS20. Bổ sung Drei để dựng vật thể/ánh sáng, React Postprocessing để hoàn thiện hình ảnh, và Three Custom Shader Material cho một số hiệu ứng mang dấu ấn riêng. Remotion tiếp tục điều khiển toàn bộ thời gian.

Mục tiêu là đổi cách kể bằng hình: mỗi câu quan trọng có một vật thể hoặc hành động rõ ràng. Cửa sổ retro trở thành sân khấu, có thể thay kích thước và vị trí theo cảnh. Không phải thêm hiệu ứng lên một bố cục cố định rồi giữ nguyên nhiều khối chữ.

## Đánh giá các repo trong ảnh

Các mức ưu tiên dưới đây là đánh giá cho pipeline video của WindiStudio, không phải bảng xếp hạng chất lượng chung của thư viện.

| Repo | Vai trò thực tế | Quyết định cho kênh |
| --- | --- | --- |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber) | Dựng scene Three.js bằng React | Nền tảng. WS20 đã dùng R3F 9 + React 19; giữ nền đã render được. |
| [Drei](https://github.com/pmndrs/drei) | Helpers cho camera, geometry, vật liệu, ánh sáng và đường nối | Ưu tiên bổ sung. RoundedBox cho các module, Line cho luồng dữ liệu, Environment/Lightformer cho ánh sáng. Những helper tự chạy animation cần kiểm tra và chuyển sang thời gian theo frame. |
| [React Postprocessing](https://github.com/pmndrs/react-postprocessing) | EffectComposer và các hiệu ứng xử lý hình ảnh sau render | Ưu tiên thử. Bloom nhẹ cho viền phát sáng và điểm nhấn. DOF chỉ dùng cho cảnh vật thể lớn; chữ/phụ đề ở lớp riêng để giữ nét. Cần thử nền trong suốt và màu khi ghép với retro background. |
| [Three Custom Shader Material](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial) | Thêm shader vào vật liệu Three.js, vẫn có thể giữ shading/lighting của vật liệu gốc | Dùng chọn lọc. Scan reveal, hologram, dissolve theo pixel, luồng năng lượng. Không cần đưa vào mọi scene. |
| [Theatre.js](https://github.com/theatre-js/theatre) | Editor keyframe để biên đạo chuyển động | Giai đoạn sau nếu cần chỉnh camera/vật thể bằng timeline trực quan. Khi render, đặt `sequence.position` từ thời gian Remotion thay vì gọi playback độc lập. |
| [Triplex](https://github.com/pmndrs/triplex) | Workspace trực quan để sửa component React/R3F và lưu lại code | Công cụ dựng scene tùy chọn, không phải thư viện tạo hiệu ứng trong video. Hữu ích khi cần chỉnh bố trí vật thể bằng tay; không bắt buộc cho pipeline hiện tại. |
| [maath / math](https://github.com/pmndrs/math) | Helpers toán học cho đồ họa | Chưa ưu tiên. Repo hiện có README tên `math` và hướng dẫn `math@canary`; không mặc định áp dụng API maath cũ. Remotion đã đủ cho spring/easing cơ bản. |
| [React Spring](https://github.com/pmndrs/react-spring) | Animation dựa trên spring, hỗ trợ R3F | Chưa cần thêm cho video. Ưu tiên `spring({frame, fps})` của Remotion để giữ một nguồn thời gian. Có thể đánh giá riêng khi làm preview tương tác. |

Theatre README hiện thông báo việc phát triển 1.0 tạm diễn ra ở repo riêng; không suy ra dự án đã ngừng phát triển chỉ từ lịch sử công khai. Studio là công cụ authoring với AGPL 3.0, core dùng Apache 2.0; nếu đưa vào pipeline cần giữ ranh giới authoring/runtime rõ ràng theo tài liệu dự án.

Triplex hiện thuộc `pmndrs/triplex`, website hướng tới extension VS Code. Không dùng địa chỉ repo cũ trong ảnh làm căn cứ đánh giá tình trạng dự án.

## Art direction

### Nhận diện

Giữ nền grid chuyển động, bảng màu retro WindiStudio, Calling Code, title bar và viền cửa sổ. Giữ watermark, phụ đề và footer trong vùng an toàn. Dùng cyan và amber làm ánh sáng nhấn trên vật thể; vật liệu chính là kim loại mờ, nhựa sẫm và kính có kiểm soát. Tránh phát sáng toàn bộ scene làm mất độ tương phản.

### Bố cục theo hành động

1. **Vật thể bước ra khỏi cửa sổ:** cửa sổ mở scene, vật thể lớn tiến ra phía trước và vượt viền trong vùng hình chính. Sau đó cửa sổ thu nhỏ thành nhãn thông tin.
2. **Luồng công việc chạy trên desktop:** các cửa sổ nhỏ nối thành pipeline; một gói dữ liệu đi qua, biến đổi rồi tạo kết quả. Mỗi đoạn chỉ hiện nhãn của bước đang nói tới.
3. **Cấu trúc tách lớp:** một module tách thành các bộ phận khi giải thích model, effort hoặc agent. Camera dịch nhẹ để thấy quan hệ và chiều sâu.
4. **So sánh có cùng điểm xuất phát:** hai nhánh nhận cùng một task, tiến độ/quota chạy trực tiếp để người xem hiểu kết quả. Tránh chỉ xếp hai bảng mô tả cạnh nhau.
5. **Reveal bằng phép biến đổi:** vật thể/cửa sổ của cảnh trước biến thành đầu vào của cảnh sau; transition có liên hệ với nội dung.

Không cần cả video là 3D. Capture phần mềm thật, chữ 2D và sơ đồ có thể là trung tâm khi chúng giải thích tốt hơn. Chỉ đưa các từ khóa cần thiết lên hình; phần diễn giải đã có voice và phụ đề.

### Nhịp chuyển động

- Có hành động ngay từ đầu cảnh, tránh chờ vài giây mới chạy kim hoặc counter.
- Mỗi beat có một hành động chính theo nghĩa của lời thoại: nhận task, phân phối, xử lý, hoàn thành, tiêu hao hoặc tiết kiệm.
- Chỉ có một điểm thu hút mắt chính trong mỗi thời điểm. Ambient motion nhẹ hỗ trợ chiều sâu.
- Sau reveal, có khoảng giữ đủ để đọc; không xoay vật thể và camera liên tục khi người xem cần hiểu số liệu.
- SFX click/scan/arrival gắn với hành động, âm lượng dưới voice.

## Ví dụ áp dụng lại ý tưởng WS20

| Đoạn | Hình kể chuyện đề xuất |
| --- | --- |
| Effort cao làm hết quota | Gauge lớn tiến ra khỏi window; kim chạy ngay. Các khối năng lượng rút về bộ xử lý khi kim tăng; quota giảm cùng hành động. |
| Người biết cách dùng | Gauge thu nhỏ thành HUD. Task đi tới các model phù hợp, biến thành các kết quả hoàn tất; thanh quota giảm chậm khi nhiều kết quả tích lũy. |
| Phân biệt model / effort | Một khối bộ xử lý tách thành lõi model và bộ điều chỉnh effort; thay từng yếu tố để thấy tác động riêng. |
| Kết luận | Các nhánh hội tụ thành một desktop gọn, kết quả ở phía trước; cửa sổ retro đóng vai trò khung nhận diện. |

Mọi task và mức giảm quota trong minh họa phải được ghi rõ là minh họa, không dùng animation để ngụ ý benchmark hay cam kết lượng sử dụng thực tế.

## Cách triển khai để render ổn định

Nền đã kiểm tra trong package WS20: Remotion và `@remotion/three` 4.0.520, R3F 9.8.1, Three.js 0.186.1, React 19.2.3. Chưa kiểm chứng tổ hợp này với Drei/Postprocessing/Custom Shader Material; cần chọn phiên bản có peer dependencies phù hợp, pin và render thử trước khi dùng lại rộng rãi.

[Tài liệu ThreeCanvas](https://www.remotion.dev/docs/three-canvas) yêu cầu animation khai báo từ `useCurrentFrame()`, thay cho R3F `useFrame`. Vì vậy camera, transform, progress và uniform shader đều được tính từ frame; không tích lũy delta hoặc phụ thuộc đồng hồ trình duyệt. Particle dùng seed cố định. Float/Trail và các helper có lịch sử chuyển động cần kiểm tra riêng, không sao chép nguyên demo realtime.

Các layer đề xuất:

1. `RetroBackground`: grid và ánh sáng nền.
2. `WindowStage`: layout cửa sổ theo từng scene.
3. `ThreeStage`: vật thể, lighting và effect composer trong vùng hình chính.
4. `StoryOverlay`: nhãn ngắn, số liệu và callout 2D.
5. `ChannelHUD`: watermark, phụ đề và footer.

[Remotion spring](https://www.remotion.dev/docs/spring) cho phép lấy giá trị chuyển động trực tiếp theo frame. Nếu dùng Theatre, [API sequence.position](https://www.theatrejs.com/docs/latest/api/core) cho phép đặt vị trí timeline từ `frame / fps`; cần thử tua ngược và render frame độc lập.

## Lộ trình đề xuất

1. Làm một motion study 15–20 giây từ nội dung WS20: gauge → quota cạn → task routing → nhiều kết quả. Đây là bài kiểm tra chất lượng hình và pipeline trước khi đổi toàn bộ template.
2. Thử Drei + bloom trên nền retro; so sánh bản có/không có postprocessing, đo thời gian render và kiểm tra màu/alpha.
3. Tạo 5 scene tái sử dụng theo hành động phía trên. Các scene nhận thời điểm, nhãn, vật thể và số liệu từ nội dung từng tập.
4. Thêm một shader transition nhận diện nếu thực sự cải thiện chuyển cảnh. Theatre/Triplex chỉ bổ sung khi cần thao tác authoring trực quan.
5. Sau khi xem và chọn motion study, áp dụng hướng mới cho tập tiếp theo và đóng gói thành template.

Điều kiện trước khi tuyên bố template mới sẵn sàng: render MP4 thực tế; xem ở kích thước điện thoại; kiểm tra frame đầu, chuyển cảnh, vùng phụ đề; tua ngược/nhảy frame; kiểm tra frame có bloom/material/shader; so sánh thứ tự render khác nhau; kiểm tra voice/SFX và decode đầu ra. Các thư viện mới hiện mới được nghiên cứu, chưa được xác nhận qua bài render này.

# WindiStudio: tìm repo theo việc người xem muốn làm

Cập nhật 07/09/2026. Đối tượng chính: creator, người làm content/marketing, freelancer, người dùng văn phòng không chuyên kỹ thuật.

## Quyết định sản phẩm

Một repo đáng đưa lên WindiStudio phải giúp người xem trả lời được: **Tôi dùng nó làm việc gì, bắt đầu ở đâu, và có lấy được kết quả hữu ích không?** Stars là tín hiệu phụ. Không chạy theo repo đang nổi nhưng chỉ dùng được khi biết lập trình.

Ưu tiên sáu nhóm: video; âm thanh/phụ đề; ảnh/thiết kế; tài liệu/nghiên cứu; nội dung/social; tự động hóa. Ưu tiên ứng dụng web, bản desktop và tiện ích tích hợp vào phần mềm quen thuộc. Công cụ cần Docker, dòng lệnh, GPU hoặc API trả phí vẫn có thể hữu ích, nhưng cần hướng dẫn cụ thể và nhãn giới hạn.

## Nguồn đã kiểm tra và cách dùng

| Nguồn | Vai trò | Cách lấy | Giới hạn biên tập |
|---|---|---|---|
| [GitHub Search API](https://docs.github.com/en/rest/search/search#search-repositories) | Tìm repo theo công việc, xác minh repo ID, license, hoạt động | Sáu nhóm truy vấn chỉ ở tên/mô tả (tránh README nhắc phụ), tối đa 20 kết quả/nhóm; stars >=50 và cập nhật trong 365 ngày cho nhánh tìm mới | Không coi thứ tự trả về là chất lượng. Ngưỡng stars không áp dụng cho repo từ directory hoặc refresh danh mục cũ |
| [Awesome Selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted) | Công cụ tài liệu, nội dung, media, automation | README public, chỉ liên kết GitHub trực tiếp ở dòng danh sách phù hợp | Self-host không có nghĩa cài dễ. Loại dịch vụ hạ tầng không có đầu ra phù hợp |
| [Awesome Mac](https://github.com/jaywcjlove/awesome-mac) | Ứng dụng desktop có giao diện | README public, lọc dòng theo nhu cầu, bỏ sponsor/badge | Nguồn thiên macOS; không được hứa có Windows hoặc miễn phí nếu chưa thử |
| [Awesome Generative AI](https://github.com/steven2358/awesome-generative-ai) | Khám phá ảnh, video và âm thanh | README public, chỉ liên kết GitHub trực tiếp ở entry phù hợp | Lọc riêng model nghiên cứu, framework và yêu cầu GPU; không nhập dịch vụ SaaS không có repo |
| README chính chủ của từng repo | Xét đường dùng, cài đặt, ví dụ, GPU và API key | raw.githubusercontent.com theo default_branch GitHub trả về | Đây là mô tả của tác giả, chưa phải kiểm nghiệm của Windi |

Các nguồn được kiểm tra trực tiếp trong report của lượt crawl, gồm HTTP và số entry parse được. Parser có báo lỗi khi không còn tìm thấy entry phù hợp. Các nguồn có thể đổi nội dung; mỗi lần chạy lưu nguồn và thời điểm thu thập.

### Nguồn bổ sung chỉ để nghiên cứu biên tập

- [AI Collection](https://github.com/ai-collection/ai-collection): README truy cập được nhưng lượt kiểm tra không tìm được entry có liên kết GitHub trực tiếp phù hợp. Đã loại khỏi crawl mặc định; vẫn hữu ích để tìm ý tưởng SaaS thủ công.

- [Pinokio](https://github.com/pinokiocomputer/pinokio): tìm đường cài ứng dụng AI thuận tiện hơn. Chưa crawl directory Pinokio; không tự chạy launcher, không coi launcher của bên thứ ba là repo chính chủ. Phải xác minh máy/GPU/dung lượng.
- [Krita AI Diffusion](https://github.com/Acly/krita-ai-diffusion): ví dụ hướng tìm plugin giải quyết công việc cụ thể trong phần mềm có giao diện. Không tự suy ra miễn phí hoặc chạy được trên mọi máy.
- Trendshift: tín hiệu phát hiện mới, cần qua cùng bộ lọc nontech. Adapter cũ vẫn được giữ ở collector legacy, không đưa bảng trending thẳng lên web.
- Skills.sh, Awesome Agent Skills, MCP Registry: phù hợp nhánh người đã dùng AI agent. Không còn là nguồn mặc định chiếm phần lớn danh sách cho người mới.
- Product Hunt, Reddit, Hugging Face Spaces, các directory Trung Quốc: có thể dùng để tìm ý tưởng; chưa có adapter trong lượt này. Chỉ bổ sung sau khi kiểm tra cách truy cập, nguồn chính chủ và chất lượng đầu mối. Bộ lọc có từ khóa tiếng Trung cho ảnh/video/tài liệu, không loại repo theo quốc gia.

## Bộ lọc đã triển khai

1. Parse entry theo công việc, chỉ nhận repo GitHub trực tiếp. Chuẩn hóa URL và gộp theo GitHub ID sau khi xác minh metadata, giữ nhiều nguồn phát hiện.
2. Loại repo private/archived/disabled, danh sách/học liệu và công cụ thiên SDK/library/framework/benchmark/MCP kể cả khi ví dụ đi kèm có giao diện.
3. Đọc README, lưu hash và trích đoạn ngắn cho mỗi tín hiệu. Thiếu license, thiếu README hay không rõ giao diện được giữ ở hàng cần nghiên cứu, không gắn nhãn dễ dùng.
4. Tính điểm **ưu tiên biên tập**: công dụng 30, cách tiếp cận 25, tài liệu/ví dụ 15, bảo trì 15, license 10, stars tối đa 5. Trừ điểm khi thấy GPU, cài kỹ thuật hoặc API trả phí. Tín hiệu GPU/API chỉ có nghĩa được nhắc tới; editor phải xác minh có bắt buộc không.
5. `PRIORITY_REVIEW`: đủ bằng chứng sơ bộ, điểm >=70, có đường web/desktop/extension, license nhận diện được, cập nhật trong 365 ngày, không phải fork. `GUIDE_REQUIRED`: có ích và có giao diện nhưng cần hướng dẫn. `NEEDS_REVIEW`: thiếu bằng chứng. `EXCLUDED`: không phù hợp đợt đề xuất này.
6. Chọn tối đa 30 mục ưu tiên để biên tập xem trong báo cáo, tối đa 8 mục/nhóm nhu cầu và 2 mục/tác giả.
7. Xếp hạng riêng cho hàng chờ DB theo bốn tín hiệu: hữu dụng cho nontech (tối đa 50), độ hot theo stars hiện tại (15), tốc độ tăng stars giữa hai lần quan sát (20), độ mới cập nhật (10), cộng độ thiếu của nhóm nhu cầu trong danh mục (15), rồi giới hạn tổng ở 100. Lần đầu chưa có lịch sử stars thì phần tăng trưởng bằng 0, không đoán tăng trưởng.
8. Mỗi lượt thành công chọn mục tiêu 8 repo, tối đa 10, tối đa 2 repo cho một nhu cầu và 1 repo cho một tác giả. Nếu không có ít nhất 5 repo đạt 60 điểm thì không ghi lô nhỏ để lấp số lượng.
9. Trước khi ghi, loại mọi repo đã có trong `resources` ở bất kỳ trạng thái nào, gồm `CANDIDATE`, `REVIEW`, `REJECTED`, `PUBLISHED` và `ARCHIVED`. Repo mới chỉ được tạo ở `CANDIDATE` (chờ duyệt); điểm này không phải Windi Score. Không tự tạo badge hoặc xuất bản.

Bộ lọc là heuristic, không phải mô hình hiểu toàn bộ repo. Từ khóa có thể xuất hiện trong ví dụ, điều kiện phủ định hoặc phần tích hợp. Các trường cách tiếp cận dùng hậu tố `CLAIMED` để thể hiện là tín hiệu từ README. Tiếng Việt, giá, an toàn và trải nghiệm đều chưa kiểm nghiệm; không dùng heuristic để hứa “dùng ngay” với khách.

## Nội dung cần viết sau khi dùng thử

Mỗi bài nên có: vấn đề cụ thể; ai sẽ thấy hữu ích; một kết quả đầu ra nhìn được; ba bước bắt đầu; chi phí thực tế; máy/OS cần có; hỗ trợ tiếng Việt; giới hạn và phương án thay thế. Một video demo làm đúng một việc sẽ hữu ích hơn liệt kê 20 tính năng.

Ví dụ góc nội dung: “Biến 10 phút ghi âm thành bản nháp phụ đề”; “Làm sạch nền 5 ảnh sản phẩm”; “Gộp và nén PDF để gửi khách”; “Lên lịch một tuần nội dung”. Đây là bài thử đề xuất, không phải tính năng đã xác nhận của mọi repo trong nhóm.

## Vận hành

```sh
npm run catalog:collect
npm run catalog:collect -- --fresh --limit=60
npm run catalog:enqueue
npm run catalog:verify
npm run catalog:refresh
```

- Collector mặc định mới: `scripts/collect-creator-candidates.mjs`. Collector 200 mục giữ ở `catalog:collect:legacy` / `catalog:verify:legacy`.
- Output: `data/catalog/nontech/latest.json`, `REVIEW.md`, `last-success.json` khi lượt chạy đầy đủ thành công. Mỗi lần có bản lưu riêng trong `data/ingestion/runs/nontech-…/`.
- Có timeout, giới hạn kích thước, allowlist host, cache/ETag 24h, backoff/rate limit và lock độc quyền kế thừa từ HTTP collector. Không thực thi code upstream. Token chỉ gửi tới API GitHub.
- Lượt lỗi một phần vẫn xuất bằng chứng lấy được, báo `PARTIAL`, exit nonzero và giữ `last-success.json`. Lượt không có repo là `FAILED`. Xem `latest.json` để biết lần thử mới nhất, không nhầm bản thành công cũ là dữ liệu mới.
- Trước mỗi lượt, crawler đọc toàn bộ identity đã có trong Supabase và đánh dấu riêng `REJECTED`. Repo bị từ chối được loại trước khi tải README hay chấm điểm; các trạng thái còn lại được loại trước bước chọn lô DB. Lượt đọc không lưu lý do biên tập hay service-role key vào artifact. Nếu không đọc được DB thì lượt crawl thất bại.
- Mọi repo đã đánh giá được lưu thành quan sát nội bộ để lần chạy sau tính tốc độ tăng stars. Chỉ 5–10 repo tốt nhất được tạo trong `resources`, luôn ở trạng thái `CANDIDATE` (chờ duyệt), kèm nguồn, snapshot stars và việc cần nghiên cứu. Lô ghi là một giao dịch có khóa và idempotency; thay đổi đồng thời khiến còn dưới 5 repo mới sẽ hủy cả lô.
- Mặc định đánh giá tối đa 60 repo, đối chiếu tối đa 36 đầu mối directory. Số còn lại được báo `deferredCount`; chưa có cursor luân phiên bền vững nên không hứa tự kiểm hết các đầu mối qua nhiều lần chạy.
- `catalog:refresh` chỉ nghiên cứu lại canonical trong `creator-100.json`, đánh dấu hash README thay đổi. Không ghi đè bài đã biên tập, không thay danh mục bằng kết quả top-N và chưa ghi metric vào DB.
- Automation `Crawl repo nontech mỗi 6 giờ` đang hoạt động trong Codex project WindiStudio2 và chạy `catalog:enqueue` mỗi 6 giờ. Mỗi lượt thành công ghi 5–10 repo vào `CANDIDATE` (chờ duyệt); không tự publish. [windi-candidate-discovery.yml](../.github/workflows/windi-candidate-discovery.yml) là nút chạy tay dự phòng trên GitHub Actions và lưu artifact 30 ngày. Không bật thêm schedule GitHub cùng lúc, tránh hai lượt crawl nối tiếp tạo hai lô trong cùng một khung 6 giờ.

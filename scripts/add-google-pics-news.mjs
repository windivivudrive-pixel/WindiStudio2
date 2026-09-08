import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';

async function main() {
  const envContent = await readFile('.env.local', 'utf8');
  const env = parse(envContent);
  const base = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!base || !serviceKey) throw new Error('Missing Supabase credentials');

  const sources = await fetch(`${base}/rest/v1/news_sources?slug=eq.google-workspace`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  }).then(r => r.json());
  const sourceId = sources[0]?.id;

  const contentHtml = `
<div class="article-callout">
  <strong>Tóm tắt phát hành:</strong> Google vừa chính thức giới thiệu <strong>Google Pics</strong> — công cụ tạo sinh và chỉnh sửa hình ảnh bằng trí tuệ nhân tạo (AI) đột phá, tích hợp trực tiếp vào hệ sinh thái Google Workspace. Được định vị là đối thủ cạnh tranh trực diện với Canva và Adobe Express, Google Pics cho phép người dùng thiết kế poster, banner, slide thuyết trình và tài liệu truyền thông chỉ bằng vài câu lệnh tự nhiên mà không cần rời khỏi môi trường làm việc quen thuộc.
</div>

<p>
  Trong nhiều năm qua, <strong>Canva</strong> đã trở thành lựa chọn quen thuộc cho các chuyên viên tiếp thị, nhà sáng tạo nội dung và doanh nghiệp nhờ kho mẫu thiết kế kéo-thả phong phú. Tuy nhiên, sự xuất hiện của <a href="https://workspace.google.com/products/pics/" target="_blank" rel="noopener noreferrer">Google Pics</a> đánh dấu một bước chuyển dịch mang tính nền tảng: từ việc tìm kiếm mẫu dựng sẵn sang mô hình <strong>sáng tạo đồ họa hoàn toàn bằng AI (Prompt-to-Design)</strong> kết hợp chỉnh sửa chuẩn xác đến từng vật thể.
</p>

<figure class="article-figure">
  <a href="https://workspace.google.com/products/pics/" target="_blank" rel="noopener noreferrer" class="figure-link" title="Khám phá Google Pics trên Google Workspace">
    <img
      src="https://lh3.googleusercontent.com/mD70974tvT_1bkGo7tb4c8mahiInjmRcCGOT9cbfq_D8zumJXKD6PBvA0fTJzmAvoZFtUNMmDfKwPsoPN6_syejOskR0vwoxLZfW=e365-pa-nu-s0-rw"
      alt="Google Pics AI Image Generator and Editor tích hợp trực tiếp trong Google Workspace"
      class="figure-image"
      loading="eager"
    />
    <span class="figure-badge">↗ Khám phá Google Pics Workspace</span>
  </a>
  <figcaption class="figure-caption">
    <strong>Hình 1:</strong> Giao diện tổng quan của Google Pics — Sức mạnh tạo ảnh AI kết hợp khả năng chỉnh sửa chuẩn xác ngay trong Google Workspace.
  </figcaption>
</figure>

<h2>1. Google Pics là gì? Vì sao đây là đối thủ đáng gờm nhất của Canva?</h2>

<p>
  <strong>Google Pics</strong> là ứng dụng thiết kế đồ họa và xử lý hình ảnh dựa trên AI mới nhất thuộc bộ công cụ Google Workspace. Được phát triển dựa trên nền tảng các mô hình AI tiên tiến nhất của Google (tương tự công nghệ trong <a href="/news/gemini-hieu-video-kieu-agent" class="internal-link">bước đột phá hiểu video của Google Gemini</a>), Google Pics kết hợp hai khả năng mạnh mẽ:
</p>

<ul>
  <li><strong>Khả năng tạo sinh hình ảnh không giới hạn (Boundless Image Generation):</strong> Dựng nên toàn bộ thiết kế, tranh vẽ, đồ họa thông tin hoặc hình ảnh chụp thực tế chỉ từ mô tả văn bản.</li>
  <li><strong>Chỉnh sửa chuẩn xác theo từng vật thể (Precision Object-based Editing):</strong> Cho phép người dùng can thiệp vào bất kỳ chi tiết nhỏ nào trong ảnh mà không phải tạo lại toàn bộ từ đầu.</li>
</ul>

<p>
  Điểm cốt lõi khiến Canva phải dè chừng chính là <strong>hệ sinh thái hơn 3 tỷ người dùng</strong> của Google Workspace. Thay vì phải mở thêm tab trình duyệt bên ngoài, chuyển đổi định dạng và tải tệp thủ công, người dùng Google Docs, Google Slides và Google Drive giờ đây có thể tạo và tinh chỉnh ấn phẩm đồ họa ngay tại nơi họ đang viết báo cáo hay chuẩn bị bài thuyết trình. Ngoài ra, bạn cũng có thể tham khảo thêm các giải pháp tự động hóa khác trong <a href="/" class="internal-link">Kho ứng dụng AI WindiStudio</a> để kết hợp quy trình làm việc tối ưu.
</p>

<figure class="article-figure">
  <a href="https://docs.google.com/images/create" target="_blank" rel="noopener noreferrer" class="figure-link" title="Trải nghiệm tạo poster với Google Pics">
    <img
      src="https://lh3.googleusercontent.com/iR1e2i0NrdK-M-r_bkTaxqFzyYqyguz9a2n7fofh5dwS9sa_EVd-BC4MgsMByjCGPj0-FOi1VgtRA1BGwtBhcsMEjUnoIX6Ak8secA=e365-pa-nu-rw-w1416"
      alt="Giao diện Google Pics tạo poster The Matcha Club phong cách chuyên nghiệp từ câu lệnh prompt"
      class="figure-image"
      loading="lazy"
    />
    <span class="figure-badge">↗ Xem mẫu thiết kế poster</span>
  </a>
  <figcaption class="figure-caption">
    <strong>Hình 2:</strong> Tạo poster sự kiện "The Matcha Club" hoàn chỉnh từ câu lệnh văn bản: bao gồm hình minh họa, thanh công cụ prompt và bảng điều khiển phong cách.
  </figcaption>
</figure>

<h2>2. Chấm dứt thời kỳ "Prompt-and-Pray": Khả năng chỉnh sửa chi tiết từng vật thể</h2>

<p>
  Một trong những rào cản lớn nhất của các công cụ tạo ảnh AI truyền thống (như Midjourney hay DALL-E) là hội chứng <em>"Prompt-and-Pray" (gõ lệnh rồi cầu may)</em>. Khi bạn muốn thay đổi màu chiếc áo hay xóa một chi tiết thừa, việc nhập prompt mới thường làm thay đổi hoàn toàn khuôn mặt, góc chụp và bối cảnh xung quanh.
</p>

<p>
  Google Pics giải quyết triệt để bài toán này bằng công nghệ <strong>Object-Level Understanding (Hiểu ảnh ở cấp độ đối tượng)</strong>:
</p>

<ul>
  <li><strong>Phân đoạn vật thể tự động:</strong> AI tự động nhận diện từng thành phần trong bức ảnh (bàn ghế, nhân vật, văn bản, nền trời). Người dùng chỉ cần nhấp chuột vào đối tượng cần chỉnh.</li>
  <li><strong>Khoanh vùng và thay thế cục bộ:</strong> Bạn có thể cô lập một chiếc ghế sofa màu vàng để đổi thành ghế da nâu, hoặc thay đổi phông nền căn phòng mà giữ nguyên sản phẩm chính ở tiền cảnh.</li>
  <li><strong>Chỉnh sửa văn bản trực tiếp trong ảnh (In-Image Typography):</strong> Cho phép thay đổi nội dung chữ, phông chữ, kích thước tiêu đề trên banner quảng cáo mà không cần thiết kế lại từ đầu.</li>
</ul>

<figure class="article-figure">
  <a href="https://workspace.google.com/products/pics/" target="_blank" rel="noopener noreferrer" class="figure-link" title="Công nghệ Object-based Precision Editing trong Google Pics">
    <img
      src="https://lh3.googleusercontent.com/SWreWdyAu9lfkzUTPcJxuAvXm2pT61so6eEt7NwQQa-zQ90JI7-Bb-MxFi_F2tOCCNHE0Drx1GQH5Jdr_lrJMyXU0ErHTC8Vb6NPFw=e365-pa-nu-s0-rw"
      alt="Công nghệ Object-based AI cô lập và chỉnh sửa từng vật thể chính xác trên Google Pics"
      class="figure-image"
      loading="lazy"
    />
    <span class="figure-badge">↗ Xem tính năng chỉnh sửa đối tượng</span>
  </a>
  <figcaption class="figure-caption">
    <strong>Hình 3:</strong> Tính năng "No more prompt-and-pray" — Cô lập chiếc ghế bành màu vàng mù tạt bằng khung bao thông minh để tùy biến màu sắc và chất liệu mà không ảnh hưởng đến toàn bộ căn phòng.
  </figcaption>
</figure>

<h2>3. Tích hợp liền mạch: Làm việc trực tiếp trong Slides, Docs và Drive</h2>

<p>
  Khác biệt lớn nhất của Google Pics so với các nền tảng thiết kế độc lập là khả năng nhúng sâu vào các công cụ văn phòng hàng ngày. Quy trình sáng tạo nội dung trực quan giờ đây không còn bị ngắt quãng:
</p>

<h3>Tạo slide thuyết trình thu hút trong Google Slides</h3>
<p>
  Khi chuẩn bị bài thuyết trình, bạn có thể gọi thanh công cụ Google Pics trực tiếp trên từng trang trình chiếu. Với tính năng <em>"Edit this image with Gemini"</em>, người dùng có thể chuyển đổi phong cách đồ họa, thêm bối cảnh trực quan cho bài phát biểu hoặc tối ưu hình ảnh sản phẩm cho phù hợp với thương hiệu doanh nghiệp.
</p>

<figure class="article-figure">
  <a href="https://workspace.google.com/products/pics/" target="_blank" rel="noopener noreferrer" class="figure-link" title="Tích hợp Google Pics trong Google Slides">
    <img
      src="https://lh3.googleusercontent.com/PAO9YSY0zclM4fSJ9MpawZ1e3PNOB0sCo7B_zepbyChVyy7B3YQIxhWHKImWf8X5fEoTJVDa5_4Le89eA0VwTVVXf4VjByRNrI6_=e365-pa-nu-s0-rw"
      alt="Tích hợp Google Pics trực tiếp trong Google Slides tạo hình ảnh thuyết trình ấn tượng với Gemini"
      class="figure-image"
      loading="lazy"
    />
    <span class="figure-badge">↗ Tích hợp Google Slides</span>
  </a>
  <figcaption class="figure-caption">
    <strong>Hình 4:</strong> Chỉnh sửa slide "Collage Art Workshop" trong Google Slides với thanh prompt Gemini nhúng sẵn, cho phép tạo biến thể đồ họa nghệ thuật cổ điển chỉ bằng 1 cú nhấp chuột.
  </figcaption>
</figure>

<h3>Trực quan hóa tài liệu trong Google Docs</h3>
<p>
  Tài liệu văn bản dài thường gây nhàm chán nếu thiếu đồ họa minh họa. Google Pics trong Docs cho phép tạo biểu đồ tròn, infographic thông tin và sơ đồ phân tích dữ liệu ngay trên trang văn bản. Người dùng có thể nhấp vào <em>"Edit chart"</em> hoặc <em>"Edit text"</em> để cập nhật số liệu trực tiếp trên hình vẽ. Bạn cũng có thể kết hợp với mô hình quy trình trong bài viết <a href="/news/giao-dien-canvas-cho-ai-workflow" class="internal-link">giao diện trực quan Canvas cho AI</a> để tối ưu hóa cách biểu diễn dữ liệu.
</p>

<figure class="article-figure">
  <a href="https://workspace.google.com/products/pics/" target="_blank" rel="noopener noreferrer" class="figure-link" title="Chỉnh sửa infographic trong Google Docs">
    <img
      src="https://lh3.googleusercontent.com/dBxR0kN_cC0l_N9PmW4ne0cuTW3QJhn-RFtYJAyJPM7ih-r39LWKaHr2UnJ6Q_bpKlWdYUfHwTPiw-Q8Cd1K6xlhznXUB4DkvySU=e365-pa-nu-s0-rw"
      alt="Chỉnh sửa infographic và biểu đồ trực quan trong Google Docs với Google Pics"
      class="figure-image"
      loading="lazy"
    />
    <span class="figure-badge">↗ Tích hợp Google Docs</span>
  </a>
  <figcaption class="figure-caption">
    <strong>Hình 5:</strong> Chỉnh sửa infographic biểu đồ năng lượng sạch (Global Clean Energy Mix) trực tiếp trong Google Docs với thanh công cụ chỉnh sửa văn bản và hình ảnh nhanh.
  </figcaption>
</figure>

<h3>Quản lý và lưu trữ tập trung trên Google Drive</h3>
<p>
  Toàn bộ tệp thiết kế Pics được lưu trữ an toàn trong Google Drive cá nhân hoặc bộ nhớ nhóm (Shared Drive). Người dùng có thể tạo thiết kế mới bằng cách chọn <strong>+ Mới → Google Pics</strong>, hoặc nhấp chuột phải vào bất kỳ tệp ảnh nào có sẵn trong Drive và chọn <em>"Chỉnh sửa bằng Google Pics"</em>.
</p>

<figure class="article-figure">
  <a href="https://workspace.google.com/products/pics/" target="_blank" rel="noopener noreferrer" class="figure-link" title="Quản lý tập tin Google Pics trong Google Drive">
    <img
      src="https://lh3.googleusercontent.com/BfqEuWb5FQxCB48PlZVGipTiYZf-6Z43_orS8GzMTUasPsk_ywWAm6h6HDy8a6qSX8t7MYQ-saZ1IlFsExs7ctE10QpGhyHG7_o=e365-pa-nu-s0-rw"
      alt="Quản lý và tạo mới thiết kế Google Pics tập trung ngay trên Google Drive"
      class="figure-image"
      loading="lazy"
    />
    <span class="figure-badge">↗ Quản lý trên Google Drive</span>
  </a>
  <figcaption class="figure-caption">
    <strong>Hình 6:</strong> Menu "+ Mới" trên Google Drive tích hợp trực tiếp Google Pics, giúp lưu trữ tập trung và kiểm soát quyền truy cập như mọi tài liệu Workspace khác.
  </figcaption>
</figure>

<h2>4. 5 Kịch bản ứng dụng thực tế giúp tăng tốc công việc</h2>

<p>
  Google Workspace nêu bật 5 trường hợp sử dụng điển hình mà Google Pics mang lại lợi thế vượt bậc cho đội ngũ tiếp thị, kinh doanh và nhà sáng tạo:
</p>

<ol>
  <li><strong>Thiết kế ấn phẩm & Bố cục (Design and Layout):</strong> Chuyển đổi một bức ảnh chụp căn hộ sơ sài thiếu sáng thành tờ rơi bất động sản sang trọng với ánh sáng hoàn hảo và typography chuyên nghiệp.</li>
  <li><strong>Kể chuyện sản phẩm (Product Storytelling):</strong> Tách sản phẩm khỏi phông nền trắng đơn điệu và đặt vào bối cảnh thực tế (ví dụ: đưa hình máy cắt cỏ vào sân vườn biệt thự xanh mát trong slide giới thiệu sản phẩm).</li>
  <li><strong>Dựng mẫu nguyên mẫu nhanh (Visualization & Rapid Prototyping):</strong> Tải logo thương hiệu lên và yêu cầu AI dựng mẫu bao bì sản phẩm (như hộp quà tặng doanh nghiệp), sau đó upscale lên độ phân giải 4K sắc nét để đưa vào bản Brief sáng tạo.</li>
  <li><strong>Tài liệu đào tạo & Cộng tác nhóm (Instructional Content):</strong> Điều chỉnh kích thước tỷ lệ khung hình và mời đồng nghiệp cùng tham gia chỉnh sửa trực tiếp trên cùng một canvas tương tự như khi làm việc trên Docs.</li>
  <li><strong>Truyền thông sự kiện đa kênh (Communication):</strong> Tạo hàng loạt biến thể banner từ cùng một ý tưởng chủ đạo cho bài đăng Facebook, Instagram Story, LinkedIn và email newsletter chỉ trong vài phút.</li>
</ol>

<h2>5. So sánh toàn diện: Google Pics vs Canva vs Google Photos</h2>

<p>
  Để giúp người dùng hiểu rõ vị thế của từng công cụ, bảng so sánh chi tiết dưới đây phân tích các tiêu chí then chốt:
</p>

<div class="article-table-wrapper">
  <table class="feature-table">
    <thead>
      <tr>
        <th>Tiêu chí so sánh</th>
        <th>Google Pics</th>
        <th>Canva</th>
        <th>Google Photos</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Định vị cốt lõi</strong></td>
        <td>Công cụ tạo ảnh & thiết kế đồ họa AI cho công việc (Workspace Creative Tool)</td>
        <td>Nền tảng thiết kế đồ họa kéo-thả dựa trên kho template mẫu</td>
        <td>Ứng dụng sao lưu, sắp xếp và lưu giữ kỷ niệm hình ảnh cá nhân</td>
      </tr>
      <tr>
        <td><strong>Phương thức tạo nội dung</strong></td>
        <td>AI Prompt-to-Design + Tinh chỉnh đối tượng độc lập (Object-level)</td>
        <td>Chọn mẫu dựng sẵn, kéo thả thủ công + Một số tính năng AI Magic Studio</td>
        <td>Chụp ảnh thực tế, chỉnh sửa màu sắc & bộ lọc cơ bản</td>
      </tr>
      <tr>
        <td><strong>Chỉnh sửa vật thể</strong></td>
        <td>Nhận diện layer vật thể tự động, sửa chi tiết không đổi bối cảnh</td>
        <td>Cần tách nền thủ công hoặc dùng tính năng trả phí Magic Grab</td>
        <td>Magic Eraser (xóa vật thể cơ bản), không tạo mới vật thể</td>
      </tr>
      <tr>
        <td><strong>Tích hợp văn phòng</strong></td>
        <td>Nhúng sâu 100% vào Google Docs, Google Slides và Google Drive</td>
        <td>Ứng dụng độc lập, cần cài extension hoặc xuất file tải về</td>
        <td>Không tích hợp công cụ văn phòng</td>
      </tr>
      <tr>
        <td><strong>Cộng tác thời gian thực</strong></td>
        <td>Chia sẻ qua Google Drive với phân quyền xem/sửa tức thì</td>
        <td>Có cộng tác theo nhóm (yêu cầu tạo tài khoản Canva)</td>
        <td>Chia sẻ album xem và bình luận</td>
      </tr>
      <tr>
        <td><strong>Độ phân giải xuất file</strong></td>
        <td>Hỗ trợ Upscale 4K chuyên nghiệp cho in ấn và trình chiếu</td>
        <td>Tùy thuộc gói Free/Pro</td>
        <td>Nén ảnh tiết kiệm dung lượng hoặc giữ chất lượng gốc</td>
      </tr>
    </tbody>
  </table>
</div>

<h2>6. Hướng dẫn truy cập và điều kiện sử dụng Google Pics</h2>

<p>
  Hiện tại, Google Pics đang được triển khai theo từng giai đoạn cho người dùng toàn cầu. Bạn có thể kiểm tra quyền truy cập và bắt đầu sử dụng theo các phương thức sau:
</p>

<ul>
  <li><strong>Lối tắt truy cập nhanh (Web Shortcut):</strong> Nhập địa chỉ <a href="https://docs.google.com/images/create" target="_blank" rel="noopener noreferrer"><strong>pics.new</strong></a> hoặc <code>docs.google.com/images/create</code> trên thanh trình duyệt Chrome để mở ngay canvas thiết kế.</li>
  <li><strong>Đối tượng khả dụng:</strong> Khách hàng sử dụng các gói Google Workspace Business Standard trở lên, Enterprise, Education và người dùng đăng ký dịch vụ cá nhân Google AI Pro &amp; Ultra.</li>
  <li><strong>Mẹo viết prompt hiệu quả:</strong> Hãy mô tả rõ phong cách mong muốn (ví dụ: <em>"Minimalist flat vector"</em>, <em>"Editorial photography 35mm"</em>), đối tượng trọng tâm, màu sắc chủ đạo và tỷ lệ khung hình (16:9 cho Slides, 1:1 cho mạng xã hội).</li>
</ul>

<p>
  Đối với các đội ngũ muốn tối ưu hóa quy trình làm việc đa nhiệm, việc kết hợp Google Pics với các kỹ thuật như <a href="/news/github-copilot-chay-nhieu-agent-song-song" class="internal-link">chạy song song nhiều trợ lý AI</a> sẽ mở ra khả năng tự động hóa mạnh mẽ cho cả quy trình viết nội dung lẫn thiết kế ấn phẩm minh họa. Bạn có thể đón đọc các phân tích cập nhật tiếp theo tại <a href="/news" class="internal-link">chuyên mục Tin tức AI của WindiStudio</a>.
</p>
`;

  const article = {
    source_id: sourceId,
    canonical_url: 'https://workspace.google.com/products/pics/',
    source_name: 'Google Workspace',
    source_title: 'Google Pics: AI Image Generator and Editor | Google Workspace',
    source_description: 'Google Pics is a powerful AI image generator and editor that uses Google\'s most advanced AI models to generate expert-looking visuals and precision edits directly in Docs and Slides.',
    title_vi: 'Google ra mắt Google Pics: Công cụ tạo và chỉnh sửa ảnh AI đột phá trong Workspace, cạnh tranh trực tiếp với Canva',
    title_en: 'Google launches Google Pics: AI-powered image generator and editor competing with Canva',
    summary_vi: 'Google chính thức công bố Google Pics — công cụ thiết kế đồ họa và tạo ảnh AI tích hợp trực tiếp vào Google Docs, Slides và Drive, cho phép tạo ấn phẩm từ câu lệnh và chỉnh sửa chuẩn xác từng vật thể.',
    summary_en: 'Google officially unveils Google Pics, an AI image generator and editor integrated into Google Docs and Slides with precision object-level editing.',
    category: 'THIẾT KẾ AI',
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    published_to_windi_at: new Date().toISOString(),
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    source_hash: 'c8f7d9a1e2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d',
    raw_payload: {
      slug: 'google-ra-mat-google-pics-canh-tranh-canva',
      image_url: 'https://lh3.googleusercontent.com/mD70974tvT_1bkGo7tb4c8mahiInjmRcCGOT9cbfq_D8zumJXKD6PBvA0fTJzmAvoZFtUNMmDfKwPsoPN6_syejOskR0vwoxLZfW=e365-pa-nu-s0-rw',
      image_alt: 'Google Pics - AI Image Generator and Editor tích hợp trực tiếp trong Google Workspace đối đầu Canva',
      takeaways: [
        'Sáng tạo đồ họa bằng câu lệnh (Prompt-to-Design): Tự động tạo poster, banner sự kiện và slide trình chiếu hoàn chỉnh mà không cần mất công tìm kiếm mẫu dựng sẵn.',
        'Chấm dứt thời "cầu may" nhờ Object-based Editing: Chọn trực tiếp từng vật thể trong ảnh để đổi màu, thay chi tiết, chỉnh bối cảnh mà không làm méo mó các thành phần xung quanh.',
        'Tích hợp sâu trong Google Workspace: Chỉnh sửa và chèn ảnh trực tiếp trong Google Docs, Google Slides và quản lý tệp tập trung trên Google Drive qua lối tắt pics.new.',
        'Hỗ trợ Upscale 4K và cộng tác thời gian thực: Chia sẻ canvas thiết kế với đồng đội để cùng chỉnh sửa như trên văn bản Docs thông thường.'
      ],
      nontech_guide: 'Google Pics đưa sức mạnh của AI tạo sinh vào thẳng bộ công cụ làm việc hàng ngày của Google Workspace. Thay vì phải rời trang để sang các phần mềm như Canva, người dùng có thể mô tả ý tưởng bằng tiếng Việt để tạo ra ấn phẩm đồ họa chuyên nghiệp và tinh chỉnh từng chi tiết ngay trên file Docs hay Slides.',
      content_html: contentHtml,
      actionable_tip: 'Bạn có thể mở ngay trình duyệt và gõ pics.new để trải nghiệm công cụ. Thử bắt đầu bằng lệnh: "Poster quảng cáo workshop trà đạo phong cách tối giản Nhật Bản, màu xanh matcha, tỷ lệ 16:9" để khám phá khả năng của AI.',
      ticker: 'Google Workspace ra mắt Google Pics: AI thiết kế đồ họa đối đầu Canva, tích hợp Docs & Slides',
      reading_time_minutes: 6
    }
  };

  // Check if item exists
  const existing = await fetch(`${base}/rest/v1/news_items?raw_payload->>slug=eq.google-ra-mat-google-pics-canh-tranh-canva`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  }).then(r => r.json());

  let res;
  if (existing.length > 0) {
    console.log(`Updating existing article ${existing[0].id}...`);
    res = await fetch(`${base}/rest/v1/news_items?id=eq.${existing[0].id}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(article)
    });
  } else {
    console.log('Inserting new article...');
    res = await fetch(`${base}/rest/v1/news_items`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(article)
    });
  }

  if (!res.ok) {
    console.error('Save failed:', res.status, await res.text());
  } else {
    const data = await res.json();
    console.log('Successfully published full SEO Google Pics article to Supabase! ID:', data[0]?.id);
  }
}

main().catch(console.error);


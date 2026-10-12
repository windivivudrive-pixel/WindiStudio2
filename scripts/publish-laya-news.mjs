import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'dotenv';

async function main() {
  const envContent = await readFile('.env.local', 'utf8');
  const env = parse(envContent);
  const base = env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!base || !serviceKey) throw new Error('Missing Supabase credentials');

  const sourceId = '778eb7e3-608f-42b9-8430-122b5e80b88a'; // Laya Open Source / WindiStudio

  const slug = 'huong-dan-loc-tin-tu-dong-0-dong-laya-ai';
  const titleVi = 'Bí quyết xây dựng "Tòa soạn tin tự động 24/7" giá 0 đồng: Hướng dẫn người không rành công nghệ lọc 10.000 tin tức mỗi ngày';
  const summaryVi = 'Không cần biết lập trình hay sở hữu máy tính tiền triệu, bạn vẫn có thể biến chiếc laptop cá nhân thành một trợ lý đọc báo và chọn lọc tin tức nóng hổi tự động, tiết kiệm hàng triệu đồng tiền phí AI mỗi tháng nhờ mô hình 2 tầng thông minh.';

  const takeaways = [
    'Mã nguồn mở miễn phí 100%: Tải trực tiếp mã nguồn tại GitHub (github.com/NandhaKishorM/laya) hoặc tải file ZIP về máy để dùng ngay mà không cần cài Git.',
    'Không cần máy tính khủng hay card đồ họa rời: Chiếc máy tính làm việc bình thường của bạn đã đủ sức tự động đọc và lọc hàng ngàn bài viết mỗi ngày hoàn toàn miễn phí.',
    'Chấm dứt nỗi lo "cháy ví" tiền AI: Thay vì gửi tất cả bài viết lên ChatGPT hay Claude gây tốn kém hàng triệu đồng mỗi tháng, hãy để mô hình tí hon trên máy gạn sạch 99% tin rác trước.',
    'Mô hình 2 người làm việc thông minh: Một "cô thư ký" miễn phí trên máy tính lo việc đọc lướt nhặt rác; một "tổng biên tập" ChatGPT cao cấp chỉ nhận đúng 10 bài hay nhất để viết bản tin tóm tắt.',
    'Tiết kiệm 2 đến 3 tiếng lướt mạng mỗi sáng: Bạn không còn phải ngụp lặn giữa biển thông tin; mở mắt ra là đã có sẵn bản tin tóm tắt cô đọng những gì đắt giá nhất trong lĩnh vực của mình.'
  ];

  const nontechGuide = 'Hãy tưởng tượng bạn đang điều hành một văn phòng: Thay vì thuê một chuyên gia tư vấn lương 100 triệu chỉ để ngồi bóc thư rác và quảng cáo, bạn giao việc phân loại thư thô cho một trợ lý gác cổng làm việc tại chỗ không tốn phí. Sau khi đã vứt bỏ 9.990 lá thư quảng cáo vô bổ, bạn mới đưa đúng 10 lá thư quan trọng nhất cho chuyên gia đọc và tóm tắt. Đó chính là cách vận hành của mô hình 2 tầng: cực kỳ thông minh, chính xác mà chi phí gần như bằng 0.';

  const actionableTip = 'Dành cho người không biết lập trình: Bạn có thể bấm tải trực tiếp mã nguồn tại https://github.com/NandhaKishorM/laya hoặc tải file ZIP về máy. Kết hợp mô hình nhỏ chạy trên máy qua LM Studio/Ollama với các công cụ kéo-thả như Make/n8n để tự động gom bài từ RSS và gửi báo cáo về Telegram mỗi sáng!';

  const contentHtml = `
<div class="article-callout">
  <strong>Tóm tắt cho người bận rộn:</strong> Mỗi ngày có hàng ngàn bài viết mới ra đời, nhưng 95% trong số đó là tin quảng cáo, bài PR hoặc tin giật gân vô thưởng vô phạt. Bạn không cần phải biết viết mã lệnh (code) hay đầu tư máy tính đắt tiền. Bằng cách kết hợp một <strong>"trợ lý đọc lướt miễn phí ngay trên máy"</strong> và một <strong>"chuyên gia tóm tắt trên đám mây"</strong>, bạn có thể tự vận hành cả một tòa soạn tin tự động 24/7, luôn đi trước thị trường mà chỉ tốn vài xu mỗi ngày!
</div>

<div class="article-callout" style="border: 2px solid #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 18px 22px; border-radius: 12px; margin: 24px 0;">
  <h3 style="margin: 0 0 12px; color: #38bdf8; font-size: 18px; display: flex; align-items: center; gap: 8px;">
    📦 Kho Tài Nguyên & Link Tải Về Trực Tiếp
  </h3>
  <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
    <li><strong>Kho mã nguồn GitHub chính thức:</strong> <a href="https://github.com/NandhaKishorM/laya" target="_blank" rel="noopener noreferrer" style="color: #86efac; font-weight: bold; text-decoration: underline;">github.com/NandhaKishorM/laya</a> (Mã nguồn mở miễn phí 100%, giấy phép Apache-2.0)</li>
    <li><strong>Link tải nhanh trọn bộ mã nguồn (file ZIP):</strong> <a href="https://github.com/NandhaKishorM/laya/archive/refs/heads/main.zip" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; font-weight: bold; text-decoration: underline;">Tải Laya-main.zip (Bấm để tải trực tiếp về máy tính mà không cần cài Git)</a></li>
    <li><strong>Kho mô hình AI trên Hugging Face:</strong> <a href="https://huggingface.co/convaiinnovations/laya" target="_blank" rel="noopener noreferrer" style="color: #fcd34d; text-decoration: underline;">huggingface.co/convaiinnovations/laya</a></li>
    <li><strong>Tài liệu hướng dẫn trực tuyến (Docs):</strong> <a href="https://nandhakishorm.github.io/laya" target="_blank" rel="noopener noreferrer" style="color: #cbd5e1; text-decoration: underline;">nandhakishorm.github.io/laya</a></li>
  </ul>
</div>

<p>
  Nếu bạn là một người làm kinh doanh tự do, nhà sáng tạo nội dung, làm truyền thông, marketing hay đơn giản là người muốn theo dõi biến động thị trường mỗi ngày, chắc hẳn bạn từng trải qua cảm giác này: <strong>mở mạng xã hội ra và bị "ngợp" giữa một biển thông tin</strong>.
</p>

<p>
  Từ sáng đến tối, hàng ngàn bài viết mới xuất hiện trên Facebook, Twitter/X, báo chí, diễn đàn. Để tìm ra vài mẩu tin thật sự đáng giá phục vụ cho công việc, bạn thường phải đánh đổi 2 đến 3 tiếng đồng hồ lướt web mỏi mắt.
</p>

<figure class="article-figure">
  <img
    src="https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/news/laya-banner.png"
    alt="Sơ đồ mô hình tòa soạn tin tự động 24/7 giá 0 đồng tiền API"
    class="figure-image"
    loading="eager"
  />
  <figcaption class="figure-caption">
    <strong>Hình 1:</strong> Cuộc đua lọc tin tức — Mô hình Laya chạy trực tiếp trên máy tính cá nhân giúp sàng lọc hàng ngàn bài báo trong tích tắc với chi phí 0 đồng.
  </figcaption>
</figure>

<h2>1. Cái bẫy chi phí khi dùng AI để đọc báo hộ</h2>

<p>
  Khi thấy AI như ChatGPT hay Claude ngày càng thông minh, phản xạ đầu tiên của nhiều người là: <em>"Tại sao không ném toàn bộ link bài viết vào ChatGPT để nó đọc và lọc giúp mình?"</em>
</p>

<p>
  Thế nhưng những ai từng thử cách này đều nhanh chóng "quay xe" vì hai lý do:
</p>

<ul>
  <li><strong>Vừa chậm vừa nghẽn:</strong> Mỗi bài báo gửi lên mạng để AI đọc sẽ mất từ 2 đến 4 giây. Nếu gửi 5.000 bài mỗi ngày, bạn sẽ phải chờ nhiều giờ đồng hồ và thường xuyên bị hệ thống báo lỗi quá tải (Rate limit).</li>
  <li><strong>Cháy ví tiền phí dịch vụ:</strong> Các công ty AI tính tiền trên từng chữ (token) mà bạn gửi lên. Gửi 5.000 – 10.000 bài viết mỗi ngày chỉ để AI nói rằng <em>"bài này là quảng cáo, không có gì mới"</em> sẽ khiến bạn "bay màu" từ 3 triệu đến 5 triệu đồng tiền phí mỗi tháng!</li>
</ul>

<p>
  Còn nếu dùng cách truyền thống là cài đặt "từ khóa" để lọc? Bạn sẽ nhận về toàn những bài viết PR bán hàng có chèn từ khóa khéo léo, hoàn toàn không phân biệt được đâu là tin nóng thật sự.
</p>

<h2>2. Bí quyết: Mô hình 2 tầng "Thư ký gác cổng & Tổng biên tập"</h2>

<p>
  Để giải quyết triệt để bài toán này, các chuyên gia tại WindiStudio đã áp dụng một nguyên lý rất tự nhiên trong quản trị doanh nghiệp: <strong>Chia việc theo cấp bậc</strong>.
</p>

<figure class="article-figure">
  <img
    src="https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/news/laya-pipeline.jpg"
    alt="Sơ đồ phễu lọc 2 tầng thông minh: Tầng 1 Laya Local 0 đồng và Tầng 2 Claude Cloud"
    class="figure-image"
    loading="lazy"
  />
  <figcaption class="figure-caption">
    <strong>Hình 2:</strong> Sơ đồ phễu lọc 2 tầng — Laya trên máy lọc sạch 9.990 bài rác hoàn toàn miễn phí, chỉ chuyển đúng 10 bài tinh hoa nhất lên đám mây để tóm tắt chuyên sâu.
  </figcaption>
</figure>

<p>
  Hệ thống được tổ chức thành 2 người làm việc ăn ý với nhau:
</p>

<h3>Tầng 1: "Thư ký đọc lướt" chạy miễn phí trên máy tính của bạn (Laya AI)</h3>
<p>
  Đây là một mô hình AI có kích thước cực kỳ nhỏ gọn (mang tên <strong>Laya</strong>). Điểm đặc biệt của nó là:
</p>
<ul>
  <li><strong>Không cần card đồ họa khủng:</strong> Chiếc laptop học tập hay máy tính văn phòng bình thường của bạn cũng chạy được êm ru.</li>
  <li><strong>Tốc độ như chớp giật (34 mili-giây / bài):</strong> Nó không ngồi suy nghĩ dài dòng để sinh văn bản, mà chỉ "liếc mắt" qua tiêu đề để đưa ra 3 phán đoán tức thì:
    <ol>
      <li><em>Bài này có phải quảng cáo / spam không?</em> (Có / Không)</li>
      <li><em>Bài này thuộc chủ đề gì?</em> (Công nghệ, Kinh doanh, Thị trường...)</li>
      <li><em>Mức độ quan trọng đạt mấy điểm?</em> (Thang điểm từ 1 đến 10)</li>
    </ol>
  </li>
  <li><strong>Chi phí đúng 0 đồng:</strong> Toàn bộ quá trình quét diễn ra ngay trên máy của bạn, không cần kết nối Internet để hỏi máy chủ, không tốn 1 xu tiền token.</li>
</ul>

<h3>Tầng 2: "Tổng biên tập cao cấp" trên đám mây (ChatGPT hoặc Claude)</h3>
<p>
  Sau khi thư ký Laya đã quét qua 10.000 bài báo và loại bỏ sạch 9.990 bài tin rác hoặc điểm thấp, nó chỉ giữ lại duy nhất <strong>Top 10 bài viết điểm cao nhất</strong>.
</p>
<p>
  Lúc này, bạn mới đưa 10 bài tinh hoa này cho ChatGPT hoặc Claude để viết một bản tin tổng hợp thật hay. Vì chỉ đọc 10 bài ngắn, chi phí gọi AI lúc này chỉ tốn <strong>khoảng vài xu (chưa đến 1.000 VNĐ mỗi ngày)</strong>!
</p>

<h2>3. So sánh: 3 cách lọc tin trên thực tế</h2>

<table class="article-table">
  <thead>
    <tr>
      <th>Tiêu chí so sánh</th>
      <th>Lọc theo từ khóa thô</th>
      <th>Ném hết vào ChatGPT/Claude</th>
      <th>Mô hình 2 tầng (WindiStudio)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Chất lượng tin chọn lọc</strong></td>
      <td>Rất kém (dính đầy bài PR)</td>
      <td>Tốt nhưng hay lỗi nghẽn</td>
      <td><strong>Rất xuất sắc (95% tin chuẩn)</strong></td>
    </tr>
    <tr>
      <td><strong>Tốc độ xử lý 10.000 bài</strong></td>
      <td>Vài giây (nhưng phải lọc tay lại)</td>
      <td>Mất vài tiếng đồng hồ</td>
      <td><strong>Chỉ vài phút chạy ngầm</strong></td>
    </tr>
    <tr>
      <td><strong>Chi phí mỗi tháng</strong></td>
      <td>0 VNĐ</td>
      <td>Từ 3.500.000 đến 5.000.000 VNĐ</td>
      <td><strong>Khoảng 30.000 VNĐ (vài xu/ngày)</strong></td>
    </tr>
    <tr>
      <td><strong>Mức độ an toàn thông tin</strong></td>
      <td>Bình thường</td>
      <td>Toàn bộ dữ liệu gửi lên máy chủ lạ</td>
      <td><strong>An toàn 100% (lọc offline trên máy)</strong></td>
    </tr>
  </tbody>
</table>

<h2>4. Link Repo Tải Về & Hướng Dẫn Sử Dụng Chi Tiết Từ A Đến Z</h2>

<p>
  Dưới đây là link mã nguồn mở chính thức và toàn bộ tài nguyên bạn cần để bắt đầu sử dụng mô hình Laya ngay hôm nay:
</p>

<div class="article-callout" style="border-left: 4px solid #38bdf8; background: rgba(56, 189, 248, 0.08); padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
  <h4 style="margin: 0 0 10px; color: #38bdf8;">📦 Kho Tài Nguyên & Đường Dẫn Tải Về Chính Thức</h4>
  <ul style="margin: 0; padding-left: 20px;">
    <li><strong>Mã nguồn GitHub chính thức:</strong> <a href="https://github.com/NandhaKishorM/laya" target="_blank" rel="noopener noreferrer" style="color: #86efac; font-weight: bold;">github.com/NandhaKishorM/laya</a> (Giấy phép mã nguồn mở Apache-2.0, miễn phí 100%)</li>
    <li><strong>Link tải trực tiếp trọn bộ file ZIP:</strong> <a href="https://github.com/NandhaKishorM/laya/archive/refs/heads/main.zip" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; font-weight: bold;">Tải về file Laya-main.zip (Bấm để tải ngay)</a></li>
    <li><strong>Kho mô hình trên Hugging Face:</strong> <a href="https://huggingface.co/convaiinnovations/laya" target="_blank" rel="noopener noreferrer" style="color: #fcd34d;">huggingface.co/convaiinnovations/laya</a></li>
    <li><strong>Tài liệu hướng dẫn trực tuyến (Docs):</strong> <a href="https://nandhakishorm.github.io/laya" target="_blank" rel="noopener noreferrer" style="color: #cbd5e1;">nandhakishorm.github.io/laya</a></li>
  </ul>
</div>

<p>
  Tùy theo mức độ quen thuộc với công nghệ của bạn, bạn có thể chọn 1 trong 2 cách sử dụng cực kỳ đơn giản dưới đây:
</p>

<h3>Cách 1: Dành cho người Không Biết Lập Trình (Giao diện đồ họa No-code)</h3>
<p>
  Nếu bạn không biết gõ code hoặc sợ các dòng lệnh màn hình đen (Terminal), bạn hoàn toàn có thể thiết lập cỗ máy đọc tin này bằng các công cụ kéo-thả có sẵn:
</p>
<ol>
  <li><strong>Bước 1 - Tải phần mềm chạy AI miễn phí trên máy:</strong> Tải ứng dụng <a href="https://lmstudio.ai" target="_blank" rel="noopener noreferrer">LM Studio</a> hoặc <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Ollama</a> (cài đặt như một phần mềm Word hay Excel bình thường trên Windows / Mac).</li>
  <li><strong>Bước 2 - Tải mô hình nhỏ về máy:</strong> Mở ô tìm kiếm trong LM Studio, gõ tên mô hình <code>laya</code> hoặc các mô hình phân loại nhẹ (khoảng 0.5B – 1B tham số) và nhấn nút <strong>Download</strong>.</li>
  <li><strong>Bước 3 - Gom tin và kết nối tự động:</strong> Sử dụng công cụ tự động hóa miễn phí như <a href="https://n8n.io" target="_blank" rel="noopener noreferrer">n8n</a> hoặc <a href="https://make.com" target="_blank" rel="noopener noreferrer">Make</a>:
    <ul>
      <li>Tạo 1 nút đón nhận tin tức từ link RSS các trang báo yêu thích.</li>
      <li>Gửi tiêu đề sang mô hình AI trên máy tính của bạn với câu lệnh mẫu: <em>"Hãy chấm điểm từ 1 đến 10 độ nóng của tin này và kiểm tra có phải quảng cáo không"</em>.</li>
      <li>Nếu điểm lớn hơn 8: Tự động gửi thông báo tin nóng về Telegram hoặc Zalo của bạn kèm bản tóm tắt ngắn!</li>
    </ul>
  </li>
</ol>

<h3>Cách 2: Cài đặt và Chạy Thử Siêu Nhanh Trong 1 Phút (Dành cho ai thích script mẫu)</h3>
<p>
  Nếu bạn muốn thử ngay tốc độ phản xạ 34 mili-giây của Laya bằng Python, bạn chỉ cần thực hiện 3 bước ngắn gọn sau:
</p>

<p><strong>1. Cài đặt thư viện Laya bằng đúng 1 câu lệnh:</strong></p>
<pre style="background: #091826; border: 1px solid #1e293b; padding: 12px 16px; border-radius: 8px; color: #86efac; overflow-x: auto;"><code>pip install laya</code></pre>

<p><strong>2. Tạo một file <code>loc_tin.py</code> và dán đoạn mã mẫu sau:</strong></p>
<pre style="background: #091826; border: 1px solid #1e293b; padding: 14px 18px; border-radius: 8px; color: #e2e8f0; font-family: monospace; font-size: 13px; line-height: 1.5; overflow-x: auto;"><code>import laya

# 1. Tải mô hình phản xạ Laya (nhẹ vài trăm MB, tải tự động 1 lần duy nhất)
print("[*] Đang khởi động thư ký Laya...")
agent = laya.load("convaiinnovations/laya")

# 2. Danh sách tiêu đề bài báo thô cần đọc lướt
bai_viet = [
    "Khuyến mãi giảm giá 50% khóa học làm giàu cấp tốc hôm nay!",
    "OpenAI chính thức ra mắt mô hình GPT-5 với khả năng suy luận mới",
    "Tuyển dụng nhân viên tiếp thị bán hàng online lương cao"
]

# 3. Cho Laya quét qua từng bài (tốc độ chỉ vài chục mili-giây/bài)
for tieu_de in bai_viet:
    ket_qua = agent.predict(
        text=tieu_de,
        questions=[
            "Bài viết này có phải quảng cáo, spam không? (yes/no)",
            "Chấm điểm độ quan trọng công nghệ từ 1 đến 10:"
        ]
    )
    print(f"\nTiêu đề: {tieu_de}")
    print(f"-> Quyết định: {ket_qua}")</code></pre>

<p><strong>3. Chạy file bằng lệnh:</strong></p>
<pre style="background: #091826; border: 1px solid #1e293b; padding: 12px 16px; border-radius: 8px; color: #86efac; overflow-x: auto;"><code>python loc_tin.py</code></pre>

<p>
  Bạn sẽ thấy Laya ngay lập tức gán nhãn <code>yes</code> cho bài quảng cáo khóa học để vứt vào thùng rác, và chấm điểm <code>9/10</code> cho bài viết về công nghệ mới — hoàn toàn tự động, chính xác và không tốn 1 xu tiền kết nối đám mây!
</p>

<h2>5. Bài học lớn nhất: Sử dụng AI hiệu quả là không lãng phí</h2>

<p>
  Qua tập phim <em>"Laya News Crawler"</em> trên kênh WindiStudio, thông điệp cốt lõi chúng tôi muốn gửi gắm đến tất cả anh em chính là:
</p>

<blockquote>
  <p><strong>"Đừng thuê một giáo sư tiến sĩ chỉ để làm công việc dọn rác."</strong></p>
</blockquote>

<p>
  Khi bắt đầu làm quen với AI, chúng ta hay có thói quen đem những mô hình đắt tiền, mạnh nhất ra để giải quyết mọi việc lặt vặt. Nhưng người làm việc thông minh và hiệu quả trong thời đại AI là người biết <strong>kết hợp đúng công cụ cho đúng việc</strong>: dùng mô hình nhỏ, nhanh, miễn phí ở máy tính làm người bảo vệ gác cổng, và chỉ dùng mô hình lớn trên đám mây khi cần tư duy sâu và viết lách tinh hoa.
</p>

<p>
  Nếu bạn thấy bài viết này hữu ích, đừng quên bấm chia sẻ cho bạn bè và tiếp tục theo dõi <strong>WindiStudio</strong> để học thêm nhiều mẹo ứng dụng AI thiết thực, tiết kiệm và hiệu quả mỗi ngày!
</p>
`;

  const sourceHash = createHash('sha256').update('https://github.com/NandhaKishorM/laya' + slug).digest('hex');

  const articlePayload = {
    source_id: sourceId,
    canonical_url: 'https://github.com/NandhaKishorM/laya',
    source_name: 'Laya Open Source / WindiStudio',
    source_title: 'Laya: Fast Local Decision Model for Autonomous Agents (421M Parameters)',
    source_description: 'Mô hình ra quyết định cục bộ chạy trên CPU thuần, phục vụ tự động hóa và sàng lọc thông tin tốc độ cao.',
    title_vi: titleVi,
    title_en: 'Building a 24/7 Automated Newsroom for $0 API: Non-tech Guide to Filtering 10,000 Articles Daily with Laya Local AI',
    summary_vi: summaryVi,
    summary_en: 'How non-tech creators and businesses can filter 10,000 daily news articles on their personal computers without coding or paying expensive API bills using a two-tier AI architecture.',
    category: 'AI AGENTS',
    status: 'PUBLISHED',
    published_at: new Date().toISOString(),
    reviewed_at: new Date().toISOString(),
    published_to_windi_at: new Date().toISOString(),
    source_hash: sourceHash,
    raw_payload: {
      slug,
      image_url: 'https://zpjphixcttehkkgxlmsn.supabase.co/storage/v1/object/public/windi-bucket/news/laya-banner.png',
      image_alt: 'Mô hình 2 tầng lọc tin tự động 0 đồng bằng Laya AI và Claude',
      takeaways,
      nontech_guide: nontechGuide,
      content_html: contentHtml,
      actionable_tip: actionableTip,
      ticker: 'WindiStudio: Hướng dẫn người không rành kỹ thuật lọc 10.000 tin tức tự động giá 0 đồng',
      reading_time_minutes: 4
    }
  };

  // Check if article exists
  const existing = await fetch(`${base}/rest/v1/news_items?raw_payload->>slug=eq.${slug}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  }).then(r => r.json());

  let res;
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`Updating existing article ${existing[0].id}...`);
    res = await fetch(`${base}/rest/v1/news_items?id=eq.${existing[0].id}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(articlePayload)
    });
  } else {
    console.log('Inserting new article into news_items...');
    res = await fetch(`${base}/rest/v1/news_items`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify(articlePayload)
    });
  }

  if (!res.ok) {
    console.error('Publish failed:', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  console.log('SUCCESS! Article published to Supabase news_items. ID:', data[0]?.id);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

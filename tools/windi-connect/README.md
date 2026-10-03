# Windi Video Workflow V1

Windi Video Workflow là hệ thống sản xuất video dọc chạy trên máy người dùng. Core CLI giữ trạng thái, hai cổng duyệt, phiên bản artifact và
validation; Windi Connect phụ trách ảnh; Windi Voice hoặc file audio của khách
phụ trách giọng; Remotion dựng kết quả trên máy.

Flow và ChatGPT dùng tài khoản đang đăng nhập trong browser. Flow 0.6.31
chọn rõ tỷ lệ 9:16, 16:9, 1:1, 3:4 hoặc 4:3; hỗ trợ Nano Banana 2,
Nano Banana Pro và Nano Banana 2 Lite, 1–4 biến thể, tạo ảnh có ref và
chỉnh sửa từ ảnh đầu vào. Tối đa 4 ảnh PNG/JPEG/WebP tổng cộng, mỗi ảnh
20 MB. Mỗi biến thể là một job được lưu riêng và luân phiên giữa các project.

Extension dùng cửa sổ Flow riêng chạy nền và thu nhỏ khi tự mở. Nó không
đưa browser lên trước hoặc chuyển tab bạn đang dùng; giữ workspace để tái sử dụng. Nó tự upload và bấm “Thêm vào câu lệnh”, xác nhận đủ ref,
chọn model/tỷ lệ, gửi một lần và đối chiếu prompt trước khi tải bản gốc 1K.
Backend kiểm tra kích thước, tỷ lệ và SHA-256 trước khi lưu vào project.
Reload hoặc kết quả chưa rõ không tự gửi lại. Đường RPC có seed là tính năng
thử nghiệm: Flow đã từ chối với `PUBLIC_ERROR_UNUSUAL_ACTIVITY` trong kiểm tra
30/09/2026; không coi seed là tính năng đã được nghiệm thu.

Đã kiểm tra thật trên macOS / Cốc Cốc với ba project độc lập, ba model,
ảnh không ref, bốn ref, edit, batch hai biến thể và phục hồi cùng job.
Xem `VERIFICATION.md` và `docs/FLOW-0.6.31.md` để phân biệt kiểm tra thật,
unit test và các nền tảng chưa kiểm tra. Flow có thể đổi giao diện hoặc yêu cầu
đăng nhập/xác minh; khi đó giữ job và workspace để tiếp tục.

## Cài một lần

Từ source, tạo bộ cài nội bộ:

```sh
npm run build:extensions
npm run package:installer
```

Mở `dist/Windi Connect Installer.app`. Bộ cài đặt backend, SQLite, CLI,
LaunchAgent và native messaging host cho Chrome lẫn Cốc Cốc. Nó không cần
Node hoặc Python trên máy người dùng.

Trong **một browser/profile duy nhất** đã đăng nhập cả Flow lẫn ChatGPT:

1. Mở trang Extensions và bật Developer mode.
2. Load unpacked folder `windi`, rồi mở popup. Lần ghép nối đầu tiên là tự động.

Folder extension ổn định nằm tại
`~/Library/Application Support/WindiConnect/extensions/windi`. Popup hiển thị
Flow và ChatGPT riêng, nhưng khách chỉ cần load một extension. Các bản `flow`
và `chatgpt` tách rời vẫn được giữ lại để rollback.

Nếu thay extension hoặc browser/profile, popup hiện **Ghép lại**. Chỉ nút đó
mới được phép thay profile đã ghép nối; không cần chạy `windi pair`.

Sau khi mua, dashboard tạo mã kích hoạt chỉ hiển thị một lần. Mở Terminal mới:

```sh
windi license activate
windi setup
windi doctor
```

Mã kích hoạt và token Voice được lưu trong macOS Keychain. Một giấy phép chỉ có
một máy active. Chuyển máy dùng `windi license activate --replace`; máy cũ bị
server từ chối ở lần gọi tiếp theo.

## Dùng trong bất kỳ project nào

```sh
cd /duong-dan/toi/project-video
windi project init
windi workflow start --topic "chủ đề" --audience "khán giả" \
  --style "phong cách" --provider flow
windi workflow status
```

Workflow đi theo trạng thái bền vững:

```text
needs_setup → idea_review → layout_review → script_review → assets → voice → timing → render → qa → complete
```

Idea, layout và script chỉ được đi tiếp khi người dùng duyệt đúng ID/version.
Sau khi duyệt idea, khách chọn một trong hai layout có sẵn:

```sh
windi workflow layout choose paper-editorial
windi workflow approve layout 1
```

Hoặc khách đưa URL/file video mẫu. Agent dùng skill `watch` từ
`bradautomates/claude-video` ở chế độ `balanced`, lưu frame và transcript vào
`windi/layout-analysis`, chuyển kết quả thành layout JSON rồi đăng ký:

```sh
npx skills add bradautomates/claude-video -g --copy # chạy một lần nếu thiếu
windi workflow artifact layout --file layout-v01.json
windi workflow approve layout 1
```

`windi doctor` báo rõ bộ phân tích video đã sẵn sàng hay chưa. Windi giữ bằng
chứng phân tích trong project; repo `claude-video` chỉ trích frame/transcript,
agent mới là tầng tạo layout. Thay layout sau duyệt vô hiệu hóa script và toàn bộ
ảnh, voice, timing, render cũ. Mỗi beat trong script phải dùng đúng một scene ID
từ layout đã duyệt, cùng voice-over, chữ màn hình, mô tả hình, prompt, motion và
spoken anchor.

Sau khi script được duyệt, workflow tạo manifest ảnh có request key ổn định.
Có thể chạy ảnh trực tiếp khi cần:

```sh
windi images create --provider flow --prompt-file prompts/scene-01.txt \
  --ref assets/character.png --output assets/windi/scene-01 --wait
```

Có thể lặp `--ref` để dùng nhiều ảnh; batch manifest dùng mảng `references`.
Ảnh ref phải nằm trong project. Windi kiểm tra SHA-256 sau khi truyền file,
và tái sử dụng media ID đã upload theo workspace + hash. Upload lỗi sẽ dừng
trước khi gửi lệnh tạo ảnh, không tự bỏ ref để tạo ảnh chỉ từ prompt.

`windi init` tạo `.windi/project.json`. Mỗi project có ID, output mặc định
`assets/windi`, lịch sử job và workspace Flow/ChatGPT riêng. Không có project
đang chọn toàn cục.

Từ 0.6.5, workspace Flow chưa liên kết sẽ được tạo tự động bằng nút New project.
URL được lưu theo project Windi và dùng lại cho ảnh tiếp theo hoặc khi resume.
Nếu mất phản hồi sau khi bấm tạo, Windi kiểm tra tab cũ và không tự bấm lần hai.
Có thể liên kết thủ công nếu muốn dùng project có sẵn:

```sh
windi project link --provider flow --url "https://flow.google.com/project/PROJECT_ID"
```

```sh
windi images edit --provider chatgpt \
  --input assets/windi/scene-01.png \
  --prompt-file prompts/scene-01-revision.txt \
  --output assets/windi/scene-01-v02 --wait
```

Lệnh ảnh hỗ trợ `--project`, `--json`, `--wait` và `--request-key`. Dùng lại
cùng request key với nội dung y hệt trả lại job cũ; thay nội dung với key đó sẽ
bị từ chối. Output trùng tên được lưu thành phiên bản mới, không ghi đè.

Nếu copy một project sang folder khác, `windi init` hỏi chọn liên kết lại hay
tạo bản độc lập. Với CI/agent không tương tác, dùng `--relink` hoặc `--fork`.

## Batch manifest

`images.json`:

```json
{
  "version": 1,
  "jobs": [
    {
      "kind": "create",
      "provider": "flow",
      "promptFile": "prompts/scene-01.txt",
      "references": ["assets/character.png"],
      "output": "assets/windi/scene-01",
      "requestKey": "scene-01-v1"
    },
    {
      "kind": "edit",
      "provider": "chatgpt",
      "input": "assets/windi/scene-01.png",
      "promptFile": "prompts/scene-01-revision.txt",
      "output": "assets/windi/scene-01-v02"
    }
  ]
}
```

Chạy `windi images batch --manifest images.json --wait`.

Nếu một job Flow cũ đã tạo ảnh bằng adapter UI, tải đúng bản 1K Original rồi
nhập lại vào chính job. Backend không tự dò thumbnail/menu và không submit
prompt lần nữa:

```sh
windi jobs import JOB_ID --file /duong/dan/anh.jpeg
```

Chỉ dùng `--replace` khi đã đối chiếu và cần sửa một asset từng bị gán sai. File
cũ được chuyển vào `.windi/quarantine`, không bị xóa.

## Voice, timestamp và render

```sh
# Người mua Video Workflow: `windi license activate` đã cấu hình luôn
# Windi Voice API và 20.000 credit tặng kèm; không cần `windi login`.
windi voice list
windi voice generate --voice VOICE_UUID

# Người chỉ mua gói Windi Voice thì tạo token tại Voice Studio rồi chạy:
windi login

# Hoặc audio của khách; Whisper chạy cục bộ nếu chưa có captions
windi voice import --audio voice.mp3

windi video preview
windi video render
```

Render tạo `final.mp4`, `cover.png`, `captions.srt`, source data và `qa.json`.

### Thử đăng TikTok bằng Lightpanda trên máy cá nhân

Đây là luồng thử nghiệm cho **một tài khoản và video riêng tư**. Cần cài binary
`lightpanda` trong `PATH`. Lightpanda chạy CDP trên `127.0.0.1`; Windi không
gửi cookie hoặc mật khẩu vào chat. Đăng nhập TikTok trong trình duyệt có giao
diện, rồi xuất cookie TikTok thành file JSON dạng CDP/Puppeteer hoặc Netscape
cookies.txt **ở ngoài project/repo**. Đặt quyền chỉ chủ máy đọc được
(`chmod 600 /đường/dẫn/cookies.txt`). Không dán nội dung file vào chat.

```sh
windi tiktok session --cookie-file /đường/dẫn/cookies.txt --account ten_tai_khoan
windi tiktok prepare --project /đường/dẫn/project --account ten_tai_khoan --caption "Nội dung caption"
windi tiktok status --project /đường/dẫn/project --code MA_DUYET
```

`prepare` chỉ chạy khi Windi workflow đã hoàn tất và `qa.json` xác nhận đúng
MP4. Nó ghi `.windi/tiktok-posts/MA_DUYET.json` với SHA-256, caption, tài
khoản, `SELF_ONLY` và trạng thái `awaiting_approval`. Agent cần hiển thị đúng
MP4, caption, tài khoản, chế độ riêng tư trong chat. **Chỉ sau khi người dùng
duyệt bản đó**, gọi:

```sh
windi tiktok approve --project /đường/dẫn/project --code MA_DUYET
windi tiktok publish --project /đường/dẫn/project --code MA_DUYET --cookie-file /đường/dẫn/cookies.txt
```

`publish` kiểm tra lại hash của video, phiên đăng nhập, tài khoản, lựa chọn
riêng tư và nút Đăng trước khi bấm một lần. Nó chỉ đánh dấu `verified` khi
quan sát được liên kết bài mới trong TikTok Studio. Nếu gặp CAPTCHA, hết phiên,
giao diện thay đổi hoặc không xác minh được kết quả, trạng thái là
`action_required` hoặc `outcome_unknown`; phải kiểm tra thủ công, không tự
gọi `publish` lại. Sau khi khởi động lại Lightpanda, chạy `session` thêm lần
nữa để kiểm tra cookie còn dùng được. Trang TikTok chưa được kiểm chứng trực
tiếp với tài khoản thật, nên cần thử trên một video riêng tư đã được duyệt.
Lightpanda công bố hỗ trợ file input từ [bản 0.3.2](https://github.com/lightpanda-io/browser/releases/tag/0.3.2) và định dạng cookie trong
[tài liệu `serve`](https://lightpanda.io/docs/reference/cli/serve); kết quả này
chưa chứng minh trang TikTok hiện tại tương thích. Nếu phát triển tính năng
cho nhiều khách hàng, xem [Content Posting API chính thức](https://developers.tiktok.com/docs/en/content-posting-api-get-started).

Các lệnh tương ứng cũng có trong MCP: `windi_tiktok_prepare`,
`windi_tiktok_approve`, `windi_tiktok_status`, `windi_tiktok_session`,
`windi_tiktok_publish`.

### Facebook Page Reels qua API Meta

Bản thử nghiệm Facebook dùng [Reels Publishing API của Meta](https://www.postman.com/meta/facebook/folder/simabyk/reels-publishing)
cho video dọc trên **Page**. Page access token cần thuộc đúng Page và có quyền
tạo nội dung. Meta nêu các quyền `pages_manage_posts`, `pages_read_engagement`,
`pages_show_list` cho việc đăng video Page trong [Page Videos reference](https://developers.facebook.com/docs/graph-api/reference/page/videos/).
Đăng nhập Facebook trong trình duyệt chưa đủ để gọi API: cần Meta app và Page
access token. Luồng thử cục bộ nhận token từ file trên máy; việc kết nối OAuth
cho mọi khách hàng chưa được triển khai.

Lưu **chỉ token** trong file text nằm ngoài project/repo, đặt quyền `0600` và
không dán token vào chat. Kiểm tra Page, chuẩn bị bản nháp rồi trình MP4,
caption, tên Page và trạng thái hiển thị để người dùng duyệt:

```sh
windi facebook page --page-id PAGE_ID --token-file /đường/dẫn/page-token.txt
windi facebook prepare --project /đường/dẫn/project --page-id PAGE_ID --caption "Nội dung caption"
windi facebook status --project /đường/dẫn/project --code MA_DUYET
```

`prepare` mặc định đặt `DRAFT`. Nếu người dùng muốn đăng công khai sau khi duyệt,
thêm `--public` **ở bước prepare**; mã duyệt khác với bản nháp. Sau khi người
dùng duyệt đúng bản trong chat:

```sh
windi facebook approve --project /đường/dẫn/project --code MA_DUYET
windi facebook submit --project /đường/dẫn/project --code MA_DUYET --token-file /đường/dẫn/page-token.txt
windi facebook status --project /đường/dẫn/project --code MA_DUYET --token-file /đường/dẫn/page-token.txt
```

`submit` đối chiếu lại Page ID và SHA-256 của MP4, rồi gọi ba bước của Meta:
start, upload file cục bộ, finish. Trạng thái lưu tại
`.windi/facebook-reels/MA_DUYET.json`. Khi Meta đã nhận lệnh đăng công khai
nhưng vẫn xử lý video, trạng thái là `submitted`; lệnh `status` đọc lại mà
không gửi bài lần nữa. Chỉ ghi `verified` khi Meta trả trạng thái xuất bản
hoàn tất cùng permalink. Nếu lỗi hoặc kết quả không rõ, trạng thái
`outcome_unknown` chặn mọi lần gửi lại tự động. Bản nháp có trạng thái `draft`
và không có liên kết bài công khai. API version mặc định là `v26.0`, có thể
đổi bằng `--api-version` nếu Meta app đang dùng phiên bản khác.

MCP có các lệnh tương ứng `windi_facebook_page`, `windi_facebook_prepare`,
`windi_facebook_approve`, `windi_facebook_status`, `windi_facebook_submit`.
Chưa thử với Page/token thật vì chưa có thông tin kết nối của người dùng.

### Đăng TikTok hoặc Facebook Page qua Postiz

[Postiz Cloud](https://postiz.com/pricing) chỉ có bản dùng thử 7 ngày; bản
Postiz mã nguồn mở có thể tự host miễn phí, nhưng máy chủ và kết nối ứng dụng
TikTok/Meta vẫn cần tự chuẩn bị. Windi Connect dùng Public API của Postiz,
không cần cài Postiz CLI. Postiz cần được chạy trước và mỗi kênh phải kết nối
thành công qua OAuth trong giao diện Postiz. Máy thử hiện chưa có Postiz đang
chạy hoặc kênh người dùng đã kết nối.

Theo [hướng dẫn cài Docker Compose](https://docs.postiz.com/self-host/installation/docker-compose),
nên dùng file Compose hiện hành của Postiz. [Hướng dẫn TikTok tự host](https://docs.postiz.com/self-host/providers/tiktok)
yêu cầu Postiz trên HTTPS, URL media công khai HTTPS và domain media đã xác minh;
app chưa qua audit chỉ có thể Direct Post riêng tư. [Hướng dẫn Facebook](https://docs.postiz.com/self-host/providers/facebook)
yêu cầu Meta app và lưu ý app ở Development mode có thể chỉ hiển thị nội dung
cho người có vai trò trong app. Kiểm tra quyền/app trước khi thử đăng thật.

Tạo API key trong Postiz và lưu **chỉ key** vào file bên ngoài project/repo,
quyền `0600`; không gửi key vào chat. `--api-url` là base Public API, ví dụ
`https://postiz.example.com/api/public/v1` khi tự host hoặc
`https://api.postiz.com/public/v1` khi dùng Cloud. URL HTTP chỉ được chấp nhận
cho localhost. Liệt kê kênh rồi chuẩn bị đúng MP4 đã QA:

```sh
windi postiz channels --api-url https://postiz.example.com/api/public/v1 --key-file /đường/dẫn/postiz-key.txt
windi postiz prepare --project /đường/dẫn/project --api-url https://postiz.example.com/api/public/v1 --key-file /đường/dẫn/postiz-key.txt --integration-id ID_KENH --caption "Nội dung caption"
windi postiz status --project /đường/dẫn/project --code MA_DUYET
```

`prepare` không upload. Với TikTok, mặc định là `SELF_ONLY` (chỉ mình tôi);
thêm `--public` ở bước prepare nếu bản duyệt phải công khai và TikTok developer
app đã qua audit; trước audit, TikTok vẫn có thể ép bài về riêng tư. Facebook Page
hiện hỗ trợ bài công khai. Bản duyệt trong chat phải cho thấy đường dẫn MP4,
caption, tên kênh Postiz và chế độ hiển thị. Sau khi người dùng duyệt đúng bản:

```sh
windi postiz approve --project /đường/dẫn/project --code MA_DUYET
windi postiz submit --project /đường/dẫn/project --code MA_DUYET --key-file /đường/dẫn/postiz-key.txt
windi postiz status --project /đường/dẫn/project --code MA_DUYET --key-file /đường/dẫn/postiz-key.txt
```

`submit` xác nhận lại hash MP4 và kênh, lấy schema cài đặt, upload MP4 lên
Postiz, kiểm tra URL media công khai HTTPS, rồi gọi `POST /posts` một lần. TikTok luôn dùng `DIRECT_POST`; chế độ
`UPLOAD` của Postiz chỉ gửi vào hộp thư TikTok để hoàn tất thủ công. Trạng thái
`submitted` chỉ nghĩa là Postiz nhận lệnh, **chưa chứng minh bài xuất hiện** ở
TikTok/Facebook. `status --key-file` đọc thêm trạng thái và `releaseURL` trong
Postiz mà không gửi bài lần nữa. Kiểm tra bài trên nền tảng trước khi báo đã
đăng, kèm liên kết bài nếu có. Nếu phản hồi tạo bài không rõ, trạng thái
`outcome_unknown` chặn gửi lại để tránh bài trùng. File trạng thái nằm ở
`.windi/postiz-posts/MA_DUYET.json`. MCP có các lệnh `windi_postiz_channels`,
`windi_postiz_prepare`, `windi_postiz_approve`, `windi_postiz_status`,
`windi_postiz_submit`.

Hai layout đi kèm là `paper-editorial` và `dark-cinematic`; layout tham chiếu có
thể định nghĩa palette, caption, pacing và các scene composition `full-bleed`,
`framed`, `split`, `text-led`, `quote`, `comparison`, `cta`. Renderer dùng thật
scene ID của từng beat thay vì bỏ qua trường `layout`. Khi dùng Windi
Voice, backend yêu cầu Windi Clone Pro 2.1 trả audio và word timestamp trong cùng một lần
tạo; CLI không chạy Whisper lại. Timestamp cuối lấy từ voice thật, không dùng
thời lượng dự kiến ở bước script.

## Khôi phục và giới hạn

- Chỉ một job chạy mỗi provider; Flow và ChatGPT có thể chạy song song và các
  project được luân phiên công bằng.
- Mất browser/extension sau khi gửi không tự gửi lại. Job chuyển sang trạng
  thái cần đối chiếu để tránh tạo ảnh trùng.
- Login hết hạn, CAPTCHA, hết quota hoặc UI provider thay đổi chuyển job sang
  **needs_user_action** với hướng dẫn trong `windi jobs status JOB_ID`.
- Ảnh chỉ được publish khi download được gắn với đúng job, giải mã hợp lệ và
  checksum và tỷ lệ xong. Flow UI đối chiếu prompt trong trang ảnh rồi chọn
  bản gốc 1K. Job được phục hồi từ trạng thái đã lưu bằng `windi jobs resume
  JOB_ID --confirm-result --wait`; job cũ thiếu liên kết cần đối chiếu rồi nhập
  bằng `windi jobs import`.
  Thumbnail/screenshot không bao giờ là output.
- API nội bộ Flow không phải API công khai, nên có thể thay đổi. Adapter direct
  và adapter UI được tách riêng để một thay đổi của Flow không làm hỏng toàn bộ
  workflow; popup luôn cho biết đường nào đang sẵn sàng.
- V1 hỗ trợ Codex và Antigravity qua adapter cài toàn máy. Môi trường khác gọi
  CLI được nhưng chưa được quảng cáo là one-click.
- Phân tích video mẫu phụ thuộc skill MIT `bradautomates/claude-video`, Python,
  `ffmpeg` và `yt-dlp`. Video local không có caption có thể cần Groq/OpenAI
  Whisper theo lựa chọn rõ ràng của khách; video không bị upload, chỉ audio được
  gửi đi khi khách bật Whisper fallback.
- Không gồm Flow video hay cloud rendering. ZIP có launcher Windows x64;
  phiên bản này chưa được kiểm tra trên máy Windows thật.

Hai extension cũ trong `app/tool/extension/` không bị sửa đổi. Trước khi coi
một provider là release-ready, cần kiểm chứng thật: create, reference, edit và
original download trên chính provider đó, bằng cả Chrome và Cốc Cốc.

Product seed mặc định `is_active=false` và `release_ready=false`. Không mở CTA
thanh toán cho đến khi hoàn tất checklist ở `docs/windi-video-workflow/`.

## Grok Web — ảnh và ảnh tham chiếu (0.6.1)

Nhánh Grok dùng phiên đăng nhập trong một tab grok.com riêng của Windi.
Giao thức upload, Imagine WebSocket, image-edit và text-to-video được tham khảo từ
[chenyme/grok2api](https://github.com/chenyme/grok2api), commit
`906b9493b099d192381c698d4e320fafeccb851c` (MIT; kèm LICENSE.grok2api.txt).
Không cài server grok2api, không dùng OAuth/API xAI và không xuất cookie ra daemon.
Code OAuth 0.6.0 còn được giữ để kiểm tra tương thích dữ liệu cũ, nhưng daemon
0.6.1 không sử dụng nó để đăng nhập hay tạo media.

Flow/ChatGPT giữ native host, pairing, hàng đợi và bộ xử lý riêng. Grok có native
host `com.windistudio.connect.grok`, tab, hàng đợi và `grokStatus` độc lập.

Sau khi cài và tải lại extension, bấm **Đăng nhập Grok**. Windi mở tab Imagine
riêng; nếu trang yêu cầu đăng nhập/kiểm tra, hoàn tất trên tab đó rồi bấm **Kiểm tra**.
Không đóng tab này trong lúc tạo media. **Ngắt kết nối** chỉ ngắt Windi, không
đăng xuất tài khoản grok.com. CLI tương ứng:

```sh
windi grok login
windi grok doctor
windi grok status
```

Trong project đã `windi project init`, đặt prompt và ref trong project:

```sh
windi images create --provider grok --prompt-file prompts/scene.txt \
  --ref refs/character.png --ref refs/clothes.png --ref refs/location.png \
  --aspect 9:16 --output assets/grok/scene-01 --wait

windi images edit --provider grok --input refs/character.png \
  --ref refs/clothes.png --prompt-file prompts/edit.txt \
  --output assets/grok/scene-01-edited --wait

windi videos create --provider grok --prompt-file prompts/clip.txt \
  --duration 6 --resolution 720p --aspect 9:16 --output assets/grok/clip-01 --wait
```

- Ảnh: tổng tối đa **8 ảnh input/ref**. Có ref thì dùng giao thức image-edit;
  không ref thì dùng Imagine Image 2.0. Một kết quả mỗi job.
- `@image1`, `@image2`… được kiểm tra và đổi thành mô tả số thứ tự ảnh đính kèm.
  `--input`, nếu có, luôn là ảnh 1; sau đó là các `--ref` theo thứ tự gửi.
  Đây là ánh xạ thứ tự input, không phải bảo đảm model giữ chính xác mọi chi tiết.
- Video dùng composer Imagine của Grok Web, tối đa **2 ref** theo thứ tự.
  Một ref là first frame, dùng `--aspect auto` (mặc định khi có 1 ref).
  Hai ref hỗ trợ chọn 9:16/16:9/1:1/3:2/2:3. Mặc định 6 giây/720p;
  thời lượng 6/10/15 giây, 480p/720p phụ thuộc quyền tài khoản.
  Giao diện hoặc tuỳ chọn không khớp thì dừng trước khi tạo, không bỏ ref.
- Ảnh Web không nhận tùy chỉnh quality/2K như Console API. Windi từ chối các
  tùy chọn đó thay vì âm thầm bỏ qua. Kích thước thật được ghi vào kết quả.
- File gốc được browser tải về rồi kiểm tra trước khi lưu vào project.
  Đường dẫn cuối nằm trong `result.path`, dùng để render tiếp. Tạo media không
  tự sửa timeline hay tự render video hoàn chỉnh.
- Lịch sử trên grok.com là phạm vi kiểm tra riêng: không hứa tự đồng bộ Imagine
  History chỉ vì giao thức web đã trả file. Windi lưu job và file trên máy.
- Mất kết nối sau khi gửi: không tự tạo lại. `windi jobs resume JOB_ID` thử lấy
  kết quả của job cũ; chỉ dùng `--confirm-no-result` khi chấp nhận gửi lại.

MCP: `windi_image_create`, `windi_image_edit`, `windi_video_create`,
`windi_job_status`, `windi_grok_status`. Giữ nguyên cổng duyệt workflow video.
Xem `docs/GROK-VERIFICATION.md` để phân biệt test tự động với nghiệm thu tài khoản thật.

ChatGPT chỉ lưu workspace khi có URL cuộc trò chuyện `/c/...`; trang chủ và trang đăng nhập không được lưu làm workspace. Báo lỗi chỉ đọc vùng thông báo và trạng thái đăng nhập/xác minh, không quét từ quota/credit trong toàn bộ hội thoại.

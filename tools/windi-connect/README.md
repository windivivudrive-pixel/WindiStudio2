# Windi Video Workflow V1

Windi Video Workflow là hệ thống sản xuất video dọc chạy trên một máy macOS
Apple Silicon. Core CLI giữ trạng thái, hai cổng duyệt, phiên bản artifact và
validation; Windi Connect phụ trách ảnh; Windi Voice hoặc file audio của khách
phụ trách giọng; Remotion dựng kết quả trên máy.

Flow và ChatGPT vẫn dùng tài khoản đang đăng nhập trong browser. ChatGPT dùng
adapter giao diện riêng. Flow V0.5.4 chạy RPC trực tiếp trong phiên Flow Angular:
backend điều phối job; extension gọi `FlowService.BatchGenerateImages`, lấy URL
nguyên bản từ đúng media trả về, tải và giải mã ảnh trong tab đã quản lý rồi lưu
vào project. Không tìm selector ở bước chuẩn bị, tạo hay tải ảnh. CSRF/cookie
không được đưa ra khỏi trang Flow. Phản hồi media được lưu theo job để phục hồi
download mà không tạo lại ảnh. Khi phiên direct chưa sẵn sàng, job dừng ở
`needs_user_action`; Windi không âm thầm chuyển sang selector UI.

Đã test thật create/download và phục hồi download trên Cốc Cốc ngày 11/09/2026.
Tạo ảnh với reference dùng `UploadImage` RPC rồi truyền media ID vào ingredient
của `BatchGenerateImages`. Hỗ trợ tối đa 4 ảnh PNG/JPEG/WebP, mỗi ảnh tối đa 20 MB.
Edit ảnh gốc vẫn chưa hỗ trợ; job edit dừng rõ ràng, không chuyển sang UI. Xem `VERIFICATION.md` để phân biệt bằng chứng live và unit test.

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

Workspace Flow được liên kết rõ ràng, không dò hoặc bấm nút tạo project bằng
selector:

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
Hai layout đi kèm là `paper-editorial` và `dark-cinematic`; layout tham chiếu có
thể định nghĩa palette, caption, pacing và các scene composition `full-bleed`,
`framed`, `split`, `text-led`, `quote`, `comparison`, `cta`. Renderer dùng thật
scene ID của từng beat thay vì bỏ qua trường `layout`. Khi dùng Windi
Voice, backend yêu cầu Cartesia trả audio và word timestamp trong cùng một lần
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
  checksum xong. Với Flow, extension lấy URL ảnh gốc trong response
  `batchGenerateImages`; job legacy chưa có response liên kết phải được người
  dùng đối chiếu rồi nhập bằng `windi jobs import`.
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
- V1 không gồm Flow video, Windows hay cloud rendering.

Hai extension cũ trong `app/tool/extension/` không bị sửa đổi. Trước khi coi
một provider là release-ready, cần kiểm chứng thật: create, reference, edit và
original download trên chính provider đó, bằng cả Chrome và Cốc Cốc.

Product seed mặc định `is_active=false` và `release_ready=false`. Không mở CTA
thanh toán cho đến khi hoàn tất checklist ở `docs/windi-video-workflow/`.

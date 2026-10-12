# Timeline trước khi xuất video — phase thử nghiệm repo-video

Người dùng yêu cầu xem và chỉnh trực tiếp trước khi render. Sau khi idea đã duyệt, hoàn tất script, asset, voice, word timestamps và composition; mở Windi Timeline và dừng ở `EDITOR_READY`. Chỉ thao tác “Xuất video” của người dùng mới khởi động render MP4. Không chạy render từ lời “tiếp tục”, không render preview MP4 tự động. Quyền tạo idea/script/asset và quyền đăng mạng xã hội vẫn theo skill chính.

## Runtime và mở editor

Runtime dùng chung nằm ở `kits/video-starter/editor/`, tách biệt với web Next.js và gói khách hàng. Không cài dependency video vào web hoặc nhân bản node_modules theo tập. Remotion Player, bundler và renderer cùng pin `4.0.520`; Vite hiện dùng từ runtime của workspace. Tại workspace WindiStudio2:

```bash
npm run video:editor -- --project videos/windistudio-repo/EPISODE
```

Server chỉ bind `127.0.0.1:4318`; dùng `--port` nếu đã có editor đang chạy. Mở URL server in ra cho người dùng. Lệnh mở editor không render MP4, không tạo voice/ảnh mới. Giữ server chạy trong khi người dùng chỉnh.

Tập WS25 đã có adapter riêng, không đổi `src/Composition.tsx` hoặc MP4 đã bàn giao. Một số tập dùng cùng cấu trúc `MainComposition` + `RetroWindow` + một `Sequence` cho mỗi beat có thể nối bằng:

```bash
npm --prefix kits/video-starter run editor:attach -- --project videos/windistudio-repo/EPISODE
```

Attach tạo `src/EditorComposition.tsx` và `editor.config.json`, không ghi đè adapter/source đang có. Hỗ trợ cấu trúc WS20 gồm các Sequence theo beat, hoặc một OffthreadVideo liên tục trong RetroWindow. Với clip liên tục, giữ nguyên video gốc khi không có override; khi thay media một cảnh, các cảnh còn lại dùng trimBefore theo startFrame để không phát lại clip từ đầu. Các composition custom, Three.js hoặc scene có mốc global cần adapter phù hợp; không giả định attach hỗ trợ mọi tập cũ. Kiểm tra preview thực tế trước khi bàn giao.

## Contract cho tập mới

- `editor.config.json`: `{ "schemaVersion": 1, "title": "tên tập", "module": "src/EditorComposition.tsx", "exportName": "EditorComposition" }`.
- `src/timeline.json`: `fps`, `totalFrames`, `beats`. Beat gồm `id`, `startFrame`, `endFrame`, `headline`, `spokenPill`, `category`; `name`, `index`, `windowTitle`, `accentColor` tùy composition.
- `src/captions.json`: nhóm `{text,startMs,endMs,words:[{text,startMs,endMs}]}` với word timestamps đã có. Không transcribe generated voice lại.
- `public/`: font, ảnh/clip, `voice.mp3`, `musicbg.mp3`. Mọi đường dẫn media tương đối trong public, không chứa secret hoặc link ngoài.
- Composition nhận `EditorProps` từ `kits/video-starter/editor/types.ts`, dùng `editor?.beats`, `editor?.captions`, `editor?.audio` làm dữ liệu runtime; fallback vào file gốc khi không có editor props.
- Preview và export cùng dùng một component, cùng document. Scene nằm trong `Sequence from={beat.startFrame} durationInFrames={beat.endFrame - beat.startFrame}`. Chuyển động bên trong scene dựa trên local frame; nếu dùng global frame, đọc timing mới thay cho hằng số cũ.
- Khi beat có media override, dùng `EditorMedia` của runtime chung để render đúng crop, zoom, clip trim và volume. Khi không có override, giữ scene code/3D gốc.
- Bọc nội dung bên trong RetroWindow bằng `EditorWindowMedia editor={editor}` của `editor/Media.tsx`. Đặt ở root frame toàn video (bên ngoài các Sequence theo beat). Wrapper áp dụng `editor.windowTransform` / `editor.beats[i].windowTransform` và thay nguồn tại `editor.mediaClips` đang active; transition đặt ngoài wrapper để giữ nguyên khung hiệu ứng. `attach` mới thêm wrapper; adapter đã tồn tại cần nối thủ công, attach không ghi đè.
- `windowTransform?: {x?, y?, scale?}`: x/y là phần trăm chiều rộng/cao của phần bên trong cửa sổ, từ -100 đến 100; scale từ 0.1 đến 6. Override theo cảnh kế thừa từng trường từ mức toàn video.
- `mediaClips?: [{id,startFrame,endFrame,media}]`: ID duy nhất, clip trong tổng frame, không chồng thời gian. `media` dùng cùng contract với media cảnh, trimBefore theo frame composition. Trong khoảng clip, nguồn này được ưu tiên hơn media cảnh; ngoài khoảng đó quay về nội dung gốc/override theo beat. Một track media cửa sổ, chưa có video chồng nhiều lớp.
- Dùng `EditorCaptionBar` hoặc caption component đã nhận groups qua props. Giữ đúng watermark, HUD và vị trí caption của WS13, WS20 V1 và quy tắc không mascot mặc định.
- Đăng ký các khối gốc bằng `EditorElement` trong `editor/Layout.tsx`: `spec={id,label,x,y,width,height,fontSize?,mode?}`. `mode: 'scale'` cho cửa sổ/thương hiệu để scale nguyên nội dung và giữ animation; `mode: 'caption'` cho chữ karaoke. Không dựng lại nội dung gốc bằng layout đơn giản hơn. Metadata phải đúng hình học của component đó. `attach` đọc JSX bằng TypeScript để đăng ký sáu khối của cấu trúc hỗ trợ; layout không nhận diện được sẽ dừng trước khi ghi file.
- `editor.layout` là layout chung; `editor.beats[i].layout` ghi đè từng thuộc tính của một cảnh. Trường tùy chọn gồm x/y, width/height, fontSize, lineHeight, color, textAlign, wrap. Thiếu override thì không thêm CSS chỉnh layout. Adapter cũ cần nối các khối này trước khi dùng kéo/resize.
- Dùng `EditorMusic editor={editor}` để đổi file, trim đầu, offset, loop và fade cùng trong preview/export. `editor.config.json.audioDefaults` có thể đặt gain/fade gốc của tập. WS25 dùng gain 0.95, fade vào 15 frame và fade ra 25 frame. Runtime kiểm tra file nhạc bằng `ffprobe` trên máy; voice vẫn cố định.
- Đặt `EditorTransition beats={timeline.beats}` trong viewport để dùng mờ qua nền tối hoặc quét retro. Đây là hiệu ứng phủ tại điểm cắt, không phải crossfade hai clip chồng nhau; không rút ngắn timeline hoặc đổi mốc voice.

## Hành vi chỉnh và lưu

Editor hiện hỗ trợ play/pause, scrub/frame-step, nhiều track, waveform voice, zoom timeline, kéo biên cảnh, chỉnh timing bằng số, headline/category/spoken pill, phụ đề, thay ảnh/clip từ media library hoặc nhập file, contain/cover/crop/zoom, trim đầu clip, âm lượng, undo/redo và lưu draft. Bản cơ bản ngày 2026-10-10 bổ sung chọn/kéo/resize sáu khối layout, nhập tọa độ và cỡ chữ, xuống dòng, layout riêng/chung, đặt lại khối, zoom preview 150–300%, thu gọn timeline, nhập/đổi nhạc, trim/offset/fade nhạc và hai hiệu ứng chuyển cảnh. Mỗi gesture kéo là một bước hoàn tác. Có bàn phím và trường nhập số thay cho kéo bằng chuột.

Bản tương tác bổ sung quét chọn nhiều phụ đề/media/nhạc, Shift/⌘/Ctrl-click chọn thêm, kéo nhóm hoặc nhập delta giây; nút chọn tất cả sub; dời vị trí cả track sub trên hình; kéo video/ảnh từ thư viện hoặc file máy vào track media độc lập; cắt hai đầu clip; kéo và zoom nội dung bên trong cửa sổ. Thư viện dùng Pointer Events để kéo clip; file ngoài dùng HTML drag/drop. Thanh ngăn điều chỉnh chiều cao timeline. Mỗi gesture tạo một bước hoàn tác.

Dời nhóm phụ đề giữ nguyên độ dài từng nhóm, khoảng cách và mọi word timestamp; bị giới hạn bởi phụ đề chưa chọn và mốc 0. Cho phép sub tới tối đa 2 lần thời lượng video để dễ chỉnh cả track; preview chỉ phát trong tổng frame gốc, SRT khi xuất cắt tại cuối video. Không tự kéo dài audio/video theo sub. Chọn cả media/caption dùng cùng delta và các giới hạn của từng track.

Timing hình được chỉnh trong tổng thời lượng voice cố định: các cảnh luôn nối liền, không đổi thứ tự/narration để tránh lệch voice. Sửa phụ đề không đổi audio. Nếu đổi số từ trong một nhóm, mốc karaoke được chia lại trong nhóm đó; kiểm tra và chỉnh voice qua workflow nếu muốn đổi lời đọc.

Draft ở `<episode>/.windi/editor/draft.json`; lưu lịch sử tại `history/revision-N.json`, từ chối ghi bằng revision cũ khi hai cửa sổ cùng chỉnh. Giữ source và paid assets gốc. Nhập media tạo file mới trong `public/editor-media/`; không submit generation mới.

Nếu fps/tổng frame đổi sau khi tạo lại timeline, editor mở baseline hiện tại cùng thông báo; draft cũ được lưu vào lịch sử ở lần lưu kế tiếp. Không áp tọa độ/timing cũ lên voice mới một cách tự động. Chưa có autosave: dùng **Lưu draft** hoặc ⌘/Ctrl+S.

## Xuất và QA

Nút “Xuất video” lưu rồi chụp snapshot draft. Thay đổi sau đó không được lẫn vào render đang chạy. Progress gồm bundle → render → cover → kiểm tra metadata. MP4, cover từ frame đang xem, SRT, edit.json và qa.json nằm riêng trong `<episode>/windi/editor-exports/<export-id>/`. Không ghi đè `final.mp4` đã bàn giao. `last-export.json` ghi hành động xuất và revision.

`technicalPassed` chỉ chứng minh kích thước 1080×1920, thời lượng đúng timeline và có audio stream. `visualAudioReview: pending` yêu cầu xem/nghe MP4, kiểm caption, motion, watermark, biên scene và âm thanh trước khi ghi `DELIVERED`. Không coi preview realtime hoặc thông báo render thành công là QA toàn bộ.

Người dùng có thể bấm “Dừng xuất” trong stage render. Giữ snapshot/partial output để kiểm tra; không coi render hủy/lỗi là thành phẩm.

Phạm vi phase này là repo-video nội bộ. Chưa thay CLI pipeline khách hàng, chưa cập nhật installer, chưa phát hành web hoặc tích hợp `$windi-video-workflow` thương mại. Việc đóng gói/bán là phase sau theo yêu cầu người dùng.

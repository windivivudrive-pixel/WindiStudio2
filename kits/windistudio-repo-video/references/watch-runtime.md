# /watch: nguồn và cách chạy

Upstream: https://github.com/bradautomates/claude-video, MIT, snapshot commit `83da59fa78c3eee9e20f515fe75c438bb5166efd`, skill version 0.2.0, tải 2026-09-06. Bản giữ trong workspace: `kits/watch/`; bản dùng trong Codex: `~/.codex/skills/watch/`. Giữ LICENSE và script upstream, không coi repo này là engine dựng video.

Đọc `watch/SKILL.md` rồi resolve đường dẫn scripts từ chính skill ấy. Dùng `setup.py --json` để biết khả năng môi trường. Chọn `balanced` khi người dùng không chỉ định; không bắt dừng chọn preference nếu task đã đủ đầu vào. Repo không yêu cầu API key để chạy frames-only.

Lệnh (thay các đường dẫn bằng đường dẫn đã resolve):

```sh
python3 /absolute/watch/scripts/watch.py /absolute/reference.mp4 --detail balanced --max-frames 40 --out-dir /absolute/episode/reference-watch
```

Xem tất cả ảnh được report liệt kê. Nếu hook/chuyển cảnh cần rõ hơn, chạy focused `--start 0 --end 5 --fps 2` hoặc `--timestamps 0,1,2,3,4,48.5`. Lưu report và khung hình cần dùng để có thể tra lại, không xóa thư mục chứng cứ trong khi còn xây skill.

## Local file và transcription

`yt-dlp` cần cho URL, không cần để đọc MP4 local. Nếu có ffmpeg/ffprobe và thiếu yt-dlp, vẫn có thể dùng script local. Nếu thiếu key Whisper, dùng `--no-whisper` để trích hình rồi chạy local Whisper đã có. Nói rõ nguồn transcript; không mô tả frames-only là đã nghe video.

```sh
ffmpeg -i reference.mp4 -vn -ac 1 -ar 16000 audio.wav
python3 -m whisper audio.wav --model large-v3-turbo --language vi --task transcribe --fp16 False --word_timestamps True --output_format all --output_dir transcript
```

Auto transcript thường sai tên repo, thư viện và từ tiếng Anh. Đối chiếu với chữ trong hình; đánh dấu từ chưa chắc, không tự nhận bản chép chuẩn. Nếu cần chính xác các từ chưa chắc, nghe lại hoặc lấy thêm cue frames. Không suy đoán giọng người/nhạc/BPM chỉ từ transcript.

Upstream downloader v0.2.0 ưu tiên phụ đề `en.*`; với video tiếng Việt từ URL, kiểm tra subtitle language trước khi nhận transcript là tiếng gốc. Dùng local Whisper với `--language vi` khi cần.

## Ghi chú môi trường đã kiểm tra

Lần phân tích mẫu dùng ffmpeg-static và ffprobe thuộc Remotion có sẵn trên máy. Remotion ffprobe cần thư viện động đi kèm. Với macOS, `/usr/bin/python3` có thể làm mất `DYLD_LIBRARY_PATH` khi gọi subprocess; Python bundled đã chạy được khi truyền thư mục compositor vào biến này. Đây là chi tiết môi trường, không phải dependency bắt buộc của skill. Ưu tiên ffmpeg/ffprobe standalone trên PATH nếu có; không hardcode đường dẫn repo khác vào sản phẩm.

Khi thiếu công cụ, cài dependency có nguồn tin cậy theo khả năng môi trường. Không ghi API key vào thư mục skill hoặc artifact; không yêu cầu người dùng gửi key trong chat. Nếu chỉ có hình, vẫn phân tích bố cục nhưng ghi rõ phần audio chưa xác minh.

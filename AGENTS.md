<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `npm run graph:query -- "<question>"` when graphify-out/graph.json exists. Use `npm run graph -- path "<A>" "<B>"` for relationships and `npm run graph -- explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `npm run graph:update` to keep the code graph current (AST-only, no API cost). If `graphify-out/` is absent or the local environment has not been initialized, run `npm run graph:setup` then `npm run graph:build`.

## HeyGen Voice

- Khi sửa chia đoạn, request TTS, ghép audio/timestamp hoặc cập nhật thư viện HeyGen, đọc và tuân theo `docs/heygen-tts-rules.md`.
- Giới hạn free đang áp dụng là 5.000 ký tự/request gồm ngữ cảnh; web nhận tối đa 5.000 ký tự mỗi lần và trả một MP3 cuối.

## WindiStudio Repo Video

- **Quy trình chuẩn**: Luôn trình 3–5 thẻ idea cho người dùng duyệt trước ➔ Người dùng duyệt idea xong thì viết kịch bản ➔ Thu voice ➔ Dựng Remotion ➔ **Render thẳng video `final.mp4`**.
- **KHÔNG tạo hoặc khởi chạy Windi Timeline Editor** (không cần `EditorComposition.tsx`, `editor.config.json`, hay server editor port 4318, không dừng lại ở `EDITOR_READY` để chờ duyệt giao diện nữa).
- **Quy chuẩn phiên âm số phiên bản trong Voiceover**: Tuyệt đối **KHÔNG viết số thập phân dạng `6.1`, `5.5`, `3.7`** trong text voiceover vì TTS sẽ đọc sai tiếng Anh hoặc nuốt chữ. **BẮT BUỘC viết thành chữ tiếng Việt: `6 chấm 1`, `5 chấm 5`, `3 chấm 7`** (ví dụ: `Sol 6 chấm 1`, `Claude Opus 5 chấm 5`, `Terra 6 chấm 1`).
- **Bàn giao trực tiếp file `final.mp4`** hoàn chỉnh kèm thumbnail `cover.png`, phụ đề `captions.srt`, cập nhật `script.md`, `qa.md`, `episode.json` cho người dùng kiểm tra ngay.


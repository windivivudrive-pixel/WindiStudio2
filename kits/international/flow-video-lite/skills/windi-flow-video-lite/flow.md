# Optional existing Flow bridge

This integration uses the customer's already installed Windi Connect. The international Lite ZIP includes no extension, daemon, account data or personal installer. Manual Flow download works without a bridge.

1. Run `windi doctor --json`. Recover only through the installed tool's documented setup if necessary. Ask the customer to complete login or pairing when required.
2. From the dedicated Lite video project, run `windi project init --project PROJECT_PATH` only if that folder has no existing Windi state. Do not fork or relink an existing project's provider mapping automatically. Follow `windi project --help` or the installed CLI's usage for linking a Flow workspace.
3. Write one scene prompt to a text file under `data/prompts/`. Match `portrait` to `--aspect 9:16` and `square` to `--aspect 1:1`.
4. With generation authorized, call the installed interface, for example:

```sh
windi images create --provider flow --project PROJECT_PATH --prompt-file data/prompts/scene-01.txt --aspect 9:16 --count 1 --output public/assets/scene-01 --wait
```

5. Record the returned job ID and exact downloaded file. A queued job is not a completed asset. Recover the same job through `windi jobs status JOB_ID --json`; do not submit again on unknown results. On login, CAPTCHA, quota or provider error, stop that stage and report the actionable blocker. Switch providers only when the user requests it.
6. Copy the confirmed original image into this project's `public/assets/`, then register its actual file name in `data/video.json`. Never import the full domestic workflow, managed voice settings, personal installer tokens or saved channel identity.

Use the installed CLI's current help if a flag differs. This path has not been acceptance-tested as part of the Lite release. The offline template/renderer path is independent of Flow.

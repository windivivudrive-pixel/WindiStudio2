import process from "node:process";

const port = Number(process.env.CHATGPT_IMAGE_BRIDGE_PORT || 38472);
const baseUrl = `http://127.0.0.1:${port}`;

const usage = () => {
  console.error("Usage:\n  node client.mjs status\n  node client.mjs doctor\n  node client.mjs generate --project girl-compare|manly-darklab --prompt <text> --target <public/illustrations/epNNN/file.png> [--reference <public/references/epNNN/ref.png>] [--backend auto|web|codex|gemini|agy] [--session name] [--size 1024x1365]");
  process.exit(2);
};

const request = async (pathname, options = {}) => {
  let response;
  try {
    response = await fetch(`${baseUrl}${pathname}`, options);
  } catch (error) {
    throw new Error(`ChatGPT Image Bridge is not running at ${baseUrl}: ${error.message}`);
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Bridge request failed with HTTP ${response.status}`);
  return payload;
};

const parseGenerate = (argv) => {
  const body = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--overwrite") { body.overwrite = true; continue; }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) usage();
    if (flag === "--prompt") body.prompt = value;
    else if (flag === "--target") body.targetPath = value;
    else if (flag === "--reference") (body.referencePaths ||= []).push(value);
    else if (flag === "--backend") body.backend = value;
    else if (flag === "--project") body.project = value;
    else if (flag === "--session") body.session = value;
    else if (flag === "--size") body.size = value;
    else if (flag === "--timeout") body.timeoutSeconds = Number(value);
    else usage();
    index += 1;
  }
  if (!body.prompt || !body.targetPath) usage();
  return body;
};

const [command, ...argv] = process.argv.slice(2);
try {
  if (command === "status") console.log(JSON.stringify(await request("/health"), null, 2));
  else if (command === "doctor") console.log(JSON.stringify(await request("/doctor"), null, 2));
  else if (command === "generate") console.log(JSON.stringify(await request("/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parseGenerate(argv)) }), null, 2));
  else usage();
} catch (error) {
  console.error(`chatgpt-image: ${error.message}`);
  process.exit(1);
}

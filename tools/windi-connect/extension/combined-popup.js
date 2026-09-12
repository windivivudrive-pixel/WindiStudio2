const $ = (id) => document.getElementById(id);
const labels = { flow: "Flow", chatgpt: "ChatGPT" };
const style = document.createElement("style");
style.textContent = `.recent{gap:7px}.asset{grid-template-columns:78px 1fr auto;min-height:84px}.asset-preview{width:72px;height:72px;display:block;object-fit:cover;border:1px solid #344b4166;border-radius:6px;background:#e8f2eb}.asset b{width:72px;height:72px}.asset-actions{display:flex;align-items:center;gap:4px}.asset-actions button{width:27px;height:27px;padding:0;border:1px solid #344b4166;border-radius:6px;background:#fff9e9;color:#26342f;font:13px CallingCode;cursor:pointer}.asset-actions button:hover{background:#49a36e}.asset-meta{min-width:0}.asset-meta strong,.asset-meta small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.asset-meta strong{font-size:9px}.asset-meta small{max-width:190px;font-size:7px}`;
document.head.append(style);
const displayPath = (value) => value?.replace(/^\/Users\/[^/]+/, "~") || "";

function providerCard(provider, status = {}) {
  const connected = Boolean(status.connected), active = status.active, pairing = status.error === "PAIRING_REQUIRES_RESET";
  const card = document.createElement("section");
  card.className = `provider-card ${connected ? "online" : "offline"}`;
  card.innerHTML = '<div class="provider-head"><div><i></i><strong></strong></div><span></span></div><p></p><div class="adapter-status"></div><div class="mini-metrics"><span></span><span></span><span></span></div><div class="provider-actions"><button data-action="open">Mở tab</button><button data-action="reconnect">Kết nối lại</button></div>';
  card.querySelector("strong").textContent = labels[provider];
  card.querySelector(".provider-head>span").textContent = active ? active.status : status.queued ? `${status.queued} đang chờ` : connected ? "Sẵn sàng" : "Ngoại tuyến";
  card.querySelector("p").textContent = pairing ? "Extension mới cần được ghép lại một lần với backend trên máy." : status.error || (connected ? "Đã ghép với backend trên máy." : "Mở trình duyệt/profile đã chọn và kết nối lại.");
  const adapterNode = card.querySelector(".adapter-status");
  if (provider === "flow") { const adapter = status.flowAdapter; adapterNode.textContent = adapter?.ready ? "Flow direct sẵn sàng · dùng phiên trang và tải ảnh từ response" : adapter?.captchaAvailable ? "Flow direct đang chờ workspace hợp lệ" : "Mở hoặc tải lại tab Flow để khởi tạo phiên"; adapterNode.className += adapter?.ready ? " ready" : " waiting"; } else adapterNode.remove();
  const metrics = card.querySelectorAll(".mini-metrics span"); metrics[0].textContent = `${status.complete || 0} hoàn tất`; metrics[1].textContent = `${status.failed || 0} lỗi`; metrics[2].textContent = `${status.queued || 0} chờ`;
  const reconnect = card.querySelector('[data-action="reconnect"]'); reconnect.textContent = pairing ? "Ghép lại" : "Kết nối lại";
  card.querySelectorAll("button").forEach((button) => button.onclick = () => chrome.runtime.sendMessage({ type: button.dataset.action === "open" ? "openStatusTab" : pairing ? "resetPairing" : "reconnect", provider }));
  return card;
}

function openAssetDirectory(asset) {
  const message = { version: 2, id: crypto.randomUUID(), op: "asset.open", args: { path: asset.path } };
  chrome.runtime.sendNativeMessage("com.windistudio.connect.flow", message, (response) => {
    if (!chrome.runtime.lastError && !response?.error) return;
    const directory = asset.path.slice(0, asset.path.lastIndexOf("/"));
    chrome.tabs.create({ url: `file://${encodeURI(directory)}/`, active: true });
  });
}

function renderRecent(statuses) {
  const assets = Object.values(statuses).flatMap((status) => (status.assets || []).map((asset) => ({ ...asset, provider: status.provider }))).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8);
  $("recent").replaceChildren();
  if (!assets.length) { $("recent").innerHTML = '<div class="empty">Chưa có ảnh gốc hoàn tất. Ảnh chỉ xuất hiện sau khi được tải, kiểm tra và ghi đúng project.</div>'; return; }
  for (const asset of assets) {
    const row = document.createElement("div"); row.className = "asset";
    row.innerHTML = '<div class="asset-visual"><b></b></div><div class="asset-meta"><strong></strong><small></small></div><div class="asset-actions"><button title="Mở thư mục ảnh" aria-label="Mở thư mục ảnh">↗</button></div>';
    const visual = row.querySelector(".asset-visual");
    if (asset.preview) { const image = document.createElement("img"); image.className = "asset-preview"; image.src = asset.preview; image.alt = asset.path.split("/").pop() || "Ảnh đã lưu"; visual.replaceChildren(image); } else visual.querySelector("b").textContent = labels[asset.provider][0];
    row.querySelector("strong").textContent = asset.path.split("/").pop(); row.querySelector("small").textContent = displayPath(asset.path); row.querySelector("button").onclick = () => openAssetDirectory(asset); $("recent").append(row);
  }
}

async function refresh() {
  const { combinedStatus = {} } = await chrome.storage.local.get("combinedStatus");
  $("providers").replaceChildren(providerCard("flow", combinedStatus.flow), providerCard("chatgpt", combinedStatus.chatgpt)); renderRecent(combinedStatus);
  const values = Object.values(combinedStatus); $("summary").textContent = `${values.filter((item) => item.connected).length}/2 provider đã kết nối · ${values.reduce((sum, item) => sum + (item.queued || 0), 0)} job chờ`;
}
chrome.storage.onChanged.addListener(() => void refresh()); void refresh();

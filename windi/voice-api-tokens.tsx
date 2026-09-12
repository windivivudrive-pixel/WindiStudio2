"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";

type Token = {
  id: string;
  name: string;
  token_prefix: string;
  last_four: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};
async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { ...init, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Chưa thể hoàn tất.");
  return body;
}
export function VoiceApiTokens({ enabled }: { enabled: boolean }) {
  const [tokens, setTokens] = useState<Token[]>([]),
    [canCreate, setCanCreate] = useState(false),
    [hasWorkflowLicense, setHasWorkflowLicense] = useState(false),
    [name, setName] = useState("Ứng dụng của tôi"),
    [secret, setSecret] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setError("");
    setLoading(true);
    try {
      const result = await request("/api/v1/voice/tokens");
      setTokens(result.data || []);
      setCanCreate(result.can_create === true);
      setHasWorkflowLicense(result.access?.hasWorkflowLicense === true);
    } finally {setLoading(false);}
  }, [enabled]);
  useEffect(() => {
    if(!enabled){setSecret('');setTokens([]);setCanCreate(false);return;}
    void refresh().catch((reason) => setError(reason.message));
  }, [refresh]);
  async function create() {
    setBusy(true);
    setError("");
    setSecret("");
    try {
      const result = await request("/api/v1/voice/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setSecret(result.token);
      await refresh();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    if (!window.confirm('Thu hồi API key này? Ứng dụng dùng key sẽ ngừng truy cập.')) return;
    setBusy(true);
    setError("");
    try {
      await request("/api/v1/voice/tokens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await refresh();
      setSecret("");
      setNotice("Đã thu hồi API key.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if(!enabled)return null;
  return (
    <section className="voice-api-panel">
      <div>
        <span>
          <KeyRound size={19} />
        </span>
        <h3>API key WindiStudio</h3>
        <p>
          Dùng credit của bạn để tạo giọng từ ứng dụng riêng hoặc Windi Workflow.
          Key đầy đủ chỉ hiện một lần khi tạo. Nếu mất key, hãy tạo key mới.
        </p>
        {hasWorkflowLicense && (
          <p>
            Bạn có giấy phép Workflow và có thể tạo API key riêng cho ứng dụng của mình.
          </p>
        )}
      </div>
      {error && (
        <p className="voice-alert" role="alert">
          {error}
          <button type="button" className="voice-btn" onClick={() => void refresh().catch(e=>setError(e.message))}>Thử lại</button>
        </p>
      )}
      {loading && <p role="status">Đang tải API key…</p>}
      {!loading && !error && !tokens.length && <p>Bạn chưa tạo API key nào.</p>}
      {secret && (
        <div className="voice-token-secret">
          <strong>Sao chép token này ngay</strong>
          <code>{secret}</code>
          <button
            className="voice-btn"
            onClick={async () => {try{await navigator.clipboard.writeText(secret);setNotice('Đã sao chép API key.');}catch{setNotice('Chưa sao chép được. Hãy chọn key để sao chép.');}}}
          >
            <Copy size={15} />
            Sao chép
          </button>
        </div>
      )}
      {enabled && (
        <div className="voice-token-create">
          <label>
            Tên API key
            <input
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button
            className="voice-btn voice-primary"
            disabled={!canCreate || busy || loading || !name.trim()}
            onClick={() => void create()}
          >
            <Plus size={16} />
            Tạo API key
          </button>
        </div>
      )}
      <p role="status">{notice}</p>
      {secret && <button type="button" className="voice-btn" onClick={()=>setSecret('')}>Đã lưu, ẩn key</button>}
      {enabled && !loading && !error && !canCreate && !hasWorkflowLicense && (
        <p className="voice-hint">
          Cần một gói Windi Voice trả phí hoặc giấy phép Windi Video Workflow
          để tạo token API.
        </p>
      )}
      {tokens.length > 0 && (
        <div className="voice-token-list">
          {tokens.map((token) => (
            <div key={token.id}>
              <span>
                <strong>{token.name}</strong>
                <small>
                  {token.token_prefix}••••{token.last_four}
                  {` · ${token.revoked_at ? 'Đã thu hồi' : 'Đang hoạt động'} · Tạo ${new Date(token.created_at).toLocaleDateString('vi-VN')}`}
                  {token.last_used_at
                    ? ` · dùng gần nhất ${new Date(token.last_used_at).toLocaleDateString("vi-VN")}`
                    : ""}
                </small>
              </span>
              <button
                className="voice-icon-btn"
                disabled={busy || !!token.revoked_at}
                aria-label={`Thu hồi ${token.name}`}
                onClick={() => void revoke(token.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

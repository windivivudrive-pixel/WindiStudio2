"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

type Order = {
  id: string;
  total_amount_vnd: number;
  status: string;
  payment_code: string;
  expires_at: string;
};
type Account = {
  product: {
    is_active: boolean;
    metadata: {
      release_ready?: boolean;
      launch_price_vnd?: number;
      launch_limit?: number;
      voice_bonus_credits?: number;
    };
  } | null;
  entitlement: {
    id: string;
    status: string;
    voice_credits: number;
    voice_credits_used: number;
  } | null;
  orders: Order[];
  release: {
    version: string;
    sha256: string;
    size_bytes: number;
    changelog: string;
  } | null;
  devices: Array<{
    id: string;
    device_name: string;
    status: string;
    last_seen_at: string;
  }>;
  voiceApi: {
    plan: {
      plan_id: string;
      credits: number;
      used_credits: number;
      ends_at: string;
    } | null;
    bonus: { credits: number; used_credits: number } | null;
  };
  bank: { bank: string; account: string; name: string } | null;
};

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const stateName = (value: string) =>
  ({
    PENDING: "Chờ thanh toán",
    PAID: "Đã thanh toán",
    EXPIRED: "Đã hết hạn",
    UNDERPAID: "Thiếu tiền",
    OVERPAID: "Thừa tiền",
    REVIEW_REQUIRED: "Cần đối soát",
  })[value] ?? value;

export function VideoKitCommerce() {
  const [account, setAccount] = useState<Account | null>(null);
  const [checkout, setCheckout] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/video-kits/account", {
      cache: "no-store",
    });
    if (response.status === 401) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.error || "Chưa tải được thông tin sản phẩm.");
    setAuthenticated(true);
    setAccount(body);
    setLoading(false);
    setCheckout((current) => {
      if (!current) return current;
      return (
        body.orders?.find((item: Order) => item.id === current.id) ?? current
      );
    });
  }, []);

  useEffect(() => {
    void refresh().catch((reason) => {
      setError(reason.message);
      setLoading(false);
    });
  }, [refresh]);
  useEffect(() => {
    if (!checkout || checkout.status !== "PENDING") return;
    const timer = window.setInterval(
      () => void refresh().catch(() => undefined),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [checkout, refresh]);
  useEffect(() => {
    if (checkout && !dialog.current?.open) dialog.current?.showModal();
  }, [checkout]);

  async function buy() {
    setError("");
    const response = await fetch("/api/video-kits/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Chưa tạo được đơn hàng.");
      return;
    }
    setCheckout(body.order);
    await refresh();
  }

  async function downloadInstaller() {
    setError("");
    const response=await fetch('/api/video-kits/installer',{method:'POST'});
    if(!response.ok){const body=await response.json();setError(body.error || 'Chưa tải được bộ cài.');return;}
    const url=URL.createObjectURL(await response.blob());
    const a=document.createElement('a');a.href=url;a.download='Windi-Cai-Dat-Ca-Nhan.zip';a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),60000);
  }

  const released =
    account?.product?.is_active && account.product.metadata.release_ready;
  const activeOrder = account?.orders.find(
    (order) =>
      order.status === "PENDING" && Date.parse(order.expires_at) > Date.now(),
  );
  const launchPrice = account?.product?.metadata.launch_price_vnd ?? 299000;
  const includedVoiceCredits =
    account?.product?.metadata.voice_bonus_credits ?? 20000;

  return (
    <section className="kit-commerce" aria-labelledby="kit-buy-title">
      <div className="kit-price-panel">
        <div>
          <span className="kit-price-kicker">Giấy phép trọn đời cho V1</span>
          <h2 id="kit-buy-title">Cài một lần. Làm video trong mọi project.</h2>
          <p>
            Dùng theo tài khoản, không cần kích hoạt máy. Kèm {money(includedVoiceCredits)}
            {" "}credit Windi Voice API; quota Flow hoặc ChatGPT dùng tài khoản
            của bạn.
          </p>
        </div>
        <div className="kit-price-box">
          <span>100 tài khoản đầu</span>
          <strong>{money(launchPrice)}đ</strong>
          <small>Sau đó 499.000đ</small>
          {loading ? (
            <button disabled>Đang kiểm tra...</button>
          ) : account?.entitlement ? (
            <button className="kit-buy-button" onClick={() => void downloadInstaller()}>
              <Download size={17} /> Tải và bắt đầu
            </button>
          ) : !authenticated ? (
            <Link className="kit-buy-button" href="/login?next=/video-kits">
              Đăng nhập để mua
            </Link>
          ) : released ? (
            <button className="kit-buy-button" onClick={() => void buy()}>
              {activeOrder ? "Mở đơn đang chờ" : "Mua Windi Workflow"}
            </button>
          ) : (
            <button disabled>Đang hoàn tất kiểm chứng</button>
          )}
        </div>
      </div>
      {!released && !account?.entitlement && (
        <p className="kit-release-lock">
          <ShieldCheck size={18} /> Thanh toán chỉ được mở sau khi Flow,
          ChatGPT, bộ cài sạch và hai video demo đã qua kiểm tra thực tế.
        </p>
      )}
      {error && (
        <p className="kit-commerce-error" role="alert">
          {error}
        </p>
      )}
      {account?.entitlement && (
        <div className="kit-account-panel">
          <div className="kit-account-release">
            <CheckCircle2 size={22} />
            <div>
              <strong>Đã sở hữu Windi Video Workflow V1</strong>
              <span>
                {account.release
                  ? `Bản ${account.release.version} · SHA-256 ${account.release.sha256}`
                  : "Bản phát hành đang được chuẩn bị."}
              </span>
            </div>
          </div>
          {account.release && <p>{account.release.changelog}</p>}
          <div className="kit-quickstart">
            <h3>Bắt đầu nhanh</h3>
            <p>Tải bộ cài cá nhân, giải nén rồi mở Cai Windi.command. Voice được kết nối tự động theo tài khoản đã mua.</p>
            <code>windi setup</code>
            <code>windi project init</code>
            <code>windi workflow start</code>
            <p>
              Trong Codex hoặc Antigravity, bạn cũng có thể nói: “Dùng Windi làm
              video này”.
            </p>
          </div>
          <div className="kit-voice-api">
            <h3>
              <KeyRound size={18} /> Windi Voice API
            </h3>
            <p>
              Workflow gọi Windi; khóa Cartesia luôn ở backend. Audio và word
              timestamp được tạo trong cùng một lần gọi, không chạy Whisper lại.
            </p>
            {account.voiceApi.bonus && (
              <p className="kit-voice-plan">
                Credit tặng kèm còn {money(Math.max(0, account.voiceApi.bonus.credits - account.voiceApi.bonus.used_credits))} / {money(account.voiceApi.bonus.credits)} · không hết hạn
              </p>
            )}
            {account.voiceApi.plan ? (
              <p className="kit-voice-plan">
                Gói Voice mua thêm: {account.voiceApi.plan.plan_id} · còn {money(Math.max(0, account.voiceApi.plan.credits - account.voiceApi.plan.used_credits))} credit · hết hạn {new Date(account.voiceApi.plan.ends_at).toLocaleDateString("vi-VN")}
              </p>
            ) : (
              <p className="kit-voice-plan">
                Muốn tạo thêm sau khi dùng hết 20K? <Link href="/voice-studio">Mua thêm Windi Voice credit</Link>
              </p>
            )}
            <p>
              Bộ cài tự lưu kết nối Voice trong macOS Keychain. Bạn không cần đăng nhập CLI hoặc dán mã API.
            </p>
            <code>windi voice list</code>
            <code>windi voice generate --voice VOICE_UUID</code>
          </div>
        </div>
      )}
      <dialog
        ref={dialog}
        className="kit-checkout"
        onClose={() => setCheckout(null)}
        onCancel={() => setCheckout(null)}
      >
        {checkout && (
          <>
            <header>
              <strong>Thanh toán Windi Workflow</strong>
              <button aria-label="Đóng" onClick={() => dialog.current?.close()}>
                <X size={18} />
              </button>
            </header>
            <div className="kit-checkout-body">
              {checkout.status === "PENDING" && account?.bank ? (
                <>
                  <strong className="kit-checkout-price">
                    {money(checkout.total_amount_vnd)}đ
                  </strong>
                  <img
                    src={`https://img.vietqr.io/image/${encodeURIComponent(account.bank.bank)}-${encodeURIComponent(account.bank.account)}-compact2.png?amount=${checkout.total_amount_vnd}&addInfo=${encodeURIComponent(checkout.payment_code)}&accountName=${encodeURIComponent(account.bank.name)}`}
                    alt="Mã QR thanh toán Windi Video Workflow"
                  />
                  <p>
                    {account.bank.name}
                    <br />
                    {account.bank.bank} · {account.bank.account}
                  </p>
                  <button
                    className="kit-payment-code"
                    onClick={() =>
                      void navigator.clipboard.writeText(checkout.payment_code)
                    }
                  >
                    {checkout.payment_code}
                    <Copy size={16} />
                  </button>
                  <small>
                    Giữ nguyên số tiền và nội dung. Suất giá mở bán được giữ
                    trong 10 phút.
                  </small>
                </>
              ) : (
                <>
                  <CheckCircle2 size={38} />
                  <h3>{stateName(checkout.status)}</h3>
                  <p>
                    {checkout.status === "PAID"
                      ? "Giấy phép đã được cấp. Bạn có thể tải bộ cài đặt."
                      : "Giao dịch này cần được kiểm tra trước khi cấp giấy phép."}
                  </p>
                </>
              )}
              <button
                className="kit-refresh-order"
                onClick={() => void refresh()}
              >
                <RefreshCw size={16} /> Kiểm tra trạng thái
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}

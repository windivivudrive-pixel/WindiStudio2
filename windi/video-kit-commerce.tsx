"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Download,
  KeyRound,
  RefreshCw,
  X,
} from "lucide-react";
import { FeedbackToast } from "./feedback-toast";

type Order = {
  id: string;
  total_amount_vnd: number;
  status: string;
  payment_code: string;
  expires_at: string;
};
type Account = {
  product: {
    price_vnd?: number;
    is_active: boolean;
    metadata: {
      release_ready?: boolean;
      launch_price_vnd?: number;
      launch_limit?: number;
      voice_trial_credits?: number;
      voice_trial_clone_limit?: number;
      voice_trial_duration_days?: number;
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
  const [notice, setNotice] = useState("");
  const [authenticated, setAuthenticated] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const checkoutOrderIdRef = useRef<string | null>(null);
  const checkoutStatusRef = useRef<string | null>(null);

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
    const nextOrder = body.orders?.find((item: Order) => item.id === checkoutOrderIdRef.current);
    if (nextOrder?.status === "PAID" && checkoutStatusRef.current === "PENDING") {
      setNotice("Thanh toán đã được xác nhận. Video Workflow, 10.000 credit Voice và 1 lượt Clone Pro 2.1 đã được cấp cho tài khoản.");
    }
    if (nextOrder) checkoutStatusRef.current = nextOrder.status;
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
    checkoutOrderIdRef.current = body.order.id;
    checkoutStatusRef.current = body.order.status;
    setCheckout(body.order);
    await refresh();
  }

  async function downloadInstaller() {
    setError("");
    const response=await fetch('/api/video-kits/installer',{method:'POST'});
    if(!response.ok){const body=await response.json();setError(body.error || 'Chưa tải được bộ cài.');return;}
    const version=response.headers.get('X-Windi-Workflow-Version');
    const url=URL.createObjectURL(await response.blob());
    const filename=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] || 'Windi-Video-Workflow-universal.zip';
    const a=document.createElement('a');a.href=url;a.download=filename;a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    setNotice(`Bộ cài Windi ${version ? `v${version} ` : ''}đang được tải xuống. Giải nén và mở file cài đặt để bắt đầu.`);
  }

  const released =
    account?.product?.is_active && account.product.metadata.release_ready;
  const activeOrder = account?.orders.find(
    (order) =>
      order.status === "PENDING" && Date.parse(order.expires_at) > Date.now(),
  );
  const launchPrice = account?.product?.metadata.launch_price_vnd ?? 89000;
  const originalPrice = account?.product?.price_vnd ?? 369000;
  const includedVoiceCredits=account?.product?.metadata.voice_trial_credits??10000;
  const includedCloneLimit=account?.product?.metadata.voice_trial_clone_limit??1;
  const includedVoiceDays=account?.product?.metadata.voice_trial_duration_days??30;

  return (
    <section className="kit-commerce" aria-labelledby="kit-buy-title">
      {notice && (
        <FeedbackToast
          message={notice}
          onClose={() => setNotice("")}
          title={notice.startsWith("Thanh toán") ? "Mua Video Kit thành công" : "Đã hoàn tất"}
        />
      )}
      <div className="kit-price-panel">
        <div>
          <span className="kit-price-kicker">Giấy phép trọn đời cho V1</span>
          <h2 id="kit-buy-title">Cài một lần. Làm video trong mọi project.</h2>
          <p>Dùng theo tài khoản, không cần kích hoạt máy. Với 89K, bạn nhận:</p>
          <ul className="kit-included-list">
            <li><strong>Automation Video Workflow</strong> — từ kịch bản đến video trong một quy trình.</li>
            <li><strong>{includedCloneLimit} giọng Clone Pro 2.1 miễn phí</strong> — tạo giọng riêng đầu tiên của bạn.</li>
            <li><strong>{money(includedVoiceCredits)} credit Voice</strong> — dùng trong {includedVoiceDays} ngày cùng gói clone.</li>
            <li><strong>Extension tạo hình tự động</strong> — gửi prompt đúng cảnh sang Google Flow hoặc ChatGPT.</li>
          </ul>
        </div>
        <div className="kit-price-box">
          <span>Giá dùng thử · 100 tài khoản đầu</span>
          <strong>{money(launchPrice)}đ</strong>
          <small>Giá gốc <s>{money(originalPrice)}đ</s></small>
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
            <button disabled>Tạm thời chưa mở bán</button>
          )}
        </div>
      </div>
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
            <p>Giải nén bộ cài đầy đủ, mở Cai Windi Windows.cmd trên Windows hoặc Cai Windi.command trên macOS. Nạp Windi Connect Extension ngay trong thư mục vừa giải nén. Voice tự kết nối theo tài khoản đã mua.</p>
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
              Workflow dùng Clone Pro 2.1. Audio và word
              timestamp được tạo trong cùng một lần gọi, không chạy Whisper lại.
            </p>
            {account.voiceApi.bonus && (
              <p className="kit-voice-plan">
                Credit tặng kèm còn {money(Math.max(0, account.voiceApi.bonus.credits - account.voiceApi.bonus.used_credits))} / {money(account.voiceApi.bonus.credits)} · không hết hạn
              </p>
            )}
            {account.voiceApi.plan ? (
              <p className="kit-voice-plan">
                {account.voiceApi.plan.plan_id==='trial'?'Gói Clone đi kèm Workflow':'Gói Voice đang dùng'} · còn {money(Math.max(0, account.voiceApi.plan.credits - account.voiceApi.plan.used_credits))} credit · hết hạn {new Date(account.voiceApi.plan.ends_at).toLocaleDateString("vi-VN")}
              </p>
            ) : (
              <p className="kit-voice-plan">
                Muốn dùng thêm sau gói Clone? <Link href="/voice-studio">Mua thêm Windi Voice credit</Link>
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
                  <div className="kit-payment-promise" role="status">
                    <strong>
                      Thanh toán <span>tự động 24/7</span>
                    </strong>
                    <small>
                      Quá trình mua tự động hoàn tất sau 5 giây khi thanh toán
                      thành công.
                    </small>
                  </div>
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
                      void navigator.clipboard.writeText(checkout.payment_code).then(() => setNotice("Đã sao chép nội dung chuyển khoản."))
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

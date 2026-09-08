'use client';

import React, { useState } from 'react';
import {
  Heart,
  Coffee,
  Copy,
  Check,
  QrCode,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/windi/auth-context';
import { RetroButton } from './ui/retro';

export const WINDI_BANK_INFO = {
  BANK_ID: 'TPB',
  BANK_NAME: 'TPBank (Tiên Phong Bank)',
  ACCOUNT_NO: '55111685555',
  ACCOUNT_NAME: 'BUI QUOC HUNG',
  DEFAULT_MEMO: 'DONATE WINDI',
  TEMPLATE: 'compact2',
};

const PRESET_AMOUNTS = [
  { value: 49000, label: '49K', sub: '1 ly cà phê ☕' },
  { value: 99000, label: '99K', sub: '2 ly cà phê ☕☕' },
  { value: 199000, label: '199K', sub: 'Server & AI ⚡' },
];

interface DonationWindowProps {
  compact?: boolean;
  className?: string;
}

export function DonationWindow({ compact = false, className = '' }: DonationWindowProps) {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number>(49000);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');
  const [senderName, setSenderName] = useState<string>(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''
  );
  const [senderMessage, setSenderMessage] = useState<string>('');
  const [step, setStep] = useState<'FORM' | 'QR' | 'THANKS'>('FORM');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeAmount = isCustom ? Number(customInput.replace(/\D/g, '')) || 0 : selectedAmount;

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setCustomInput('');
      return;
    }
    const num = Number(raw);
    setCustomInput(num.toLocaleString('vi-VN'));
  };

  const handleSelectPreset = (val: number) => {
    setSelectedAmount(val);
    setIsCustom(false);
  };

  const getCleanMemo = () => {
    if (!senderName.trim()) return WINDI_BANK_INFO.DEFAULT_MEMO;
    const clean = senderName
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 12)
      .toUpperCase();
    return clean ? `DONATE WINDI ${clean}` : WINDI_BANK_INFO.DEFAULT_MEMO;
  };

  const memo = getCleanMemo();
  const qrUrl = `https://img.vietqr.io/image/${WINDI_BANK_INFO.BANK_ID}-${WINDI_BANK_INFO.ACCOUNT_NO}-${WINDI_BANK_INFO.TEMPLATE}.png?amount=${activeAmount}&addInfo=${encodeURIComponent(
    memo
  )}&accountName=${encodeURIComponent(WINDI_BANK_INFO.ACCOUNT_NAME)}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className={`retro-window tone-pink donation-window ${className}`}>
      {/* Titlebar */}
      <div className="window-titlebar tone-pink">
        <div className="titlebar-dots" aria-hidden="true">
          <span className="window-dot" />
          <span className="window-dot" />
        </div>
        <h2>KEEP WINDI ONLINE ♥</h2>
        <span className="window-symbol">✦ DONATE FOR INDEPENDENCE</span>
      </div>

      <div className="window-content donation-window-body">
        {step === 'FORM' && (
          <div className="donation-form-step">
            <div className="donation-lead">
              <p className="donation-mission">
                Help us test more tools, review more repos and keep Windi independent.
              </p>
              <p className="donation-subtext">
                Ủng hộ để Windi tiếp tục trải nghiệm thực tế từng công cụ AI, rà soát repo độc lập và
                hoàn toàn không nhận tài trợ thiên vị.
              </p>
            </div>

            {/* Presets */}
            <div className="donation-presets-group">
              <span className="donation-field-label">CHỌN MỨC ỦNG HỘ // PRESET</span>
              <div className="donation-presets-row">
                {PRESET_AMOUNTS.map((preset) => {
                  const isSelected = !isCustom && selectedAmount === preset.value;
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      className={`donation-preset-btn ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleSelectPreset(preset.value)}
                    >
                      <strong className="preset-amount-label">[ {preset.label} ]</strong>
                      <span className="preset-sub-label">{preset.sub}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`donation-preset-btn custom-toggle-btn ${isCustom ? 'is-selected' : ''}`}
                  onClick={() => setIsCustom(true)}
                >
                  <strong className="preset-amount-label">[ Tùy chọn ]</strong>
                  <span className="preset-sub-label">Số tiền khác</span>
                </button>
              </div>

              {isCustom && (
                <div className="donation-custom-box">
                  <label htmlFor="custom-donate-input">Nhập số tiền muốn ủng hộ (VNĐ):</label>
                  <div className="custom-input-wrap">
                    <input
                      id="custom-donate-input"
                      type="text"
                      className="retro-input custom-amount-field"
                      placeholder="Ví dụ: 50.000"
                      value={customInput}
                      onChange={handleCustomChange}
                      autoFocus
                    />
                    <span className="currency-unit">₫</span>
                  </div>
                </div>
              )}
            </div>

            {/* Sender Info (BuyMeACoffee style) */}
            {!compact && (
              <div className="donation-personalize-fields">
                <div className="input-group">
                  <label htmlFor="donor-nickname">Tên / Nickname (tùy chọn):</label>
                  <input
                    id="donor-nickname"
                    type="text"
                    className="retro-input"
                    placeholder="Ẩn danh / Bạn bè Windi..."
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    maxLength={30}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="donor-message">Lời nhắn gửi (tùy chọn):</label>
                  <input
                    id="donor-message"
                    type="text"
                    className="retro-input"
                    placeholder="Gửi một lời nhắn động viên tới tác giả..."
                    value={senderMessage}
                    onChange={(e) => setSenderMessage(e.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>
            )}

            {/* Action CTA */}
            <div className="donation-action-wrap">
              <RetroButton
                type="button"
                className="donation-cta-btn"
                disabled={activeAmount < 10000}
                onClick={() => setStep('QR')}
              >
                <Heart size={18} className="heart-pulse-icon" />
                <span>SUPPORT {activeAmount > 0 ? `${activeAmount.toLocaleString('vi-VN')}₫` : ''}</span>
              </RetroButton>
              {activeAmount < 10000 && isCustom && (
                <p className="min-amount-note">Số tiền tối thiểu là 10.000đ.</p>
              )}
            </div>
          </div>
        )}

        {step === 'QR' && (
          <div className="donation-qr-step">
            <div className="qr-header-notice">
              <span className="eyebrow">QUÉT MÃ VIETQR QUA APP NGÂN HÀNG HOẶC MOMO</span>
              <h3>Cảm ơn bạn đã tiếp sức cho Windi!</h3>
              <p>Mở ứng dụng ngân hàng hoặc ví điện tử bất kỳ và quét mã bên dưới:</p>
            </div>

            <div className="qr-visual-card">
              {/* QR Image */}
              <div className="qr-image-container">
                <img
                  src={qrUrl}
                  alt={`Mã QR Donate Windi ${activeAmount.toLocaleString('vi-VN')}đ`}
                  className="vietqr-image"
                />
              </div>

              {/* Transfer Details with 1-Click Copy */}
              <div className="transfer-details-table">
                <div className="transfer-row">
                  <span className="transfer-label">Số tiền:</span>
                  <div className="transfer-val-copy">
                    <strong className="amount-highlight">
                      {activeAmount.toLocaleString('vi-VN')}₫
                    </strong>
                    <button
                      type="button"
                      className="copy-chip-btn"
                      onClick={() => copyToClipboard(String(activeAmount), 'amount')}
                    >
                      {copiedKey === 'amount' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'amount' ? 'Đã chép' : 'Chép'}</span>
                    </button>
                  </div>
                </div>

                <div className="transfer-row">
                  <span className="transfer-label">Ngân hàng:</span>
                  <span className="transfer-val">
                    <strong>TPBank</strong> (Tiên Phong Bank)
                  </span>
                </div>

                <div className="transfer-row">
                  <span className="transfer-label">Số tài khoản:</span>
                  <div className="transfer-val-copy">
                    <strong className="account-num">{WINDI_BANK_INFO.ACCOUNT_NO}</strong>
                    <button
                      type="button"
                      className="copy-chip-btn"
                      onClick={() => copyToClipboard(WINDI_BANK_INFO.ACCOUNT_NO, 'stk')}
                    >
                      {copiedKey === 'stk' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'stk' ? 'Đã chép' : 'Chép'}</span>
                    </button>
                  </div>
                </div>

                <div className="transfer-row">
                  <span className="transfer-label">Chủ tài khoản:</span>
                  <span className="transfer-val font-mono">{WINDI_BANK_INFO.ACCOUNT_NAME}</span>
                </div>

                <div className="transfer-row highlight-memo-row">
                  <span className="transfer-label">Nội dung CK:</span>
                  <div className="transfer-val-copy">
                    <strong className="memo-tag">{memo}</strong>
                    <button
                      type="button"
                      className="copy-chip-btn"
                      onClick={() => copyToClipboard(memo, 'memo')}
                    >
                      {copiedKey === 'memo' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'memo' ? 'Đã chép' : 'Chép'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="qr-footer-actions">
              <button
                type="button"
                className="retro-button secondary"
                onClick={() => setStep('FORM')}
              >
                <RotateCcw size={14} /> Chọn lại mức khác
              </button>
              <button
                type="button"
                className="retro-button primary confirm-donated-btn"
                onClick={() => setStep('THANKS')}
              >
                <CheckCircle2 size={16} /> Đã chuyển khoản xong ♥
              </button>
            </div>
          </div>
        )}

        {step === 'THANKS' && (
          <div className="donation-thanks-step">
            <div className="thanks-icon-box">
              <Heart size={44} className="thanks-heart-anim" />
            </div>
            <h2>Cảm ơn bạn rất nhiều!</h2>
            <p className="thanks-message">
              Sự đồng hành và ủng hộ từ bạn là nguồn năng lượng quý giá nhất giúp Windi giữ trọn cam
              kết: <strong>biên tập độc lập, kiểm nghiệm trung thực và không ngừng săn tìm công cụ hữu ích.</strong>
            </p>
            {senderMessage && (
              <div className="thanks-quote">
                <span>&ldquo;{senderMessage}&rdquo;</span>
                <small>— {senderName || 'Người bạn ẩn danh'}</small>
              </div>
            )}
            <div className="thanks-actions">
              <button
                type="button"
                className="retro-button secondary"
                onClick={() => {
                  setStep('FORM');
                  setIsCustom(false);
                }}
              >
                Ủng hộ thêm lần nữa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

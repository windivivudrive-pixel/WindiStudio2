'use client';

import React, { useState, useEffect } from 'react';
import { Heart, Copy, Check, X, RotateCcw, CheckCircle2 } from 'lucide-react';
import { PixelDuck } from './pixel-duck';
import { WINDI_BANK_INFO } from './donation-window';
import { RetroButton } from './ui/retro';
import { useLanguage } from './language-mode';
import { BuyMeACoffeeButton } from './buy-me-a-coffee';

interface DuckHuntModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DUCK_PRESETS = [
  { value: 49000, label: '49K', subVi: 'cặp', subEn: 'quack' },
  { value: 99000, label: '99K', subVi: 'cặp cặp', subEn: 'quack quack' },
  { value: 199000, label: '199K', subVi: 'cặp cặp cặp', subEn: 'quack quack quack' },
];

export function DuckHuntModal({ isOpen, onClose }: DuckHuntModalProps) {
  const { language, t } = useLanguage();
  const isEn = language === 'en';

  const [selectedAmount, setSelectedAmount] = useState<number>(49000);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');
  const [step, setStep] = useState<'FORM' | 'QR' | 'THANKS'>('FORM');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  const memo = 'DONATE WINDI';
  const qrUrl = `https://img.vietqr.io/image/${WINDI_BANK_INFO.BANK_ID}-${WINDI_BANK_INFO.ACCOUNT_NO}-${WINDI_BANK_INFO.TEMPLATE}.png?amount=${activeAmount}&addInfo=${encodeURIComponent(
    memo
  )}&accountName=${encodeURIComponent(WINDI_BANK_INFO.ACCOUNT_NAME)}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="dialog-backdrop duck-hunt-backdrop" onClick={onClose}>
      <div
        className="retro-window tone-yellow duck-hunt-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="duck-hunt-modal-title"
      >
        <div className="window-titlebar tone-yellow">
          <div className="titlebar-dots" aria-hidden="true">
            <span className="window-dot" />
            <span className="window-dot" />
          </div>
          <h2 id="duck-hunt-modal-title">DUCK HUNT // QUACK QUACK QUAC..K 🎯🦆</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label={isEn ? 'Close' : 'Đóng'}
          >
            <X size={16} />
          </button>
        </div>

        <div className="window-content duck-hunt-content">
          {step === 'FORM' && (
            <div>
              {/* Duck Banner - Just Quack */}
              <div className="duck-avatar-banner">
                <div className="pixel-duck-box" aria-hidden="true">
                  <PixelDuck />
                </div>
                <div className="duck-dialogue-bubble">
                  <h3 style={{ fontSize: 18, margin: 0, letterSpacing: '0.02em', lineHeight: 1.4 }}>
                    quack quack quac..k quackkk q.u.a.c.kk
                  </h3>
                </div>
              </div>

              {/* Presets */}
              <div className="donation-presets-group" style={{ marginTop: 18 }}>
                <span className="donation-field-label">
                  {isEn ? 'QUACK // QUACK QUACK' : 'QUACK // CẶP CẶP'}
                </span>
                <div className="donation-presets-row">
                  {DUCK_PRESETS.map((preset) => {
                    const isSelected = !isCustom && selectedAmount === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        className={`donation-preset-btn ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setSelectedAmount(preset.value);
                          setIsCustom(false);
                        }}
                      >
                        <strong className="preset-amount-label">{`[ ${preset.label} ]`}</strong>
                        <span className="preset-sub-label">{isEn ? preset.subEn : preset.subVi}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={`donation-preset-btn custom-toggle-btn ${isCustom ? 'is-selected' : ''}`}
                    onClick={() => setIsCustom(true)}
                  >
                    <strong className="preset-amount-label">{isEn ? '[ Custom ]' : '[ Tùy tâm ]'}</strong>
                    <span className="preset-sub-label">{isEn ? 'custom' : 'tùy tâm'}</span>
                  </button>
                </div>

                {isCustom && (
                  <div className="donation-custom-box">
                    <label htmlFor="custom-duck-input">
                      {isEn ? 'Custom amount (VND):' : 'Số tiền tùy tâm (VNĐ):'}
                    </label>
                    <div className="custom-input-wrap">
                      <input
                        id="custom-duck-input"
                        type="text"
                        className="retro-input custom-amount-field"
                        placeholder={isEn ? '50,000' : '50.000'}
                        value={customInput}
                        onChange={handleCustomChange}
                        autoFocus
                      />
                      <span className="currency-unit">₫</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="duck-hunt-actions">
                <RetroButton
                  type="button"
                  className="donation-cta-btn duck-donate-btn"
                  disabled={activeAmount < 10000}
                  onClick={() => setStep('QR')}
                >
                  <Heart size={18} className="heart-pulse-icon" />
                  <span>
                    {`♥ ${isEn ? 'DONATE VIA VIETQR' : 'ỦNG HỘ VIETQR'}${
                      activeAmount > 0 ? ` ${activeAmount.toLocaleString('vi-VN')}₫` : ''
                    }`}
                  </span>
                </RetroButton>

                <div className="duck-bmc-divider">
                  <span>{isEn ? 'OR SUPPORT VIA' : 'HOẶC ỦNG HỘ QUA'}</span>
                </div>

                <div className="duck-bmc-wrap">
                  <BuyMeACoffeeButton className="duck-bmc-btn" />
                </div>

                <button
                  type="button"
                  className="retro-button secondary dismiss-duck-btn"
                  onClick={onClose}
                >
                  {isEn ? 'Maybe later' : 'Bỏ qua'}
                </button>
              </div>
            </div>
          )}

          {step === 'QR' && (
            <div className="donation-qr-step">
              <div className="qr-header-notice">
                <span className="eyebrow">VIETQR // QUACK</span>
                <h3>quack quack quac..k quackkk q.u.a.c.kk</h3>
              </div>

              <div className="qr-visual-card">
                <div className="qr-image-container">
                  <img
                    src={qrUrl}
                    alt={`VietQR ${activeAmount.toLocaleString('vi-VN')}đ`}
                    className="vietqr-image"
                  />
                </div>

                <div className="transfer-details-table">
                  <div className="transfer-row">
                    <span className="transfer-label">{t('Số tiền:')}</span>
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
                        <span>{copiedKey === 'amount' ? t('Đã chép') : t('Chép')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="transfer-row">
                    <span className="transfer-label">{t('Ngân hàng:')}</span>
                    <span className="transfer-val">
                      <strong>TPBank</strong> (Tiên Phong Bank)
                    </span>
                  </div>

                  <div className="transfer-row">
                    <span className="transfer-label">{t('Số tài khoản:')}</span>
                    <div className="transfer-val-copy">
                      <strong className="account-num">{WINDI_BANK_INFO.ACCOUNT_NO}</strong>
                      <button
                        type="button"
                        className="copy-chip-btn"
                        onClick={() => copyToClipboard(WINDI_BANK_INFO.ACCOUNT_NO, 'stk')}
                      >
                        {copiedKey === 'stk' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedKey === 'stk' ? t('Đã chép') : t('Chép')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="transfer-row">
                    <span className="transfer-label">{t('Chủ tài khoản:')}</span>
                    <span className="transfer-val font-mono">{WINDI_BANK_INFO.ACCOUNT_NAME}</span>
                  </div>

                  <div className="transfer-row highlight-memo-row">
                    <span className="transfer-label">{t('Nội dung CK:')}</span>
                    <div className="transfer-val-copy">
                      <strong className="memo-tag">{memo}</strong>
                      <button
                        type="button"
                        className="copy-chip-btn"
                        onClick={() => copyToClipboard(memo, 'memo')}
                      >
                        {copiedKey === 'memo' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedKey === 'memo' ? t('Đã chép') : t('Chép')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="qr-bmc-hint">
                <span>
                  {isEn
                    ? "Can't scan VietQR? Support internationally via:"
                    : 'Không quét được VietQR? Ủng hộ quốc tế qua:'}
                </span>
                <BuyMeACoffeeButton className="duck-bmc-btn qr-bmc-button" />
              </div>

              <div className="qr-footer-actions">
                <button
                  type="button"
                  className="retro-button secondary"
                  onClick={() => setStep('FORM')}
                >
                  <RotateCcw size={14} /> {isEn ? 'Back' : 'Quay lại'}
                </button>
                <button
                  type="button"
                  className="retro-button primary confirm-donated-btn"
                  onClick={() => setStep('THANKS')}
                >
                  <CheckCircle2 size={16} /> {isEn ? 'Donated ♥' : 'Đã ủng hộ ♥'}
                </button>
              </div>
            </div>
          )}

          {step === 'THANKS' && (
            <div className="donation-thanks-step">
              <div className="thanks-icon-box">
                <PixelDuck />
              </div>
              <h2>{isEn ? 'Thank you so much! 🦆✨' : 'Cảm ơn bạn rất nhiều! 🦆✨'}</h2>
              <p className="thanks-message">
                {isEn
                  ? 'Your support helps Windi maintain independent AI tool curation and keep the servers running!'
                  : 'Sự ủng hộ của bạn giúp Windi duy trì việc tuyển chọn công cụ AI độc lập và giữ server hoạt động!'}
              </p>
              <div className="thanks-actions">
                <button type="button" className="retro-button primary" onClick={onClose}>
                  {isEn ? 'Close' : 'Đóng'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

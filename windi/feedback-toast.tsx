"use client";

import type { ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

type FeedbackToastProps = {
  message: string;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
};

/** A short, screen-level confirmation for actions that users must not miss. */
export function FeedbackToast({
  message,
  onClose,
  title = "Đã hoàn tất",
  children,
}: FeedbackToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 7000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="feedback-toast" role="status" aria-live="polite">
      <CheckCircle2 className="feedback-toast-icon" size={21} aria-hidden="true" />
      <div className="feedback-toast-copy">
        <strong>{title}</strong>
        <p>{message}</p>
        {children}
      </div>
      <button type="button" className="feedback-toast-close" onClick={onClose} aria-label="Đóng thông báo">
        <X size={17} aria-hidden="true" />
      </button>
    </div>
  );
}

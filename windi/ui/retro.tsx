import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

type Accent = 'green' | 'pink' | 'yellow' | 'blue' | 'orange' | 'neutral';

export function RetroWindow({ title, accent = 'blue', children, className = '', action }: {
  title: string; accent?: Accent; children: ReactNode; className?: string; action?: ReactNode;
}) {
  return <section className={`retro-window ${className}`}>
    <div className={`window-titlebar tone-${accent}`}>
      <span className="window-dot" aria-hidden="true" />
      <span className="window-dot" aria-hidden="true" />
      <h2>{title}</h2>
      <span className="window-symbol" aria-hidden="true">✦</span>
      {action && <div className="window-action">{action}</div>}
    </div>
    <div className="window-content">{children}</div>
  </section>;
}

export function RetroPanel({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`retro-panel ${className}`} {...props}>{children}</div>;
}

export function RetroButton({ variant = 'primary', className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'plain' }) {
  return <button className={`retro-button ${variant} ${className}`} {...props}>{children}</button>;
}

export function RetroInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="retro-input" {...props} />;
}

export function RetroBadge({ accent = 'neutral', children }: { accent?: Accent; children: ReactNode }) {
  return <span className={`retro-badge tone-${accent}`}>{children}</span>;
}

export function RetroProgress({ value, label, displayValue }: { value: number; label: string; displayValue?: ReactNode }) {
  return (
    <div className="score-row">
      <span>{label}</span>
      <div className="retro-progress">
        <span style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
      <strong>{displayValue ?? value}</strong>
    </div>
  );
}

import { RetroWindow } from '@/windi/ui/retro';

export default function Loading() {
  return (
    <div className="page narrow-page" aria-live="polite" aria-busy="true">
      <RetroWindow title="ĐANG TẢI" accent="blue">
        <div className="loading-state">
          <span className="loading-pixel" aria-hidden="true" />
          <p>Đang mở Windi Studio…</p>
        </div>
      </RetroWindow>
    </div>
  );
}

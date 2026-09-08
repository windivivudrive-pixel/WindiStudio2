'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const selected = mounted ? theme : undefined;
  const next = selected === 'light' ? 'dark' : selected === 'dark' ? 'system' : 'light';
  const Icon = selected === 'light' ? Sun : selected === 'dark' ? Moon : Monitor;
  const label = selected === 'light' ? 'Light' : selected === 'dark' ? 'Dark' : 'System';
  return <button className="theme-toggle" disabled={!mounted} onClick={() => setTheme(next)} aria-label={`Đổi giao diện, hiện tại ${label}`} title={`Theme: ${label}`}><Icon size={16} /><span>{label}</span></button>;
}

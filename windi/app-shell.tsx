'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import { ChevronDown, Heart, LogIn, LogOut, Menu, Plus, Sparkles, User as UserIcon, Wrench, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { CommandPalette } from './command-palette';
import { ThemeToggle } from './theme-toggle';
import { LanguageToggle } from './language-toggle';
import { PixelLandscape } from './pixel-landscape';
import { useToolbox } from './toolbox-context';
import { useAuth } from './auth-context';
import { BuyMeACoffeeButton } from './buy-me-a-coffee';

const nav: {href:string;label:string;items?:{href:string;label:string}[]}[] = [
  { href: '/video-kits', label: 'Video Kits' },
  { href: '/voice-studio', label: 'Voice Studio' },
  { href: '/discover', label: 'Công cụ' },
  { href: '/news', label: 'Tin tức' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname=usePathname();
  const [open, setOpen] = useState(false);
  const [studioMenuOpen, setStudioMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const studioMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { count } = useToolbox();
  const { user, signOut } = useAuth();

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (studioMenuRef.current && !studioMenuRef.current.contains(event.target as Node)) {
        setStudioMenuOpen(false);
      }
    }
    if (studioMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [studioMenuOpen]);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="site-header">
        <Link href="/" className="wordmark header-logo-link" aria-label="Windi Studio - Video Kits và Voice Studio">
          <img
            src="/logo-text.png"
            alt="Windi Studio"
            className="site-header-logo"
          />
        </Link>

        <nav aria-label="Điều hướng chính">
          {nav.map((item) => {
            if (item.items) {
              return (
                <div className="studio-nav-menu" key={item.label} ref={studioMenuRef}>
                  <button
                    type="button"
                    className="nav-featured studio-nav-trigger"
                    aria-expanded={studioMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => setStudioMenuOpen((isOpen) => !isOpen)}
                  >
                    Studio <ChevronDown size={14} aria-hidden="true" />
                  </button>
                  {studioMenuOpen && (
                    <div className="studio-nav-popover" role="menu">
                      {item.items.map((studioItem) => (
                        <Link href={studioItem.href} key={studioItem.href} role="menuitem" onClick={() => setStudioMenuOpen(false)}>
                          {studioItem.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return <Link href={item.href} key={item.href} aria-current={pathname===item.href?'page':undefined}>{item.label}</Link>;
          })}
        </nav>

        <div className="header-actions">
          {/* Quick Access to My Toolbox (Authenticated only) */}
          {user && (
            <Link href="/toolbox" className="toolbox-header-link" aria-label="Mở Toolbox cá nhân">
              <Wrench size={14} />
              <span>My Toolbox</span>
              <span className="toolbox-count-badge">{count}</span>
            </Link>
          )}

          <CommandPalette />
          {user && (
            <Link href="/submit" className="submit-link">
              <Plus size={16} /> Submit
            </Link>
          )}
          {user ? (
            <div className="user-menu-wrapper" ref={userMenuRef}>
              <button
                type="button"
                className="avatar-link user-avatar-btn"
                aria-label="Tài khoản cá nhân"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="user-avatar-img" />
                ) : (
                  <span>{initial}</span>
                )}
              </button>

              {userMenuOpen && (
                <div className="retro-window tone-yellow user-dropdown-window">
                  <div className="window-titlebar tone-yellow">
                    <span className="window-dot" />
                    <h2>USER PROFILE</h2>
                  </div>
                  <div className="window-content user-dropdown-content">
                    <div className="dropdown-user-info">
                      <strong>{displayName}</strong>
                      <small>{user.email}</small>
                    </div>
                    <div className="dropdown-divider" />
                    <Link href="/account" className="dropdown-menu-item" onClick={() => setUserMenuOpen(false)}><UserIcon size={14}/> Hồ sơ của tôi</Link>
                    <Link
                      href="/toolbox"
                      className="dropdown-menu-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Wrench size={14} /> My Toolbox ({count})
                    </Link>
                    <Link
                      href="/submit"
                      className="dropdown-menu-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Plus size={14} /> Submit Tool
                    </Link>
                    <div className="dropdown-divider" />
                    <button
                      type="button"
                      className="dropdown-menu-item logout-btn"
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                    >
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="login-nav-btn" aria-label="Đăng nhập">
              <LogIn size={14} /> Đăng nhập
            </Link>
          )}
          <LanguageToggle />
          <ThemeToggle />
          <button
            className="menu-toggle"
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {open && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Điều hướng di động">
          {user && (
            <Link onClick={() => setOpen(false)} href="/toolbox" className="mobile-toolbox-link">
              <Wrench size={16} /> My Toolbox ({count} tools)
            </Link>
          )}
          {nav.map((item) => {
            if (item.items) {
              return (
                <div className="mobile-studio-nav" key={item.label}>
                  <span>Studio</span>
                  {item.items.map((studioItem) => (
                    <Link key={studioItem.href} href={studioItem.href} onClick={() => setOpen(false)}>
                      {studioItem.label}
                    </Link>
                  ))}
                </div>
              );
            }
            return <Link onClick={() => setOpen(false)} href={item.href} key={item.href} aria-current={pathname===item.href?'page':undefined}>{item.label}</Link>;
          })}
          {user && (
            <Link onClick={() => setOpen(false)} href="/submit">
              Submit resource
            </Link>
          )}
          {user ? (
            <div className="mobile-user-box">
              <Link href="/account" onClick={() => setOpen(false)}><UserIcon size={14}/> Hồ sơ của tôi</Link>
              <span className="mobile-user-email">👤 {user.email}</span>
              <button
                type="button"
                className="mobile-logout-btn"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
              >
                <LogOut size={14} /> Đăng xuất
              </button>
            </div>
          ) : (
            <Link onClick={() => setOpen(false)} href="/login">
              <LogIn size={15} /> Đăng nhập
            </Link>
          )}
        </nav>
      )}

      <main>{children}</main>

      <footer className="site-footer">
        <PixelLandscape />
        <div>
          <p>
            <strong>WINDI STUDIO</strong> · Video Kits · Voice Studio · Công cụ sáng tạo.
          </p>
        </div>
        <nav aria-label="Liên kết cuối trang">
          {user && <Link href="/toolbox">My Toolbox</Link>}
          <Link href="/stacks">Stacks</Link>
          <Link href="/video-kits">Video Kits</Link>
          <Link href="/news">News</Link>
          <Link href="/support" className="footer-support">
            <Heart size={15} aria-hidden="true" />
            Ủng hộ Windi
          </Link>
          <BuyMeACoffeeButton />
        </nav>
      </footer>
    </>
  );
}

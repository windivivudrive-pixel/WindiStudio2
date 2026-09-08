'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  ArrowRight,
  Check,
  Plus,
  Layers,
  X,
  Terminal,
  Palette,
  AppWindow,
  PenLine,
  Clapperboard,
} from 'lucide-react';
import { resources as defaultResources, type WindiResource } from '@/lib/windi-data';
import { useToolbox } from '@/windi/toolbox-context';
import { AppWindowModal } from './ui/app-window-modal';

interface IntentPreset {
  id: string;
  label: string;
  query: string;
  summary: string;
  setup: Array<{
    slug: string;
    role: string;
    note: string;
  }>;
}

const presetIcons = [Palette, AppWindow, PenLine, Clapperboard];

const presets: IntentPreset[] = [
  {
    id: 'design-web',
    label: 'Thiết kế website',
    query: 'Tôi muốn Codex thiết kế website đẹp hơn',
    summary: 'Bộ công cụ giúp chọn phong cách, thiết kế giao diện và kiểm tra hiển thị.',
    setup: [
      { slug: 'ui-ux-pro-max', role: 'Kỹ năng chính', note: 'Định hình phong cách, màu sắc và checklist UX' },
      { slug: 'frontend-design-skill', role: 'Tinh chỉnh giao diện', note: 'Tinh chỉnh micro-interactions và spacing nhịp nhàng' },
      { slug: 'playwright-mcp', role: 'Kiểm thử thực tế', note: 'Cho agent mở browser thật để chụp màn hình và test UI' },
      { slug: 'browser-qa-workflow', role: 'Kiểm tra tự động', note: 'Tự động dò lỗi responsive và visual regression' },
    ],
  },
  {
    id: 'fullstack-dev',
    label: 'Xây dựng ứng dụng',
    query: 'Lập trình Fullstack web có database và authentication',
    summary: 'Công cụ hỗ trợ xây dựng ứng dụng, quản lý dữ liệu và kiểm tra các tính năng.',
    setup: [
      { slug: 'context7-mcp', role: 'Tra cứu tài liệu', note: 'Tra cứu API Next.js 16 và React 19 không bị lỗi cũ' },
      { slug: 'supabase-mcp', role: 'Quản lý dữ liệu', note: 'Tự sinh schema, RLS policies và migration an toàn' },
      { slug: 'playwright-mcp', role: 'Kiểm tra tính năng', note: 'Chạy automated test các luồng đăng nhập, thanh toán' },
      { slug: 'ui-ux-pro-max', role: 'Thiết kế dễ sử dụng', note: 'Tạo form và dashboard chuẩn responsive, accessible' },
    ],
  },
  {
    id: 'seo-content',
    label: 'Nghiên cứu & viết bài',
    query: 'Nghiên cứu tài liệu sâu và viết bài chuẩn SEO',
    summary: 'Tìm tài liệu, phát triển ý tưởng và tối ưu bài viết cho tìm kiếm.',
    setup: [
      { slug: 'deep-research-skill', role: 'Nghiên cứu sâu', note: 'Đào sâu tài liệu PDF, GitHub và whitepapers khoa học' },
      { slug: 'seo-audit-skill', role: 'Tối ưu kỹ thuật SEO', note: 'Chuẩn hóa cấu trúc heading, meta tags và schema JSON-LD' },
      { slug: 'playwright-mcp', role: 'Thu thập thực tế', note: 'Quét dữ liệu bảng xếp hạng tìm kiếm Google thực tế' },
    ],
  },
  {
    id: 'video-code',
    label: 'Làm video',
    query: 'Tạo video tự động bằng code React',
    summary: 'Bộ công cụ làm video với Remotion, từ bố cục đến chuyển cảnh và kiểm tra khung hình.',
    setup: [
      { slug: 'remotion-best-practices', role: 'Kỹ năng chính', note: 'Cấu trúc component video React chuẩn nhịp timeline' },
      { slug: 'frontend-design-skill', role: 'Thiết kế đồ họa', note: 'Tạo typography và hiệu ứng chuyển cảnh mượt' },
      { slug: 'browser-qa-workflow', role: 'Kiểm tra khung hình', note: 'Đảm bảo render video không bị giật lag hay sai lệch' },
    ],
  },
];

export function IntentSearch({ onOpenResource }: { onOpenResource?: (res: WindiResource) => void }) {
  const [query, setQuery] = useState('');
  const [activePreset, setActivePreset] = useState<IntentPreset>(presets[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedToolForModal, setSelectedToolForModal] = useState<WindiResource | null>(null);
  const [addedAll, setAddedAll] = useState(false);
  const { addAllToToolbox } = useToolbox();

  // Match query to presets or custom intent
  const currentIntent = useMemo(() => {
    if (!query.trim()) return activePreset;
    const selected = presets.find(preset => preset.query === query);
    if (selected) return selected;
    const lower = query.toLowerCase();
    if (/video|remotion|clip|phim/.test(lower)) return presets[3];
    if (lower.includes('thiết kế') || lower.includes('design') || lower.includes('landing') || /\bui\b/.test(lower) || lower.includes('giao diện')) {
      return presets[0];
    }
    if (lower.includes('fullstack') || lower.includes('database') || lower.includes('backend') || lower.includes('supabase') || lower.includes('code')) {
      return presets[1];
    }
    if (lower.includes('seo') || lower.includes('viết') || lower.includes('content') || lower.includes('research') || lower.includes('bài')) {
      return presets[2];
    }
    if (lower.includes('video') || lower.includes('remotion') || lower.includes('clip') || lower.includes('phim')) {
      return presets[3];
    }
    return activePreset;
  }, [query, activePreset]);

  // Resolve tools from defaultResources
  const setupTools = useMemo(() => {
    if (!currentIntent) return [];
    return currentIntent.setup.map((item) => {
      const tool = defaultResources.find((r) => r.slug === item.slug);
      return {
        ...item,
        tool: tool || {
          slug: item.slug,
          name: item.slug,
          type: 'SKILL' as const,
          tagline: item.note,
          description: item.note,
          canonicalUrl: '#',
          source: 'Windi',
          tags: [],
          agents: ['Codex'],
          score: null,
          metricLabel: '★ 10K+',
          updatedLabel: 'Đã duyệt',
          badges: [],
          status: 'PUBLISHED' as const,
        },
      };
    });
  }, [currentIntent]);

  // Handle ESC key and prevent body scroll when modal is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedToolForModal) {
          setSelectedToolForModal(null);
        } else if (isModalOpen) {
          setIsModalOpen(false);
        }
      }
    };
    if (isModalOpen || selectedToolForModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, selectedToolForModal]);

  const handleAddAll = () => {
    const tools = setupTools.map((s) => s.tool);
    addAllToToolbox(tools);
    setAddedAll(true);
    setTimeout(() => setAddedAll(false), 2500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handlePresetClick = (preset: IntentPreset) => {
    setActivePreset(preset);
    setQuery(preset.query);
    setIsModalOpen(true);
  };

  const handleOpenTool = (tool: WindiResource) => {
    if (onOpenResource) {
      onOpenResource(tool);
    } else {
      setSelectedToolForModal(tool);
    }
  };

  return (
    <div className="intent-search-module">
      {/* Search Input Window in Hero */}
      <div className="retro-window intent-window tone-blue">
        <div className="window-titlebar tone-blue">
          <span className="window-dot" aria-hidden="true" />
          <span className="window-dot" aria-hidden="true" />
          <h2>TRỢ LÝ CHỌN CÔNG CỤ</h2>
          <Sparkles className="window-symbol" size={15} aria-hidden="true" />
        </div>

        <div className="window-content intent-content">
          <label htmlFor="intent-input" className="intent-question">
            Bạn muốn AI giúp việc gì?
          </label>
          <form onSubmit={handleSearchSubmit}>
            <div className="intent-input-box">
              <Search size={20} className="search-icon" />
              <input
                id="intent-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ví dụ: thiết kế website, viết bài…"
                className="retro-input"
              />
              {query && (
                <button
                  type="button"
                  className="clear-btn"
                  onClick={() => setQuery('')}
                  aria-label="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
              <button type="submit" className="intent-submit-btn">
                <Sparkles size={14} /> Xem gợi ý
              </button>
            </div>
          </form>

          {/* Preset Chips */}
          <div className="intent-chips-row">
            <span className="chips-label">Hoặc chọn nhanh một việc</span>
            <div className="chips-list">
              {presets.map((preset, index) => { const Icon = presetIcons[index]; return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`intent-chip ${currentIntent?.id === preset.id && isModalOpen ? 'is-selected' : ''}`}
                >
                  <Icon size={18} aria-hidden="true" /><span>{preset.label}</span><ArrowRight size={14} aria-hidden="true" />
                </button>
              ); })}
            </div>
          </div>
        </div>
      </div>

      {/* Intent Resolve POPUP Window Modal */}
      {isModalOpen && currentIntent && (
        <div
          className="app-modal-backdrop"
          onClick={() => setIsModalOpen(false)}
          role="presentation"
        >
          <div
            className="app-modal-window intent-modal-window"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Bộ công cụ gợi ý"
          >
            {/* Modal Titlebar */}
            <div className="app-modal-titlebar tone-green" style={{ background: 'var(--green)' }}>
              <div className="titlebar-controls" aria-hidden="true">
                <span className="dot dot-red" onClick={() => setIsModalOpen(false)} />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <div className="titlebar-title">
                <Sparkles size={14} className="title-icon" />
                <span>BỘ CÔNG CỤ GỢI Ý</span>
              </div>
              <div className="titlebar-actions">
                <button
                  className="titlebar-btn"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Đóng popup"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="intent-modal-body">
              <div className="setup-header">
                <div>
                  <span className="eyebrow-mini">DÀNH CHO VIỆC BẠN MUỐN LÀM</span>
                  <h3 className="setup-title">{currentIntent.query}</h3>
                  <p className="setup-summary">{currentIntent.summary}</p>
                </div>
                <div className="setup-actions">
                  <button
                    type="button"
                    className={`retro-button ${addedAll ? 'secondary' : 'primary'}`}
                    onClick={handleAddAll}
                  >
                    {addedAll ? <Check size={16} /> : <Plus size={16} />}
                    {addedAll ? 'Đã lưu tất cả' : 'Lưu tất cả'}
                  </button>
                  <Link
                    href="/stacks"
                    className="retro-button secondary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <Layers size={16} /> Tạo bộ công cụ
                  </Link>
                </div>
              </div>

              {/* List of recommended tools */}
              <div className="setup-grid">
                {setupTools.map((item, index) => (
                  <div key={item.slug} className="setup-item-card">
                    <div className="setup-item-head">
                      <span className="setup-index">0{index + 1}</span>
                      <span className="setup-badge-role">{item.role}</span>
                    </div>
                    <div className="setup-item-body">
                      <strong className="setup-item-name">{item.tool.name}</strong>
                      <p className="setup-item-note">{item.note}</p>
                    </div>
                    <div className="setup-item-foot">
                      <span className="setup-type-pill">{item.tool.type}</span>
                      <button
                        type="button"
                        className="setup-open-link"
                        onClick={() => handleOpenTool(item.tool)}
                      >
                        Xem chi tiết <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="app-modal-footer">
              <button
                type="button"
                className="retro-button secondary"
                onClick={() => setIsModalOpen(false)}
              >
                ✕ Đóng cửa sổ (Esc)
              </button>
              <span className="small-copy" style={{ marginLeft: 'auto' }}>
                Mẹo: Bấm <strong>Lưu tất cả</strong> để lưu toàn bộ vào bộ sưu tập cá nhân.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tool Detail Modal (if opened from within intent popup) */}
      {selectedToolForModal && (
        <AppWindowModal
          resource={selectedToolForModal}
          onClose={() => setSelectedToolForModal(null)}
        />
      )}
    </div>
  );
}

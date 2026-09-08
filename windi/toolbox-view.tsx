'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Layers,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { useToolbox } from '@/windi/toolbox-context';
import type { WindiResource } from '@/lib/windi-data';
import { AppWindowModal } from '@/windi/ui/app-window-modal';

export function ToolboxView() {
  const {
    items,
    count,
    countsByType,
    groupedByCategory,
    removeFromToolbox,
    clearToolbox,
    isLoaded,
    isSyncing,
    syncError,
    isAuthenticated,
    userEmail,
  } = useToolbox();

  const [selectedResource, setSelectedResource] = useState<WindiResource | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [exportNotice, setExportNotice] = useState(false);

  const handleCopyAllCommands = () => {
    const commands = items
      .map((item) => {
        const cmd = item.installCommand || (
          item.type === 'SKILL' ? `npx skills add ${item.slug}` :
          item.type === 'MCP' ? `npx -y @modelcontextprotocol/server-${item.slug}` :
          `# ${item.name}: ${item.canonicalUrl}`
        );
        return `# ${item.name} (${item.type})\n${cmd}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(commands);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `windi-toolbox-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 2500);
  };

  const categories = ['DESIGN', 'CODING', 'RESEARCH', 'CONTENT', 'AUTOMATION'] as const;

  return (
    <div className="toolbox-page-container">
      {/* Header Window */}
      <div className="retro-window tone-yellow toolbox-header-window">
        <div className="window-titlebar tone-yellow">
          <span className="window-dot" />
          <span className="window-dot" />
          <h2>MY TOOLBOX // PERSONAL AI ARSENAL</h2>
          <span className="window-symbol">✦ THE CURATED TOOLBOX FOR AI POWER USERS</span>
        </div>

        <div className="window-content toolbox-header-content">
          <div className="toolbox-headline">
            <div className="toolbox-badge">
              <Wrench size={18} /> MY TOOLBOX
            </div>
            <h1>Bộ công cụ AI cá nhân của bạn.</h1>
            <p>
              Mỗi Skill, MCP, Workflow hay Dự án Open Source bạn lưu lại được đóng gói tại đây như một hộp đồ nghề sẵn sàng triệu hồi vào bất kỳ coding session nào.
            </p>
          </div>

          {/* User Sync Status Bar */}
          <div className={`toolbox-sync-banner ${isAuthenticated ? 'is-auth' : 'is-guest'}`}>
            {isAuthenticated ? (
              <div className="sync-banner-content">
                <span className="sync-status-indicator online" />
                <span className="sync-text">
                  Toolbox của <strong>{userEmail}</strong> · <span className="sync-tag">Đã kết nối tài khoản & đồng bộ Cloud</span>
                </span>
                {isSyncing && (
                  <span className="syncing-pill">
                    <RefreshCw size={12} className="spin-icon animate-spin" /> Đang lưu...
                  </span>
                )}
                {syncError && <span className="sync-error-pill">{syncError}</span>}
              </div>
            ) : (
              <div className="sync-banner-content">
                <span className="sync-status-indicator offline" />
                <span className="sync-text">
                  Bạn đang lưu Toolbox trên <strong>trình duyệt tạm</strong>. Hãy đăng nhập để lưu vĩnh viễn và đồng bộ đa thiết bị.
                </span>
                <Link href="/login?next=/toolbox" className="retro-button secondary btn-xs">
                  <Sparkles size={13} /> ĐĂNG NHẬP ĐỂ ĐỒNG BỘ
                </Link>
              </div>
            )}
          </div>

          {/* Quantified Count Bar */}
          <div className="toolbox-quantified-bar">
            <div className="count-chip total-chip">
              <strong>{count}</strong> TOOLS TỔNG CỘNG
            </div>
            <div className="count-chip">
              <strong>{countsByType.skills}</strong> Skills
            </div>
            <div className="count-chip">
              <strong>{countsByType.mcp}</strong> MCPs
            </div>
            <div className="count-chip">
              <strong>{countsByType.openSource}</strong> Open Source
            </div>
            <div className="count-chip">
              <strong>{countsByType.workflows}</strong> Workflows
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="toolbox-action-bar">
            <button
              type="button"
              className="retro-button primary"
              onClick={handleCopyAllCommands}
              disabled={count === 0}
            >
              {copiedAll ? <Check size={16} /> : <Copy size={16} />}
              {copiedAll ? 'ĐÃ COPY TẤT CẢ LỆNH!' : 'COPY TẤT CẢ LỆNH CÀI ĐẶT'}
            </button>

            <button
              type="button"
              className="retro-button secondary"
              onClick={handleExportJson}
              disabled={count === 0}
            >
              <Download size={16} />
              {exportNotice ? 'ĐÃ TẢI FILE JSON!' : 'XUẤT TOOLBOX JSON'}
            </button>

            <Link href="/stacks" className="retro-button secondary">
              <Layers size={16} /> TẠO STACK MỚI
            </Link>

            {count > 0 && (
              <button
                type="button"
                className="retro-button plain text-danger"
                onClick={() => {
                  if (confirm('Bạn có chắc muốn dọn sạch Toolbox cá nhân?')) clearToolbox();
                }}
              >
                <Trash2 size={15} /> Xóa tất cả
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Toolbox Inventory by Category */}
      {count === 0 ? (
        <div className="retro-window tone-blue empty-toolbox-window">
          <div className="window-titlebar tone-blue">
            <span className="window-dot" />
            <h2>TOOLBOX ĐANG TRỐNG</h2>
          </div>
          <div className="window-content empty-toolbox-content">
            <h3>Chưa có công cụ nào trong Toolbox của bạn.</h3>
            <p>
              Hãy lướt qua mục Discover hoặc Stacks, bấm nút <strong>[ + TOOLBOX ]</strong> trên các thẻ công cụ bạn muốn giữ để xây dựng hộp đồ nghề cho riêng mình.
            </p>
            <Link href="/discover" className="retro-button primary">
              Khám phá công cụ ngay <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="toolbox-categories-container">
          {categories.map((catKey) => {
            const list = groupedByCategory[catKey] || [];
            if (list.length === 0) return null;

            return (
              <section key={catKey} className="toolbox-category-section">
                <div className="category-section-title">
                  <span className="cat-bullet">▶</span>
                  <h3>{catKey}</h3>
                  <span className="cat-count">({list.length} tools)</span>
                </div>

                <div className="toolbox-items-list">
                  {list.map((tool) => (
                    <div key={tool.slug} className="toolbox-row-card">
                      <div className="row-type-badge">
                        {tool.type === 'SKILL' ? 'SKILL' :
                         tool.type === 'MCP' ? 'MCP' :
                         tool.type === 'WORKFLOW' ? 'WORKFLOW' : 'OPEN SOURCE'}
                      </div>

                      <div className="row-main-info">
                        <strong className="row-name">
                          <button
                            type="button"
                            className="name-click-btn"
                            onClick={() => setSelectedResource(tool)}
                          >
                            {tool.name}
                          </button>
                        </strong>
                        <p className="row-tagline">{tool.tagline}</p>
                      </div>

                      <div className="row-meta">
                        <span className="row-metric">{tool.metricLabel}</span>
                        {tool.agents?.slice(0, 2).map((agent) => (
                          <span key={agent} className="row-agent-pill">
                            ✓ {agent}
                          </span>
                        ))}
                      </div>

                      <div className="row-actions">
                        <button
                          type="button"
                          className="retro-button secondary btn-sm"
                          onClick={() => setSelectedResource(tool)}
                        >
                          [ OPEN ]
                        </button>
                        <button
                          type="button"
                          className="remove-btn"
                          title="Xóa khỏi Toolbox"
                          onClick={() => removeFromToolbox(tool.slug)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Interactive App Window Modal */}
      {selectedResource && (
        <AppWindowModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </div>
  );
}

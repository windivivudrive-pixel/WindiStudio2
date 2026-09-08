'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Copy,
  Layers,
  Plus,
  Share2,
  Sparkles,
  BookmarkCheck,
  Terminal,
} from 'lucide-react';
import type { WindiResource } from '@/lib/windi-data';
import { resources as defaultResources } from '@/lib/windi-data';
import { useToolbox } from '@/windi/toolbox-context';
import { RetroBadge, RetroWindow } from './ui/retro';

export function StackDetailView({ stack }: { stack: WindiResource }) {
  const { addAllToToolbox, isInToolbox, toggleToolbox } = useToolbox();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState(false);
  const [addedAll, setAddedAll] = useState(false);

  // Resolve tools from stackTools
  const tools = (stack.stackTools || []).map((st) => {
    const matched = defaultResources.find((r) => r.slug === st.slug || r.name === st.name);
    return {
      ...st,
      resolved: matched || null,
    };
  });

  const handleAddStackToToolbox = () => {
    const validTools = tools.map((t) => t.resolved).filter(Boolean) as WindiResource[];
    if (validTools.length > 0) {
      addAllToToolbox(validTools);
    }
    setAddedAll(true);
    setTimeout(() => setAddedAll(false), 2500);
  };

  const handleShareStack = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCommands = () => {
    const lines = tools
      .map((t) => {
        const cmd = t.resolved?.installCommand || (
          t.type === 'SKILL' ? `npx skills add ${t.slug || t.name}` :
          t.type === 'MCP' ? `npx -y @modelcontextprotocol/server-${t.slug || t.name}` :
          `# ${t.name}`
        );
        return `# [${t.type}] ${t.name} (${t.role})\n${cmd}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(lines);
    setCopiedCommands(true);
    setTimeout(() => setCopiedCommands(false), 2500);
  };

  return (
    <div className="page stack-detail-page">
      <nav className="breadcrumbs" aria-label="Đường dẫn">
        <Link href="/discover">Discover</Link>
        <span>/</span>
        <Link href="/stacks">Stacks</Link>
        <span>/</span>
        <span>{stack.name}</span>
      </nav>

      {/* Main Stack Window */}
      <div className="retro-window tone-orange stack-master-window">
        <div className="window-titlebar tone-orange">
          <div className="titlebar-dots">
            <span className="window-dot" />
            <span className="window-dot" />
          </div>
          <h2>WINDI CURATED STACK // {stack.name.toUpperCase()} · STACK.EXE</h2>
          <span className="window-symbol">⚡ {tools.length} TOOLS INCLUDED</span>
        </div>

        <div className="window-content stack-master-content">
          <div className="stack-master-header">
            <div>
              <div className="badge-row">
                <RetroBadge accent="orange">STACK.EXE</RetroBadge>
                {stack.badges?.includes('EDITOR') && (
                  <RetroBadge accent="yellow">
                    <Sparkles size={12} /> Editor&apos;s Pick
                  </RetroBadge>
                )}
              </div>
              <h1 className="stack-main-title">{stack.name}</h1>
              <p className="stack-main-tagline">{stack.tagline}</p>
            </div>

            <div className="stack-header-actions">
              <button
                type="button"
                className={`retro-button ${addedAll ? 'secondary' : 'primary'}`}
                onClick={handleAddStackToToolbox}
              >
                {addedAll ? <Check size={16} /> : <Plus size={16} />}
                {addedAll ? 'ĐÃ THÊM VÀO MY TOOLBOX' : '+ THÊM CẢ STACK VÀO TOOLBOX'}
              </button>

              <button type="button" className="retro-button secondary" onClick={handleShareStack}>
                <Share2 size={15} />
                {copiedLink ? 'ĐÃ COPY LINK!' : 'CHIA SẺ STACK'}
              </button>
            </div>
          </div>

          {/* Rationale: Why use these tools together */}
          <div className="stack-rationale-box">
            <div className="rationale-head">
              <Sparkles size={16} /> TẠI SAO NÊN DÙNG CÁC CÔNG CỤ NÀY CÙNG NHAU?
            </div>
            <p>
              {stack.whyWindiRecommends ||
                stack.description ||
                'Một công cụ riêng lẻ khó có thể tự kiểm tra hoặc hoàn tất toàn bộ quy trình. Bộ Stack này được ghép lại để các công cụ bổ trợ cho nhau một cách nhịp nhàng.'}
            </p>
          </div>

          {/* Stack Tools Inventory */}
          <div className="stack-inventory-section">
            <div className="inventory-title-row">
              <h3>Danh sách công cụ trong Stack ({tools.length} tools)</h3>
              <button
                type="button"
                className="retro-button secondary btn-sm"
                onClick={handleCopyCommands}
              >
                <Terminal size={14} />
                {copiedCommands ? 'ĐÃ COPY TẤT CẢ!' : 'COPY TẤT CẢ LỆNH CÀI ĐẶT'}
              </button>
            </div>

            <div className="stack-tools-cards-list">
              {tools.map((item, idx) => {
                const inToolbox = item.resolved ? isInToolbox(item.resolved.slug) : false;
                return (
                  <div key={item.name} className="stack-tool-row-card">
                    <span className="row-order-num">0{idx + 1}</span>

                    <div className="row-tool-badge">
                      {item.type === 'SKILL' ? 'SKILL' :
                       item.type === 'MCP' ? 'MCP' :
                       item.type === 'WORKFLOW' ? 'WORKFLOW' : 'OPEN SOURCE'}
                    </div>

                    <div className="row-tool-details">
                      <div className="row-tool-title-row">
                        {item.resolved ? (
                          <Link href={`/tool/${item.resolved.slug}`} className="row-tool-name-link">
                            {item.name}
                          </Link>
                        ) : (
                          <strong className="row-tool-name">{item.name}</strong>
                        )}
                        <span className="row-role-tag">{item.role}</span>
                      </div>
                      <p className="row-tool-desc">
                        {item.resolved?.tagline || item.role}
                      </p>
                    </div>

                    <div className="row-tool-btn-group">
                      {item.resolved && (
                        <button
                          type="button"
                          className={`retro-button btn-sm ${inToolbox ? 'secondary' : 'primary'}`}
                          onClick={() => toggleToolbox(item.resolved!)}
                        >
                          {inToolbox ? <BookmarkCheck size={14} /> : <Plus size={14} />}
                          {inToolbox ? 'In Toolbox' : '+ Toolbox'}
                        </button>
                      )}
                      {item.resolved && (
                        <Link href={`/tool/${item.resolved.slug}`} className="retro-button secondary btn-sm">
                          Chi tiết <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Layers,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { WindiResource } from '@/lib/windi-data';
import { calculateWindiScore, scoreLabels } from '@/lib/score';
import { RetroBadge, RetroProgress, RetroWindow } from './ui/retro';
import { useToolbox } from '@/windi/toolbox-context';
import type { CommunityEvidence } from '@/lib/community-evidence';
import type { EasyPrompt } from './easy-prompt';
import { CommunityEvidenceSection } from './community-evidence';
import { CreatorGuide } from './creator-guide';
import { CreatorEvidence } from './creator-evidence';
import { EasyPromptCard } from './easy-prompt';
import { ToolIntroduction } from './tool-introduction';
import { simpleToolPrompt } from '@/lib/tool-editorial';

export function ResourceDetailView({
  resource,
  community = [],
  communityAvailable = true,
  easyPrompt = null,
}: {
  resource: WindiResource;
  community?: CommunityEvidence[];
  communityAvailable?: boolean;
  easyPrompt?: EasyPrompt | null;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'install' | 'workflow' | 'reviews'>('overview');
  const [copied, setCopied] = useState(false);
  const { isInToolbox, toggleToolbox } = useToolbox();

  let totalScore: number | null = null;
  if (resource.score) {
    try {
      totalScore = calculateWindiScore(resource.score);
    } catch {
      totalScore = null;
    }
  }
  const inToolbox = isInToolbox(resource.slug);

  const installCmd = resource.installCommand || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const defaultAgents = ['Codex', 'Claude', 'Cursor'];
  const agents = resource.agents && resource.agents.length > 0 ? resource.agents : defaultAgents;

  const fileExt = resource.type === 'SKILL' ? 'SKILL' :
    resource.type === 'MCP' ? 'MCP' :
    resource.type === 'WORKFLOW' ? 'WORKFLOW' :
    resource.type === 'STACK' ? 'STACK' : 'OPEN SOURCE';

  const isHot = resource.badges?.includes('HOT') || Boolean(
    (resource.creatorBrief?.github?.stars && resource.creatorBrief.github.stars >= 20000) ||
    (resource.metricLabel && (() => {
      const m = resource.metricLabel.match(/★\s*([\d.,]+)\s*([Kk]?)/);
      if (!m) return false;
      const num = parseFloat(m[1].replace(/\./g, '').replace(/,/g, '.'));
      const actual = m[2].toUpperCase() === 'K' ? num * 1000 : num;
      return actual >= 20000;
    })())
  );

  return (
    <div className="page detail-page">
      {/* Breadcrumb path */}
      <nav className="breadcrumbs" aria-label="Đường dẫn">
        <Link href="/discover">Discover</Link>
        <span>/</span>
        <Link href={resource.type === 'SKILL' ? '/skills' : resource.type === 'MCP' ? '/mcp' : '/open-source'}>
          {resource.type}
        </Link>
        <span>/</span>
        <span>{resource.name}</span>
      </nav>

      {/* Main Application Window */}
      <div className="retro-window app-master-window tone-blue">
        {/* Titlebar */}
        <div className="window-titlebar app-master-titlebar tone-blue">
          <div className="titlebar-dots" aria-hidden="true">
            <span className="window-dot" />
            <span className="window-dot" />
          </div>
          <h2>
            WINDI APPLICATION // {resource.name.toUpperCase()} · {fileExt}
          </h2>
          <span className="window-symbol">● READY</span>
        </div>

        {/* Tab Navigation */}
        <div className="app-modal-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'install' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('install')}
          >
            Install
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'workflow' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            Workflow & Stack
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'reviews' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews & Evidence
          </button>
        </div>

        {/* Tab Content Panes */}
        <div className="window-content app-master-content">
          {activeTab === 'overview' && (
            <div className="master-overview-pane">
              <div className="detail-hero-section">
                <div>
                  <div className="badge-row">
                    <RetroBadge accent={resource.type === 'MCP' ? 'pink' : 'green'}>
                      {resource.type}
                    </RetroBadge>
                    {isHot && (
                      <RetroBadge accent="orange">
                        <Flame size={12} className="badge-flame-icon" /> HOT
                      </RetroBadge>
                    )}
                    {resource.badges?.includes('EDITOR') && (
                      <RetroBadge accent="yellow">
                        <Sparkles size={12} /> Editor&apos;s Pick
                      </RetroBadge>
                    )}
                    {resource.badges?.includes('OFFICIAL') && (
                      <RetroBadge accent="blue">Official</RetroBadge>
                    )}
                    {resource.badges?.includes('RISING') && (
                      <RetroBadge accent="pink">
                        <TrendingUp size={12} /> Rising
                      </RetroBadge>
                    )}
                  </div>
                  <h1>{resource.name}</h1>
                  <p className="detail-lead">{resource.tagline}</p>

                  <div className="detail-action-buttons">
                    <button
                      type="button"
                      className={`retro-button ${inToolbox ? 'secondary' : 'primary'}`}
                      onClick={() => toggleToolbox(resource)}
                    >
                      {inToolbox ? <BookmarkCheck size={16} /> : <Plus size={16} />}
                      {inToolbox ? '✓ IN YOUR TOOLBOX' : '+ ADD TO TOOLBOX'}
                    </button>
                    <a
                      className="retro-button secondary"
                      href={resource.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Mở trang nguồn <ExternalLink size={15} />
                    </a>
                  </div>
                </div>

                <div className="score-summary-window">
                  <span className="score-label">WINDI SCORE</span>
                  <div className="score-number">
                    <strong>{totalScore !== null ? totalScore : '--'}</strong>
                    <small>/100</small>
                  </div>
                  <span className="score-caption">
                    {totalScore !== null ? 'Được kiểm định độc lập' : 'Chưa chấm điểm'}
                  </span>
                </div>
              </div>

              {/* Agent compatibility pills */}
              <div className="agent-support-bar">
                <span className="bar-label">Hoạt động tốt với:</span>
                <div className="agent-pills">
                  {agents.map((agent) => (
                    <span key={agent} className="agent-pill">
                      <Check size={13} /> {agent}
                    </span>
                  ))}
                </div>
              </div>

              {/* WHY WINDI RECOMMENDS IT */}
              <div className="recommend-box">
                <div className="recommend-title">
                  <Sparkles size={16} /> WHY WINDI RECOMMENDS IT
                </div>
                <p>
                  {resource.whyWindiRecommends ||
                    resource.creatorBrief?.selectionReason ||
                    'Công cụ hỗ trợ coding agent tối ưu hóa quy trình làm việc, loại bỏ các lỗi thiết kế phổ biến và nâng cao chất lượng code tự sinh.'}
                </p>
              </div>

              {/* Quick 1-click copy install box */}
              {installCmd&&<div className="quick-install-box">
                <span className="install-label">CÀI ĐẶT NHANH (TERMINAL)</span>
                <div className="terminal-line">
                  <code>{installCmd}</code>
                  <button type="button" className="copy-btn" onClick={handleCopy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'ĐÃ COPY' : 'COPY'}
                  </button>
                </div>
              </div>}
              {/* Description and Creator Guide */}
              <div className="detail-layout" style={{ marginTop: '28px' }}>
                <article>
                  <RetroWindow title="CÔNG CỤ NÀY GIÚP GÌ?" accent="blue">
                    <ToolIntroduction resource={resource} />
                  </RetroWindow>

                  {resource.creatorBrief && (
                    <CreatorGuide brief={resource.creatorBrief} sourceUrl={resource.canonicalUrl} />
                  )}

                  <EasyPromptCard prompt={easyPrompt || {promptVi:simpleToolPrompt(resource),promptEn:simpleToolPrompt(resource,true),sourceUrl:resource.canonicalUrl}} />
                </article>

                <aside>
                  {resource.creatorBrief && <CreatorEvidence brief={resource.creatorBrief} />}

                  {resource.score && (
                    <RetroWindow title="SCORE BREAKDOWN" accent="yellow">
                      <div id="score-breakdown">
                        {scoreLabels.map(([key, label, max]) => {
                          const pts = resource.score?.[key] ?? 0;
                          return (
                            <RetroProgress
                              key={key}
                              label={label}
                              value={Math.round((pts / max) * 100)}
                              displayValue={`${pts}/${max}`}
                            />
                          );
                        })}
                      </div>
                    </RetroWindow>
                  )}
                </aside>
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            !installCmd ? <EasyPromptCard prompt={easyPrompt || {promptVi:simpleToolPrompt(resource),promptEn:simpleToolPrompt(resource,true),sourceUrl:resource.canonicalUrl}} /> :
            <div className="master-install-pane">
              <h3>Hướng dẫn cài đặt chi tiết</h3>
              <p>Chạy lệnh dưới đây để nạp năng lực của {resource.name} vào Coding Agent của bạn.</p>

              <div className="terminal-container">
                <div className="terminal-header">
                  <Terminal size={14} />
                  <span>TERMINAL COMMAND</span>
                </div>
                <div className="terminal-body">
                  <code>{installCmd}</code>
                  <button type="button" className="copy-btn" onClick={handleCopy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'ĐÃ COPY' : 'COPY LỆNH'}
                  </button>
                </div>
              </div>

              <div className="agent-setup-steps">
                <h4>Thiết lập theo công cụ bạn sử dụng:</h4>
                <ul>
                  <li>
                    <strong>Codex CLI / Claude Code:</strong> Chạy câu lệnh trên trong thư mục dự án của bạn để nạp skill.
                  </li>
                  <li>
                    <strong>Cursor:</strong> Tải MCP server tương ứng qua Settings hoặc đưa rules vào file <code>.cursorrules</code>.
                  </li>
                  <li>
                    <strong>Windsurf / Antigravity:</strong> Đăng ký skill trong cấu hình workspace agent.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="master-workflow-pane">
              <div className="workflow-badge">
                <Layers size={16} /> CÁCH PHỐI HỢP TRONG WORKFLOW
              </div>
              <h3>Tạo sức mạnh cộng hưởng</h3>
              <p>
                Không chỉ là một tool độc lập, hãy kết hợp {resource.name} cùng các MCP và workflow khác để giải quyết trọn vẹn bài toán.
              </p>

              <div className="workflow-steps-box">
                <div className="workflow-step">
                  <span className="step-num">1</span>
                  <div>
                    <strong>Khởi tạo & Chỉ thị</strong>
                    <p>Cung cấp cho AI bộ quy chuẩn từ {resource.name} trước khi sinh mã.</p>
                  </div>
                </div>
                <div className="workflow-step">
                  <span className="step-num">2</span>
                  <div>
                    <strong>Thực thi & Tự kiểm chứng</strong>
                    <p>Agent thực hiện công việc và sử dụng browser automation để kiểm tra kết quả hiển thị thực tế.</p>
                  </div>
                </div>
                <div className="workflow-step">
                  <span className="step-num">3</span>
                  <div>
                    <strong>Lưu vào Stack</strong>
                    <p>Thêm {resource.name} vào <strong>My Toolbox</strong> để ghép thành Stack tái sử dụng.</p>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className={`retro-button ${inToolbox ? 'secondary' : 'primary'}`}
                  onClick={() => toggleToolbox(resource)}
                >
                  {inToolbox ? <BookmarkCheck size={16} /> : <Plus size={16} />}
                  {inToolbox ? 'ĐÃ CÓ TRONG TOOLBOX' : '+ THÊM VÀO MY TOOLBOX'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="master-reviews-pane">
              <div className="metrics-grid">
                <div className="metric-card">
                  <Star size={20} className="metric-icon star-icon" />
                  <strong>{resource.metricLabel || 'Chưa có số liệu'}</strong>
                  <span>GitHub Popularity</span>
                </div>
                <div className="metric-card">
                  <ShieldCheck size={20} className="metric-icon shield-icon" />
                  <strong>ĐÃ DUYỆT</strong>
                  <span>Kiểm định An toàn</span>
                </div>
                <div className="metric-card">
                  <Zap size={20} className="metric-icon zap-icon" />
                  <strong>{totalScore !== null ? `${totalScore}/100` : '--/100'}</strong>
                  <span>Windi Utility Score</span>
                </div>
              </div>

              <CommunityEvidenceSection
                evidence={community}
                unavailable={!communityAvailable}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check,
  Copy,
  ExternalLink,
  Flame,
  Maximize2,
  Sparkles,
  Star,
  Terminal,
  X,
  Zap,
  BookmarkCheck,
  Plus,
  ShieldCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { WindiResource } from '@/lib/windi-data';
import { calculateWindiScore } from '@/lib/score';
import { useToolbox } from '@/windi/toolbox-context';
import { ToolIntroduction } from '../tool-introduction';
import { EasyPromptCard } from '../easy-prompt';
import { simpleToolPrompt } from '@/lib/tool-editorial';

interface AppWindowModalProps {
  resource: WindiResource | null;
  onClose: () => void;
}

export function AppWindowModal({ resource, onClose }: AppWindowModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'install' | 'workflow' | 'reviews'>('overview');
  const [copied, setCopied] = useState(false);
  const { isInToolbox, toggleToolbox } = useToolbox();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (resource) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [resource, onClose]);

  if (!resource) return null;

  let score: number | null = null;
  if (resource.score) {
    try {
      score = calculateWindiScore(resource.score);
    } catch {
      score = null;
    }
  }
  const inToolbox = isInToolbox(resource.slug);
  const installCmd = resource.installCommand || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
    <div className="app-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="app-modal-window"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={resource.name}
      >
        {/* Titlebar */}
        <div className="app-modal-titlebar">
          <div className="titlebar-controls" aria-hidden="true">
            <span className="dot dot-red" onClick={onClose} />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </div>
          <div className="titlebar-title">
            <Terminal size={14} className="title-icon" />
            <span>{resource.name.toUpperCase()} · {fileExt}</span>
          </div>
          <div className="titlebar-actions">
            <Link
              href={resource.type === 'STACK' ? `/stack/${resource.slug}` : `/tool/${resource.slug}`}
              className="titlebar-btn"
              title="Mở trang đầy đủ"
            >
              <Maximize2 size={13} />
            </Link>
            <button className="titlebar-btn" onClick={onClose} aria-label="Đóng cửa sổ">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="app-modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'install' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('install')}
          >
            Install
          </button>
          <button
            className={`tab-btn ${activeTab === 'workflow' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            Workflow & Stack
          </button>
          <button
            className={`tab-btn ${activeTab === 'reviews' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews & Metrics
          </button>
        </div>

        {/* Modal Body */}
        <div className="app-modal-content">
          {activeTab === 'overview' && (
            <div className="tab-pane">
              <div className="overview-header">
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                    <div className="app-badge-pill">{resource.type}</div>
                    {isHot && (
                      <div className="app-badge-pill" style={{ background: 'var(--orange)', color: '#1d2924', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Flame size={11} className="badge-flame-icon" /> HOT
                      </div>
                    )}
                  </div>
                  <h2 className="app-title">{resource.name}</h2>
                  <p className="app-tagline">{resource.tagline}</p>
                </div>
                <div className="app-score-box">
                  <span className="score-label">WINDI SCORE</span>
                  <div className="score-number">
                    <strong>{score !== null ? score : '--'}</strong>
                    <small>/100</small>
                  </div>
                </div>
              </div>

              {/* Supported Agents */}
              <div className="agent-support-bar">
                <span className="bar-label">Tương thích Agent:</span>
                <div className="agent-pills">
                  {(resource.agents && resource.agents.length > 0 ? resource.agents : ['Codex', 'Claude', 'Cursor']).map((agent) => (
                    <span key={agent} className="agent-pill">
                      <Check size={12} /> {agent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Why Windi Recommends It */}
              <div className="recommend-box">
                <div className="recommend-title">
                  <Sparkles size={16} /> WHY WINDI RECOMMENDS IT
                </div>
                <p>
                  {resource.whyWindiRecommends ||
                    resource.creatorBrief?.selectionReason ||
                    'Công cụ đã được đội ngũ Windi kiểm định kỹ lưỡng về độ bảo mật, tính cập nhật và giá trị thực tế cho quy trình AI coding.'}
                </p>
              </div>

              {/* Description */}
              <div className="app-desc-section">
                <h3>Về công cụ này</h3>
                <ToolIntroduction resource={resource} />
                <EasyPromptCard prompt={{promptVi:simpleToolPrompt(resource),promptEn:simpleToolPrompt(resource,true),sourceUrl:resource.canonicalUrl}} />
              </div>

              {/* Quick install box */}
              {installCmd&&<div className="quick-install-box">
                <span className="install-label">CÀI ĐẶT NHANH (CLI / AGENT)</span>
                <div className="terminal-line">
                  <code>{installCmd}</code>
                  <button className="copy-btn" onClick={handleCopy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'ĐÃ COPY' : 'COPY'}
                  </button>
                </div>
              </div>}
            </div>
          )}

          {activeTab === 'install' && (
            !installCmd ? <EasyPromptCard prompt={{promptVi:simpleToolPrompt(resource),promptEn:simpleToolPrompt(resource,true),sourceUrl:resource.canonicalUrl}} /> :
            <div className="tab-pane">
              <div className="install-guide">
                <h3>Lệnh cài đặt cho Coding Agents</h3>
                <p>Sao chép câu lệnh dưới đây và dán vào terminal của dự án hoặc cửa sổ chat của AI Assistant.</p>

                <div className="terminal-container">
                  <div className="terminal-header">
                    <Terminal size={14} />
                    <span>TERMINAL</span>
                  </div>
                  <div className="terminal-body">
                    <code>{installCmd}</code>
                    <button className="copy-btn" onClick={handleCopy}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'ĐÃ COPY' : 'COPY COMMAND'}
                    </button>
                  </div>
                </div>

                <div className="agent-setup-steps">
                  <h4>Hướng dẫn theo Agent:</h4>
                  <ul>
                    <li>
                      <strong>Codex / Claude Code:</strong> Gõ lệnh trên trực tiếp trong terminal hoặc nhập trong chat <code>/skills add {resource.slug}</code>.
                    </li>
                    <li>
                      <strong>Cursor:</strong> Cấu hình file <code>.cursorrules</code> hoặc cài MCP server qua Cursor Settings ➔ MCP.
                    </li>
                    <li>
                      <strong>Windsurf / Antigravity:</strong> Thêm vào danh sách skills hoặc plugin manager tương ứng.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="tab-pane">
              <div className="workflow-pane">
                <div className="workflow-badge">
                  <Layers size={16} /> WORKFLOW COMPATIBILITY
                </div>
                <h3>Cách phối hợp trong một Stack</h3>
                <p>
                  Một công cụ AI riêng lẻ chỉ giải quyết một phần việc. Sức mạnh thực sự nằm ở việc kết hợp {resource.name} cùng các tool khác:
                </p>

                <div className="workflow-steps-box">
                  <div className="workflow-step">
                    <span className="step-num">1</span>
                    <div>
                      <strong>Định hình & Chỉ thị</strong>
                      <p>Kích hoạt {resource.name} trong session của Agent để thiết lập bối cảnh chuẩn.</p>
                    </div>
                  </div>
                  <div className="workflow-step">
                    <span className="step-num">2</span>
                    <div>
                      <strong>Kiểm thử & Xác thực</strong>
                      <p>Kết hợp cùng Playwright MCP hoặc QA Workflow để kiểm tra sản phẩm thực tế.</p>
                    </div>
                  </div>
                  <div className="workflow-step">
                    <span className="step-num">3</span>
                    <div>
                      <strong>Đóng gói & Lưu trữ</strong>
                      <p>Lưu tổ hợp này vào Stack cá nhân trong <strong>My Toolbox</strong> để dùng lại bất kỳ lúc nào.</p>
                    </div>
                  </div>
                </div>

                <div className="workflow-cta">
                  <button
                    className="retro-button primary"
                    onClick={() => toggleToolbox(resource)}
                  >
                    {inToolbox ? <BookmarkCheck size={16} /> : <Plus size={16} />}
                    {inToolbox ? 'ĐÃ CÓ TRONG TOOLBOX' : '+ THÊM VÀO TOOLBOX ĐỂ GHÉP STACK'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="tab-pane">
              <div className="reviews-pane">
                <div className="metrics-grid">
                  <div className="metric-card">
                    <Star size={20} className="metric-icon star-icon" />
                    <strong>{resource.metricLabel || '★ 15K+'}</strong>
                    <span>GitHub Popularity</span>
                  </div>
                  <div className="metric-card">
                    <ShieldCheck size={20} className="metric-icon shield-icon" />
                    <strong>ĐÃ DUYỆT</strong>
                    <span>Kiểm định An toàn</span>
                  </div>
                  <div className="metric-card">
                    <Zap size={20} className="metric-icon zap-icon" />
                    <strong>{score !== null ? `${score}/100` : '--/100'}</strong>
                    <span>Windi Utility Score</span>
                  </div>
                </div>

                <div className="review-notes">
                  <h4>Ghi chú từ Biên tập viên Windi</h4>
                  <p>
                    {resource.creatorBrief?.limitations ||
                      'Công cụ hoạt động ổn định trên Node 18+ và Python 3.10+. Khuyến nghị kiểm tra cấu hình mạng nếu chạy trong môi trường sandbox cô lập.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="app-modal-footer">
          <button
            className={`retro-button ${inToolbox ? 'secondary' : 'primary'}`}
            onClick={() => toggleToolbox(resource)}
          >
            {inToolbox ? <BookmarkCheck size={16} /> : <Plus size={16} />}
            {inToolbox ? 'IN YOUR TOOLBOX' : 'ADD TO TOOLBOX'}
          </button>

          <div className="footer-links">
            <a
              href={resource.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="retro-button secondary"
            >
              Trang nguồn <ExternalLink size={14} />
            </a>
            <Link
              href={resource.type === 'STACK' ? `/stack/${resource.slug}` : `/tool/${resource.slug}`}
              className="retro-button primary full-detail-btn"
            >
              Mở chi tiết full page <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

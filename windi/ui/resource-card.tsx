'use client';

import React from 'react';
import Link from 'next/link';
import { Check, CheckCircle2, Flame, GitFork, Plus, Sparkles, Star } from 'lucide-react';
import { calculateWindiScore } from '@/lib/score';
import type { ResourceType, WindiResource } from '@/lib/windi-data';
import { RetroBadge } from './retro';
import { useToolbox } from '@/windi/toolbox-context';

const typeExtensions: Record<ResourceType, string> = {
  SKILL: 'Kỹ năng AI',
  MCP: 'Kết nối ứng dụng',
  OPEN_SOURCE: 'Mã nguồn mở',
  WORKFLOW: 'Quy trình',
  STACK: 'Bộ công cụ',
};

const accents: Record<ResourceType, 'green' | 'pink' | 'blue' | 'yellow' | 'orange'> = {
  SKILL: 'green',
  MCP: 'pink',
  OPEN_SOURCE: 'blue',
  WORKFLOW: 'yellow',
  STACK: 'orange',
};

export function ResourceCard({
  resource,
  onOpen,
}: {
  resource: WindiResource;
  onOpen?: (resource: WindiResource) => void;
}) {
  const { isInToolbox, toggleToolbox } = useToolbox();
  const inToolbox = isInToolbox(resource.slug);
  let score: number | null = null;
  if (resource.score) {
    try {
      score = calculateWindiScore(resource.score);
    } catch {
      score = null;
    }
  }
  const accent = accents[resource.type];
  const exeTitle = typeExtensions[resource.type] || 'APP.EXE';

  const defaultAgents = ['Codex', 'Claude', 'Cursor'];
  const agents = resource.agents && resource.agents.length > 0 ? resource.agents : defaultAgents;

  const detailHref = resource.type === 'STACK' ? `/stack/${resource.slug}` : `/tool/${resource.slug}`;

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
    <div className={`desktop-app-card tone-${accent}`}>
      {/* Window Titlebar */}
      <div className={`app-card-titlebar tone-${accent}`}>
        <div className="titlebar-dots" aria-hidden="true">
          <span className="window-dot" />
          <span className="window-dot" />
        </div>
        <span className="exe-tag">{exeTitle}</span>
        <span className="status-indicator">●</span>
      </div>

      {/* Card Body */}
      <div className="app-card-body">
        <div className="app-card-header">
          <h3 className="app-card-title">
            <Link href={detailHref}>{resource.name}</Link>
          </h3>
          <p className="app-card-tagline">{resource.tagline}</p>
        </div>

        {/* Metrics Grid */}
        <div className="app-card-metrics">
          <div className="metric-row">
            <span className="metric-name">ĐIỂM WINDI</span>
            {score !== null ? (
              <strong className="metric-val text-score">
                <Sparkles size={12} className="score-icon" /> {score}
                <small>/100</small>
              </strong>
            ) : (
              <strong className="metric-val text-muted" style={{ opacity: 0.65 }}>
                --<small>/100</small>
              </strong>
            )}
          </div>
          <div className="metric-row">
            <span className="metric-name">LƯỢT QUAN TÂM</span>
            {(() => {
              const rawLabel = resource.metricLabel || '★ --';
              if (rawLabel.includes(' · ')) {
                const [starsPart, forksPart] = rawLabel.split(' · ');
                return (
                  <div className="metric-split-col">
                    <strong className="metric-val text-stars">
                      <Star size={11} className="star-icon" /> {starsPart}
                    </strong>
                    <span className="metric-val text-forks">
                      <GitFork size={11} className="fork-icon" /> {forksPart}
                    </span>
                  </div>
                );
              }
              return (
                <strong className="metric-val text-stars">
                  <Star size={12} className="star-icon" /> {rawLabel}
                </strong>
              );
            })()}
          </div>
        </div>

        {/* Agent Compatibility */}
        <div className="app-card-agents">
          {agents.slice(0, 3).map((agent) => (
            <span key={agent} className="agent-tag">
              <Check size={11} className="agent-check" /> {agent}
            </span>
          ))}
        </div>

        {/* Badges */}
        <div className="app-card-badges">
          {isHot && (
            <RetroBadge accent="orange">
              <Flame size={11} className="badge-flame-icon" /> Phổ biến
            </RetroBadge>
          )}
          {resource.badges?.includes('EDITOR') && (
            <RetroBadge accent="yellow">
              <Sparkles size={11} /> Windi đề xuất
            </RetroBadge>
          )}
          {resource.badges?.includes('OFFICIAL') && (
            <RetroBadge accent="blue">
              <CheckCircle2 size={11} /> Chính chủ
            </RetroBadge>
          )}
          {resource.badges?.includes('RISING') && (
            <RetroBadge accent="pink">Đang nổi bật</RetroBadge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="app-card-actions">
          {onOpen ? (
            <button
              type="button"
              className="card-btn open-btn"
              onClick={() => onOpen(resource)}
            >
              Xem chi tiết
            </button>
          ) : (
            <Link href={detailHref} className="card-btn open-btn">
              Xem chi tiết
            </Link>
          )}

          <button
            type="button"
            className={`card-btn toolbox-btn ${inToolbox ? 'in-toolbox' : ''}`}
            onClick={() => toggleToolbox(resource)}
            aria-label={inToolbox ? 'Bỏ lưu công cụ' : 'Lưu công cụ'}
          >
            {inToolbox ? (
              <>
                <Check size={12} /> Đã lưu
              </>
            ) : (
              <>
                <Plus size={12} /> Lưu lại
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ResourceGrid({
  resources,
  onOpen,
}: {
  resources: WindiResource[];
  onOpen?: (resource: WindiResource) => void;
}) {
  return (
    <div className="desktop-app-grid">
      {resources.map((resource) => (
        <ResourceCard key={resource.slug} resource={resource} onOpen={onOpen} />
      ))}
    </div>
  );
}

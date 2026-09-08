'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { resources as defaultResources, type WindiResource } from '@/lib/windi-data';
import { useAuth } from './auth-context';
import { createClient } from '@/lib/supabase/browser';

interface ToolboxContextType {
  items: WindiResource[];
  count: number;
  isInToolbox: (slug: string) => boolean;
  addToToolbox: (tool: WindiResource) => void;
  removeFromToolbox: (slug: string) => void;
  toggleToolbox: (tool: WindiResource) => void;
  addAllToToolbox: (tools: WindiResource[]) => void;
  clearToolbox: () => void;
  countsByType: {
    skills: number;
    mcp: number;
    openSource: number;
    workflows: number;
  };
  groupedByCategory: Record<string, WindiResource[]>;
  isLoaded: boolean;
  isSyncing: boolean;
  syncError: string | null;
  isAuthenticated: boolean;
  userEmail: string | null;
}

const GUEST_STORAGE_KEY = 'windi_toolbox_guest';
const LEGACY_STORAGE_KEY = 'windi_toolbox_v2';
const LEGACY_STARTER_SLUGS = new Set(['ui-ux-pro-max', 'playwright-mcp', 'context7-mcp', 'supabase-mcp']);

function isOnlyLegacyStarters(list: { slug?: string }[]): boolean {
  if (!Array.isArray(list) || list.length === 0 || list.length > 4) return false;
  return list.every((item) => item && item.slug && LEGACY_STARTER_SLUGS.has(item.slug));
}

function resolveToolResource(item: any): WindiResource | null {
  if (!item) return null;
  const slug = typeof item === 'string' ? item : item.slug;
  if (!slug) return null;
  const found = defaultResources.find((r) => r.slug === slug);
  if (found) return found;
  if (item.name && item.type) return item as WindiResource;
  return {
    slug,
    name: item.name || slug,
    type: item.type || 'SKILL',
    tagline: item.tagline || 'Custom saved tool',
    description: item.description || '',
    canonicalUrl: item.canonicalUrl || '#',
    source: item.source || 'Windi',
    tags: item.tags || [],
    agents: item.agents || [],
    score: item.score || null,
    metricLabel: item.metricLabel || 'Saved',
    updatedLabel: item.updatedLabel || 'Đã lưu',
    badges: item.badges || [],
    status: 'PUBLISHED',
  };
}

function toCompactPayload(list: WindiResource[]): { slug: string }[] {
  return list.filter((i) => i && i.slug).map((i) => ({ slug: i.slug }));
}

const ToolboxContext = createContext<ToolboxContextType | null>(null);

export function ToolboxProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [items, setItems] = useState<WindiResource[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Sync / Load items on auth state resolution
  useEffect(() => {
    if (isAuthLoading) return;

    async function loadToolbox() {
      if (user) {
        const userKey = `windi_toolbox_user_${user.id}`;
        let cloudRaw: any[] | null = null;
        if (Array.isArray(user.user_metadata?.toolbox)) {
          cloudRaw = user.user_metadata.toolbox;
        }

        let localUserTools: WindiResource[] | null = null;
        try {
          const stored = localStorage.getItem(userKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && !isOnlyLegacyStarters(parsed)) {
              localUserTools = parsed.map(resolveToolResource).filter(Boolean) as WindiResource[];
            }
          }
        } catch {
          // ignore parsing error
        }

        let guestTools: WindiResource[] | null = null;
        try {
          const guestStored = localStorage.getItem(GUEST_STORAGE_KEY);
          if (guestStored) {
            const parsed = JSON.parse(guestStored);
            if (Array.isArray(parsed) && !isOnlyLegacyStarters(parsed)) {
              guestTools = parsed.map(resolveToolResource).filter(Boolean) as WindiResource[];
            }
          }
        } catch {
          // ignore parsing error
        }

        let resolved: WindiResource[] = [];

        if (cloudRaw && cloudRaw.length > 0 && !isOnlyLegacyStarters(cloudRaw)) {
          resolved = cloudRaw.map(resolveToolResource).filter(Boolean) as WindiResource[];
          // Merge guest tools if user previously saved tools before logging in
          if (guestTools && guestTools.length > 0) {
            const existingSlugs = new Set(resolved.map((i) => i.slug));
            const toAdd = guestTools.filter((g) => !existingSlugs.has(g.slug));
            if (toAdd.length > 0) {
              resolved = [...toAdd, ...resolved];
            }
            try {
              localStorage.removeItem(GUEST_STORAGE_KEY);
            } catch {}
          }

          // Always compact user_metadata to avoid bloated JWT session cookies (HTTP 431)
          const needsCompacting = cloudRaw.some(
            (t: any) => t && (typeof t !== 'object' || t.description || t.longDescription || t.creatorBrief)
          );
          if (needsCompacting || (guestTools && guestTools.length > 0)) {
            try {
              const supabase = createClient();
              await supabase.auth.updateUser({ data: { toolbox: toCompactPayload(resolved) } });
            } catch (err) {
              console.error('Failed to sync compact toolbox:', err);
            }
          }
        } else if (localUserTools && localUserTools.length > 0) {
          resolved = localUserTools;
          // Sync local user cache to cloud in compact form
          try {
            const supabase = createClient();
            await supabase.auth.updateUser({ data: { toolbox: toCompactPayload(resolved) } });
          } catch (err) {
            console.error('Failed to sync local toolbox to cloud:', err);
          }
        } else if (guestTools && guestTools.length > 0) {
          // Promote guest items to user's cloud account in compact form
          resolved = guestTools;
          try {
            const supabase = createClient();
            await supabase.auth.updateUser({ data: { toolbox: toCompactPayload(resolved) } });
            localStorage.removeItem(GUEST_STORAGE_KEY);
          } catch (err) {
            console.error('Failed to promote guest toolbox to cloud:', err);
          }
        } else {
          resolved = [];
        }

        setItems(resolved);
        try {
          localStorage.setItem(userKey, JSON.stringify(resolved));
        } catch {}
      } else {
        // Guest user mode
        let guestItems: WindiResource[] = [];
        try {
          const stored = localStorage.getItem(GUEST_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && !isOnlyLegacyStarters(parsed)) {
              guestItems = parsed;
            }
          } else {
            // Check legacy storage key
            const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (legacyStored) {
              const legacyParsed = JSON.parse(legacyStored);
              if (Array.isArray(legacyParsed) && !isOnlyLegacyStarters(legacyParsed)) {
                guestItems = legacyParsed;
                localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestItems));
              }
              localStorage.removeItem(LEGACY_STORAGE_KEY);
            }
          }
        } catch {
          guestItems = [];
        }

        setItems(guestItems);
      }

      setIsLoaded(true);
    }

    loadToolbox();
  }, [user, isAuthLoading]);

  // Persist items both locally and in cloud (if authenticated)
  const persistItems = useCallback(
    async (nextItems: WindiResource[]) => {
      setItems(nextItems);

      if (user) {
        const userKey = `windi_toolbox_user_${user.id}`;
        try {
          localStorage.setItem(userKey, JSON.stringify(nextItems));
        } catch {}

        setIsSyncing(true);
        setSyncError(null);
        try {
          const supabase = createClient();
          const { error } = await supabase.auth.updateUser({
            data: { toolbox: toCompactPayload(nextItems) },
          });
          if (error) {
            console.error('Cloud sync error:', error);
            setSyncError('Chưa thể đồng bộ lên tài khoản.');
          }
        } catch (err) {
          console.error('Network sync error:', err);
          setSyncError('Lỗi kết nối khi đồng bộ.');
        } finally {
          setIsSyncing(false);
        }
      } else {
        // Guest mode
        try {
          localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(nextItems));
        } catch {}
      }
    },
    [user]
  );

  const isInToolbox = useCallback(
    (slug: string) => items.some((item) => item?.slug === slug),
    [items]
  );

  const addToToolbox = useCallback(
    (tool: WindiResource) => {
      if (!tool?.slug) return;
      const next = items.some((item) => item?.slug === tool.slug)
        ? items
        : [tool, ...items];
      persistItems(next);
    },
    [items, persistItems]
  );

  const removeFromToolbox = useCallback(
    (slug: string) => {
      const next = items.filter((item) => item && item.slug !== slug);
      persistItems(next);
    },
    [items, persistItems]
  );

  const toggleToolbox = useCallback(
    (tool: WindiResource) => {
      if (!tool?.slug) return;
      if (isInToolbox(tool.slug)) {
        removeFromToolbox(tool.slug);
      } else {
        addToToolbox(tool);
      }
    },
    [isInToolbox, removeFromToolbox, addToToolbox]
  );

  const addAllToToolbox = useCallback(
    (newTools: WindiResource[]) => {
      const existingSlugs = new Set(items.filter((i) => i?.slug).map((i) => i.slug));
      const toAdd = newTools.filter((t) => t?.slug && !existingSlugs.has(t.slug));
      if (toAdd.length === 0) return;
      persistItems([...toAdd, ...items]);
    },
    [items, persistItems]
  );

  const clearToolbox = useCallback(() => {
    persistItems([]);
  }, [persistItems]);

  const countsByType = useMemo(() => {
    return {
      skills: items.filter((i) => i && i.type === 'SKILL').length,
      mcp: items.filter((i) => i && i.type === 'MCP').length,
      openSource: items.filter((i) => i && i.type === 'OPEN_SOURCE').length,
      workflows: items.filter((i) => i && i.type === 'WORKFLOW').length,
    };
  }, [items]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, WindiResource[]> = {
      DESIGN: [],
      CODING: [],
      RESEARCH: [],
      CONTENT: [],
      AUTOMATION: [],
    };

    items.forEach((tool) => {
      if (!tool) return;
      const cat =
        tool.categoryGroup ||
        (tool.tags?.some((t) => /design|ui|css|frontend/i.test(t))
          ? 'DESIGN'
          : tool.tags?.some((t) => /code|developer|database|postgres/i.test(t))
          ? 'CODING'
          : tool.tags?.some((t) => /research|search/i.test(t))
          ? 'RESEARCH'
          : tool.tags?.some((t) => /seo|content|video|writing/i.test(t))
          ? 'CONTENT'
          : 'AUTOMATION');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tool);
    });

    return groups;
  }, [items]);

  return (
    <ToolboxContext.Provider
      value={{
        items,
        count: items.length,
        isInToolbox,
        addToToolbox,
        removeFromToolbox,
        toggleToolbox,
        addAllToToolbox,
        clearToolbox,
        countsByType,
        groupedByCategory,
        isLoaded,
        isSyncing,
        syncError,
        isAuthenticated: !!user,
        userEmail: user?.email ?? null,
      }}
    >
      {children}
    </ToolboxContext.Provider>
  );
}

export function useToolbox() {
  const context = useContext(ToolboxContext);
  if (!context) {
    throw new Error('useToolbox must be used within a ToolboxProvider');
  }
  return context;
}

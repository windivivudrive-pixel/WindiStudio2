export interface EvidenceMedia {
  id: string;
  kind: 'IMAGE' | 'YOUTUBE' | 'VIMEO' | 'SOURCE_LINK';
  source_url: string;
  media_url: string | null;
  alt_text: string;
  rights_basis: 'LINK_ONLY' | 'PLATFORM_EMBED' | 'PERMISSION' | 'LICENSE';
  rights_verified_at: string | null;
}
export interface CommunityEvidence {
  id: string;
  title: string;
  source_url: string;
  platform: string;
  author_name: string;
  author_relationship: 'USER' | 'MAINTAINER' | 'AFFILIATE' | 'UNKNOWN';
  summary_vi: string;
  positive_notes: string | null;
  limitation_notes: string | null;
  resource_match: 'EXACT' | 'RELATED_PROJECT';
  match_explanation: string;
  observed_at: string;
  media: EvidenceMedia[];
}

export function externalHttps(input: string | null): string | null {
  try {
    const url = new URL(input || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /^(localhost|\d+\.\d+\.\d+\.\d+|\[)/.test(url.hostname)) return null;
    return url.toString();
  } catch { return null; }
}

export function embedUrl(media: EvidenceMedia): string | null {
  if (media.rights_basis !== 'PLATFORM_EMBED' || !media.rights_verified_at) return null;
  const safe = externalHttps(media.media_url); if (!safe) return null;
  const url = new URL(safe);
  if (media.kind === 'YOUTUBE') {
    let id: string | null = null;
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
    if (['youtube.com', 'www.youtube.com'].includes(url.hostname)) id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed)\/([\w-]{11})$/)?.[1] || null;
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (media.kind === 'VIMEO' && ['vimeo.com','www.vimeo.com'].includes(url.hostname) && /^\/\d+$/.test(url.pathname)) return `https://player.vimeo.com/video${url.pathname}`;
  return null;
}

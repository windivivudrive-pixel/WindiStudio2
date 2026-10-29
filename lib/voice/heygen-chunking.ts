/** Contract: docs/heygen-tts-rules.md. Offsets are UTF-16 source offsets. */
export const HEYGEN_REQUEST_RULE = 'heygen-free-5000-sentences-v4';
export const HEYGEN_REQUEST_CHARACTER_LIMIT = 5000;
export const HEYGEN_CONTEXT_CHARACTER_LIMIT = 160;
export const HEYGEN_EXPRESSIVENESS = 0.8;

export type HeyGenChunk = {
  index: number;
  sourceStart: number;
  sourceEnd: number;
  text: string;
  context: string;
  requestText: string;
};

function safeEnd(text: string, end: number) {
  // Never separate a Unicode surrogate pair, even when a single word is enormous.
  return end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1] || '') ? end - 1 : end;
}

export function planHeyGenChunks(text: string, language = 'vi'): HeyGenChunk[] {
  if (!text.trim()) return [];
  const segmenter = new Intl.Segmenter(language, { granularity: 'sentence' });
  const boundaries = [...segmenter.segment(text)].map(part => part.index + part.segment.length);
  const chunks: HeyGenChunk[] = [];
  let start = 0;
  while (start < text.length) {
    let context = '';
    if (start && !/\n\s*\n\s*$/.test(text.slice(0, start))) {
      const previous = [...segmenter.segment(text.slice(0, start))].at(-1)?.segment.trim() || '';
      if (previous.length + 1 <= HEYGEN_CONTEXT_CHARACTER_LIMIT) context = previous;
      // A long sentence's last complete clause can still provide a short context.
      else {
        const clauses = previous.match(/[^,;:，；：]+[,;:，；：]?/gu) || [];
        const clause = clauses.at(-1)?.trim() || '';
        if (clause.length + 1 <= HEYGEN_CONTEXT_CHARACTER_LIMIT) context = clause;
      }
      if (context) context += '\n';
    }
    const nextSentenceEnd = boundaries.find(end => end > start) ?? text.length;
    // Preserve an intact sentence that fits by itself rather than splitting it to fit context.
    if (nextSentenceEnd - start > HEYGEN_REQUEST_CHARACTER_LIMIT - context.length
      && nextSentenceEnd - start <= HEYGEN_REQUEST_CHARACTER_LIMIT) context = '';
    const limit = safeEnd(text, Math.min(text.length, start + HEYGEN_REQUEST_CHARACTER_LIMIT - context.length));
    let end = boundaries.filter(boundary => boundary > start && boundary <= limit).at(-1);
    if (!end) {
      const window = text.slice(start, limit);
      const clauseEnds = [...window.matchAll(/[,;:，；：](?:[”’"')\]]*)\s+|\n+/gu)];
      const clause = clauseEnds.at(-1);
      end = clause ? start + clause.index! + clause[0].length : undefined;
      if (!end || end - start < (limit - start) * 0.5) {
        const space = [...window.matchAll(/\s+/gu)].at(-1);
        end = space ? start + space.index! + space[0].length : limit;
      }
    }
    if (end <= start) throw new Error('Không thể chia văn bản cho HeyGen.');
    const content = text.slice(start, end);
    // A trailing whitespace-only span belongs to the prior source span, not a new request.
    if (!content.trim() && chunks.length) {
      const last = chunks[chunks.length - 1];
      last.sourceEnd = end;
      last.text += content;
    } else {
      chunks.push({ index: chunks.length, sourceStart: start, sourceEnd: end,
        text: content, context, requestText: context + content });
    }
    start = end;
  }
  return chunks;
}

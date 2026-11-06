/** Client-side menu search: diacritic- and case-insensitive, with match ranges for <mark>. */

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Normalised query, or '' when there is nothing to search for. */
export const normalizeQuery = (q: string) => fold(q).trim().replace(/\s+/g, ' ');

/**
 * Split `text` into plain / matched segments for the (already normalised) query.
 * Folding can drop characters (combining marks), so match positions are mapped back to `text`.
 */
export function highlight(text: string, q: string): { text: string; match: boolean }[] {
  if (!q) return [{ text, match: false }];
  let folded = '';
  const at: number[] = []; // folded index -> source index
  let i = 0;
  for (const ch of text) {
    for (const f of fold(ch)) {
      folded += f;
      at.push(i);
    }
    i += ch.length;
  }
  at.push(text.length);

  const out: { text: string; match: boolean }[] = [];
  let from = 0;
  let cursor = 0;
  for (let hit = folded.indexOf(q); hit !== -1; hit = folded.indexOf(q, from)) {
    const start = at[hit]!;
    const end = at[hit + q.length]!;
    if (start > cursor) out.push({ text: text.slice(cursor, start), match: false });
    out.push({ text: text.slice(start, end), match: true });
    cursor = end;
    from = hit + q.length;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), match: false });
  return out;
}

/** Does any of the texts contain the normalised query? Empty query matches everything. */
export const matches = (q: string, ...texts: (string | null | undefined)[]) =>
  !q || texts.some((t) => t != null && fold(t).includes(q));

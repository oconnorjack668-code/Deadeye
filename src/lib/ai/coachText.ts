// src/lib/ai/coachText.ts
// Turns a coach reply (Markdown-ish text from the model) into blocks the chat
// can render. Models write headings, numbered items with indented sub-bullets
// and **bold** labels whatever the prompt says, so this reads them line by
// line rather than trusting a block to be all one kind. Anything it does not
// recognise stays as plain text, so a reply is never lost.

export interface CoachListItem {
  text: string;
  /** "1." for a numbered item, null for a bullet */
  marker: string | null;
  /** 0 for a top-level item, 1 for anything indented under it */
  depth: 0 | 1;
}

export type CoachBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: CoachListItem[] };

export interface InlinePiece {
  text: string;
  bold: boolean;
  italic: boolean;
}

const HEADING = /^\s*#{1,6}\s+(.+?)\s*#*\s*$/;
const BOLD_LINE = /^\s*\*\*([^*]+)\*\*\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const LIST_ITEM = /^(\s*)([-•*]|\d+[.)])\s+(.*)$/;

export function parseCoachText(input: string): CoachBlock[] {
  const blocks: CoachBlock[] = [];
  let current: CoachBlock | null = null;
  const close = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const raw of input.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || RULE.test(line)) {
      close();
      continue;
    }
    const heading = line.match(HEADING) ?? line.match(BOLD_LINE);
    if (heading) {
      close();
      blocks.push({ type: 'heading', text: heading[1].trim() });
      continue;
    }
    const item = line.match(LIST_ITEM);
    if (item) {
      const [, indent, mark, text] = item;
      const numbered = /^\d/.test(mark);
      const entry: CoachListItem = { text: text.trim(), marker: numbered ? `${parseInt(mark, 10)}.` : null, depth: indent.length >= 2 ? 1 : 0 };
      if (current?.type === 'list') current.items.push(entry);
      else {
        close();
        current = { type: 'list', items: [entry] };
      }
      continue;
    }
    if (current?.type === 'paragraph') current.text += '\n' + line.trim();
    else {
      close();
      current = { type: 'paragraph', text: line.trim() };
    }
  }
  close();
  return blocks;
}

// **bold**, *italic* or _italic_ (not "5 * 2"), and `code` shown as plain text
const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`)/g;

export function parseInline(text: string): InlinePiece[] {
  const pieces: InlinePiece[] = [];
  const push = (t: string, bold = false, italic = false) => {
    if (!t) return;
    const last = pieces[pieces.length - 1];
    if (last && !last.bold && !last.italic && !bold && !italic) last.text += t;
    else pieces.push({ text: t, bold, italic });
  };
  for (const part of text.split(INLINE)) {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) push(part.slice(2, -2), true);
    else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) push(part.slice(1, -1));
    else if (/^\*[^*\s][^*]*\*$/.test(part) || /^_[^_\s][^_]*_$/.test(part)) push(part.slice(1, -1), false, true);
    else push(part);
  }
  return pieces;
}

const TOC_ENTRY_PATTERN = /^(.*?)\s*(?:\.{3,}|…{2,})\s*(\d+)\s*$/;
const HEADING_PATTERN = /^(#{1,4})\s+\S/;
const FENCE_PATTERN = /^```/;
const COMMENT_PATTERN = /^\s*<!--.*-->\s*$/;
const BULLET_PATTERN = /^\s*[-*]\s+/;
const ORDERED_LIST_PATTERN = /^\s*\d+[.)]\s+/;
const BLOCKQUOTE_PATTERN = /^\s*>\s?/;
const HORIZONTAL_RULE_PATTERN = /^\s*(?:---+|\*\*\*+|___+)\s*$/;

function isTableStart(lines, index) {
  return (
    lines[index]?.includes('|') && lines[index + 1]?.match(/^\s*\|?\s*:?-{3,}/)
  );
}

function isStructuralLine(lines, index) {
  return (
    !lines[index]?.trim() ||
    COMMENT_PATTERN.test(lines[index]) ||
    HEADING_PATTERN.test(lines[index]) ||
    FENCE_PATTERN.test(lines[index]) ||
    BULLET_PATTERN.test(lines[index]) ||
    ORDERED_LIST_PATTERN.test(lines[index]) ||
    BLOCKQUOTE_PATTERN.test(lines[index]) ||
    HORIZONTAL_RULE_PATTERN.test(lines[index]) ||
    isTableStart(lines, index)
  );
}

function parseListBlock(lines, start, pattern, type) {
  const items = [];
  let i = start;

  while (i < lines.length && pattern.test(lines[i])) {
    const itemLines = [lines[i].replace(pattern, '').trim()];
    i += 1;

    while (
      i < lines.length &&
      lines[i].trim() &&
      !pattern.test(lines[i]) &&
      /^\s{2,}\S/.test(lines[i]) &&
      !isStructuralLine(lines, i)
    ) {
      itemLines.push(lines[i].trim());
      i += 1;
    }

    items.push(itemLines.join(' ').replace(/\s+/g, ' ').trim());
  }

  return { type, items, nextIndex: i };
}

function parseTocEntry(line) {
  const match = line.match(TOC_ENTRY_PATTERN);
  if (!match) return null;

  return {
    label: match[1].replace(/\s+/g, ' ').trim(),
    page: match[2],
  };
}

function parseTocBlock(lines, start) {
  const items = [];
  const pending = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const isBoundary = isStructuralLine(lines, i);

    if (isBoundary) break;

    const entry = parseTocEntry(trimmed);
    if (entry) {
      items.push({
        label: [...pending, entry.label].join(' ').replace(/\s+/g, ' ').trim(),
        page: entry.page,
      });
      pending.length = 0;
    } else if (items.length) {
      pending.push(trimmed);
    } else {
      return null;
    }

    i += 1;
  }

  if (!items.length) return null;
  if (pending.length) {
    items.push({ label: pending.join(' '), page: '' });
  }

  return { type: 'toc', items, nextIndex: i };
}

export function parseMarkdownBlocks(markdown) {
  const blocks = [];
  const lines = markdown
    .replace(/\r\n/g, '\n')
    .replace(/^\uFEFF?---\n[\s\S]*?\n---\n?/, '')
    .split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*<!--.*-->\s*$/.test(line)) {
      i += 1;
      continue;
    }
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (HORIZONTAL_RULE_PATTERN.test(line)) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    if (BLOCKQUOTE_PATTERN.test(line)) {
      const quoteLines = [];
      while (i < lines.length && BLOCKQUOTE_PATTERN.test(lines[i])) {
        quoteLines.push(lines[i].replace(BLOCKQUOTE_PATTERN, '').trim());
        i += 1;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    const fence = line.match(/^```(\w+)?/);
    if (fence) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```'))
        code.push(lines[i++]);
      blocks.push({
        type: 'code',
        lang: fence[1] || '',
        text: code.join('\n'),
      });
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)/);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: heading[2],
      });
      i += 1;
      continue;
    }

    const toc = parseTocBlock(lines, i);
    if (toc) {
      blocks.push({ type: toc.type, items: toc.items });
      i = toc.nextIndex;
      continue;
    }

    if (isTableStart(lines, i)) {
      const rows = [];
      while (i < lines.length && lines[i].includes('|')) {
        if (!lines[i].match(/^\s*\|?\s*:?-{3,}/)) {
          const cells = lines[i].split('|').map((cell) => cell.trim());
          if (!cells[0]) cells.shift();
          if (!cells[cells.length - 1]) cells.pop();
          rows.push(cells);
        }
        i += 1;
      }
      blocks.push({ type: 'table', rows });
      continue;
    }

    if (BULLET_PATTERN.test(line)) {
      blocks.push(parseListBlock(lines, i, BULLET_PATTERN, 'list'));
      i = blocks[blocks.length - 1].nextIndex;
      delete blocks[blocks.length - 1].nextIndex;
      continue;
    }

    if (ORDERED_LIST_PATTERN.test(line)) {
      blocks.push(
        parseListBlock(lines, i, ORDERED_LIST_PATTERN, 'ordered-list')
      );
      i = blocks[blocks.length - 1].nextIndex;
      delete blocks[blocks.length - 1].nextIndex;
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEADING_PATTERN.test(lines[i]) &&
      !FENCE_PATTERN.test(lines[i]) &&
      !COMMENT_PATTERN.test(lines[i]) &&
      !BULLET_PATTERN.test(lines[i]) &&
      !ORDERED_LIST_PATTERN.test(lines[i]) &&
      !BLOCKQUOTE_PATTERN.test(lines[i]) &&
      !HORIZONTAL_RULE_PATTERN.test(lines[i]) &&
      !isTableStart(lines, i)
    ) {
      paragraph.push(lines[i++].trim());
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

export function parseArticleBlocks(markdown) {
  const blocks = parseMarkdownBlocks(markdown);
  if (blocks[0]?.type === 'heading' && blocks[0].level === 1) {
    return blocks.slice(1);
  }
  return blocks;
}

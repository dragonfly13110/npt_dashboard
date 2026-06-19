export function parseMarkdownBlocks(markdown) {
  const blocks = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
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

    if (line.includes('|') && lines[i + 1]?.match(/^\s*\|?\s*:?-{3,}/)) {
      const rows = [];
      while (i < lines.length && lines[i].includes('|')) {
        if (!lines[i].match(/^\s*\|?\s*:?-{3,}/)) {
          rows.push(
            lines[i]
              .split('|')
              .map((cell) => cell.trim())
              .filter(Boolean)
          );
        }
        i += 1;
      }
      blocks.push({ type: 'table', rows });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !(lines[i].includes('|') && lines[i + 1]?.match(/^\s*\|?\s*:?-{3,}/))
    ) {
      paragraph.push(lines[i++].trim());
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

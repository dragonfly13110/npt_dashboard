import { parseArticleBlocks } from './markdownBlocks';

export function isReferenceHeading(text) {
  return /(?:อ้างอิง|references|แหล่งอ้างอิง|แหล่งข้อมูล|ที่มา)/i.test(
    String(text || '')
  );
}

export function prepareFrontierArticleMarkdown(markdown) {
  const lines = String(markdown || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const titleIndex = lines.findIndex((line) => /^#\s+/.test(line));

  if (titleIndex >= 0) {
    let metadataEnd = titleIndex + 1;
    while (
      metadataEnd < lines.length &&
      (!lines[metadataEnd].trim() || /^\s*>/.test(lines[metadataEnd]))
    ) {
      metadataEnd += 1;
    }
    const metadata = lines.slice(titleIndex + 1, metadataEnd).join('\n');
    if (/เอกสารเจาะลึกหัวข้อ|research topic/i.test(metadata)) {
      lines.splice(titleIndex + 1, metadataEnd - titleIndex - 1);
    }
  }

  const checklistIndex = lines.findIndex((line) =>
    /^##\s+(?:Checklist|Self-check)\b/i.test(line)
  );
  if (checklistIndex >= 0) lines.splice(checklistIndex);

  let inReferences = false;
  return lines
    .map((line) => {
      const heading = line.match(/^#{1,4}\s+(.+)/);
      if (heading) inReferences = isReferenceHeading(heading[1]);
      if (inReferences && /^\s*`?\[\d+\]`?\s+/.test(line)) {
        return `- ${line.trim()}`;
      }
      return line;
    })
    .join('\n');
}

export function getFrontierArticleBlockGroups(markdown) {
  const blocks = parseArticleBlocks(prepareFrontierArticleMarkdown(markdown));
  const groups = [];
  let inReferences = false;

  for (const block of blocks) {
    if (block.type === 'heading' && isReferenceHeading(block.text)) {
      inReferences = true;
    }
    const current = groups[groups.length - 1];
    if (!current || current.isReferences !== inReferences) {
      groups.push({ isReferences: inReferences, blocks: [] });
    }
    groups[groups.length - 1].blocks.push(block);
  }

  return groups;
}

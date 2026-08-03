import { describe, expect, it } from 'vitest';
import { parseMarkdownBlocks } from './markdownBlocks';

describe('parseMarkdownBlocks', () => {
  it('keeps headings, lists, tables, and code separate', () => {
    const blocks = parseMarkdownBlocks(
      '# Title\n\n- one\n- two\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```js\nx()\n```'
    );

    expect(blocks.map((block) => block.type)).toEqual([
      'heading',
      'list',
      'table',
      'code',
    ]);
    expect(blocks[2].rows[1]).toEqual(['1', '2']);
  });

  it('preserves empty table cells', () => {
    const [table] = parseMarkdownBlocks(
      '| A | B | C |\n| --- | --- | --- |\n| 1 |  | 3 |'
    );

    expect(table.rows[1]).toEqual(['1', '', '3']);
  });

  it('ignores YAML front matter and source markers', () => {
    const blocks = parseMarkdownBlocks(
      "---\ntitle: 'Article'\nslug: article\n---\n<!-- source: 1.pdf | PDF page 2 -->\n# Heading\n\nBody"
    );

    expect(blocks).toEqual([
      { type: 'heading', level: 1, text: 'Heading' },
      { type: 'paragraph', text: 'Body' },
    ]);
  });
});

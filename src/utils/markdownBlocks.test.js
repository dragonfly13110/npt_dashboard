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
});

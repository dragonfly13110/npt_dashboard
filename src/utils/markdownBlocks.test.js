import { describe, expect, it } from 'vitest';
import { parseArticleBlocks, parseMarkdownBlocks } from './markdownBlocks';

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

  it('keeps table-of-contents entries separate without changing prose', () => {
    const blocks = parseMarkdownBlocks(
      '## สารบัญ\n\nคำนิยม ........................................3\nบทนำ ............................................5\nการสำรวจและติดตามสถานการณ์\nแมลงศัตรูข้าว ................................127\n\nประโยค\nที่ต่อบรรทัด'
    );

    expect(blocks).toEqual([
      { type: 'heading', level: 2, text: 'สารบัญ' },
      {
        type: 'toc',
        items: [
          { label: 'คำนิยม', page: '3' },
          { label: 'บทนำ', page: '5' },
          { label: 'การสำรวจและติดตามสถานการณ์ แมลงศัตรูข้าว', page: '127' },
        ],
      },
      { type: 'paragraph', text: 'ประโยค ที่ต่อบรรทัด' },
    ]);
  });

  it('parses ordered lists and multiline blockquotes as blocks', () => {
    const blocks = parseMarkdownBlocks(`
> แหล่งข้อมูล
> รายละเอียดเพิ่มเติม

1. ขั้นแรก
   ข้อความต่อเนื่อง
2. ขั้นถัดไป`);

    expect(blocks).toEqual([
      { type: 'blockquote', text: 'แหล่งข้อมูล รายละเอียดเพิ่มเติม' },
      {
        type: 'ordered-list',
        items: ['ขั้นแรก ข้อความต่อเนื่อง', 'ขั้นถัดไป'],
      },
    ]);
  });

  it('removes an article heading already shown by the page header', () => {
    expect(
      parseArticleBlocks('# ชื่อบทความ\n\n## หัวข้อแรก\n\nเนื้อหา')
    ).toEqual([
      { type: 'heading', level: 2, text: 'หัวข้อแรก' },
      { type: 'paragraph', text: 'เนื้อหา' },
    ]);
  });
});

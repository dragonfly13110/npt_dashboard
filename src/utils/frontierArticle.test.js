import { describe, expect, it } from 'vitest';
import {
  getFrontierArticleBlockGroups,
  prepareFrontierArticleMarkdown,
} from './frontierArticle';

describe('frontier article cleanup', () => {
  it('removes internal metadata and delivery checklists while keeping references', () => {
    const markdown = `# บทความทดสอบ

> **เอกสารเจาะลึกหัวข้อ: 01-001** — สร้าง: 2026-08-01
> โดเมน: ทดสอบ

## 1. เนื้อหา

ผลการศึกษา [1]

## References

[1] Source https://example.com/source

## Checklist ก่อนส่งมอบ (AI ต้องตรวจเอง)

- [x] ตรวจแล้ว`;

    const prepared = prepareFrontierArticleMarkdown(markdown);
    const groups = getFrontierArticleBlockGroups(markdown);

    expect(prepared).not.toContain('เอกสารเจาะลึกหัวข้อ');
    expect(prepared).not.toContain('Checklist ก่อนส่งมอบ');
    expect(groups.some((group) => group.isReferences)).toBe(true);
    expect(
      groups
        .flatMap((group) => group.blocks)
        .some((block) => block.items?.[0]?.includes('[1]'))
    ).toBe(true);
  });
});

import fs from 'node:fs';

const filePath = 'public/data/farmer69/source-pages.json';
const visualReviewPages = new Set([
  54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72,
  73, 79, 80, 81, 88,
]);

const pages = JSON.parse(fs.readFileSync(filePath, 'utf8')).map((page) =>
  visualReviewPages.has(page.pdf_page)
    ? {
        ...page,
        status: 'visual_review_pending',
        review_reason:
          'หน้ามีแบบฟอร์ม แผนภาพ หรือตราสัญลักษณ์ที่ text layer อ่านได้ไม่ครบ ต้องตรวจเทียบภาพ PDF',
      }
    : page
);

fs.writeFileSync(filePath, `${JSON.stringify(pages, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify({
    pages: pages.length,
    visualReviewPending: pages.filter(
      (page) => page.status === 'visual_review_pending'
    ).length,
  })
);

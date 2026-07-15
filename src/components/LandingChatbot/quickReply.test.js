import { describe, expect, it } from 'vitest';
import { getLandingQuickReply } from './quickReply';

describe('getLandingQuickReply', () => {
  it('answers greetings directly', () => {
    expect(getLandingQuickReply('สวัสดี')).toContain('น้องข้าวหลาม');
  });

  it('answers help directly', () => {
    expect(getLandingQuickReply('ช่วยอะไรได้บ้าง')).toContain(
      'ข้อมูลเกษตรนครปฐม'
    );
  });

  it('lets navigation questions fall through to AI', () => {
    expect(getLandingQuickReply('ดูแผนที่แปลงเกษตรตรงไหน')).toBeNull();
  });

  it('lets analytics questions fall through to AI', () => {
    expect(
      getLandingQuickReply('เปรียบเทียบพื้นที่เกษตรแต่ละอำเภอ')
    ).toBeNull();
  });

  it.each([
    ['ขอดูแผนที่', '/smart-map'],
    ['ไปราคาสินค้าเกษตร', '/public/agricultural-prices'],
    ['เปิดพยากรณ์โรคพืช', '/public/disease-forecast'],
    ['ขอคู่มือใช้งาน', '/manual'],
  ])('answers direct navigation without AI: %s', (query, route) => {
    expect(getLandingQuickReply(query)).toContain(route);
  });

  it('does not intercept a factual navigation-shaped question', () => {
    expect(
      getLandingQuickReply('แผนที่แปลงเกษตรในสามพรานมีอะไรบ้าง')
    ).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { getLandingQuickReply } from './quickReply';

describe('getLandingQuickReply', () => {
  it('answers greetings directly', () => {
    expect(getLandingQuickReply('สวัสดี')).toContain('น้องข้าวหลาม AI');
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
});

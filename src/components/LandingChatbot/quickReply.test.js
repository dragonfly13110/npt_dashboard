import { describe, expect, it } from 'vitest';
import { getLandingQuickReply } from './quickReply';

describe('getLandingQuickReply', () => {
  it('routes analytics questions to the full chatbot without using AI quota', () => {
    expect(getLandingQuickReply('เปรียบเทียบพื้นที่เกษตรแต่ละอำเภอ')).toContain(
      '/dashboard/chatbot'
    );
  });

  it('answers known navigation questions directly', () => {
    expect(getLandingQuickReply('ดูแผนที่แปลงเกษตรตรงไหน')).toContain(
      '/smart-map'
    );
  });

  it('lets open-ended chat fall through to AI', () => {
    expect(getLandingQuickReply('สวัสดี')).toBeNull();
  });
});

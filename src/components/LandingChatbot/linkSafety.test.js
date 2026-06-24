import { describe, expect, it } from 'vitest';
import { normalizeLandingChatbotLink } from './linkSafety';

describe('normalizeLandingChatbotLink', () => {
  it('allows known public landing chatbot routes', () => {
    expect(normalizeLandingChatbotLink('/smart-map')).toBe('/smart-map');
    expect(normalizeLandingChatbotLink('/public/large-plots')).toBe(
      '/public/large-plots'
    );
  });

  it('normalizes safe aliases to public routes', () => {
    expect(
      normalizeLandingChatbotLink('/dashboard/protection/disease-forecast')
    ).toBe('/public/disease-forecast');
    expect(
      normalizeLandingChatbotLink(
        '/dashboard/development/community-enterprises'
      )
    ).toBe('/public/community-enterprises');
  });

  it('removes query strings, hashes, and trailing slashes from allowed routes', () => {
    expect(normalizeLandingChatbotLink('/public/fire-hotspots/?tab=pm25')).toBe(
      '/public/fire-hotspots'
    );
    expect(normalizeLandingChatbotLink('/interactive-dashboard#summary')).toBe(
      '/interactive-dashboard'
    );
  });

  it('blocks external, protocol-relative, hash-only, and unknown routes', () => {
    expect(normalizeLandingChatbotLink('https://example.com')).toBeNull();
    expect(normalizeLandingChatbotLink('//example.com/path')).toBeNull();
    expect(normalizeLandingChatbotLink('#top')).toBeNull();
    expect(normalizeLandingChatbotLink('/public/weather')).toBeNull();
    expect(normalizeLandingChatbotLink('/dashboard/admin/users')).toBeNull();
    expect(normalizeLandingChatbotLink('/dashboard/chatbot')).toBeNull();
  });
});

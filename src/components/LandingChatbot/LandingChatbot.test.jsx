import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { parseMarkdownText } from './LandingChatbot';

describe('parseMarkdownText', () => {
  it('renders a bold Markdown link as a usable internal link', () => {
    render(
      <BrowserRouter>
        {parseMarkdownText('**[ดูแผนที่](/smart-map)**')}
      </BrowserRouter>
    );

    expect(screen.getByRole('link', { name: 'ดูแผนที่' })).toHaveAttribute(
      'href',
      '/smart-map'
    );
  });
});

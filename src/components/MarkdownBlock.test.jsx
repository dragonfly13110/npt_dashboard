import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { MarkdownBlock } from './MarkdownBlock';

describe('MarkdownBlock citation links', () => {
  it('renders citation markers as superscript anchors and links bare URLs', () => {
    render(
      <MemoryRouter>
        <MarkdownBlock
          block={{
            type: 'paragraph',
            text: 'ผลการศึกษา [1] ดู https://example.com/source.',
          }}
          citationTarget="#frontier-reference"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '[1]' })).toHaveAttribute(
      'href',
      '#frontier-reference-1'
    );
    expect(
      screen.getByRole('link', { name: 'https://example.com/source' })
    ).toHaveAttribute('target', '_blank');
  });

  it('anchors numbered reference list items for citation jumps', () => {
    render(
      <MemoryRouter>
        <MarkdownBlock
          block={{
            type: 'list',
            items: ['`[1]` Source https://example.com/source'],
          }}
          citationTarget="#frontier-reference"
          referenceList
        />
      </MemoryRouter>
    );

    expect(document.getElementById('frontier-reference-1')).toBeInTheDocument();
  });
});

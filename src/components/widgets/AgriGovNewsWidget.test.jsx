import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AgriGovNewsWidget from './AgriGovNewsWidget';

vi.mock('../../hooks/useApiCache', () => ({
  useApiCache: () => ({
    data: {
      'doae-hq': [
        {
          title: 'ข่าวกรมส่งเสริมการเกษตร',
          link: '#',
          description: '',
          pubDate: '',
        },
      ],
      'doae-npt': [],
      'doae-esc': [],
      ictc: [],
    },
    isLoading: false,
    error: null,
  }),
}));

describe('AgriGovNewsWidget', () => {
  it('opens selected source news in a dialog', () => {
    render(<AgriGovNewsWidget />);

    fireEvent.click(screen.getByRole('button', { name: /กรมส่งเสริมฯ/ }));

    expect(screen.getByRole('dialog')).toHaveTextContent(
      'ข่าวกรมส่งเสริมการเกษตร'
    );
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LandingFooter from './LandingFooter';

describe('LandingFooter', () => {
  it('renders useful footer actions and opens panel shortcuts', () => {
    const onOpenPanel = vi.fn();

    render(<LandingFooter onOpenPanel={onOpenPanel} />);

    expect(screen.getByText('สำนักงานเกษตรจังหวัดนครปฐม')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /โทร 0 3425 3992/ })
    ).toHaveAttribute('href', 'tel:034253992');
    expect(screen.getByRole('link', { name: /ส่งอีเมล/ })).toHaveAttribute(
      'href',
      'mailto:nakhonpathom@doae.go.th'
    );
    expect(
      screen.getByRole('link', { name: /แผนที่อัจฉริยะ/ })
    ).toHaveAttribute('href', '/smart-map');

    expect(
      screen.queryByRole('button', { name: /ทางลัดหน่วยงาน/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /แจ้งปัญหาระบบ/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /คำอธิบายข้อมูล/ })
    ).toHaveAttribute('href', '/public/data-dictionary');

    fireEvent.click(screen.getByRole('button', { name: /ประเมินเว็บไซต์/ }));

    expect(onOpenPanel).toHaveBeenCalledWith('websiteEvaluation');
  });
});

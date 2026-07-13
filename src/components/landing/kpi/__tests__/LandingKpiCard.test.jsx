import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LandingKpiCard from '../LandingKpiCard';

describe('LandingKpiCard', () => {
  it('renders title and value in normal state', () => {
    render(
      <LandingKpiCard
        id="test-card"
        title="สภาพอากาศ"
        value="30"
        unit="°C"
        status="normal"
        statusLabel="ดี"
        secondaryText="ความชื้น 50%"
        sourceLabel="กรมอุตุฯ"
        interactive={false}
      />
    );

    expect(screen.getByText('สภาพอากาศ')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('°C')).toBeInTheDocument();
    expect(screen.getByText('ดี')).toBeInTheDocument();
    expect(screen.getByText('ความชื้น 50%')).toBeInTheDocument();
    expect(screen.getByText('กรมอุตุฯ')).toBeInTheDocument();
    expect(screen.queryByText('ดูรายละเอียด')).not.toBeInTheDocument();
  });

  it('renders interactive button and handles click', () => {
    const handleClick = vi.fn();
    render(
      <LandingKpiCard
        id="test-card"
        title="สภาพอากาศ"
        value="30"
        unit="°C"
        interactive={true}
        onClick={handleClick}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('ดูรายละเอียด')).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders loading state', () => {
    render(<LandingKpiCard id="test-card" title="สภาพอากาศ" loading={true} />);
    expect(screen.getByTestId('kpi-loading-test-card')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(
      <LandingKpiCard
        id="test-card"
        title="สภาพอากาศ"
        error={new Error('Failed')}
      />
    );
    expect(screen.getByTestId('kpi-error-test-card')).toBeInTheDocument();
    expect(screen.getByText('ไม่สามารถเชื่อมต่อข้อมูล')).toBeInTheDocument();
  });
});

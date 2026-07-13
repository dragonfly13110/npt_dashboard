import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import WidgetDetailHost from '../WidgetDetailHost';
import { widgetDetailRegistry } from '../widgetDetailRegistry';

// Mock registry components to avoid importing heavy real widgets in unit test
vi.mock('../widgetDetailRegistry', () => {
  const MockWidget = () => (
    <div data-testid="mock-weather-detail">Weather Details Content</div>
  );
  return {
    widgetDetailRegistry: {
      weather: {
        title: 'รายละเอียดสภาพอากาศ',
        component: MockWidget,
      },
    },
  };
});

describe('WidgetDetailHost', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <WidgetDetailHost
        activeWidgetKey="weather"
        open={false}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders weather details title and content when open', () => {
    const handleClose = vi.fn();
    render(
      <WidgetDetailHost
        activeWidgetKey="weather"
        open={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('รายละเอียดสภาพอากาศ')).toBeInTheDocument();
    expect(screen.getByTestId('mock-weather-detail')).toBeInTheDocument();
    expect(screen.getByText('Weather Details Content')).toBeInTheDocument();

    const closeBtn = screen.getByTestId('widget-detail-close');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press', () => {
    const handleClose = vi.fn();
    render(
      <WidgetDetailHost
        activeWidgetKey="weather"
        open={true}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders error on invalid key', () => {
    render(
      <WidgetDetailHost
        activeWidgetKey="invalidKey"
        open={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('ข้อผิดพลาด')).toBeInTheDocument();
    expect(screen.getByText('ไม่พบส่วนแสดงผลที่ระบุ')).toBeInTheDocument();
  });
});

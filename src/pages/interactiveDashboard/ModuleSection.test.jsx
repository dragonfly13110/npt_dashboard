import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { ModuleSection } from './ModuleSection';

beforeEach(() => {
  global.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {
      this.callback([{ isIntersecting: true }]);
    }

    disconnect() {}
  };
});

it('expands details without navigation', async () => {
  render(
    <ModuleSection id="groups" title="กลุ่มเกษตรกร" summary="608 กลุ่ม">
      <p>รายละเอียดกลุ่มเกษตรกร</p>
    </ModuleSection>
  );

  const details = screen.getByRole('group');
  fireEvent.click(screen.getByText('กลุ่มเกษตรกร'));

  expect(details).toHaveAttribute('open', '');
  expect(screen.getByText('รายละเอียดกลุ่มเกษตรกร')).toBeVisible();
  expect(location.pathname).not.toContain('development');
});

it('shows the supplied module status', () => {
  render(
    <ModuleSection id="soil" title="ชุดดิน" status="ข้อมูลล่าสุด">
      <p>ชุดดิน</p>
    </ModuleSection>
  );

  expect(screen.getByText('ข้อมูลล่าสุด')).toBeVisible();
});

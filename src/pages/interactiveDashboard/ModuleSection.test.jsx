import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { ModuleSection } from './ModuleSection';

const originalIntersectionObserver = global.IntersectionObserver;
let observerInstance;

beforeEach(() => {
  global.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
      observerInstance = this;
    }

    observe() {}

    disconnect = () => {
      this.disconnected = true;
    };
  };
});

afterEach(() => {
  cleanup();
  global.IntersectionObserver = originalIntersectionObserver;
  observerInstance = undefined;
});

it('expands details without navigation', () => {
  render(
    <ModuleSection id="groups" title="กลุ่มเกษตรกร" summary="608 กลุ่ม">
      <p>รายละเอียดกลุ่มเกษตรกร</p>
    </ModuleSection>
  );

  const details = screen.getByRole('group');
  fireEvent.click(screen.getByText('กลุ่มเกษตรกร'));

  expect(details).toHaveAttribute('open', '');
  act(() => observerInstance.callback([{ isIntersecting: true }]));
  expect(screen.getByText('รายละเอียดกลุ่มเกษตรกร')).toBeVisible();
  expect(location.pathname).not.toContain('development');
});

it('mounts children after intersection and disconnects the observer', () => {
  render(
    <ModuleSection id="soil" title="ชุดดิน">
      <p>รายละเอียดชุดดิน</p>
    </ModuleSection>
  );

  expect(screen.queryByText('รายละเอียดชุดดิน')).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('ชุดดิน'));
  act(() => observerInstance.callback([{ isIntersecting: true }]));
  expect(screen.getByText('รายละเอียดชุดดิน')).toBeVisible();

  cleanup();
  expect(observerInstance.disconnected).toBe(true);
});

it('uses native summary semantics with the complete accessible name', () => {
  render(
    <ModuleSection
      id="soil"
      title="ชุดดิน"
      summary="ชนิดดิน"
      status="ข้อมูลล่าสุด"
    >
      <p>รายละเอียดชุดดิน</p>
    </ModuleSection>
  );

  const details = screen.getByRole('group');
  const summary = details.querySelector('summary');

  expect(summary).toBeInstanceOf(HTMLElement);
  expect(summary.tagName).toBe('SUMMARY');
  expect(summary).toHaveAccessibleName('ชุดดิน ชนิดดิน ข้อมูลล่าสุด');
  summary.focus();
  expect(summary).toHaveFocus();
});

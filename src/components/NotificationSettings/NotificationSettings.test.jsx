import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationSettings from './NotificationSettings';

const subscribeToPush = vi.fn();
const unsubscribeFromPush = vi.fn();
vi.mock('../../services/pushNotifications', () => ({
  subscribeToPush: (...args) => subscribeToPush(...args),
  unsubscribeFromPush: (...args) => unsubscribeFromPush(...args),
  isPushSupported: () => true,
}));

describe('NotificationSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('subscribes from an explicit button click', async () => {
    subscribeToPush.mockResolvedValue({});
    render(<NotificationSettings />);
    fireEvent.click(screen.getByRole('button', { name: /เปิดการแจ้งเตือน/ }));
    await waitFor(() =>
      expect(subscribeToPush).toHaveBeenCalledWith({
        outbreak: true,
        hotspot: true,
        districts: [],
      })
    );
  });

  it('can unsubscribe the current device', async () => {
    unsubscribeFromPush.mockResolvedValue();
    render(<NotificationSettings />);
    fireEvent.click(screen.getByRole('button', { name: /ยกเลิกการแจ้งเตือน/ }));
    await waitFor(() => expect(unsubscribeFromPush).toHaveBeenCalled());
  });
});

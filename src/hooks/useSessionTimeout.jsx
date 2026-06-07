import { useEffect, useRef, useState, useCallback } from 'react';
import { Modal } from 'antd';
import { LogoutOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';

/**
 * Hook ที่ตรวจสอบ session expiry ของ Supabase
 * แสดง Modal เตือน 5 นาทีก่อน session หมดอายุ
 */
export function useSessionTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 นาที
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, [clearTimers]);

  const startCountdown = useCallback(
    (seconds) => {
      let remaining = seconds;
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownRef.current);
          handleLogout();
        }
      }, 1000);
    },
    [handleLogout]
  );

  const scheduleWarning = useCallback(
    (session) => {
      clearTimers();
      if (!session) return;

      const expiresAt = session.expires_at; // Unix timestamp in seconds
      if (!expiresAt) return;

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      const warningTime = timeUntilExpiry - 300; // 5 นาทีก่อนหมดอายุ

      if (warningTime <= 0) {
        // น้อยกว่า 5 นาที → แสดงเตือนทันที
        setShowWarning(true);
        setCountdown(Math.max(0, timeUntilExpiry));
        startCountdown(Math.max(0, timeUntilExpiry));
      } else {
        timerRef.current = setTimeout(() => {
          setShowWarning(true);
          setCountdown(300);
          startCountdown(300);
        }, warningTime * 1000);
      }
    },
    [clearTimers, startCountdown]
  );

  const handleRefresh = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      setShowWarning(false);
      clearTimers();
      if (data.session) {
        scheduleWarning(data.session);
      }
    } catch {
      handleLogout();
    }
  }, [clearTimers, handleLogout, scheduleWarning]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) scheduleWarning(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        scheduleWarning(session);
      } else {
        clearTimers();
      }
    });

    return () => {
      clearTimers();
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const WarningModal = (
    <Modal
      title="⏰ Session กำลังจะหมดอายุ"
      open={showWarning}
      closable={false}
      mask={{ closable: false }}
      okText="ต่ออายุ Session"
      cancelText="ออกจากระบบ"
      onOk={handleRefresh}
      onCancel={handleLogout}
      okButtonProps={{ icon: <ReloadOutlined />, className: 'add-btn' }}
      cancelButtonProps={{ icon: <LogoutOutlined />, danger: true }}
      className="crud-modal"
    >
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
        <p style={{ fontSize: 16, marginBottom: 8, color: '#1f2328' }}>
          Session ของคุณจะหมดอายุใน
        </p>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: countdown <= 60 ? '#cf222e' : '#bf8700',
            fontFamily: 'monospace',
            marginBottom: 12,
          }}
        >
          {formatTime(countdown)}
        </div>
        <p style={{ fontSize: 14, color: '#656d76' }}>
          กด "ต่ออายุ" เพื่อใช้งานต่อ หรือข้อมูลที่กำลังกรอกอาจหายไป
        </p>
      </div>
    </Modal>
  );

  return { WarningModal };
}

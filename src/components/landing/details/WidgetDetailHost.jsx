import React, { useEffect, useRef, Suspense } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { widgetDetailRegistry } from './widgetDetailRegistry';
import WidgetDetailErrorBoundary from './WidgetDetailErrorBoundary';
import './WidgetDetailHost.css';

const DetailSkeleton = () => (
  <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
    <div
      className="landing-kpi-shimmer"
      style={{
        height: '40px',
        width: '80%',
        margin: '0 auto 20px',
        borderRadius: '8px',
      }}
    />
    <div
      className="landing-kpi-shimmer"
      style={{ height: '200px', width: '100%', borderRadius: '12px' }}
    />
  </div>
);

export default function WidgetDetailHost({ activeWidgetKey, open, onClose }) {
  const triggerRef = useRef(null);
  const containerRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (open) {
      // Store current active element to restore focus later
      triggerRef.current = document.activeElement;

      // Put focus inside the modal close button or container
      const closeBtn = containerRef.current?.querySelector(
        '.widget-detail-modal-close-btn'
      );
      if (closeBtn) {
        closeBtn.focus();
      }
    } else {
      // Restore focus
      if (
        triggerRef.current &&
        typeof triggerRef.current.focus === 'function'
      ) {
        triggerRef.current.focus();
      }
    }
  }, [open]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !activeWidgetKey) return null;

  const registryItem = widgetDetailRegistry[activeWidgetKey];
  if (!registryItem) {
    return (
      <div className="widget-detail-modal-overlay" onClick={onClose}>
        <div
          className="widget-detail-modal-container"
          onClick={(e) => e.stopPropagation()}
          ref={containerRef}
        >
          <div className="widget-detail-modal-header">
            <h2 className="widget-detail-modal-title">ข้อผิดพลาด</h2>
            <button
              className="widget-detail-modal-close-btn"
              onClick={onClose}
              aria-label="ปิด"
            >
              <CloseOutlined />
            </button>
          </div>
          <div className="widget-detail-modal-body">
            <p style={{ color: '#e53e3e', fontWeight: 600 }}>
              ไม่พบส่วนแสดงผลที่ระบุ
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    title,
    component: WidgetComponent,
    props: widgetProps = {},
  } = registryItem;

  return (
    <div
      className="widget-detail-modal-overlay"
      onClick={onClose}
      data-testid="widget-detail-overlay"
    >
      <div
        className="widget-detail-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={containerRef}
      >
        <div className="widget-detail-modal-header">
          <h2 className="widget-detail-modal-title">{title}</h2>
          <button
            className="widget-detail-modal-close-btn"
            onClick={onClose}
            aria-label="ปิดรายละเอียด"
            data-testid="widget-detail-close"
          >
            <CloseOutlined />
          </button>
        </div>
        <div className="widget-detail-modal-body">
          <WidgetDetailErrorBoundary
            onRetry={() => console.log('Retrying dynamic chunk load...')}
          >
            <Suspense fallback={<DetailSkeleton />}>
              <WidgetComponent {...widgetProps} />
            </Suspense>
          </WidgetDetailErrorBoundary>
        </div>
      </div>
    </div>
  );
}

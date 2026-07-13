import React from 'react';
import './LandingKpiCard.css';

export default function LandingKpiCard({
  id,
  title,
  value,
  unit,
  status = 'normal',
  statusLabel,
  secondaryText,
  updatedAt,
  sourceLabel,
  icon,
  loading = false,
  error = null,
  interactive = true,
  onClick,
}) {
  // Format Thai time helper
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      return (
        d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) +
        ' น.'
      );
    } catch (e) {
      return timeStr;
    }
  };

  if (loading) {
    return (
      <div
        className="landing-kpi-card is-loading"
        data-testid={`kpi-loading-${id}`}
      >
        <div className="landing-kpi-shimmer header-shimmer" />
        <div className="landing-kpi-shimmer value-shimmer" />
        <div className="landing-kpi-shimmer footer-shimmer" />
      </div>
    );
  }

  if (error || status === 'unavailable') {
    const errorText = error
      ? 'ไม่สามารถเชื่อมต่อข้อมูล'
      : statusLabel || 'ไม่สามารถเชื่อมต่อข้อมูล';
    return (
      <div
        className="landing-kpi-card is-error"
        data-testid={`kpi-error-${id}`}
      >
        <div className="landing-kpi-header">
          <span className="landing-kpi-icon">{icon}</span>
          <span className="landing-kpi-title">{title}</span>
        </div>
        <div className="landing-kpi-error-body">
          <span className="landing-kpi-error-msg">{errorText}</span>
        </div>
        <div className="landing-kpi-footer">
          {sourceLabel && (
            <span className="landing-kpi-source">{sourceLabel}</span>
          )}
        </div>
      </div>
    );
  }

  const ariaLabel = `ดูรายละเอียด${title} ค่าปัจจุบัน ${value || '-'} ${unit || ''} ${statusLabel ? `สถานะ ${statusLabel}` : ''}`;

  const content = (
    <>
      <div className="landing-kpi-header">
        <span className="landing-kpi-icon">{icon}</span>
        <span className="landing-kpi-title">{title}</span>
      </div>
      <div className="landing-kpi-body">
        <div className="landing-kpi-value-row">
          <span className="landing-kpi-value">{value ?? '-'}</span>
          {unit && <span className="landing-kpi-unit">{unit}</span>}
        </div>
        {statusLabel && (
          <span className={`landing-kpi-status-badge is-${status}`}>
            {statusLabel}
          </span>
        )}
        {secondaryText && (
          <p className="landing-kpi-secondary">{secondaryText}</p>
        )}
      </div>
      <div className="landing-kpi-footer">
        {sourceLabel && (
          <span className="landing-kpi-source">{sourceLabel}</span>
        )}
        {updatedAt && (
          <span className="landing-kpi-time">{formatTime(updatedAt)}</span>
        )}
      </div>
    </>
  );

  if (interactive && onClick) {
    return (
      <button
        type="button"
        className={`landing-kpi-card is-interactive is-${status}`}
        onClick={onClick}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        data-testid={`kpi-card-${id}`}
      >
        {content}
        <span className="landing-kpi-action-hint">ดูรายละเอียด</span>
      </button>
    );
  }

  return (
    <div
      className={`landing-kpi-card is-${status}`}
      data-testid={`kpi-card-${id}`}
    >
      {content}
    </div>
  );
}

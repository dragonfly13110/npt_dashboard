import React from 'react';

export default class WidgetDetailErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error loading lazy widget chunk:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '30px 15px',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
          <h3
            style={{
              fontSize: '18px',
              color: '#0f172a',
              marginBottom: '8px',
              fontWeight: 'bold',
            }}
          >
            ไม่สามารถโหลดรายละเอียดได้
          </h3>
          <p style={{ fontSize: '14px', marginBottom: '16px' }}>
            กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              background: 'var(--agri-green, #21694c)',
              color: '#ffffff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

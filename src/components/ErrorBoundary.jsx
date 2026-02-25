import { Component } from 'react';
import { Button, Result } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-container">
                    <div className="error-boundary-card">
                        <div className="error-boundary-icon">⚠️</div>
                        <h1 className="error-boundary-title">เกิดข้อผิดพลาด</h1>
                        <p className="error-boundary-desc">
                            ระบบพบปัญหาที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
                        </p>
                        {this.state.error && (
                            <div className="error-boundary-detail">
                                {this.state.error.message}
                            </div>
                        )}
                        <div className="error-boundary-actions">
                            <Button
                                type="primary"
                                icon={<ReloadOutlined />}
                                size="large"
                                onClick={this.handleReload}
                                className="add-btn"
                            >
                                ลองใหม่อีกครั้ง
                            </Button>
                            <Button
                                icon={<HomeOutlined />}
                                size="large"
                                onClick={this.handleGoHome}
                            >
                                กลับหน้าหลัก
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

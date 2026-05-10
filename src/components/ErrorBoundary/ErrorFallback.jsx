import { Button, Result, Space } from 'antd';
import { ReloadOutlined, HomeOutlined, BugOutlined } from '@ant-design/icons';
import styles from './ErrorFallback.module.css';

export default function ErrorFallback({ error, resetErrorBoundary }) {
    const handleGoHome = () => {
        window.location.href = '/';
    };

    const handleReload = () => {
        window.location.reload();
    };

    return (
        <div className={styles.container}>
            <Result
                status="error"
                title="เกิดข้อผิดพลาดในระบบ"
                subTitle="ระบบพบปัญหาที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ"
                icon={<BugOutlined />}
                extra={
                    <Space wrap>
                        <Button type="primary" icon={<ReloadOutlined />} onClick={handleReload} size="large">
                            ลองใหม่อีกครั้ง
                        </Button>
                        <Button icon={<HomeOutlined />} onClick={handleGoHome} size="large">
                            กลับหน้าหลัก
                        </Button>
                    </Space>
                }
            >
                {error && (
                    <div className={styles.errorDetail}>
                        <p className={styles.errorLabel}>รายละเอียดข้อผิดพลาด:</p>
                        <pre className={styles.errorMessage}>{error.message || String(error)}</pre>
                        {error.stack && (
                            <details className={styles.errorStack}>
                                <summary>Stack Trace</summary>
                                <pre>{error.stack}</pre>
                            </details>
                        )}
                    </div>
                )}
            </Result>
        </div>
    );
}

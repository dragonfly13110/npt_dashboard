import React, { useState, useEffect } from 'react';
import { Avatar, Spin, Typography } from 'antd';
import { RobotOutlined } from '@ant-design/icons';

const { Text } = Typography;

const loadingPhrases = [
    "กำลังวิเคราะห์...",
    "กำลังรวบรวมข้อมูลจาก 7 อำเภอ...",
    "กำลังเปรียบเทียบสถิติ...",
    "กำลังคำนวณสัดส่วนและจัดอันดับ...",
    "กำลังประมวลผลข้อมูลเกษตรกร...",
    "กำลังสังเคราะห์ Insight...",
    "ใกล้เสร็จแล้ว..."
];

export default function LoadingIndicator({ currentModelConfig }) {
    const [phraseIndex, setPhraseIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setPhraseIndex((prev) => (prev + 1) % loadingPhrases.length);
        }, 3000); // Change phrase every 3 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <Avatar
                size={36}
                icon={<RobotOutlined />}
                style={{
                    background: `linear-gradient(135deg, ${currentModelConfig.color}, ${currentModelConfig.color}88)`,
                    flexShrink: 0,
                    animation: 'pulse 2s infinite',
                }}
            />
            <div style={{
                background: '#f6f8fa',
                borderRadius: '4px 18px 18px 18px',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            }}>
                <Spin size="small" />
                <Text type="secondary" style={{
                    transition: 'opacity 0.3s ease-in-out',
                    animation: 'fadePulse 3s infinite',
                }}>
                    {currentModelConfig.icon} {loadingPhrases[phraseIndex]}
                </Text>
            </div>
            <style>
                {`
                @keyframes fadePulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 ${currentModelConfig.color}40; }
                    70% { box-shadow: 0 0 0 6px rgba(0, 0, 0, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
                }
                `}
            </style>
        </div>
    );
}

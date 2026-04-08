import { Segmented, Typography } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { AI_MODELS } from '../../utils/chatbotConstants';

const { Text } = Typography;

export default function ModelSelector({ selectedModel, onChange, disabled }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#f6f8fa',
            borderRadius: 12,
            padding: '6px 12px',
            border: '1px solid #d0d7de',
        }}>
            <ExperimentOutlined style={{ color: '#656d76', fontSize: 14 }} />
            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>AI Model:</Text>
            <Segmented
                value={selectedModel}
                onChange={onChange}
                disabled={disabled}
                size="small"
                options={Object.values(AI_MODELS).map(m => ({
                    label: (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '2px 4px',
                        }}>
                            <span>{m.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: 12 }}>{m.shortLabel}</span>
                            <span style={{
                                background: m.badgeColor,
                                color: '#fff',
                                fontSize: 9,
                                padding: '0 5px',
                                borderRadius: 6,
                                fontWeight: 700,
                                lineHeight: '16px',
                            }}>
                                {m.badge}
                            </span>
                        </div>
                    ),
                    value: m.key,
                }))}
                style={{ background: '#fff' }}
            />
        </div>
    );
}

import { Avatar, Collapse, Tag, Typography } from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import khaolamAvatar from '../../assets/khaolam-avatar.png';
import SmartTable from './SmartTable';
import SmartChart from './SmartChart';
import { AI_MODELS } from '../../utils/chatbotConstants';

export default function ChatMessage({ message, isLast }) {
  const isBot = message.role === 'bot';
  const modelConfig = message.modelKey ? AI_MODELS[message.modelKey] : null;

  let textToParse = message.text || '';
  let thinkContent = null;

  // Extract <think> ... </think> block if present
  const thinkMatch = textToParse.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    thinkContent = thinkMatch[1].trim();
    textToParse = textToParse.replace(thinkMatch[0], '').trim();
  }

  const parseBlocks = (text) => {
    const blocks = [];

    // Extract chart blocks first: ```chart ... ```
    const chartRegex = /```chart\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;

    while ((match = chartRegex.exec(text)) !== null) {
      const preChartText = text.substring(lastIndex, match.index);
      if (preChartText.trim()) {
        blocks.push(...parseSubBlocks(preChartText));
      }
      blocks.push({ type: 'chart', content: match[1].trim() });
      lastIndex = chartRegex.lastIndex;
    }

    const remainingText = text.substring(lastIndex);
    if (remainingText.trim()) {
      blocks.push(...parseSubBlocks(remainingText));
    }

    return blocks;
  };

  const parseSubBlocks = (text) => {
    const lines = text.split('\n');
    const blocks = [];
    let currentTable = [];
    let currentText = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        if (currentText.length > 0) {
          blocks.push({ type: 'text', lines: currentText });
          currentText = [];
        }
        currentTable.push(line);
      } else {
        if (currentTable.length > 0) {
          blocks.push({ type: 'table', lines: currentTable });
          currentTable = [];
        }
        currentText.push(line);
      }
    }
    if (currentText.length > 0)
      blocks.push({ type: 'text', lines: currentText });
    if (currentTable.length > 0)
      blocks.push({ type: 'table', lines: currentTable });
    return blocks;
  };

  const blocks = parseBlocks(textToParse);

  return (
    <div
      className={`chat-message ${isBot ? 'bot' : 'user'}`}
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: 20,
        flexDirection: isBot ? 'row' : 'row-reverse',
        animation: isLast ? 'chatFadeIn 0.3s ease-out' : 'none',
      }}
    >
      <Avatar
        size={36}
        src={isBot ? khaolamAvatar : undefined}
        icon={isBot ? undefined : <UserOutlined />}
        style={{
          background: isBot
            ? `linear-gradient(135deg, ${modelConfig?.color || '#1a7f37'}, ${modelConfig?.color || '#2ea043'}88)`
            : 'linear-gradient(135deg, #1565c0, #42a5f5)',
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <div
        style={{
          maxWidth: '78%',
          background: isBot ? '#f6f8fa' : '#1a7f37',
          color: isBot ? '#1f2328' : '#fff',
          borderRadius: isBot ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
          padding: '12px 18px',
          fontSize: 14,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {thinkContent && (
          <Collapse
            size="small"
            bordered={true}
            expandIconPosition="end"
            style={{
              marginBottom: 16,
              background: '#fafafa',
              borderRadius: 8,
              border: '1px solid #d9d9d9',
              overflow: 'hidden',
            }}
            items={[
              {
                key: '1',
                label: (
                  <span
                    style={{
                      color: '#8c8c8c',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <AppstoreOutlined /> กระบวนการคิดของ AI (Reasoning)
                  </span>
                ),
                children: (
                  <div
                    style={{
                      fontSize: 13,
                      color: '#595959',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                    }}
                  >
                    {thinkContent}
                  </div>
                ),
              },
            ]}
          />
        )}
        {blocks.map((block, bIdx) => {
          if (block.type === 'chart' && isBot) {
            return <SmartChart key={bIdx} rawContent={block.content} />;
          }
          if (block.type === 'table' && isBot) {
            return <SmartTable key={bIdx} rawLines={block.lines} />;
          }
          return (
            <div key={bIdx}>
              {block.lines.map((line, i) => {
                const parts = line.split(/\*\*(.*?)\*\*/g);
                return (
                  <div key={i} style={{ minHeight: line === '' ? 8 : 'auto' }}>
                    {parts.map((part, j) =>
                      j % 2 === 1 ? (
                        <strong key={j}>{part}</strong>
                      ) : (
                        <span key={j}>{part}</span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
        {/* Data summary tags */}
        {isBot && message.data && message.type === 'overview' && (
          <div
            style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}
          >
            {message.data
              .filter((d) => d.count > 0)
              .map((d) => (
                <Tag
                  key={d.table}
                  color="green"
                  style={{ borderRadius: 12, fontSize: 12 }}
                >
                  {d.icon} {d.label}: {d.count.toLocaleString()}
                </Tag>
              ))}
          </div>
        )}
        <div
          style={{
            fontSize: 11,
            opacity: 0.5,
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            justifyContent: isBot ? 'flex-start' : 'flex-end',
          }}
        >
          <span>
            {new Date(message.timestamp).toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {modelConfig && (
            <span
              style={{
                background: isBot
                  ? 'rgba(0,0,0,0.05)'
                  : 'rgba(255,255,255,0.2)',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {modelConfig.icon} {modelConfig.description}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

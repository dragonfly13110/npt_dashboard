import { useState } from 'react';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { barOption, comboOption, pieOption } from '../charts/echartOptions';
import EChart from '../widgets/EChart';

/**
 * Validates and normalizes chart config from parsed JSON.
 * Replaces Zod schema validation to avoid version compatibility issues.
 */
function validateChartConfig(input) {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Input is not an object' };
  }

  const data = input.data;
  if (!Array.isArray(data) || data.length === 0) {
    return { success: false, error: 'data must be a non-empty array' };
  }

  const validTypes = ['pie', 'line', 'bar'];
  const type = validTypes.includes(input.type) ? input.type : 'bar';
  const title = typeof input.title === 'string' ? input.title : undefined;
  const xAxisKey = typeof input.xAxisKey === 'string' ? input.xAxisKey : 'name';

  let series = [{ key: 'value', name: 'Value' }];
  if (Array.isArray(input.series) && input.series.length > 0) {
    const validSeries = input.series.filter(
      (s) => s && typeof s.key === 'string'
    );
    if (validSeries.length > 0) {
      series = validSeries.map((s) => ({
        key: s.key,
        name: typeof s.name === 'string' ? s.name : s.key,
      }));
    }
  }

  return { success: true, data: { type, title, data, xAxisKey, series } };
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#a28CFE',
  '#ff66b2',
  '#7acc00',
];

export default function SmartChart({ rawContent }) {
  const [chartInstance, setChartInstance] = useState(null);
  let parsedJson = null;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (e) {
    return (
      <div
        style={{
          color: '#d32f2f',
          padding: '8px',
          border: '1px solid #d32f2f',
          borderRadius: '4px',
          background: '#ffebee',
          fontSize: '0.9em',
        }}
      >
        [ข้อมูล JSON ไม่ถูกต้อง ไม่สามารถเรนเดอร์กราฟได้]
      </div>
    );
  }

  // Validate structured payload robustly
  const validationResult = validateChartConfig(parsedJson);

  if (!validationResult.success) {
    console.error('Chart Validation Error:', validationResult.error);
    return (
      <div
        style={{
          color: '#d32f2f',
          padding: '8px',
          border: '1px solid #d32f2f',
          borderRadius: '4px',
          background: '#ffebee',
          fontSize: '0.9em',
        }}
      >
        [รูปแบบข้อมูลกราฟไม่ถูกต้อง โปรดลองใหม่อีกครั้ง]
      </div>
    );
  }

  const { type, title, data, xAxisKey, series } = validationResult.data;
  const option =
    type === 'pie'
      ? pieOption(
          data.map((item) => ({
            name: item[xAxisKey] ?? item.name,
            value: item[series[0].key] ?? 0,
          })),
          { colors: COLORS, radius: ['0%', '68%'], legend: true }
        )
      : type === 'line'
        ? comboOption(
            data,
            series.map((s, idx) => ({
              ...s,
              type: 'line',
              color: COLORS[idx % COLORS.length],
            })),
            { categoryKey: xAxisKey, colors: COLORS }
          )
        : barOption(
            data,
            series.map((s, idx) => ({
              ...s,
              color: COLORS[idx % COLORS.length],
            })),
            { categoryKey: xAxisKey, colors: COLORS }
          );

  const exportCSV = () => {
    const headers = [xAxisKey, ...series.map((s) => s.name)].join(',');
    const rows = data.map((item) => {
      const keyVal = String(item[xAxisKey] ?? '').replace(/"/g, '""');
      const seriesVals = series.map((s) => {
        let v = String(item[s.key] ?? '').replace(/"/g, '""');
        if (v.includes(',') || v.includes('\n') || v.includes('"')) {
          v = `"${v}"`;
        }
        return v;
      });
      return [
        keyVal.includes(',') ? `"${keyVal}"` : keyVal,
        ...seriesVals,
      ].join(',');
    });
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title || 'ข้อมูลกราฟ'}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadChartImage = () => {
    if (!chartInstance) return;
    const url = chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    });
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title || 'กราฟ'}_${Date.now()}.png`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: 330,
        background: '#fff',
        padding: 16,
        borderRadius: 8,
        marginTop: 8,
        marginBottom: 8,
        border: '1px solid #e1e4e8',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 'bold', color: '#24292f', fontSize: 14 }}>
          {title || 'วิเคราะห์ข้อมูลด้วยกราฟ'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={exportCSV}
            style={{ borderRadius: 6 }}
          >
            ส่งออก CSV
          </Button>
          <Button
            size="small"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={downloadChartImage}
            disabled={!chartInstance}
            style={{
              borderRadius: 6,
              background: '#1a7f37',
              borderColor: '#1a7f37',
            }}
          >
            ดาวน์โหลดรูปกราฟ
          </Button>
        </div>
      </div>
      <div style={{ flex: 1, height: 260 }}>
        <EChart
          onChartReady={setChartInstance}
          option={option}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Table, Segmented, Button } from 'antd';
import {
  TableOutlined,
  BarChartOutlined,
  PieChartOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { barOption, pieOption } from '../charts/echartOptions';
import EChart from '../widgets/EChart';
import { rowsToCsv } from '../../utils/csv';

const COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#eb2f96',
  '#13c2c2',
];

const stripBold = (value) =>
  String(value ?? '').replace(/\*\*(.*?)\*\*/g, '$1');

const renderBold = (value) => {
  const text = String(value ?? '');
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
};

export default function SmartTable({ rawLines }) {
  const [viewMode, setViewMode] = useState('table');
  const [chartInstance, setChartInstance] = useState(null);

  if (rawLines.length < 3) return <pre>{rawLines.join('\n')}</pre>;

  // Parse table and cleanup separators
  const headerRow = rawLines[0]
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  const dataRows = rawLines
    .slice(2)
    .map((r) =>
      r
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .filter((r) => r.length > 0);

  if (headerRow.length === 0 || dataRows.length === 0)
    return <pre>{rawLines.join('\n')}</pre>;

  const columns = headerRow.map((h, i) => ({
    title: stripBold(h),
    dataIndex: `col_${i}`,
    key: `col_${i}`,
    render: renderBold,
  }));

  let isChartable = false;
  let chartData = [];

  // Check if the table has data that can be charted
  if (columns.length >= 2) {
    chartData = dataRows.map((row) => {
      const obj = { name: stripBold(row[0]) };
      row.forEach((v, colIdx) => {
        const clean = stripBold(v);
        const val = clean.replace(/,/g, ''); // Fix commas
        obj[`col_${colIdx}`] = !isNaN(val) && val !== '' ? Number(val) : clean;
      });
      return obj;
    });

    // Exclude "Total" rows from charts so they don't break the scale
    chartData = chartData.filter((item) => {
      const firstCol = item.name?.toString()?.toLowerCase() || '';
      return !firstCol.includes('รวม') && !firstCol.includes('total');
    });

    // Can we chart this? Is the second column a number?
    if (chartData.length > 0 && typeof chartData[0].col_1 === 'number') {
      isChartable = true;
    }
  }

  const dataSource = dataRows.map((row, i) => {
    const obj = { key: i };
    row.forEach((v, colIdx) => {
      obj[`col_${colIdx}`] = v;
    });
    return obj;
  });

  const exportCSV = () => {
    const csvContent = '\uFEFF' + rowsToCsv([headerRow, ...dataRows]);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'ข้อมูลตาราง.csv');
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
    link.setAttribute('download', `กราฟ_${columns[1]?.title || 'ข้อมูล'}.png`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        marginBottom: 12,
        overflowX: 'auto',
        border: '1px solid #e1e4e8',
        color: '#1f2328',
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
        <div>
          {isChartable && (
            <Segmented
              size="small"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: 'ตาราง', value: 'table', icon: <TableOutlined /> },
                { label: 'กราฟแท่ง', value: 'bar', icon: <BarChartOutlined /> },
                { label: 'พายชาร์ต', value: 'pie', icon: <PieChartOutlined /> },
              ]}
            />
          )}
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
          {isChartable && viewMode !== 'table' && (
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
          )}
        </div>
      </div>

      {viewMode === 'table' ? (
        <Table
          dataSource={dataSource}
          columns={columns}
          size="small"
          pagination={false}
          bordered
        />
      ) : viewMode === 'pie' ? (
        <EChart
          onChartReady={setChartInstance}
          option={pieOption(
            chartData.map((item) => ({ name: item.name, value: item.col_1 })),
            {
              colors: COLORS,
              radius: ['0%', '68%'],
            }
          )}
          style={{ height: 250 }}
        />
      ) : (
        <EChart
          onChartReady={setChartInstance}
          option={barOption(
            chartData,
            [
              {
                key: 'col_1',
                name: columns[1]?.title || 'Value',
                color: '#1a7f37',
              },
            ],
            { rotate: -45, grid: { bottom: 72 } }
          )}
          style={{ height: 250 }}
        />
      )}
    </div>
  );
}

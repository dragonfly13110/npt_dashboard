import { useState } from 'react';
import { Table, Segmented } from 'antd';
import { TableOutlined, BarChartOutlined, PieChartOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2'];

export default function SmartTable({ rawLines }) {
    if (rawLines.length < 3) return <pre>{rawLines.join('\n')}</pre>;
    
    // Parse table and cleanup separators
    const headerRow = rawLines[0].split('|').map(s => s.trim()).filter(Boolean);
    const dataRows = rawLines.slice(2).map(r => r.split('|').map(s => s.trim()).filter(Boolean)).filter(r => r.length > 0);
    
    const [viewMode, setViewMode] = useState('table');
    
    if (headerRow.length === 0 || dataRows.length === 0) return <pre>{rawLines.join('\n')}</pre>;

    const columns = headerRow.map((h, i) => ({
        title: h,
        dataIndex: `col_${i}`,
        key: `col_${i}`
    }));
    
    let isChartable = false;
    let chartData = [];
    
    // Check if the table has data that can be charted
    if (columns.length >= 2) {
       chartData = dataRows.map((row) => {
           const obj = { name: row[0] };
           row.forEach((v, colIdx) => {
               const val = v.replace(/,/g, ''); // Fix commas
               obj[`col_${colIdx}`] = (!isNaN(val) && val !== '') ? Number(val) : v;
           });
           return obj;
       });
       
       // Exclude "Total" rows from charts so they don't break the scale
       chartData = chartData.filter(item => {
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

    return (
        <div style={{ background: '#fff', borderRadius: 8, padding: 12, marginTop: 12, marginBottom: 12, overflowX: 'auto', border: '1px solid #e1e4e8', color: '#1f2328' }}>
            {isChartable && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <Segmented 
                        size="small"
                        value={viewMode}
                        onChange={setViewMode}
                        options={[
                            { label: 'ตาราง', value: 'table', icon: <TableOutlined /> },
                            { label: 'กราฟแท่ง', value: 'bar', icon: <BarChartOutlined /> },
                            { label: 'พายชาร์ต', value: 'pie', icon: <PieChartOutlined /> }
                        ]}
                    />
                </div>
            )}
            
            {viewMode === 'table' ? (
                <Table 
                    dataSource={dataSource} 
                    columns={columns} 
                    size="small" 
                    pagination={false} 
                    bordered
                />
            ) : viewMode === 'pie' ? (
                 <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={chartData} dataKey="col_1" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                         {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                 </ResponsiveContainer>
            ) : (
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} tick={{fontSize: 11}} />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="col_1" fill="#1a7f37" radius={[4,4,0,0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

import React from 'react';
import { Table, Tag, Tooltip, Badge, Breadcrumb, Select, DatePicker } from 'antd';
import { ClockCircleOutlined, HomeOutlined, SafetyCertificateOutlined, DatabaseOutlined, FileAddOutlined } from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { Link } from 'react-router-dom';
import { useApiCache } from '../../hooks/useApiCache';

const { RangePicker } = DatePicker;

const groupConfig = [
    { group: 'ยุทธศาสตร์ฯ', icon: '🎯', color: '#1565c0', tables: [
        { table: 'agricultural_areas', label: 'พื้นที่การเกษตร' },
        { table: 'learning_centers', label: 'ศพก.' },
        { table: 'disasters', label: 'ภัยพิบัติ' },
    ]},
    { group: 'ส่งเสริมการผลิต', icon: '🌱', color: '#43a047', tables: [
        { table: 'large_plots', label: 'แปลงใหญ่' },
        { table: 'certifications', label: 'มาตรฐาน GAP' },
        { table: 'crop_production', label: 'ผลผลิตพืช' },
    ]},
    { group: 'พัฒนาเกษตรกร', icon: '🤝', color: '#6a1b9a', tables: [
        { table: 'community_enterprises', label: 'วิสาหกิจ' },
        { table: 'smart_farmers', label: 'เกษตรกรรุ่นใหม่' },
        { table: 'farmer_groups', label: 'กลุ่มแม่บ้าน' },
        { table: 'farmer_institutes', label: 'สถาบันเกษตรกร' },
        { table: 'agri_tourism', label: 'ท่องเที่ยวเกษตร' },
    ]},
    { group: 'อารักขาพืช', icon: '🛡️', color: '#e65100', tables: [
        { table: 'forecast_plots', label: 'แปลงพยากรณ์' },
        { table: 'pest_centers', label: 'ศจช.' },
        { table: 'soil_fertilizer_centers', label: 'ศดปช.' },
        { table: 'fire_hotspots', label: 'จุดเฝ้าระวัง PM2.5' },
    ]},
];

const allTables = groupConfig.flatMap(g => g.tables.map(t => ({ ...t, group: g.group, groupIcon: g.icon, groupColor: g.color })));

// Group records into batches by table+time window (5-minute interval)
function groupIntoBatches(records) {
    const BATCH_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
    const batches = [];
    
    // Sort by table then by created_at
    const sorted = [...records].sort((a, b) => {
        if (a.tableName !== b.tableName) return a.tableName.localeCompare(b.tableName);
        return new Date(a.created_at) - new Date(b.created_at);
    });
    
    let currentBatch = null;
    
    for (const record of sorted) {
        const recordTime = new Date(record.created_at).getTime();
        
        if (
            currentBatch &&
            currentBatch.tableName === record.tableName &&
            Math.abs(recordTime - currentBatch.lastTime) <= BATCH_WINDOW_MS
        ) {
            // Add to existing batch
            currentBatch.count += 1;
            currentBatch.lastTime = recordTime;
            currentBatch.endTime = record.created_at;
            currentBatch.names.push(record.name);
        } else {
            // Start a new batch
            if (currentBatch) batches.push(currentBatch);
            currentBatch = {
                tableName: record.tableName,
                tableLabel: record.tableLabel,
                group: record.group,
                icon: record.icon,
                color: record.color,
                count: 1,
                startTime: record.created_at,
                endTime: record.created_at,
                lastTime: recordTime,
                names: [record.name],
            };
        }
    }
    if (currentBatch) batches.push(currentBatch);
    
    // Sort batches by most recent startTime descending
    batches.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    
    // Assign unique IDs
    return batches.map((b, i) => ({
        ...b,
        id: `batch-${i}`,
        sampleNames: b.names.slice(0, 5), // keep top 5 names for tooltip
    }));
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'เมื่อสักครู่';
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateFull(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { 
        day: 'numeric', month: 'long', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('th-TH', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

const fetchAllRecentActivities = async () => {
    const promises = allTables.map(async (tbl) => {
        try {
            const { data, error } = await supabase
                .from(tbl.table)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (!error && data?.length) {
                return data.map(row => ({
                    tableName: tbl.table,
                    tableLabel: tbl.label,
                    group: tbl.group,
                    icon: tbl.groupIcon,
                    color: tbl.groupColor,
                    name: row.name || row.full_name || row.project_name || row.center_name || row.district || tbl.label,
                    created_at: row.created_at,
                }));
            }
        } catch { /* skip */ }
        return [];
    });

    const results = await Promise.all(promises);
    const allRecords = results.flat();
    return groupIntoBatches(allRecords);
};

export default function RecentActivities() {
    const { data: filteredBatches = [], isLoading: loading } = useApiCache(
        'admin-recent-activities',
        fetchAllRecentActivities,
        { staleMinutes: 5 } // cache less to keep recent data mostly fresh
    );

    const totalRecords = filteredBatches.reduce((sum, b) => sum + b.count, 0);

    const columns = [
        {
            title: 'เวลาที่ดำเนินการ',
            dataIndex: 'startTime',
            key: 'startTime',
            width: 220,
            render: (text, record) => (
                <Tooltip title={
                    record.startTime === record.endTime 
                        ? formatDateFull(text)
                        : `${formatDateFull(record.startTime)} ถึง ${formatDateFull(record.endTime)}`
                }>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ClockCircleOutlined style={{ color: '#8b949e' }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{formatTimeAgo(text)}</span>
                            <span style={{ color: '#8b949e', fontSize: 12 }}>
                                {formatDateTime(text)}
                            </span>
                        </div>
                    </div>
                </Tooltip>
            )
        },
        {
            title: 'กลุ่มงาน / หมวดหมู่',
            dataIndex: 'group',
            key: 'group',
            width: 200,
            filters: groupConfig.map(g => ({ text: `${g.icon} ${g.group}`, value: g.group })),
            onFilter: (value, record) => record.group === value,
            render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{record.icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, color: record.color }}>{text}</span>
                        <span style={{ fontSize: 12, color: '#656d76' }}>{record.tableLabel}</span>
                    </div>
                </div>
            )
        },
        {
            title: 'การดำเนินการ',
            key: 'action',
            width: 180,
            render: () => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileAddOutlined style={{ color: '#43a047', fontSize: 16 }} />
                    <span style={{ fontWeight: 600 }}>
                        เพิ่ม/อัปเดตข้อมูล
                    </span>
                </div>
            )
        },
        {
            title: 'จำนวน (รายการ)',
            dataIndex: 'count',
            key: 'count',
            width: 150,
            sorter: (a, b) => a.count - b.count,
            render: (count, record) => (
                <Tooltip 
                    title={
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>ตัวอย่างข้อมูล:</div>
                            {record.sampleNames.map((n, i) => (
                                <div key={i}>• {n}</div>
                            ))}
                            {record.count > 5 && <div style={{ color: '#aaa', marginTop: 4 }}>...และอีก {record.count - 5} รายการ</div>}
                        </div>
                    }
                >
                    <Badge 
                        count={`${count} รายการ`} 
                        style={{ 
                            backgroundColor: count >= 100 ? '#f44336' : count >= 10 ? '#ff9800' : '#43a047',
                            fontSize: 13,
                            fontWeight: 600,
                            padding: '0 12px',
                            cursor: 'pointer',
                        }} 
                    />
                </Tooltip>
            )
        },
    ];

    return (
        <div className="crud-container">
            <div className="md-page-header">
                <h2>🕐 กิจกรรมล่าสุดทั้งหมด</h2>
                <p>
                    แสดงสรุปการเพิ่ม/อัปเดตข้อมูลเป็นรายครั้ง จากทุกกลุ่มงานในระบบ
                    {' '}(ข้อมูลที่ถูกเพิ่มในช่วงเวลาใกล้เคียงกัน ±5 นาที จะถูกรวมเป็นครั้งเดียว)
                </p>
            </div>

            {/* Summary stats */}
            <div style={{ 
                display: 'flex', 
                gap: 16, 
                marginBottom: 16, 
                flexWrap: 'wrap' 
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)',
                    borderRadius: 12,
                    padding: '14px 24px',
                    color: '#fff',
                    minWidth: 160,
                }}>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>จำนวนครั้งทั้งหมด</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{filteredBatches.length}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>ครั้ง</div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #43a047 0%, #66bb6a 100%)',
                    borderRadius: 12,
                    padding: '14px 24px',
                    color: '#fff',
                    minWidth: 160,
                }}>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>รายการข้อมูลรวม</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{totalRecords.toLocaleString()}</div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>รายการ</div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #6a1b9a 0%, #ab47bc 100%)',
                    borderRadius: 12,
                    padding: '14px 24px',
                    color: '#fff',
                    minWidth: 160,
                }}>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>เฉลี่ยต่อครั้ง</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>
                        {filteredBatches.length > 0 
                            ? Math.round(totalRecords / filteredBatches.length).toLocaleString() 
                            : 0}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>รายการ/ครั้ง</div>
                </div>
            </div>

            <Table 
                dataSource={filteredBatches}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} จาก ${total} ครั้ง`
                }}
            />
        </div>
    );
}

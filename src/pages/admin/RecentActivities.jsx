import React, { useEffect, useState } from 'react';
import { Table, Tag, Tooltip, Breadcrumb } from 'antd';
import { ClockCircleOutlined, HomeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { Link } from 'react-router-dom';

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

export default function RecentActivities() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivities();
    }, []);

    const loadActivities = async () => {
        setLoading(true);
        const acts = [];
        
        // Fetch up to 20 recent records from each table
        for (const tbl of allTables) {
            try {
                const { data, error } = await supabase
                    .from(tbl.table)
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(20);
                    
                if (!error && data?.length) {
                    data.forEach(row => {
                        acts.push({
                            id: `${tbl.table}-${row.id || Math.random()}`,
                            table: tbl.label,
                            group: tbl.group,
                            icon: tbl.groupIcon,
                            color: tbl.groupColor,
                            name: row.name || row.full_name || row.project_name || row.center_name || row.district || tbl.label,
                            created_at: row.created_at,
                        });
                    });
                }
            } catch { /* skip */ }
        }
        
        // Sort all accumulated records by created_at descending
        acts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        // Limit to latest 100 activities overall
        setActivities(acts.slice(0, 100));
        setLoading(false);
    };

    const columns = [
        {
            title: 'กลุ่มงาน / หมวดหมู่',
            dataIndex: 'group',
            key: 'group',
            width: 200,
            render: (text, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{record.icon}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, color: record.color }}>{text}</span>
                        <span style={{ fontSize: 12, color: '#656d76' }}>{record.table}</span>
                    </div>
                </div>
            )
        },
        {
            title: 'รายการข้อมูล',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <strong>{text}</strong>
        },
        {
            title: 'เวลาที่บันทึก/อัปเดต',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 250,
            render: (text) => (
                <Tooltip title={formatDateFull(text)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ClockCircleOutlined style={{ color: '#8b949e' }} />
                        <span>{formatTimeAgo(text)}</span>
                        <span style={{ color: '#8b949e', fontSize: 12 }}>({new Date(text).toLocaleDateString('th-TH')})</span>
                    </div>
                </Tooltip>
            )
        }
    ];

    return (
        <div className="crud-container">
            <div className="md-page-header">
                <h2>🕐 กิจกรรมล่าสุดทั้งหมด</h2>
                <p>แสดงรายการข้อมูลที่มีการเพิ่มหรืออัปเดตล่าสุด 100 รายการ จากทุกกลุ่มงานในระบบ</p>
            </div>

            <Table 
                dataSource={activities}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{
                    pageSize: 15,
                    showSizeChanger: true,
                    pageSizeOptions: ['15', '30', '50', '100'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} จาก ${total} รายการ`
                }}
            />
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Select, DatePicker, Button, Empty, Input, Space } from 'antd';
import {
    SearchOutlined, ReloadOutlined, HistoryOutlined
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import dayjs from 'dayjs';

const ACTION_COLORS = {
    CREATE: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
};

const ACTION_LABELS = {
    CREATE: 'เพิ่ม',
    UPDATE: 'แก้ไข',
    DELETE: 'ลบ',
};

const TABLE_LABELS = {
    personnel: 'บุคลากร',
    assets: 'พัสดุ/ครุภัณฑ์',
    budgets: 'งบประมาณ',
    farmer_registry: 'ทะเบียนเกษตรกร',
    gis_areas: 'พิกัด GIS',
    disasters: 'ภัยพิบัติ',
    kpi_plans: 'แผน/KPI',
    large_plots: 'แปลงใหญ่',
    learning_centers: 'ศพก.',
    certifications: 'มาตรฐาน GAP',
    crop_production: 'ผลผลิตพืช',
    community_enterprises: 'วิสาหกิจชุมชน',
    smart_farmers: 'เกษตรกรรุ่นใหม่',
    farmer_groups: 'กลุ่มแม่บ้าน/ยุวฯ',
    agri_tourism: 'ท่องเที่ยวเกษตร',
    forecast_plots: 'แปลงพยากรณ์',
    pest_centers: 'ศจช.',
    biocontrol_stock: 'ชีวภัณฑ์',
    fire_hotspots: 'จุดเฝ้าระวัง PM2.5',
};

export default function AuditLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
    const [filterAction, setFilterAction] = useState(null);
    const [filterTable, setFilterTable] = useState(null);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const from = (pagination.current - 1) * pagination.pageSize;
            const to = from + pagination.pageSize - 1;

            let query = supabase
                .from('audit_logs')
                .select('*', { count: 'exact' });

            if (filterAction) query = query.eq('action', filterAction);
            if (filterTable) query = query.eq('table_name', filterTable);

            query = query.order('created_at', { ascending: false }).range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;
            setLogs(data || []);
            setTotal(count || 0);
        } catch (err) {
            console.error('Error loading audit logs:', err);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination, pagination.current, pagination.pageSize, filterAction, filterTable]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const columns = [
        {
            title: 'วันเวลา',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 180,
            render: (val) => val ? dayjs(val).format('DD/MM/YYYY HH:mm:ss') : '-',
        },
        {
            title: 'ผู้ใช้',
            dataIndex: 'user_email',
            key: 'user_email',
            width: 200,
            render: (val) => val || '-',
        },
        {
            title: 'การกระทำ',
            dataIndex: 'action',
            key: 'action',
            width: 100,
            align: 'center',
            render: (val) => (
                <Tag color={ACTION_COLORS[val] || 'default'}>
                    {ACTION_LABELS[val] || val}
                </Tag>
            ),
        },
        {
            title: 'ตาราง',
            dataIndex: 'table_name',
            key: 'table_name',
            width: 160,
            render: (val) => TABLE_LABELS[val] || val,
        },
        {
            title: 'รายละเอียด',
            key: 'detail',
            render: (_, record) => {
                if (record.action === 'CREATE' && record.new_data) {
                    const name = record.new_data.full_name || record.new_data.name ||
                        record.new_data.project_name || record.new_data.enterprise_name ||
                        record.new_data.plot_name || record.new_data.pest_name ||
                        record.new_data.spot_name || record.new_data.center_name ||
                        record.new_data.crop_name || record.new_data.farm_name ||
                        record.new_data.group_name || record.new_data.product_name ||
                        record.new_data.area_name || record.new_data.kpi_name || '';
                    return <span style={{ color: '#1a7f37' }}>เพิ่ม: {name}</span>;
                }
                if (record.action === 'DELETE' && record.old_data) {
                    const name = record.old_data.full_name || record.old_data.name ||
                        record.old_data.project_name || record.old_data.enterprise_name ||
                        record.old_data.plot_name || record.old_data.pest_name ||
                        record.old_data.spot_name || record.old_data.center_name ||
                        record.old_data.crop_name || record.old_data.farm_name ||
                        record.old_data.group_name || record.old_data.product_name ||
                        record.old_data.area_name || record.old_data.kpi_name || '';
                    return <span style={{ color: '#cf222e' }}>ลบ: {name}</span>;
                }
                if (record.action === 'UPDATE' && record.new_data) {
                    const fields = Object.keys(record.new_data).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
                    return <span style={{ color: '#0969da' }}>แก้ไข {fields.length} ฟิลด์</span>;
                }
                return '-';
            },
        },
    ];

    return (
        <div className="crud-container">
            <div className="crud-header">
                <div className="crud-header-left">
                    <span className="crud-title">
                        <HistoryOutlined style={{ marginRight: 8 }} />
                        ประวัติการแก้ไขข้อมูล
                    </span>
                    <Tag className="crud-count">{total} รายการ</Tag>
                </div>
                <div className="crud-header-right">
                    <Select
                        placeholder="ประเภท"
                        allowClear
                        value={filterAction}
                        onChange={val => { setFilterAction(val); setPagination(p => ({ ...p, current: 1 })); }}
                        style={{ width: 120 }}
                        options={[
                            { label: '✅ เพิ่ม', value: 'CREATE' },
                            { label: '✏️ แก้ไข', value: 'UPDATE' },
                            { label: '🗑️ ลบ', value: 'DELETE' },
                        ]}
                    />
                    <Select
                        placeholder="ตาราง"
                        allowClear
                        value={filterTable}
                        onChange={val => { setFilterTable(val); setPagination(p => ({ ...p, current: 1 })); }}
                        style={{ width: 180 }}
                        showSearch
                        filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
                        options={Object.entries(TABLE_LABELS).map(([value, label]) => ({ label, value }))}
                    />
                    <Button icon={<ReloadOutlined />} onClick={loadLogs} className="export-btn">
                        รีเฟรช
                    </Button>
                </div>
            </div>

            <Table
                dataSource={logs}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total,
                    showSizeChanger: true,
                    showTotal: (t) => `ทั้งหมด ${t} รายการ`,
                    pageSizeOptions: ['10', '20', '50', '100'],
                    onChange: (page, pageSize) => setPagination({ current: page, pageSize }),
                }}
                locale={{ emptyText: <Empty description="ยังไม่มีประวัติการแก้ไข" /> }}
                scroll={{ x: 'max-content' }}
            />
        </div>
    );
}

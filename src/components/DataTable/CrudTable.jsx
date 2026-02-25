import { useState, useEffect, useCallback } from 'react';
import {
    Table, Button, Input, Modal, Form, Space, Popconfirm, Tag, Tooltip, Empty
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, DownloadOutlined, ReloadOutlined, UploadOutlined
} from '@ant-design/icons';
import { useSupabaseCrud } from '../../hooks/useSupabase';
import CsvImportModal from './CsvImportModal';

export default function CrudTable({ tableName, title, columns, formFields, searchField }) {
    const { data, loading, total, fetchData, createRecord, updateRecord, deleteRecord } = useSupabaseCrud(tableName);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [form] = Form.useForm();

    const loadData = useCallback(() => {
        fetchData({ page: pagination.current, pageSize: pagination.pageSize, search, searchField });
    }, [fetchData, pagination.current, pagination.pageSize, search, searchField]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleAdd = () => {
        setEditingRecord(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        form.setFieldsValue(record);
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        const ok = await deleteRecord(id);
        if (ok) loadData();
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            let ok;
            if (editingRecord) {
                ok = await updateRecord(editingRecord.id, values);
            } else {
                ok = await createRecord(values);
            }
            if (ok) {
                setModalOpen(false);
                form.resetFields();
                loadData();
            }
        } catch (err) {
            /* validation error, ant handles display */
        }
    };

    const handleTableChange = (pag) => {
        setPagination({ current: pag.current, pageSize: pag.pageSize });
    };

    const handleSearch = (value) => {
        setSearch(value);
        setPagination({ ...pagination, current: 1 });
    };

    const handleExportCSV = () => {
        if (!data.length) return;
        const headers = columns.filter(c => c.dataIndex).map(c => c.title);
        const keys = columns.filter(c => c.dataIndex).map(c => c.dataIndex);
        const csvContent = [
            headers.join(','),
            ...data.map(row => keys.map(k => `"${row[k] ?? ''}"`).join(','))
        ].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${tableName}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const actionColumn = {
        title: 'จัดการ',
        key: 'actions',
        width: 120,
        align: 'center',
        render: (_, record) => (
            <Space size={4}>
                <Tooltip title="แก้ไข">
                    <Button className="action-btn edit" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                </Tooltip>
                <Popconfirm
                    title="ยืนยันการลบ"
                    description="คุณต้องการลบข้อมูลนี้ใช่หรือไม่?"
                    onConfirm={() => handleDelete(record.id)}
                    okText="ลบ"
                    cancelText="ยกเลิก"
                    okButtonProps={{ danger: true }}
                >
                    <Tooltip title="ลบ">
                        <Button className="action-btn delete" icon={<DeleteOutlined />} />
                    </Tooltip>
                </Popconfirm>
            </Space>
        ),
    };

    const allColumns = [...columns, actionColumn];

    return (
        <div className="crud-container">
            <div className="crud-header">
                <div className="crud-header-left">
                    <span className="crud-title">{title}</span>
                    <Tag className="crud-count">{total} รายการ</Tag>
                </div>
                <div className="crud-header-right">
                    {searchField && (
                        <Input.Search
                            placeholder="ค้นหา..."
                            allowClear
                            onSearch={handleSearch}
                            style={{ width: 220 }}
                            prefix={<SearchOutlined />}
                        />
                    )}
                    <Tooltip title="รีเฟรช">
                        <Button icon={<ReloadOutlined />} onClick={loadData} className="export-btn" />
                    </Tooltip>
                    <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)} className="export-btn">
                        Import CSV
                    </Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExportCSV} className="export-btn">
                        Export CSV
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="add-btn">
                        เพิ่มข้อมูล
                    </Button>
                </div>
            </div>

            <Table
                dataSource={data}
                columns={allColumns}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total,
                    showSizeChanger: true,
                    showTotal: (t) => `ทั้งหมด ${t} รายการ`,
                    pageSizeOptions: ['10', '20', '50'],
                }}
                onChange={handleTableChange}
                locale={{ emptyText: <Empty description="ยังไม่มีข้อมูล" /> }}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title={editingRecord ? `แก้ไข${title}` : `เพิ่ม${title}`}
                open={modalOpen}
                onCancel={() => { setModalOpen(false); form.resetFields(); }}
                onOk={handleSubmit}
                okText={editingRecord ? 'บันทึก' : 'เพิ่ม'}
                cancelText="ยกเลิก"
                width={640}
                className="crud-modal"
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    {formFields}
                </Form>
            </Modal>

            <CsvImportModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                tableName={tableName}
                columns={columns}
                onSuccess={loadData}
            />
        </div>
    );
}

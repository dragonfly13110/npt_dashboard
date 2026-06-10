import React, { useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Empty,
  Card,
  Row,
  Col,
  Rate,
  Popconfirm,
  message,
  Select,
  Space,
  Tooltip,
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  LikeOutlined,
  UserOutlined,
  StarOutlined,
  DashboardOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import dayjs from 'dayjs';
import { useApiCache } from '../../hooks/useApiCache';

export default function WebsiteEvaluations() {
  const [filterUserType, setFilterUserType] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  const fetchEvaluations = async () => {
    let query = supabase
      .from('website_evaluations')
      .select('*', { count: 'exact' });

    if (filterUserType) {
      query = query.eq('user_type', filterUserType);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], total: count || 0 };
  };

  const queryKey = ['admin-website-evaluations', filterUserType];
  const {
    data: result = { data: [], total: 0 },
    isLoading: loading,
    refetch: loadData,
  } = useApiCache(queryKey, fetchEvaluations, { staleMinutes: 3 });

  const evaluations = result.data;
  const total = result.total;

  // Calculate statistics
  const usabilitySum = evaluations.reduce((s, e) => s + e.rating_usability, 0);
  const infoSum = evaluations.reduce((s, e) => s + e.rating_information, 0);
  const speedSum = evaluations.reduce((s, e) => s + e.rating_speed, 0);
  const count = evaluations.length || 1;

  const avgUsability = (usabilitySum / count).toFixed(1);
  const avgInfo = (infoSum / count).toFixed(1);
  const avgSpeed = (speedSum / count).toFixed(1);
  const avgOverall = (
    (usabilitySum + infoSum + speedSum) /
    (count * 3)
  ).toFixed(1);

  // Group user types count
  const typeCounts = evaluations.reduce((acc, curr) => {
    acc[curr.user_type] = (acc[curr.user_type] || 0) + 1;
    return acc;
  }, {});

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('website_evaluations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      message.success('ลบข้อมูลการประเมินเรียบร้อยแล้วค่ะ');
      loadData();
    } catch (err) {
      console.error('Error deleting evaluation:', err);
      message.error('ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const columns = [
    {
      title: 'วันเวลาที่ประเมิน',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY HH:mm:ss') : '-'),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at),
    },
    {
      title: 'กลุ่มผู้ใช้งาน',
      dataIndex: 'user_type',
      key: 'user_type',
      width: 140,
      render: (val) => {
        let color = 'blue';
        if (val === 'เกษตรกร') color = 'green';
        if (val === 'เจ้าหน้าที่เกษตร') color = 'gold';
        if (val === 'ผู้ประกอบการ') color = 'purple';
        if (val === 'นักเรียนนักศึกษา') color = 'cyan';
        return (
          <Tag
            color={color}
            style={{
              fontSize: '13px',
              padding: '2px 8px',
              borderRadius: '4px',
            }}
          >
            {val}
          </Tag>
        );
      },
    },
    {
      title: '1. ความง่ายในการใช้งาน',
      dataIndex: 'rating_usability',
      key: 'rating_usability',
      width: 160,
      align: 'center',
      render: (val) => (
        <Rate
          disabled
          value={val}
          style={{ fontSize: '14px', color: '#f59e0b' }}
        />
      ),
    },
    {
      title: '2. ประโยชน์ของข้อมูล',
      dataIndex: 'rating_information',
      key: 'rating_information',
      width: 160,
      align: 'center',
      render: (val) => (
        <Rate
          disabled
          value={val}
          style={{ fontSize: '14px', color: '#f59e0b' }}
        />
      ),
    },
    {
      title: '3. ความเร็วของระบบ',
      dataIndex: 'rating_speed',
      key: 'rating_speed',
      width: 160,
      align: 'center',
      render: (val) => (
        <Rate
          disabled
          value={val}
          style={{ fontSize: '14px', color: '#f59e0b' }}
        />
      ),
    },
    {
      title: 'ข้อคิดเห็น / เสนอแนะเพิ่มเติม',
      dataIndex: 'comments',
      key: 'comments',
      render: (val) =>
        val ? (
          <span style={{ color: '#334155', fontSize: '13.5px' }}>{val}</span>
        ) : (
          <span
            style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}
          >
            ไม่มีความคิดเห็นเพิ่มเติม
          </span>
        ),
    },
    {
      title: 'จัดการ',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title="ยืนยันการลบข้อมูลการประเมินนี้?"
          onConfirm={() => handleDelete(record.id)}
          okText="ลบ"
          cancelText="ยกเลิก"
          okButtonProps={{ danger: true }}
        >
          <Tooltip title="ลบรายการ">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div
      className="crud-container"
      style={{ padding: '24px', fontFamily: "'Kanit', sans-serif" }}
    >
      {/* Header */}
      <div
        className="crud-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div
          className="crud-header-left"
          style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <span
            className="crud-title"
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <LikeOutlined style={{ color: '#16a34a' }} />
            ผลการประเมินและข้อคิดเห็นเว็บไซต์
          </span>
          <Tag
            color="green"
            style={{
              fontSize: '14px',
              borderRadius: '12px',
              padding: '2px 10px',
            }}
          >
            ทั้งหมด {total} รายการ
          </Tag>
        </div>
        <div className="crud-header-right">
          <Space size="middle">
            <Select
              placeholder="กรองตามกลุ่มผู้ใช้งาน"
              allowClear
              value={filterUserType}
              onChange={(val) => {
                setFilterUserType(val);
                setPagination((p) => ({ ...p, current: 1 }));
              }}
              style={{ width: 220 }}
              options={[
                { label: '🌾 เกษตรกร', value: 'เกษตรกร' },
                { label: 'เจ้าหน้าที่เกษตร', value: 'เจ้าหน้าที่เกษตร' },
                { label: 'ผู้ประกอบการ', value: 'ผู้ประกอบการ' },
                { label: 'นักเรียนนักศึกษา', value: 'นักเรียนนักศึกษา' },
                { label: 'อื่น ๆ', value: 'อื่น ๆ' },
              ]}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              type="primary"
              style={{
                background: '#16a34a',
                borderColor: '#16a34a',
                borderRadius: '6px',
              }}
            >
              รีเฟรช
            </Button>
          </Space>
        </div>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  คะแนนเฉลี่ยรวม
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '4px 0',
                  }}
                >
                  {avgOverall}{' '}
                  <span style={{ fontSize: '16px', color: '#94a3b8' }}>
                    / 5.0
                  </span>
                </div>
              </div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: '#dcfce7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContents: 'center',
                  color: '#16a34a',
                  fontSize: '20px',
                  justifyContent: 'center',
                }}
              >
                <StarOutlined />
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Rate
                disabled
                allowHalf
                value={parseFloat(avgOverall)}
                style={{ fontSize: '12px', color: '#f59e0b' }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  1. ความง่ายในการใช้งาน
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '4px 0',
                  }}
                >
                  {avgUsability}{' '}
                  <span style={{ fontSize: '16px', color: '#94a3b8' }}>
                    / 5.0
                  </span>
                </div>
              </div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: '#dbeafe',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContents: 'center',
                  color: '#2563eb',
                  fontSize: '20px',
                  justifyContent: 'center',
                }}
              >
                <DashboardOutlined />
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Rate
                disabled
                allowHalf
                value={parseFloat(avgUsability)}
                style={{ fontSize: '12px', color: '#f59e0b' }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  2. ประโยชน์ของข้อมูล
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '4px 0',
                  }}
                >
                  {avgInfo}{' '}
                  <span style={{ fontSize: '16px', color: '#94a3b8' }}>
                    / 5.0
                  </span>
                </div>
              </div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: '#fef3c7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContents: 'center',
                  color: '#d97706',
                  fontSize: '20px',
                  justifyContent: 'center',
                }}
              >
                <StarOutlined />
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Rate
                disabled
                allowHalf
                value={parseFloat(avgInfo)}
                style={{ fontSize: '12px', color: '#f59e0b' }}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card
            bordered={false}
            style={{
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  3. ความเร็วของระบบ
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '4px 0',
                  }}
                >
                  {avgSpeed}{' '}
                  <span style={{ fontSize: '16px', color: '#94a3b8' }}>
                    / 5.0
                  </span>
                </div>
              </div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: '#f3e8ff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContents: 'center',
                  color: '#7c3aed',
                  fontSize: '20px',
                  justifyContent: 'center',
                }}
              >
                <ReloadOutlined />
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Rate
                disabled
                allowHalf
                value={parseFloat(avgSpeed)}
                style={{ fontSize: '12px', color: '#f59e0b' }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Users Breakdown Mini Bar */}
      <Card
        bordered={false}
        style={{
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          borderRadius: '12px',
        }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '20px',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
            สัดส่วนผู้ประเมิน:
          </span>
          {[
            'เกษตรกร',
            'เจ้าหน้าที่เกษตร',
            'ผู้ประกอบการ',
            'นักเรียนนักศึกษา',
            'อื่น ๆ',
          ].map((role) => {
            const count = typeCounts[role] || 0;
            const percentage =
              total > 0 ? ((count / total) * 100).toFixed(0) : 0;
            return (
              <div
                key={role}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span style={{ fontSize: '13px', fontWeight: 500 }}>
                  {role}
                </span>
                <Tag color="default" style={{ margin: 0 }}>
                  {count} ({percentage}%)
                </Tag>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Evaluations Table */}
      <Table
        dataSource={evaluations}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `ทั้งหมด ${t} รายการ`,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (page, pageSize) =>
            setPagination({ current: page, pageSize }),
        }}
        locale={{
          emptyText: <Empty description="ยังไม่มีข้อมูลการประเมินเข้ามาค่ะ" />,
        }}
        scroll={{ x: 'max-content' }}
        style={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      />
    </div>
  );
}

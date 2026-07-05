import { useEffect, useMemo, useState } from 'react';
import { Card, Col, Row, Select, Spin, Table, Tag } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import EChart from '../../components/widgets/EChart';
import { barOption, pieOption } from '../../components/charts/echartOptions';
import { PageHeader } from '../../components/widgets/SharedDashboardUI';
import { supabase } from '../../supabaseClient';
import fallbackRows from '../../data/production_costs_2567.json';

const money = (value) =>
  Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });

const percent = (value) =>
  `${Number(value || 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })}%`;

const costParts = [
  { key: 'seed_cost_baht', name: 'ค่าพันธุ์' },
  { key: 'fertilizer_cost_baht', name: 'ค่าปุ๋ย' },
  { key: 'pesticide_cost_baht', name: 'ค่ายา' },
  { key: 'service_cost_baht', name: 'ค่าจ้างเหมาบริการ' },
  { key: 'equipment_cost_baht', name: 'ค่าอุปกรณ์' },
  { key: 'fuel_cost_baht', name: 'ค่าน้ำมัน' },
  { key: 'repair_depreciation_cost_baht', name: 'ค่าซ่อม/เสื่อม' },
  { key: 'packaging_cost_baht', name: 'บรรจุภัณฑ์' },
  { key: 'other_cost_baht', name: 'อื่น ๆ' },
];

const columns = [
  { title: 'ปี', dataIndex: 'data_year', width: 76, align: 'center' },
  { title: 'พืช', dataIndex: 'crop_name', fixed: 'left', width: 130 },
  {
    title: 'ผลผลิตเฉลี่ย (กก./ไร่)',
    dataIndex: 'yield_kg_per_rai',
    align: 'right',
    render: money,
    sorter: (a, b) => a.yield_kg_per_rai - b.yield_kg_per_rai,
  },
  {
    title: 'มูลค่าเฉลี่ย (บาท/ไร่)',
    dataIndex: 'revenue_baht_per_rai',
    align: 'right',
    render: money,
    sorter: (a, b) => a.revenue_baht_per_rai - b.revenue_baht_per_rai,
  },
  {
    title: 'รวมค่าใช้จ่าย (บาท/ไร่)',
    dataIndex: 'total_cost_baht',
    align: 'right',
    render: money,
    sorter: (a, b) => a.total_cost_baht - b.total_cost_baht,
  },
  {
    title: 'กำไรสุทธิ (บาท/ไร่)',
    dataIndex: 'net_return_baht',
    align: 'right',
    render: (value) => (
      <Tag color={value >= 0 ? 'green' : 'red'} style={{ margin: 0 }}>
        {money(value)}
      </Tag>
    ),
    sorter: (a, b) => a.net_return_baht - b.net_return_baht,
  },
  {
    title: 'ต้นทุนต่อรายได้',
    dataIndex: 'cost_ratio',
    align: 'right',
    render: percent,
    sorter: (a, b) => a.cost_ratio - b.cost_ratio,
  },
  ...costParts.map((part) => ({
    title: part.name,
    dataIndex: part.key,
    align: 'right',
    render: money,
  })),
];

function withDerived(row) {
  const revenue = Number(row.revenue_baht_per_rai) || 0;
  const cost = Number(row.total_cost_baht) || 0;
  return {
    ...row,
    key: `${row.data_year}-${row.crop_name}`,
    net_return_baht: revenue - cost,
    cost_ratio: revenue > 0 ? (cost / revenue) * 100 : 0,
  };
}

export default function ProductionCosts() {
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [data, setData] = useState(fallbackRows);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.title = 'ต้นทุนการผลิต ปี 2567 นครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
  }, []);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);

    supabase
      .from('production_costs')
      .select('*')
      .order('data_year', { ascending: false })
      .order('crop_name')
      .then(({ data: dbRows, error }) => {
        if (!alive) return;
        if (!error && dbRows?.length) setData(dbRows);
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(() => data.map(withDerived), [data]);
  const filteredRows = useMemo(
    () =>
      selectedCrop
        ? rows.filter((row) => row.crop_name === selectedCrop)
        : rows,
    [rows, selectedCrop]
  );

  const summary = useMemo(() => {
    const topNet = [...rows].sort(
      (a, b) => b.net_return_baht - a.net_return_baht
    )[0];
    const highCost = [...rows].sort((a, b) => b.cost_ratio - a.cost_ratio)[0];
    const avgCost =
      rows.reduce((sum, row) => sum + row.total_cost_baht, 0) /
      Math.max(rows.length, 1);
    return { topNet, highCost, avgCost };
  }, [rows]);

  const barData = useMemo(
    () =>
      filteredRows.map((row) => ({
        name: row.crop_name,
        revenue: row.revenue_baht_per_rai,
        cost: row.total_cost_baht,
        net: row.net_return_baht,
      })),
    [filteredRows]
  );

  const costMix = useMemo(() => {
    const totals = costParts.map((part) => ({
      name: part.name,
      value: filteredRows.reduce(
        (sum, row) => sum + (Number(row[part.key]) || 0),
        0
      ),
    }));
    return totals
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  return (
    <div>
      <PageHeader
        title="ต้นทุนการผลิต ปี 2567"
        subtitle="เปรียบเทียบผลผลิต มูลค่า ต้นทุน และกำไรสุทธิต่อไร่จากตารางต้นทุนการผลิต"
        icon={DollarOutlined}
      />

      {isLoading ? (
        <div
          style={{
            height: 360,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spin size="large" tip="กำลังโหลดข้อมูลต้นทุน..." />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            {[
              { label: 'รายการพืช', value: `${rows.length} รายการ` },
              {
                label: 'ต้นทุนเฉลี่ย',
                value: `${money(summary.avgCost)} บาท/ไร่`,
              },
              {
                label: 'กำไรสุทธิสูงสุด',
                value: summary.topNet
                  ? `${summary.topNet.crop_name} ${money(summary.topNet.net_return_baht)}`
                  : '-',
              },
              {
                label: 'ต้นทุนต่อรายได้สูงสุด',
                value: summary.highCost
                  ? `${summary.highCost.crop_name} ${percent(summary.highCost.cost_ratio)}`
                  : '-',
              },
            ].map((item) => (
              <Col xs={24} sm={12} lg={6} key={item.label}>
                <Card size="small" style={{ borderRadius: 8, height: '100%' }}>
                  <div
                    style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      color: '#0f172a',
                      fontSize: 22,
                      fontWeight: 800,
                      marginTop: 4,
                    }}
                  >
                    {item.value}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 12,
            }}
          >
            <Select
              allowClear
              showSearch
              placeholder="เลือกพืช"
              value={selectedCrop}
              onChange={setSelectedCrop}
              style={{ minWidth: 220 }}
              options={rows.map((row) => ({
                label: row.crop_name,
                value: row.crop_name,
              }))}
            />
          </div>

          <Row gutter={[20, 20]} style={{ marginBottom: 20 }}>
            <Col xs={24} lg={14}>
              <Card
                title="มูลค่า เทียบต้นทุน และกำไรสุทธิต่อไร่"
                style={{ borderRadius: 8 }}
              >
                <div style={{ height: 360 }}>
                  <EChart
                    option={barOption(
                      barData,
                      [
                        { key: 'revenue', name: 'มูลค่าเฉลี่ย' },
                        { key: 'cost', name: 'รวมค่าใช้จ่าย' },
                        { key: 'net', name: 'กำไรสุทธิ' },
                      ],
                      {
                        unit: 'บาท/ไร่',
                        compact: true,
                        rotate: 30,
                        grid: { bottom: 72 },
                      }
                    )}
                  />
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card title="สัดส่วนรายการต้นทุน" style={{ borderRadius: 8 }}>
                <div style={{ height: 360 }}>
                  <EChart option={pieOption(costMix, { unit: 'บาท/ไร่' })} />
                </div>
              </Card>
            </Col>
          </Row>

          <Card title="ตารางต้นทุนการผลิต" style={{ borderRadius: 8 }}>
            <Table
              rowKey="key"
              columns={columns}
              dataSource={filteredRows}
              pagination={false}
              size="middle"
              scroll={{ x: 1600 }}
            />
          </Card>
        </>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { Form, Input, InputNumber } from 'antd';
import CrudTable from '../../components/DataTable/CrudTable';
import { supabase } from '../../supabaseClient';
import seedRows from '../../data/agri_tourism_seed.json';

const columns = [
  {
    title: 'ชื่อแหล่งท่องเที่ยว',
    dataIndex: 'spot_name',
    key: 'spot_name',
    width: 220,
    ellipsis: true,
  },
  { title: 'อำเภอ', dataIndex: 'district', key: 'district', width: 105 },
  { title: 'ตำบล', dataIndex: 'subdistrict', key: 'subdistrict', width: 110 },
  {
    title: 'ประเภท',
    dataIndex: 'spot_type',
    key: 'spot_type',
    width: 120,
    ellipsis: true,
  },
  {
    title: 'รหัสทะเบียน',
    dataIndex: 'registration_code',
    key: 'registration_code',
    width: 145,
  },
  { title: 'เบอร์โทร', dataIndex: 'phone', key: 'phone', width: 115 },
  {
    title: 'ผลประเมิน',
    dataIndex: 'evaluation',
    key: 'evaluation',
    width: 110,
  },
  {
    title: 'ละติจูด',
    dataIndex: 'latitude',
    key: 'latitude',
    width: 105,
    render: (value) => value ?? '',
  },
  {
    title: 'ลองจิจูด',
    dataIndex: 'longitude',
    key: 'longitude',
    width: 105,
    render: (value) => value ?? '',
  },
  {
    title: 'สินค้าหรือบริการ',
    dataIndex: 'description',
    key: 'description',
    width: 240,
    ellipsis: true,
  },
  {
    title: 'หมายเหตุ',
    dataIndex: 'notes',
    key: 'notes',
    width: 260,
    ellipsis: true,
  },
];

const formFields = (
  <>
    <Form.Item
      name="spot_name"
      label="ชื่อแหล่งท่องเที่ยว"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>
    <Form.Item name="district" label="อำเภอ">
      <Input />
    </Form.Item>
    <Form.Item name="spot_type" label="ประเภท">
      <Input placeholder="สวนเกษตร, ฟาร์มสเตย์" />
    </Form.Item>
    <Form.Item name="contact_person" label="ผู้ประสานงาน">
      <Input />
    </Form.Item>
    <Form.Item name="phone" label="เบอร์โทร">
      <Input />
    </Form.Item>
    <Form.Item name="latitude" label="ละติจูด">
      <InputNumber style={{ width: '100%' }} step={0.000001} />
    </Form.Item>
    <Form.Item name="longitude" label="ลองจิจูด">
      <InputNumber style={{ width: '100%' }} step={0.000001} />
    </Form.Item>
    <Form.Item name="description" label="รายละเอียด">
      <Input.TextArea rows={2} />
    </Form.Item>
  </>
);

const cleanRows = (rows) =>
  rows.map((row, index) => ({ id: row.id || `row-${index}`, ...row }));

async function getRows() {
  const { data, error } = await supabase
    .from('agri_tourism')
    .select('*')
    .order('created_at', { ascending: false });

  if (!error && data?.length) return cleanRows(data);
  return seedRows;
}

function applyLocalQuery(rows, query) {
  const {
    pagination,
    search,
    searchFields = [],
    searchField,
    filters = {},
    sorter,
    defaultSort,
  } = query;
  const fields = searchFields.length
    ? searchFields
    : [searchField].filter(Boolean);
  const needle = String(search || '')
    .trim()
    .toLowerCase();

  let data = rows.filter((row) => {
    const matchesSearch =
      !needle ||
      fields.some((field) =>
        String(row[field] || '')
          .toLowerCase()
          .includes(needle)
      );
    const matchesFilters = Object.entries(filters).every(
      ([key, value]) =>
        value === undefined ||
        value === null ||
        value === '' ||
        row[key] === value
    );
    return matchesSearch && matchesFilters;
  });

  const activeSort = sorter?.field && sorter?.order ? sorter : defaultSort;
  if (activeSort?.field) {
    data = [...data].sort((a, b) =>
      String(a[activeSort.field] || '').localeCompare(
        String(b[activeSort.field] || ''),
        'th'
      )
    );
    if (activeSort.order === 'descend') data.reverse();
  }

  const page = pagination.current || 1;
  const size = pagination.pageSize || 10;
  return {
    data: data.slice((page - 1) * size, page * size),
    total: data.length,
  };
}

export default function AgriTourism() {
  useEffect(() => {
    document.title = 'ท่องเที่ยวเชิงเกษตรนครปฐม | ศูนย์ข้อมูลการเกษตรนครปฐม';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'รวมแหล่งท่องเที่ยวเชิงเกษตรในจังหวัดนครปฐม พร้อมข้อมูลสถานที่ กิจกรรม และช่องทางติดต่อ'
      );
    }
  }, []);

  return (
    <CrudTable
      tableName="agri_tourism"
      title="แหล่งท่องเที่ยวเชิงเกษตร"
      columns={columns}
      formFields={formFields}
      searchField="spot_name"
      searchFields={[
        'spot_name',
        'district',
        'subdistrict',
        'description',
        'registration_code',
      ]}
      filterConfig={[
        {
          key: 'district',
          label: 'อำเภอ',
          options: [...new Set(seedRows.map((row) => row.district))],
        },
        {
          key: 'evaluation',
          label: 'ผลประเมิน',
          options: [
            ...new Set(seedRows.map((row) => row.evaluation).filter(Boolean)),
          ],
        },
      ]}
      fetchDataOverride={async (query) =>
        applyLocalQuery(await getRows(), query)
      }
      fetchAllOverride={getRows}
      defaultColumns={[
        'phone',
        'evaluation',
        'latitude',
        'longitude',
        'description',
      ]}
      scrollX={1570}
    />
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileExcelOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  DISTRICTS,
  FIELD_TYPES,
  applyGridPaste,
  createField,
  googleSheetUrlToCsvUrl,
  normalizeSchema,
  parseCsv,
  rowsToExportObjects,
  tabularRowsToAnswerRows,
  validateRows,
} from '../../utils/dataRequestGrid';

const { Text, Title } = Typography;
const DEFAULT_SCHEMA = [
  createField({ id: 'district', label: 'อำเภอ', type: 'select', required: true, options: DISTRICTS.join(','), order: 0 }),
  createField({ id: 'subdistrict', label: 'ตำบล', type: 'text', required: true, order: 1 }),
  createField({ id: 'reporter', label: 'ผู้รายงาน', type: 'text', required: true, order: 2 }),
  createField({ id: 'amount', label: 'จำนวน/พื้นที่', type: 'number', required: false, order: 3 }),
];

function statusTag(status) {
  if (status === 'published') return <Tag color="green">เปิดรับข้อมูล</Tag>;
  if (status === 'closed') return <Tag color="red">ปิดแล้ว</Tag>;
  return <Tag>ร่าง</Tag>;
}

function assignmentSummary(assignments = []) {
  const submitted = assignments.filter(a => a.status === 'submitted').length;
  return `${submitted}/${assignments.length}`;
}

function toOptions(options = '') {
  return String(options)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => ({ label: item, value: item }));
}

function fieldInput(field, value, onChange, error) {
  const status = error ? 'error' : undefined;
  if (field.type === 'number') {
    return <Input status={status} value={value ?? ''} onChange={e => onChange(e.target.value)} />;
  }
  if (field.type === 'date') {
    return <Input status={status} type="date" value={value ?? ''} onChange={e => onChange(e.target.value)} />;
  }
  if (field.type === 'select') {
    return (
      <Select
        status={status}
        value={value || undefined}
        onChange={onChange}
        options={toOptions(field.options)}
        style={{ minWidth: 160 }}
        placeholder="เลือก"
      />
    );
  }
  if (field.type === 'textarea') {
    return <Input.TextArea status={status} value={value ?? ''} onChange={e => onChange(e.target.value)} autoSize={{ minRows: 1, maxRows: 4 }} />;
  }
  return <Input status={status} value={value ?? ''} onChange={e => onChange(e.target.value)} />;
}

export default function DataRequests() {
  const { role, profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [responses, setResponses] = useState([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [requestForm] = Form.useForm();
  const [schema, setSchema] = useState(DEFAULT_SCHEMA);
  const [gridRows, setGridRows] = useState([{}]);
  const [entryMode, setEntryMode] = useState('grid');
  const [cellErrors, setCellErrors] = useState({});
  const [selectedSubmitDistrict, setSelectedSubmitDistrict] = useState(null);
  const isAdmin = role === 'admin';
  const isEditor = role === 'editor';
  const profileDistrict = DISTRICTS.includes(profile?.department) ? profile.department : null;

  const requestAssignments = useMemo(() => {
    return assignments.reduce((acc, item) => {
      if (!acc[item.request_id]) acc[item.request_id] = [];
      acc[item.request_id].push(item);
      return acc;
    }, {});
  }, [assignments]);

  const requestResponses = useMemo(() => {
    return responses.reduce((acc, item) => {
      if (!acc[item.request_id]) acc[item.request_id] = [];
      acc[item.request_id].push(item);
      return acc;
    }, {});
  }, [responses]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [requestResult, assignmentResult, responseResult] = await Promise.all([
        supabase.from('data_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('data_request_assignments').select('*').order('created_at', { ascending: true }),
        supabase.from('data_request_responses').select('*').order('submitted_at', { ascending: false }),
      ]);

      if (requestResult.error) throw requestResult.error;
      if (assignmentResult.error) throw assignmentResult.error;
      if (responseResult.error) throw responseResult.error;

      setRequests(requestResult.data || []);
      setAssignments(assignmentResult.data || []);
      setResponses(responseResult.data || []);
    } catch (err) {
      message.error(`โหลดคำขอข้อมูลไม่สำเร็จ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin || isEditor) loadData();
  }, [isAdmin, isEditor, loadData]);

  const openCreate = () => {
    setActiveRequest(null);
    setSchema(DEFAULT_SCHEMA);
    requestForm.resetFields();
    requestForm.setFieldsValue({
      title: '',
      description: '',
      deadline: dayjs().add(7, 'day'),
      districts: DISTRICTS,
      status: 'published',
    });
    setBuilderOpen(true);
  };

  const openEdit = (record) => {
    setActiveRequest(record);
    setSchema(normalizeSchema(record.schema));
    requestForm.setFieldsValue({
      title: record.title,
      description: record.description,
      sheet_url: record.sheet_url || '',
      deadline: record.deadline ? dayjs(record.deadline) : null,
      districts: (requestAssignments[record.id] || []).map(item => item.district),
      status: record.status,
    });
    setBuilderOpen(true);
  };

  const saveRequest = async () => {
    try {
      const values = await requestForm.validateFields();
      const cleanSchema = normalizeSchema(schema).filter(field => field.label.trim());
      if (!cleanSchema.length) {
        message.warning('ต้องมีคำถามอย่างน้อย 1 ช่อง');
        return;
      }

      const payload = {
        title: values.title,
        description: values.description || '',
        sheet_url: values.sheet_url || '',
        deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : null,
        status: values.status,
        schema: cleanSchema,
        updated_at: new Date().toISOString(),
      };

      let requestId = activeRequest?.id;
      if (activeRequest) {
        const { error } = await supabase.from('data_requests').update(payload).eq('id', activeRequest.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('data_requests')
          .insert([{ ...payload, created_by: user?.id }])
          .select('id')
          .single();
        if (error) throw error;
        requestId = data.id;
      }

      const selectedDistricts = values.districts || [];
      const existing = requestAssignments[requestId] || [];
      const existingDistricts = new Set(existing.map(item => item.district));
      const selectedSet = new Set(selectedDistricts);
      const toInsert = selectedDistricts
        .filter(district => !existingDistricts.has(district))
        .map(district => ({ request_id: requestId, district }));
      const toDelete = existing.filter(item => !selectedSet.has(item.district)).map(item => item.id);

      if (toInsert.length) {
        const { error } = await supabase.from('data_request_assignments').insert(toInsert);
        if (error) throw error;
      }
      if (toDelete.length) {
        const { error } = await supabase.from('data_request_assignments').delete().in('id', toDelete);
        if (error) throw error;
      }

      message.success('บันทึกคำขอข้อมูลแล้ว');
      setBuilderOpen(false);
      await loadData();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(`บันทึกไม่สำเร็จ: ${err.message}`);
    }
  };

  const updateField = (id, patch) => {
    setSchema(prev => normalizeSchema(prev.map(field => field.id === id ? { ...field, ...patch } : field)));
  };

  const addField = () => {
    setSchema(prev => [...prev, createField({ order: prev.length })]);
  };

  const removeField = (id) => {
    setSchema(prev => normalizeSchema(prev.filter(field => field.id !== id)));
  };

  const openFill = (record) => {
    const assignedDistricts = (requestAssignments[record.id] || []).map(item => item.district);
    const initialDistrict = profileDistrict || assignedDistricts[0] || null;
    const existingResponse = (requestResponses[record.id] || []).find(item => item.district === initialDistrict)
      || (requestResponses[record.id] || [])[0];
    const savedRows = Array.isArray(existingResponse?.answers)
      ? existingResponse.answers
      : existingResponse?.answers
        ? [existingResponse.answers]
        : [{}];
    setActiveRequest(record);
    setEntryMode('grid');
    setSelectedSubmitDistrict(initialDistrict);
    setGridRows(savedRows.length ? savedRows : [{}]);
    setCellErrors({});
    setFillOpen(true);
  };

  const submitRows = async () => {
    const cleanSchema = normalizeSchema(activeRequest.schema);
    const nonEmptyRows = gridRows.filter(row => Object.values(row || {}).some(value => String(value ?? '').trim() !== ''));
    const rows = nonEmptyRows.length ? nonEmptyRows : [{}];
    const errors = validateRows(rows, cleanSchema);
    setCellErrors(errors);
    if (Object.keys(errors).length) {
      message.warning('ตรวจพบข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง');
      return;
    }

    const district = profileDistrict || selectedSubmitDistrict || rows[0]?.district || (requestAssignments[activeRequest.id] || [])[0]?.district;
    if (!district) {
      message.error('ไม่พบอำเภอของผู้ส่งข้อมูล');
      return;
    }

    try {
      const now = new Date().toISOString();
      const { error: responseError } = await supabase.from('data_request_responses').upsert({
        request_id: activeRequest.id,
        district,
        answers: entryMode === 'form' ? rows[0] : rows,
        submitted_by: user?.id,
        submitted_at: now,
        updated_at: now,
      }, { onConflict: 'request_id,district' });
      if (responseError) throw responseError;

      const { error: assignmentError } = await supabase
        .from('data_request_assignments')
        .update({ status: 'submitted', submitted_at: now })
        .eq('request_id', activeRequest.id)
        .eq('district', district);
      if (assignmentError) throw assignmentError;

      message.success('ส่งข้อมูลแล้ว');
      setFillOpen(false);
      await loadData();
    } catch (err) {
      message.error(`ส่งข้อมูลไม่สำเร็จ: ${err.message}`);
    }
  };

  const downloadTemplate = (record = activeRequest) => {
    const cleanSchema = normalizeSchema(record.schema);
    const ws = XLSX.utils.aoa_to_sheet([cleanSchema.map(field => field.label)]);
    ws['!cols'] = cleanSchema.map(field => ({ wch: Math.max(field.label.length * 2, 15) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${record.title || 'data-request'}-template.xlsx`);
  };

  const importExcelRows = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const cleanSchema = normalizeSchema(activeRequest.schema);
        const rows = raw.slice(1)
          .filter(row => row?.some(cell => cell !== undefined && cell !== null && cell !== ''))
          .map(row => {
            const item = {};
            cleanSchema.forEach((field, index) => {
              item[field.id] = row[index] ?? '';
            });
            return item;
          });
        setGridRows(rows.length ? rows : [{}]);
        setCellErrors({});
        message.success(`นำเข้า ${rows.length} แถว`);
      } catch (err) {
        message.error(`อ่านไฟล์ Excel ไม่สำเร็จ: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const exportResults = (record) => {
    const cleanSchema = normalizeSchema(record.schema);
    const rows = (requestResponses[record.id] || []).flatMap(response => {
      const answerRows = Array.isArray(response.answers) ? response.answers : [response.answers];
      return answerRows.map(answer => ({
        อำเภอ: response.district,
        วันที่ส่ง: response.submitted_at ? dayjs(response.submitted_at).format('YYYY-MM-DD HH:mm') : '',
        ...rowsToExportObjects([answer], cleanSchema)[0],
      }));
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    XLSX.writeFile(wb, `${record.title || 'data-request'}-responses.xlsx`);
  };

  const syncGoogleSheet = async (record, districtOverride = null) => {
    const district = districtOverride || selectedSubmitDistrict || profileDistrict || (requestAssignments[record.id] || [])[0]?.district;
    if (!record.sheet_url) {
      message.warning('ยังไม่มี Google Sheet URL');
      return;
    }
    if (!district) {
      message.warning('เลือกอำเภอก่อน sync');
      return;
    }

    try {
      const csvUrl = googleSheetUrlToCsvUrl(record.sheet_url);
      const result = await fetch(csvUrl);
      if (!result.ok) throw new Error(`Google Sheet ตอบกลับ ${result.status}`);
      const csv = await result.text();
      const rows = tabularRowsToAnswerRows(parseCsv(csv), record.schema);
      const errors = validateRows(rows, record.schema);
      if (Object.keys(errors).length) {
        message.warning('ข้อมูลใน Sheet ยังไม่ผ่าน validation');
        setActiveRequest(record);
        setSelectedSubmitDistrict(district);
        setGridRows(rows.length ? rows : [{}]);
        setCellErrors(errors);
        setFillOpen(true);
        return;
      }

      const now = new Date().toISOString();
      const { error: responseError } = await supabase.from('data_request_responses').upsert({
        request_id: record.id,
        district,
        answers: rows,
        submitted_by: user?.id,
        submitted_at: now,
        updated_at: now,
      }, { onConflict: 'request_id,district' });
      if (responseError) throw responseError;

      const { error: assignmentError } = await supabase
        .from('data_request_assignments')
        .update({ status: 'submitted', submitted_at: now })
        .eq('request_id', record.id)
        .eq('district', district);
      if (assignmentError) throw assignmentError;

      message.success(`sync จาก Google Sheet แล้ว ${rows.length} แถว`);
      await loadData();
    } catch (err) {
      message.error(`sync ไม่สำเร็จ: ${err.message}`);
    }
  };

  const visibleRequests = useMemo(() => {
    if (isAdmin) return requests;
    return requests.filter(item => item.status === 'published');
  }, [isAdmin, requests]);

  const columns = [
    {
      title: 'คำขอข้อมูล',
      dataIndex: 'title',
      render: (title, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{title}</Text>
          <Text type="secondary">{record.description || 'ไม่มีคำอธิบาย'}</Text>
        </Space>
      ),
    },
    {
      title: 'สถานะ',
      dataIndex: 'status',
      width: 130,
      render: statusTag,
    },
    {
      title: 'กำหนดส่ง',
      dataIndex: 'deadline',
      width: 130,
      render: value => value ? dayjs(value).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'ส่งแล้ว',
      width: 110,
      render: (_, record) => assignmentSummary(requestAssignments[record.id] || []),
    },
    {
      title: 'จัดการ',
      width: isAdmin ? 290 : 150,
      render: (_, record) => (
        <Space wrap>
          {isAdmin ? (
            <>
              <Button type="primary" icon={<SendOutlined />} onClick={() => openFill(record)}>กรอกแทน</Button>
              <Button icon={<SyncOutlined />} onClick={() => {
                const district = (requestAssignments[record.id] || [])[0]?.district || null;
                setSelectedSubmitDistrict(district);
                syncGoogleSheet(record, district);
              }}>Sync Sheet</Button>
              <Button icon={<EditOutlined />} onClick={() => openEdit(record)}>แก้ไข</Button>
              <Button icon={<FileExcelOutlined />} onClick={() => { setActiveRequest(record); setResultOpen(true); }}>ผลลัพธ์</Button>
              <Tooltip title="ดาวน์โหลดข้อมูลคำตอบ">
                <Button icon={<DownloadOutlined />} onClick={() => exportResults(record)} />
              </Tooltip>
            </>
          ) : (
            <Button type="primary" icon={<SendOutlined />} onClick={() => openFill(record)}>กรอกข้อมูล</Button>
          )}
        </Space>
      ),
    },
  ];

  const cleanActiveSchema = normalizeSchema(activeRequest?.schema || schema);
  const gridColumns = cleanActiveSchema.map(field => ({
    title: (
      <Space size={4}>
        <span>{field.label}</span>
        {field.required && <Text type="danger">*</Text>}
      </Space>
    ),
    dataIndex: field.id,
    width: field.type === 'textarea' ? 260 : 190,
    render: (_, record, rowIndex) => {
      const error = cellErrors[`${rowIndex}:${field.id}`];
      return (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          {fieldInput(field, record[field.id], (value) => {
            setGridRows(prev => prev.map((row, index) => index === rowIndex ? { ...row, [field.id]: value } : row));
          }, error)}
          {error && <Text type="danger" style={{ fontSize: 11 }}>{error}</Text>}
        </Space>
      );
    },
    onCell: (_record, rowIndex) => ({
      onPaste: (event) => {
        event.preventDefault();
        const text = event.clipboardData.getData('text');
        setGridRows(prev => applyGridPaste(prev, cleanActiveSchema, text, rowIndex, field.id));
        setCellErrors({});
      },
    }),
  }));

  const resultRows = activeRequest
    ? (requestResponses[activeRequest.id] || []).flatMap((response, responseIndex) => {
      const answerRows = Array.isArray(response.answers) ? response.answers : [response.answers];
      return answerRows.map((answer, rowIndex) => ({
        key: `${response.id}-${rowIndex}`,
        district: response.district,
        submitted_at: response.submitted_at,
        rowNo: responseIndex + rowIndex + 1,
        ...answer,
      }));
    })
    : [];

  const resultColumns = [
    { title: 'อำเภอ', dataIndex: 'district', fixed: 'left', width: 140 },
    { title: 'วันที่ส่ง', dataIndex: 'submitted_at', width: 160, render: value => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-' },
    ...cleanActiveSchema.map(field => ({ title: field.label, dataIndex: field.id, width: 180, ellipsis: true })),
  ];

  if (!isAdmin && !isEditor) {
    return (
      <Card>
        <Empty description="คุณไม่มีสิทธิ์ใช้งานระบบคำขอข้อมูล" />
      </Card>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={<Title level={3} style={{ margin: 0 }}>คำขอข้อมูล</Title>}
        extra={(
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>รีเฟรช</Button>
            {isAdmin && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>สร้างคำขอ</Button>}
          </Space>
        )}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={isAdmin ? 'จังหวัดสร้างแบบฟอร์มและติดตามการส่งข้อมูลรายอำเภอได้จากหน้านี้' : 'เลือกคำขอข้อมูล แล้วกรอกแบบตารางหรือวางข้อมูลจาก Excel ได้'}
        />
        <Table
          rowKey="id"
          loading={loading}
          dataSource={visibleRequests}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={activeRequest ? 'แก้ไขคำขอข้อมูล' : 'สร้างคำขอข้อมูล'}
        open={builderOpen}
        onCancel={() => setBuilderOpen(false)}
        onOk={saveRequest}
        okText="บันทึก"
        cancelText="ยกเลิก"
        width={1040}
        destroyOnClose
      >
        <Form form={requestForm} layout="vertical">
          <Form.Item name="title" label="ชื่อคำขอ" rules={[{ required: true, message: 'กรุณากรอกชื่อคำขอ' }]}>
            <Input placeholder="เช่น สำรวจพื้นที่ระบาดศัตรูพืชรายอำเภอ" />
          </Form.Item>
          <Form.Item name="description" label="คำอธิบาย">
            <Input.TextArea rows={2} placeholder="รายละเอียดที่อำเภอต้องทราบก่อนกรอก" />
          </Form.Item>
          <Form.Item name="sheet_url" label="Google Sheet URL">
            <Input placeholder="วางลิงก์ Google Sheet หรือ CSV export URL สำหรับ sync ข้อมูล" />
          </Form.Item>
          <Space align="start" wrap>
            <Form.Item name="deadline" label="กำหนดส่ง">
              <DatePicker format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="status" label="สถานะ" rules={[{ required: true }]}>
              <Select style={{ width: 180 }} options={[
                { label: 'ร่าง', value: 'draft' },
                { label: 'เปิดรับข้อมูล', value: 'published' },
                { label: 'ปิดแล้ว', value: 'closed' },
              ]} />
            </Form.Item>
          </Space>
          <Form.Item name="districts" label="อำเภอที่ต้องส่งข้อมูล" rules={[{ required: true, message: 'เลือกอย่างน้อย 1 อำเภอ' }]}>
            <Select mode="multiple" options={DISTRICTS.map(district => ({ label: district, value: district }))} />
          </Form.Item>
        </Form>

        <Card size="small" title="โครงสร้างฟอร์ม" extra={<Button icon={<PlusOutlined />} onClick={addField}>เพิ่มคำถาม</Button>}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {normalizeSchema(schema).map((field, index) => (
              <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 150px 110px 1fr 42px', gap: 8, alignItems: 'center' }}>
                <Text>{index + 1}</Text>
                <Input value={field.label} placeholder="ชื่อคำถาม" onChange={e => updateField(field.id, { label: e.target.value })} />
                <Select value={field.type} options={FIELD_TYPES} onChange={value => updateField(field.id, { type: value })} />
                <Space>
                  <Switch checked={field.required} onChange={checked => updateField(field.id, { required: checked })} />
                  <Text>บังคับ</Text>
                </Space>
                <Input
                  disabled={field.type !== 'select'}
                  value={field.options}
                  placeholder="ตัวเลือกคั่นด้วย comma"
                  onChange={e => updateField(field.id, { options: e.target.value })}
                />
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeField(field.id)} />
              </div>
            ))}
          </Space>
        </Card>
      </Modal>

      <Modal
        title={activeRequest?.title || 'กรอกข้อมูล'}
        open={fillOpen}
        onCancel={() => setFillOpen(false)}
        onOk={submitRows}
        okText="ส่งข้อมูล"
        cancelText="ยกเลิก"
        width={1180}
        destroyOnClose
      >
        <Space style={{ marginBottom: 12 }} wrap>
          {isAdmin && (
            <Select
              value={selectedSubmitDistrict || undefined}
              onChange={setSelectedSubmitDistrict}
              style={{ width: 180 }}
              placeholder="เลือกอำเภอ"
              options={(requestAssignments[activeRequest?.id] || []).map(item => ({ label: item.district, value: item.district }))}
            />
          )}
          <Radio.Group value={entryMode} onChange={e => setEntryMode(e.target.value)} optionType="button" buttonStyle="solid">
            <Radio.Button value="grid">ตาราง Excel</Radio.Button>
            <Radio.Button value="form">ฟอร์มทีละรายการ</Radio.Button>
          </Radio.Group>
          <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate()}>ดาวน์โหลด Template</Button>
          <label>
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) importExcelRows(file);
                e.target.value = '';
              }}
            />
            <Button icon={<FileExcelOutlined />}>อัปโหลด Excel</Button>
          </label>
        </Space>
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="คัดลอกจาก Excel/Google Sheets แล้ววางลงช่องแรกของตารางได้ ระบบจะแตกข้อมูลลงแถวและคอลัมน์ให้" />
        {entryMode === 'form' ? (
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              {cleanActiveSchema.map(field => {
                const error = cellErrors[`0:${field.id}`];
                return (
                  <div key={field.id}>
                    <Text strong>{field.label}{field.required ? ' *' : ''}</Text>
                    <div style={{ marginTop: 4 }}>{fieldInput(field, gridRows[0]?.[field.id], value => setGridRows([{ ...(gridRows[0] || {}), [field.id]: value }]), error)}</div>
                    {error && <Text type="danger">{error}</Text>}
                  </div>
                );
              })}
            </Space>
          </Card>
        ) : (
          <>
            <Table
              rowKey={(_, index) => index}
              dataSource={gridRows.map((row, index) => ({ ...row, key: index }))}
              columns={gridColumns}
              pagination={false}
              size="small"
              bordered
              scroll={{ x: 'max-content', y: 420 }}
            />
            <Space style={{ marginTop: 12 }}>
              <Button icon={<PlusOutlined />} onClick={() => setGridRows(prev => [...prev, {}])}>เพิ่มแถว</Button>
              <Button danger disabled={gridRows.length <= 1} onClick={() => setGridRows(prev => prev.slice(0, -1))}>ลบแถวสุดท้าย</Button>
            </Space>
          </>
        )}
      </Modal>

      <Modal
        title={`ผลลัพธ์: ${activeRequest?.title || ''}`}
        open={resultOpen}
        onCancel={() => setResultOpen(false)}
        footer={<Button onClick={() => setResultOpen(false)}>ปิด</Button>}
        width={1180}
      >
        <Space style={{ marginBottom: 12 }}>
          <Tag color="blue">ส่งแล้ว {resultRows.length} แถว</Tag>
          {activeRequest && <Button icon={<DownloadOutlined />} onClick={() => exportResults(activeRequest)}>Export Excel</Button>}
        </Space>
        <Table
          rowKey="key"
          dataSource={resultRows}
          columns={resultColumns}
          size="small"
          scroll={{ x: 'max-content', y: 480 }}
        />
      </Modal>
    </div>
  );
}

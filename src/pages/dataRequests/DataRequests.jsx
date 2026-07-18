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
  Popconfirm,
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
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  DISTRICTS,
  FIELD_TYPES,
  applyGridPaste,
  createField,
  detectCandidateTables,
  googleSheetUrlToCsvUrl,
  normalizeSchema,
  parseAiSchemaSuggestion,
  parseCsv,
  removeMissingSupabaseColumn,
  rowsToExportObjects,
  tabularRowsToAnswerRows,
  validateRows,
} from '../../utils/dataRequestGrid';
import { callAI } from '../../services/aiService';
import { downloadCsv, objectsToCsv, parseCsvFile, rowsToCsv } from '../../utils/csv';

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

function candidateConfidenceLabel(candidate) {
  if (!candidate) return '';
  if (candidate.confidence >= 0.72) return 'ระบบแนะนำ';
  return 'ควรตรวจดู';
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
  const [aiBuilderOpen, setAiBuilderOpen] = useState(false);
  const [aiSourceType, setAiSourceType] = useState('csv');
  const [aiSheetUrl, setAiSheetUrl] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCandidates, setAiCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [aiSuggestedSchema, setAiSuggestedSchema] = useState([]);
  const [aiSuggestionInfo, setAiSuggestionInfo] = useState(null);
  const [aiSourceMeta, setAiSourceMeta] = useState(null);
  const isAdmin = role === 'admin';
  const isEditor = ['editor', 'district_editor'].includes(role);
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
        let { error } = await supabase.from('data_requests').update(payload).eq('id', activeRequest.id);
        const retryPayload = removeMissingSupabaseColumn(payload, error);
        if (error && retryPayload !== payload) {
          message.warning('ฐานข้อมูลยังไม่มีช่องเก็บลิงก์ Google Sheet ระบบจะบันทึกคำขอโดยไม่เก็บลิงก์นี้');
          ({ error } = await supabase.from('data_requests').update(retryPayload).eq('id', activeRequest.id));
        }
        if (error) throw error;
      } else {
        let { data, error } = await supabase
          .from('data_requests')
          .insert([{ ...payload, created_by: user?.id }])
          .select('id')
          .single();
        const retryPayload = removeMissingSupabaseColumn(payload, error);
        if (error && retryPayload !== payload) {
          message.warning('ฐานข้อมูลยังไม่มีช่องเก็บลิงก์ Google Sheet ระบบจะบันทึกคำขอโดยไม่เก็บลิงก์นี้');
          ({ data, error } = await supabase
            .from('data_requests')
            .insert([{ ...retryPayload, created_by: user?.id }])
            .select('id')
            .single());
        }
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

  const deleteRequest = async (record) => {
    Modal.confirm({
      title: 'ลบคำขอนี้?',
      content: `คำขอ "${record.title}" และข้อมูลที่อำเภอส่งในคำขอนี้จะถูกลบไปด้วย`,
      okText: 'ลบ',
      okType: 'danger',
      cancelText: 'ยกเลิก',
      async onOk() {
        try {
          const { data, error } = await supabase.from('data_requests').delete().eq('id', record.id);
          if (error) throw error;
          if (!data || data.length === 0) {
            message.error('ไม่สามารถลบได้ — คุณไม่มีสิทธิ์ลบ หรือข้อมูลถูกลบไปแล้ว');
            return;
          }
          message.success('ลบคำขอข้อมูลแล้ว');
          await loadData();
        } catch (err) {
          message.error(`ลบไม่สำเร็จ: ${err.message}`);
        }
      },
    });
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

  const resetAiBuilder = () => {
    setAiSourceType('csv');
    setAiSheetUrl('');
    setAiLoading(false);
    setAiCandidates([]);
    setSelectedCandidateId(null);
    setAiSuggestedSchema([]);
    setAiSuggestionInfo(null);
    setAiSourceMeta(null);
  };

  const openAiBuilder = () => {
    resetAiBuilder();
    setAiBuilderOpen(true);
  };

  const chooseCandidates = (candidates, meta) => {
    const nextCandidates = candidates.slice(0, 3);
    setAiCandidates(nextCandidates);
    setAiSourceMeta(meta);
    setAiSuggestedSchema([]);
    setAiSuggestionInfo(null);
    const first = nextCandidates[0] || null;
    setSelectedCandidateId(first?.id || null);
    if (!first) {
      message.warning('ไม่พบตารางที่อ่านได้จากแหล่งข้อมูลนี้');
      return;
    }
    const second = nextCandidates[1];
    if (first.confidence >= 0.72 && (!second || first.score - second.score >= 3)) {
      analyzeCandidateWithAi(first, meta);
    } else {
      message.info('พบหลายตารางในไฟล์ เลือกตารางที่ต้องการก่อนให้ระบบช่วยจัดช่องข้อมูล');
    }
  };

  const readAiCsvSource = (file) => {
    parseCsvFile(file)
      .then((rows) => {
        chooseCandidates(detectCandidateTables(rows, { sheetName: file.name }), { sourceType: 'csv', fileName: file.name });
      })
      .catch((err) => {
        message.error(`อ่านไฟล์ CSV ไม่สำเร็จ: ${err.message}`);
      });
    return false;
  };

  const readAiGoogleSheetSource = async () => {
    if (!aiSheetUrl.trim()) {
      message.warning('วาง Google Sheet URL ก่อน');
      return;
    }
    setAiLoading(true);
    try {
      const csvUrl = googleSheetUrlToCsvUrl(aiSheetUrl);
      const result = await fetch(csvUrl);
      if (!result.ok) throw new Error(`Google Sheet ตอบกลับ ${result.status}`);
      const rows = parseCsv(await result.text());
      chooseCandidates(detectCandidateTables(rows, { sheetName: 'Google Sheet' }), {
        sourceType: 'google_sheet',
        sheetUrl: aiSheetUrl,
      });
    } catch (err) {
      message.error(`อ่าน Google Sheet ไม่สำเร็จ: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const analyzeCandidateWithAi = async (candidate, meta = aiSourceMeta) => {
    if (!candidate) {
      message.warning('เลือกตารางตัวอย่างก่อน');
      return;
    }
    setAiLoading(true);
    try {
      const systemPrompt = `คุณเป็นผู้ช่วยออกแบบ schema สำหรับแบบฟอร์มขอข้อมูลราชการไทย
ตอบเป็น JSON object เท่านั้น ห้ามมี markdown
รูปแบบ:
{"confidence":0.0-1.0,"note":"สรุปสั้น","fields":[{"label":"ชื่อช่อง","type":"text|number|select|date|textarea","required":true|false,"options":["ตัวเลือก"],"note":"เหตุผลสั้น"}]}
กติกา:
- ใช้ type ที่กำหนดเท่านั้น
- ถ้าคอลัมน์เป็นค่าคำนวณจากสูตร ให้เก็บเป็น number/date/text ตามค่าผลลัพธ์ ไม่ต้องสร้างสูตร
- เลือก required เฉพาะช่องที่น่าจำเป็นต่อการรวมผล
- ถ้าเป็น select ให้ใส่ options เฉพาะเมื่อเห็นตัวเลือกชัดเจนจากตัวอย่าง`;
      const userPrompt = JSON.stringify({
        source: meta,
        table: {
          sheetName: candidate.sheetName,
          headerRowIndex: candidate.headerRowIndex,
          headers: candidate.headers,
          sampleRows: candidate.sampleRows,
        },
      });
      const aiText = await callAI('gemini', systemPrompt, userPrompt, { deepThinking: false });
      const suggestion = parseAiSchemaSuggestion(aiText, candidate);
      if (!suggestion.schema.length) throw new Error('AI ไม่ได้ส่ง schema ที่ใช้ได้');
      setAiSuggestedSchema(suggestion.schema);
      setAiSuggestionInfo({
        confidence: suggestion.confidence,
        note: suggestion.note,
        source: meta,
        table: candidate,
      });
      message.success('AI แนะนำโครงสร้างแล้ว ตรวจและแก้ก่อนใช้งาน');
    } catch (err) {
      const fallback = parseAiSchemaSuggestion('', candidate);
      setAiSuggestedSchema(fallback.schema);
      setAiSuggestionInfo({
        confidence: fallback.confidence,
        note: `ใช้ schema สำรองจากหัวตาราง เพราะ AI ไม่สำเร็จ: ${err.message}`,
        source: meta,
        table: candidate,
      });
      message.warning('AI ไม่สำเร็จ ระบบสร้างโครงสร้างสำรองจากหัวตารางให้แก้ต่อ');
    } finally {
      setAiLoading(false);
    }
  };

  const updateAiField = (id, patch) => {
    setAiSuggestedSchema(prev => normalizeSchema(prev.map(field => field.id === id ? { ...field, ...patch } : field)));
  };

  const removeAiField = (id) => {
    setAiSuggestedSchema(prev => normalizeSchema(prev.filter(field => field.id !== id)));
  };

  const applyAiSchema = () => {
    const cleanSchema = normalizeSchema(aiSuggestedSchema).filter(field => field.label.trim());
    if (!cleanSchema.length) {
      message.warning('ไม่มีโครงสร้างให้ใช้');
      return;
    }
    setSchema(cleanSchema);
    if (aiSuggestionInfo?.source?.sourceType === 'google_sheet' && aiSuggestionInfo.source.sheetUrl) {
      requestForm.setFieldsValue({ sheet_url: aiSuggestionInfo.source.sheetUrl });
    }
    setAiBuilderOpen(false);
    message.success('นำช่องข้อมูลเข้าแบบฟอร์มแล้ว ตรวจอีกครั้งก่อนบันทึก');
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
    downloadCsv(`${record.title || 'data-request'}-template.csv`, rowsToCsv([cleanSchema.map(field => field.label)]));
  };

  const importCsvRows = (file) => {
    parseCsvFile(file)
      .then((raw) => {
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
      })
      .catch((err) => {
        message.error(`อ่านไฟล์ CSV ไม่สำเร็จ: ${err.message}`);
      });
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
    downloadCsv(`${record.title || 'data-request'}-responses.csv`, objectsToCsv(rows));
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
              }}>ดึงข้อมูลจาก Sheet</Button>
              <Button icon={<EditOutlined />} onClick={() => openEdit(record)}>แก้ไข</Button>
              <Button icon={<FileTextOutlined />} onClick={() => { setActiveRequest(record); setResultOpen(true); }}>ผลลัพธ์</Button>
              <Tooltip title="ดาวน์โหลดข้อมูลคำตอบ">
                <Button icon={<DownloadOutlined />} onClick={() => exportResults(record)} />
              </Tooltip>
              <Popconfirm title="ยืนยันการลบ" description="ต้องการลบคำขอนี้ใช่ไหม?" okText="ลบ" cancelText="ยกเลิก" okButtonProps={{ danger: true }} onConfirm={() => deleteRequest(record)}>
                <Tooltip title="ลบคำขอนี้">
                  <Button danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          ) : (
            <Button type="primary" icon={<SendOutlined />} onClick={() => openFill(record)}>กรอกข้อมูล</Button>
          )}
        </Space>
      ),
    },
  ];

  const selectedCandidate = aiCandidates.find(item => item.id === selectedCandidateId) || aiCandidates[0] || null;
  const candidatePreviewColumns = selectedCandidate
    ? selectedCandidate.headers.map((header, index) => ({
      title: header || `คอลัมน์ ${index + 1}`,
      dataIndex: `col_${index}`,
      width: 150,
      ellipsis: true,
    }))
    : [];
  const candidatePreviewRows = selectedCandidate
    ? selectedCandidate.sampleRows.slice(0, 5).map((row, rowIndex) => ({
      key: rowIndex,
      ...Object.fromEntries(selectedCandidate.headers.map((_, index) => [`col_${index}`, row?.[index] ?? ''])),
    }))
    : [];

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
          message={isAdmin ? 'จังหวัดสร้างแบบฟอร์มและติดตามการส่งข้อมูลรายอำเภอได้จากหน้านี้' : 'เลือกคำขอข้อมูล แล้วกรอกแบบตารางหรือวางข้อมูลจาก CSV ได้'}
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
        title={activeRequest ? 'แก้ไขคำขอข้อมูล' : 'ขอข้อมูลจากอำเภอ'}
        open={builderOpen}
        onCancel={() => setBuilderOpen(false)}
        onOk={saveRequest}
        okText="บันทึกคำขอ"
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

        <Card
          size="small"
          title="ช่องข้อมูลที่ต้องการเก็บ"
          extra={(
            <Space>
              <Button icon={<FileTextOutlined />} onClick={openAiBuilder}>เริ่มจากไฟล์ CSV/Google Sheet เดิม</Button>
              <Button icon={<PlusOutlined />} onClick={addField}>เพิ่มช่องข้อมูล</Button>
            </Space>
          )}
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="กำหนดช่องที่อำเภอต้องส่ง เช่น อำเภอ ตำบล ชนิดพืช จำนวน พื้นที่ หรือหมายเหตุ"
          />
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
        title="ช่วยจัดช่องข้อมูลจากไฟล์เดิม"
        open={aiBuilderOpen}
        onCancel={() => setAiBuilderOpen(false)}
        width={1180}
        destroyOnClose
        footer={(
          <Space>
            <Button onClick={() => setAiBuilderOpen(false)}>ยกเลิก</Button>
            <Button
              icon={<SyncOutlined />}
              loading={aiLoading}
              disabled={!selectedCandidate}
              onClick={() => analyzeCandidateWithAi(selectedCandidate, aiSourceMeta)}
            >
              ให้ระบบช่วยจัดช่องข้อมูล
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={!aiSuggestedSchema.length}
              onClick={applyAiSchema}
            >
              นำช่องข้อมูลไปใช้
            </Button>
          </Space>
        )}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="เลือกไฟล์ที่ใช้อยู่หรือวางลิงก์ Google Sheet ระบบจะอ่านตารางตัวอย่าง แล้วช่วยเสนอช่องข้อมูลให้ตรวจแก้ก่อนนำไปใช้"
        />
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Radio.Group value={aiSourceType} onChange={e => setAiSourceType(e.target.value)} optionType="button" buttonStyle="solid">
            <Radio.Button value="csv">ไฟล์ CSV</Radio.Button>
            <Radio.Button value="google_sheet">ลิงก์ Google Sheet</Radio.Button>
          </Radio.Group>

          {aiSourceType === 'excel' ? (
            <label>
              <input
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) readAiCsvSource(file);
                  e.target.value = '';
                }}
              />
              <Button icon={<FileTextOutlined />} loading={aiLoading}>เลือกไฟล์ CSV ที่ใช้อยู่</Button>
            </label>
          ) : (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={aiSheetUrl}
                onChange={e => setAiSheetUrl(e.target.value)}
                placeholder="วางลิงก์ Google Sheet"
              />
              <Button type="primary" loading={aiLoading} onClick={readAiGoogleSheetSource}>อ่านข้อมูล</Button>
            </Space.Compact>
          )}

          {!!aiCandidates.length && (
            <Card size="small" title="ตารางที่ระบบพบในไฟล์">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">ถ้าไฟล์มีหลายตาราง ให้เลือกตารางที่อำเภอต้องกรอกจริง</Text>
                <Select
                  value={selectedCandidateId || undefined}
                  style={{ width: '100%' }}
                  onChange={value => {
                    setSelectedCandidateId(value);
                    setAiSuggestedSchema([]);
                    setAiSuggestionInfo(null);
                  }}
                  options={aiCandidates.map((candidate, index) => ({
                    value: candidate.id,
                    label: `${index + 1}. ${candidate.sheetName} แถวหัวตาราง ${candidate.headerRowIndex + 1} · ${candidate.columnCount} คอลัมน์ · ${candidate.dataRowCount} แถวตัวอย่าง · ${candidateConfidenceLabel(candidate)}`,
                  }))}
                />
                <Table
                  rowKey="key"
                  dataSource={candidatePreviewRows}
                  columns={candidatePreviewColumns}
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ x: 'max-content' }}
                />
              </Space>
            </Card>
          )}

          {!!aiSuggestionInfo && (
            <Alert
              type={aiSuggestionInfo.confidence >= 0.7 ? 'success' : 'warning'}
              showIcon
              message={aiSuggestionInfo.confidence >= 0.7 ? 'ระบบช่วยจัดช่องข้อมูลแล้ว' : 'ระบบจัดช่องข้อมูลเบื้องต้นแล้ว ควรตรวจให้ละเอียด'}
              description={aiSuggestionInfo.note || 'ตรวจชื่อช่อง ชนิดข้อมูล และช่องบังคับก่อนนำไปใช้'}
            />
          )}

          {!!aiSuggestedSchema.length && (
            <Card size="small" title="ช่องข้อมูลที่ระบบแนะนำ">
              <Space direction="vertical" style={{ width: '100%' }}>
                {normalizeSchema(aiSuggestedSchema).map((field, index) => (
                  <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 140px 100px 1fr 1fr 42px', gap: 8, alignItems: 'center' }}>
                    <Text>{index + 1}</Text>
                    <Input value={field.label} placeholder="ชื่อคำถาม" onChange={e => updateAiField(field.id, { label: e.target.value })} />
                    <Select value={field.type} options={FIELD_TYPES} onChange={value => updateAiField(field.id, { type: value })} />
                    <Space>
                      <Switch checked={field.required} onChange={checked => updateAiField(field.id, { required: checked })} />
                      <Text>บังคับ</Text>
                    </Space>
                    <Input
                      disabled={field.type !== 'select'}
                      value={field.options}
                      placeholder="ตัวเลือกคั่นด้วย comma"
                      onChange={e => updateAiField(field.id, { options: e.target.value })}
                    />
                    <Input
                      value={field.note}
                      placeholder="หมายเหตุจากระบบ"
                      onChange={e => updateAiField(field.id, { note: e.target.value })}
                    />
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeAiField(field.id)} />
                  </div>
                ))}
              </Space>
            </Card>
          )}
        </Space>
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
            <Radio.Button value="grid">ตาราง CSV</Radio.Button>
            <Radio.Button value="form">ฟอร์มทีละรายการ</Radio.Button>
          </Radio.Group>
          <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate()}>ดาวน์โหลด Template</Button>
          <label>
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) importCsvRows(file);
                e.target.value = '';
              }}
            />
            <Button icon={<FileTextOutlined />}>อัปโหลด CSV</Button>
          </label>
        </Space>
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="คัดลอกจาก CSV/Google Sheets แล้ววางลงช่องแรกของตารางได้ ระบบจะแตกข้อมูลลงแถวและคอลัมน์ให้" />
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
          {activeRequest && <Button icon={<DownloadOutlined />} onClick={() => exportResults(activeRequest)}>Export CSV</Button>}
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

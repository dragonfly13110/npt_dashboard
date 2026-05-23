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
  createField({ id: 'district', label: 'à¸­à¸³à¹€à¸ à¸­', type: 'select', required: true, options: DISTRICTS.join(','), order: 0 }),
  createField({ id: 'subdistrict', label: 'à¸•à¸³à¸šà¸¥', type: 'text', required: true, order: 1 }),
  createField({ id: 'reporter', label: 'à¸œà¸¹à¹‰à¸£à¸²à¸¢à¸‡à¸²à¸™', type: 'text', required: true, order: 2 }),
  createField({ id: 'amount', label: 'à¸ˆà¸³à¸™à¸§à¸™/à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆ', type: 'number', required: false, order: 3 }),
];

function statusTag(status) {
  if (status === 'published') return <Tag color="green">à¹€à¸›à¸´à¸”à¸£à¸±à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥</Tag>;
  if (status === 'closed') return <Tag color="red">à¸›à¸´à¸”à¹à¸¥à¹‰à¸§</Tag>;
  return <Tag>à¸£à¹ˆà¸²à¸‡</Tag>;
}

function assignmentSummary(assignments = []) {
  const submitted = assignments.filter(a => a.status === 'submitted').length;
  return `${submitted}/${assignments.length}`;
}

function candidateConfidenceLabel(candidate) {
  if (!candidate) return '';
  if (candidate.confidence >= 0.72) return 'à¸£à¸°à¸šà¸šà¹à¸™à¸°à¸™à¸³';
  return 'à¸„à¸§à¸£à¸•à¸£à¸§à¸ˆà¸”à¸¹';
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
        placeholder="à¹€à¸¥à¸·à¸­à¸"
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
      message.error(`à¹‚à¸«à¸¥à¸”à¸„à¸³à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ${err.message}`);
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
        message.warning('à¸•à¹‰à¸­à¸‡à¸¡à¸µà¸„à¸³à¸–à¸²à¸¡à¸­à¸¢à¹ˆà¸²à¸‡à¸™à¹‰à¸­à¸¢ 1 à¸Šà¹ˆà¸­à¸‡');
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
          message.warning('à¸à¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸Šà¹ˆà¸­à¸‡à¹€à¸à¹‡à¸šà¸¥à¸´à¸‡à¸à¹Œ Google Sheet à¸£à¸°à¸šà¸šà¸ˆà¸°à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸‚à¸­à¹‚à¸”à¸¢à¹„à¸¡à¹ˆà¹€à¸à¹‡à¸šà¸¥à¸´à¸‡à¸à¹Œà¸™à¸µà¹‰');
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
          message.warning('à¸à¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µà¸Šà¹ˆà¸­à¸‡à¹€à¸à¹‡à¸šà¸¥à¸´à¸‡à¸à¹Œ Google Sheet à¸£à¸°à¸šà¸šà¸ˆà¸°à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸‚à¸­à¹‚à¸”à¸¢à¹„à¸¡à¹ˆà¹€à¸à¹‡à¸šà¸¥à¸´à¸‡à¸à¹Œà¸™à¸µà¹‰');
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

      message.success('à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¹‰à¸§');
      setBuilderOpen(false);
      await loadData();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(`à¸šà¸±à¸™à¸—à¸¶à¸à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ${err.message}`);
    }
  };

  const deleteRequest = async (record) => {
    Modal.confirm({
      title: 'à¸¥à¸šà¸„à¸³à¸‚à¸­à¸™à¸µà¹‰?',
      content: `à¸„à¸³à¸‚à¸­ "${record.title}" à¹à¸¥à¸°à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸­à¸³à¹€à¸ à¸­à¸ªà¹ˆà¸‡à¹ƒà¸™à¸„à¸³à¸‚à¸­à¸™à¸µà¹‰à¸ˆà¸°à¸–à¸¹à¸à¸¥à¸šà¹„à¸›à¸”à¹‰à¸§à¸¢`,
      okText: 'à¸¥à¸š',
      okType: 'danger',
      cancelText: 'à¸¢à¸à¹€à¸¥à¸´à¸',
      async onOk() {
        try {
          const { data, error } = await supabase.from('data_requests').delete().eq('id', record.id);
          if (error) throw error;
          if (!data || data.length === 0) {
            message.error('à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸¥à¸šà¹„à¸”à¹‰ â€” à¸„à¸¸à¸“à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¸¥à¸š à¸«à¸£à¸·à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸–à¸¹à¸à¸¥à¸šà¹„à¸›à¹à¸¥à¹‰à¸§');
            return;
          }
          message.success('à¸¥à¸šà¸„à¸³à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¹‰à¸§');
          await loadData();
        } catch (err) {
          message.error(`à¸¥à¸šà¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ${err.message}`);
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
      message.warning('à¹„à¸¡à¹ˆà¸žà¸šà¸•à¸²à¸£à¸²à¸‡à¸—à¸µà¹ˆà¸­à¹ˆà¸²à¸™à¹„à¸”à¹‰à¸ˆà¸²à¸à¹à¸«à¸¥à¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸™à¸µà¹‰');
      return;
    }
    const second = nextCandidates[1];
    if (first.confidence >= 0.72 && (!second || first.score - second.score >= 3)) {
      analyzeCandidateWithAi(first, meta);
    } else {
      message.info('à¸žà¸šà¸«à¸¥à¸²à¸¢à¸•à¸²à¸£à¸²à¸‡à¹ƒà¸™à¹„à¸Ÿà¸¥à¹Œ à¹€à¸¥à¸·à¸­à¸à¸•à¸²à¸£à¸²à¸‡à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸à¹ˆà¸­à¸™à¹ƒà¸«à¹‰à¸£à¸°à¸šà¸šà¸Šà¹ˆà¸§à¸¢à¸ˆà¸±à¸”à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥');
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
      message.warning('à¸§à¸²à¸‡ Google Sheet URL à¸à¹ˆà¸­à¸™');
      return;
    }
    setAiLoading(true);
    try {
      const csvUrl = googleSheetUrlToCsvUrl(aiSheetUrl);
      const result = await fetch(csvUrl);
      if (!result.ok) throw new Error(`Google Sheet à¸•à¸­à¸šà¸à¸¥à¸±à¸š ${result.status}`);
      const rows = parseCsv(await result.text());
      chooseCandidates(detectCandidateTables(rows, { sheetName: 'Google Sheet' }), {
        sourceType: 'google_sheet',
        sheetUrl: aiSheetUrl,
      });
    } catch (err) {
      message.error(`à¸­à¹ˆà¸²à¸™ Google Sheet à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const analyzeCandidateWithAi = async (candidate, meta = aiSourceMeta) => {
    if (!candidate) {
      message.warning('à¹€à¸¥à¸·à¸­à¸à¸•à¸²à¸£à¸²à¸‡à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡à¸à¹ˆà¸­à¸™');
      return;
    }
    setAiLoading(true);
    try {
      const systemPrompt = `à¸„à¸¸à¸“à¹€à¸›à¹‡à¸™à¸œà¸¹à¹‰à¸Šà¹ˆà¸§à¸¢à¸­à¸­à¸à¹à¸šà¸š schema à¸ªà¸³à¸«à¸£à¸±à¸šà¹à¸šà¸šà¸Ÿà¸­à¸£à¹Œà¸¡à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸²à¸Šà¸à¸²à¸£à¹„à¸—à¸¢
à¸•à¸­à¸šà¹€à¸›à¹‡à¸™ JSON object à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™ à¸«à¹‰à¸²à¸¡à¸¡à¸µ markdown
à¸£à¸¹à¸›à¹à¸šà¸š:
{"confidence":0.0-1.0,"note":"à¸ªà¸£à¸¸à¸›à¸ªà¸±à¹‰à¸™","fields":[{"label":"à¸Šà¸·à¹ˆà¸­à¸Šà¹ˆà¸­à¸‡","type":"text|number|select|date|textarea","required":true|false,"options":["à¸•à¸±à¸§à¹€à¸¥à¸·à¸­à¸"],"note":"à¹€à¸«à¸•à¸¸à¸œà¸¥à¸ªà¸±à¹‰à¸™"}]}
à¸à¸•à¸´à¸à¸²:
- à¹ƒà¸Šà¹‰ type à¸—à¸µà¹ˆà¸à¸³à¸«à¸™à¸”à¹€à¸—à¹ˆà¸²à¸™à¸±à¹‰à¸™
- à¸–à¹‰à¸²à¸„à¸­à¸¥à¸±à¸¡à¸™à¹Œà¹€à¸›à¹‡à¸™à¸„à¹ˆà¸²à¸„à¸³à¸™à¸§à¸“à¸ˆà¸²à¸à¸ªà¸¹à¸•à¸£ à¹ƒà¸«à¹‰à¹€à¸à¹‡à¸šà¹€à¸›à¹‡à¸™ number/date/text à¸•à¸²à¸¡à¸„à¹ˆà¸²à¸œà¸¥à¸¥à¸±à¸žà¸˜à¹Œ à¹„à¸¡à¹ˆà¸•à¹‰à¸­à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¸ªà¸¹à¸•à¸£
- à¹€à¸¥à¸·à¸­à¸ required à¹€à¸‰à¸žà¸²à¸°à¸Šà¹ˆà¸­à¸‡à¸—à¸µà¹ˆà¸™à¹ˆà¸²à¸ˆà¸³à¹€à¸›à¹‡à¸™à¸•à¹ˆà¸­à¸à¸²à¸£à¸£à¸§à¸¡à¸œà¸¥
- à¸–à¹‰à¸²à¹€à¸›à¹‡à¸™ select à¹ƒà¸«à¹‰à¹ƒà¸ªà¹ˆ options à¹€à¸‰à¸žà¸²à¸°à¹€à¸¡à¸·à¹ˆà¸­à¹€à¸«à¹‡à¸™à¸•à¸±à¸§à¹€à¸¥à¸·à¸­à¸à¸Šà¸±à¸”à¹€à¸ˆà¸™à¸ˆà¸²à¸à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡`;
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
      if (!suggestion.schema.length) throw new Error('AI à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸ªà¹ˆà¸‡ schema à¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¹„à¸”à¹‰');
      setAiSuggestedSchema(suggestion.schema);
      setAiSuggestionInfo({
        confidence: suggestion.confidence,
        note: suggestion.note,
        source: meta,
        table: candidate,
      });
      message.success('AI à¹à¸™à¸°à¸™à¸³à¹‚à¸„à¸£à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¹à¸¥à¹‰à¸§ à¸•à¸£à¸§à¸ˆà¹à¸¥à¸°à¹à¸à¹‰à¸à¹ˆà¸­à¸™à¹ƒà¸Šà¹‰à¸‡à¸²à¸™');
    } catch (err) {
      const fallback = parseAiSchemaSuggestion('', candidate);
      setAiSuggestedSchema(fallback.schema);
      setAiSuggestionInfo({
        confidence: fallback.confidence,
        note: `à¹ƒà¸Šà¹‰ schema à¸ªà¸³à¸£à¸­à¸‡à¸ˆà¸²à¸à¸«à¸±à¸§à¸•à¸²à¸£à¸²à¸‡ à¹€à¸žà¸£à¸²à¸° AI à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ${err.message}`,
        source: meta,
        table: candidate,
      });
      message.warning('AI à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ à¸£à¸°à¸šà¸šà¸ªà¸£à¹‰à¸²à¸‡à¹‚à¸„à¸£à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¸ªà¸³à¸£à¸­à¸‡à¸ˆà¸²à¸à¸«à¸±à¸§à¸•à¸²à¸£à¸²à¸‡à¹ƒà¸«à¹‰à¹à¸à¹‰à¸•à¹ˆà¸­');
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
      message.warning('à¹„à¸¡à¹ˆà¸¡à¸µà¹‚à¸„à¸£à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¹ƒà¸«à¹‰à¹ƒà¸Šà¹‰');
      return;
    }
    setSchema(cleanSchema);
    if (aiSuggestionInfo?.source?.sourceType === 'google_sheet' && aiSuggestionInfo.source.sheetUrl) {
      requestForm.setFieldsValue({ sheet_url: aiSuggestionInfo.source.sheetUrl });
    }
    setAiBuilderOpen(false);
    message.success('à¸™à¸³à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸‚à¹‰à¸²à¹à¸šà¸šà¸Ÿà¸­à¸£à¹Œà¸¡à¹à¸¥à¹‰à¸§ à¸•à¸£à¸§à¸ˆà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡à¸à¹ˆà¸­à¸™à¸šà¸±à¸™à¸—à¸¶à¸');
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
      message.warning('à¸•à¸£à¸§à¸ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸¡à¹ˆà¸„à¸£à¸šà¸«à¸£à¸·à¸­à¸£à¸¹à¸›à¹à¸šà¸šà¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡');
      return;
    }

    const district = profileDistrict || selectedSubmitDistrict || rows[0]?.district || (requestAssignments[activeRequest.id] || [])[0]?.district;
    if (!district) {
      message.error('à¹„à¸¡à¹ˆà¸žà¸šà¸­à¸³à¹€à¸ à¸­à¸‚à¸­à¸‡à¸œà¸¹à¹‰à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥');
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

      message.success('à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¹‰à¸§');
      setFillOpen(false);
      await loadData();
    } catch (err) {
      message.error(`à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ${err.message}`);
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
      message.warning('à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µ Google Sheet URL');
      return;
    }
    if (!district) {
      message.warning('à¹€à¸¥à¸·à¸­à¸à¸­à¸³à¹€à¸ à¸­à¸à¹ˆà¸­à¸™ sync');
      return;
    }

    try {
      const csvUrl = googleSheetUrlToCsvUrl(record.sheet_url);
      const result = await fetch(csvUrl);
      if (!result.ok) throw new Error(`Google Sheet à¸•à¸­à¸šà¸à¸¥à¸±à¸š ${result.status}`);
      const csv = await result.text();
      const rows = tabularRowsToAnswerRows(parseCsv(csv), record.schema);
      const errors = validateRows(rows, record.schema);
      if (Object.keys(errors).length) {
        message.warning('à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸™ Sheet à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸œà¹ˆà¸²à¸™ validation');
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

      message.success(`sync à¸ˆà¸²à¸ Google Sheet à¹à¸¥à¹‰à¸§ ${rows.length} à¹à¸–à¸§`);
      await loadData();
    } catch (err) {
      message.error(`sync à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ: ${err.message}`);
    }
  };

  const visibleRequests = useMemo(() => {
    if (isAdmin) return requests;
    return requests.filter(item => item.status === 'published');
  }, [isAdmin, requests]);

  const columns = [
    {
      title: 'à¸„à¸³à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥',
      dataIndex: 'title',
      render: (title, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{title}</Text>
          <Text type="secondary">{record.description || 'à¹„à¸¡à¹ˆà¸¡à¸µà¸„à¸³à¸­à¸˜à¸´à¸šà¸²à¸¢'}</Text>
        </Space>
      ),
    },
    {
      title: 'à¸ªà¸–à¸²à¸™à¸°',
      dataIndex: 'status',
      width: 130,
      render: statusTag,
    },
    {
      title: 'à¸à¸³à¸«à¸™à¸”à¸ªà¹ˆà¸‡',
      dataIndex: 'deadline',
      width: 130,
      render: value => value ? dayjs(value).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'à¸ªà¹ˆà¸‡à¹à¸¥à¹‰à¸§',
      width: 110,
      render: (_, record) => assignmentSummary(requestAssignments[record.id] || []),
    },
    {
      title: 'à¸ˆà¸±à¸”à¸à¸²à¸£',
      width: isAdmin ? 290 : 150,
      render: (_, record) => (
        <Space wrap>
          {isAdmin ? (
            <>
              <Button type="primary" icon={<SendOutlined />} onClick={() => openFill(record)}>à¸à¸£à¸­à¸à¹à¸—à¸™</Button>
              <Button icon={<SyncOutlined />} onClick={() => {
                const district = (requestAssignments[record.id] || [])[0]?.district || null;
                setSelectedSubmitDistrict(district);
                syncGoogleSheet(record, district);
              }}>à¸”à¸¶à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ˆà¸²à¸ Sheet</Button>
              <Button icon={<EditOutlined />} onClick={() => openEdit(record)}>à¹à¸à¹‰à¹„à¸‚</Button>
              <Button icon={<FileTextOutlined />} onClick={() => { setActiveRequest(record); setResultOpen(true); }}>à¸œà¸¥à¸¥à¸±à¸žà¸˜à¹Œ</Button>
              <Tooltip title="à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸„à¸³à¸•à¸­à¸š">
                <Button icon={<DownloadOutlined />} onClick={() => exportResults(record)} />
              </Tooltip>
              <Popconfirm title="à¸¢à¸·à¸™à¸¢à¸±à¸™à¸à¸²à¸£à¸¥à¸š" description="à¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¸¥à¸šà¸„à¸³à¸‚à¸­à¸™à¸µà¹‰à¹ƒà¸Šà¹ˆà¹„à¸«à¸¡?" okText="à¸¥à¸š" cancelText="à¸¢à¸à¹€à¸¥à¸´à¸" okButtonProps={{ danger: true }} onConfirm={() => deleteRequest(record)}>
                <Tooltip title="à¸¥à¸šà¸„à¸³à¸‚à¸­à¸™à¸µà¹‰">
                  <Button danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </>
          ) : (
            <Button type="primary" icon={<SendOutlined />} onClick={() => openFill(record)}>à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</Button>
          )}
        </Space>
      ),
    },
  ];

  const selectedCandidate = aiCandidates.find(item => item.id === selectedCandidateId) || aiCandidates[0] || null;
  const candidatePreviewColumns = selectedCandidate
    ? selectedCandidate.headers.map((header, index) => ({
      title: header || `à¸„à¸­à¸¥à¸±à¸¡à¸™à¹Œ ${index + 1}`,
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
    { title: 'à¸­à¸³à¹€à¸ à¸­', dataIndex: 'district', fixed: 'left', width: 140 },
    { title: 'à¸§à¸±à¸™à¸—à¸µà¹ˆà¸ªà¹ˆà¸‡', dataIndex: 'submitted_at', width: 160, render: value => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-' },
    ...cleanActiveSchema.map(field => ({ title: field.label, dataIndex: field.id, width: 180, ellipsis: true })),
  ];

  if (!isAdmin && !isEditor) {
    return (
      <Card>
        <Empty description="à¸„à¸¸à¸“à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸£à¸°à¸šà¸šà¸„à¸³à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥" />
      </Card>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={<Title level={3} style={{ margin: 0 }}>à¸„à¸³à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</Title>}
        extra={(
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>à¸£à¸µà¹€à¸Ÿà¸£à¸Š</Button>
            {isAdmin && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>à¸ªà¸£à¹‰à¸²à¸‡à¸„à¸³à¸‚à¸­</Button>}
          </Space>
        )}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={isAdmin ? 'à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”à¸ªà¸£à¹‰à¸²à¸‡à¹à¸šà¸šà¸Ÿà¸­à¸£à¹Œà¸¡à¹à¸¥à¸°à¸•à¸´à¸”à¸•à¸²à¸¡à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸£à¸²à¸¢à¸­à¸³à¹€à¸ à¸­à¹„à¸”à¹‰à¸ˆà¸²à¸à¸«à¸™à¹‰à¸²à¸™à¸µà¹‰' : 'à¹€à¸¥à¸·à¸­à¸à¸„à¸³à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ à¹à¸¥à¹‰à¸§à¸à¸£à¸­à¸à¹à¸šà¸šà¸•à¸²à¸£à¸²à¸‡à¸«à¸£à¸·à¸­à¸§à¸²à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ˆà¸²à¸ CSV à¹„à¸”à¹‰'}
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
        title={activeRequest ? 'à¹à¸à¹‰à¹„à¸‚à¸„à¸³à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥' : 'à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ˆà¸²à¸à¸­à¸³à¹€à¸ à¸­'}
        open={builderOpen}
        onCancel={() => setBuilderOpen(false)}
        onOk={saveRequest}
        okText="à¸šà¸±à¸™à¸—à¸¶à¸à¸„à¸³à¸‚à¸­"
        cancelText="à¸¢à¸à¹€à¸¥à¸´à¸"
        width={1040}
        destroyOnClose
      >
        <Form form={requestForm} layout="vertical">
          <Form.Item name="title" label="à¸Šà¸·à¹ˆà¸­à¸„à¸³à¸‚à¸­" rules={[{ required: true, message: 'à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸Šà¸·à¹ˆà¸­à¸„à¸³à¸‚à¸­' }]}>
            <Input placeholder="à¹€à¸Šà¹ˆà¸™ à¸ªà¸³à¸£à¸§à¸ˆà¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¸£à¸°à¸šà¸²à¸”à¸¨à¸±à¸•à¸£à¸¹à¸žà¸·à¸Šà¸£à¸²à¸¢à¸­à¸³à¹€à¸ à¸­" />
          </Form.Item>
          <Form.Item name="description" label="à¸„à¸³à¸­à¸˜à¸´à¸šà¸²à¸¢">
            <Input.TextArea rows={2} placeholder="à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸—à¸µà¹ˆà¸­à¸³à¹€à¸ à¸­à¸•à¹‰à¸­à¸‡à¸—à¸£à¸²à¸šà¸à¹ˆà¸­à¸™à¸à¸£à¸­à¸" />
          </Form.Item>
          <Form.Item name="sheet_url" label="Google Sheet URL">
            <Input placeholder="à¸§à¸²à¸‡à¸¥à¸´à¸‡à¸à¹Œ Google Sheet à¸«à¸£à¸·à¸­ CSV export URL à¸ªà¸³à¸«à¸£à¸±à¸š sync à¸‚à¹‰à¸­à¸¡à¸¹à¸¥" />
          </Form.Item>
          <Space align="start" wrap>
            <Form.Item name="deadline" label="à¸à¸³à¸«à¸™à¸”à¸ªà¹ˆà¸‡">
              <DatePicker format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="status" label="à¸ªà¸–à¸²à¸™à¸°" rules={[{ required: true }]}>
              <Select style={{ width: 180 }} options={[
                { label: 'à¸£à¹ˆà¸²à¸‡', value: 'draft' },
                { label: 'à¹€à¸›à¸´à¸”à¸£à¸±à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥', value: 'published' },
                { label: 'à¸›à¸´à¸”à¹à¸¥à¹‰à¸§', value: 'closed' },
              ]} />
            </Form.Item>
          </Space>
          <Form.Item name="districts" label="à¸­à¸³à¹€à¸ à¸­à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥" rules={[{ required: true, message: 'à¹€à¸¥à¸·à¸­à¸à¸­à¸¢à¹ˆà¸²à¸‡à¸™à¹‰à¸­à¸¢ 1 à¸­à¸³à¹€à¸ à¸­' }]}>
            <Select mode="multiple" options={DISTRICTS.map(district => ({ label: district, value: district }))} />
          </Form.Item>
        </Form>

        <Card
          size="small"
          title="à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸•à¹‰à¸­à¸‡à¸à¸²à¸£à¹€à¸à¹‡à¸š"
          extra={(
            <Space>
              <Button icon={<FileTextOutlined />} onClick={openAiBuilder}>à¹€à¸£à¸´à¹ˆà¸¡à¸ˆà¸²à¸à¹„à¸Ÿà¸¥à¹Œ CSV/Google Sheet à¹€à¸”à¸´à¸¡</Button>
              <Button icon={<PlusOutlined />} onClick={addField}>à¹€à¸žà¸´à¹ˆà¸¡à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</Button>
            </Space>
          )}
        >
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="à¸à¸³à¸«à¸™à¸”à¸Šà¹ˆà¸­à¸‡à¸—à¸µà¹ˆà¸­à¸³à¹€à¸ à¸­à¸•à¹‰à¸­à¸‡à¸ªà¹ˆà¸‡ à¹€à¸Šà¹ˆà¸™ à¸­à¸³à¹€à¸ à¸­ à¸•à¸³à¸šà¸¥ à¸Šà¸™à¸´à¸”à¸žà¸·à¸Š à¸ˆà¸³à¸™à¸§à¸™ à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆ à¸«à¸£à¸·à¸­à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸"
          />
          <Space direction="vertical" style={{ width: '100%' }}>
            {normalizeSchema(schema).map((field, index) => (
              <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 150px 110px 1fr 42px', gap: 8, alignItems: 'center' }}>
                <Text>{index + 1}</Text>
                <Input value={field.label} placeholder="à¸Šà¸·à¹ˆà¸­à¸„à¸³à¸–à¸²à¸¡" onChange={e => updateField(field.id, { label: e.target.value })} />
                <Select value={field.type} options={FIELD_TYPES} onChange={value => updateField(field.id, { type: value })} />
                <Space>
                  <Switch checked={field.required} onChange={checked => updateField(field.id, { required: checked })} />
                  <Text>à¸šà¸±à¸‡à¸„à¸±à¸š</Text>
                </Space>
                <Input
                  disabled={field.type !== 'select'}
                  value={field.options}
                  placeholder="à¸•à¸±à¸§à¹€à¸¥à¸·à¸­à¸à¸„à¸±à¹ˆà¸™à¸”à¹‰à¸§à¸¢ comma"
                  onChange={e => updateField(field.id, { options: e.target.value })}
                />
                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeField(field.id)} />
              </div>
            ))}
          </Space>
        </Card>
      </Modal>

      <Modal
        title="à¸Šà¹ˆà¸§à¸¢à¸ˆà¸±à¸”à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ˆà¸²à¸à¹„à¸Ÿà¸¥à¹Œà¹€à¸”à¸´à¸¡"
        open={aiBuilderOpen}
        onCancel={() => setAiBuilderOpen(false)}
        width={1180}
        destroyOnClose
        footer={(
          <Space>
            <Button onClick={() => setAiBuilderOpen(false)}>à¸¢à¸à¹€à¸¥à¸´à¸</Button>
            <Button
              icon={<SyncOutlined />}
              loading={aiLoading}
              disabled={!selectedCandidate}
              onClick={() => analyzeCandidateWithAi(selectedCandidate, aiSourceMeta)}
            >
              à¹ƒà¸«à¹‰à¸£à¸°à¸šà¸šà¸Šà¹ˆà¸§à¸¢à¸ˆà¸±à¸”à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={!aiSuggestedSchema.length}
              onClick={applyAiSchema}
            >
              à¸™à¸³à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹„à¸›à¹ƒà¸Šà¹‰
            </Button>
          </Space>
        )}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="à¹€à¸¥à¸·à¸­à¸à¹„à¸Ÿà¸¥à¹Œà¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¸­à¸¢à¸¹à¹ˆà¸«à¸£à¸·à¸­à¸§à¸²à¸‡à¸¥à¸´à¸‡à¸à¹Œ Google Sheet à¸£à¸°à¸šà¸šà¸ˆà¸°à¸­à¹ˆà¸²à¸™à¸•à¸²à¸£à¸²à¸‡à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡ à¹à¸¥à¹‰à¸§à¸Šà¹ˆà¸§à¸¢à¹€à¸ªà¸™à¸­à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸«à¹‰à¸•à¸£à¸§à¸ˆà¹à¸à¹‰à¸à¹ˆà¸­à¸™à¸™à¸³à¹„à¸›à¹ƒà¸Šà¹‰"
        />
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Radio.Group value={aiSourceType} onChange={e => setAiSourceType(e.target.value)} optionType="button" buttonStyle="solid">
            <Radio.Button value="csv">à¹„à¸Ÿà¸¥à¹Œ CSV</Radio.Button>
            <Radio.Button value="google_sheet">à¸¥à¸´à¸‡à¸à¹Œ Google Sheet</Radio.Button>
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
              <Button icon={<FileTextOutlined />} loading={aiLoading}>à¹€à¸¥à¸·à¸­à¸à¹„à¸Ÿà¸¥à¹Œ CSV à¸—à¸µà¹ˆà¹ƒà¸Šà¹‰à¸­à¸¢à¸¹à¹ˆ</Button>
            </label>
          ) : (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={aiSheetUrl}
                onChange={e => setAiSheetUrl(e.target.value)}
                placeholder="à¸§à¸²à¸‡à¸¥à¸´à¸‡à¸à¹Œ Google Sheet"
              />
              <Button type="primary" loading={aiLoading} onClick={readAiGoogleSheetSource}>à¸­à¹ˆà¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</Button>
            </Space.Compact>
          )}

          {!!aiCandidates.length && (
            <Card size="small" title="à¸•à¸²à¸£à¸²à¸‡à¸—à¸µà¹ˆà¸£à¸°à¸šà¸šà¸žà¸šà¹ƒà¸™à¹„à¸Ÿà¸¥à¹Œ">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">à¸–à¹‰à¸²à¹„à¸Ÿà¸¥à¹Œà¸¡à¸µà¸«à¸¥à¸²à¸¢à¸•à¸²à¸£à¸²à¸‡ à¹ƒà¸«à¹‰à¹€à¸¥à¸·à¸­à¸à¸•à¸²à¸£à¸²à¸‡à¸—à¸µà¹ˆà¸­à¸³à¹€à¸ à¸­à¸•à¹‰à¸­à¸‡à¸à¸£à¸­à¸à¸ˆà¸£à¸´à¸‡</Text>
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
                    label: `${index + 1}. ${candidate.sheetName} à¹à¸–à¸§à¸«à¸±à¸§à¸•à¸²à¸£à¸²à¸‡ ${candidate.headerRowIndex + 1} Â· ${candidate.columnCount} à¸„à¸­à¸¥à¸±à¸¡à¸™à¹Œ Â· ${candidate.dataRowCount} à¹à¸–à¸§à¸•à¸±à¸§à¸­à¸¢à¹ˆà¸²à¸‡ Â· ${candidateConfidenceLabel(candidate)}`,
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
              message={aiSuggestionInfo.confidence >= 0.7 ? 'à¸£à¸°à¸šà¸šà¸Šà¹ˆà¸§à¸¢à¸ˆà¸±à¸”à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸¥à¹‰à¸§' : 'à¸£à¸°à¸šà¸šà¸ˆà¸±à¸”à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸šà¸·à¹‰à¸­à¸‡à¸•à¹‰à¸™à¹à¸¥à¹‰à¸§ à¸„à¸§à¸£à¸•à¸£à¸§à¸ˆà¹ƒà¸«à¹‰à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”'}
              description={aiSuggestionInfo.note || 'à¸•à¸£à¸§à¸ˆà¸Šà¸·à¹ˆà¸­à¸Šà¹ˆà¸­à¸‡ à¸Šà¸™à¸´à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ à¹à¸¥à¸°à¸Šà¹ˆà¸­à¸‡à¸šà¸±à¸‡à¸„à¸±à¸šà¸à¹ˆà¸­à¸™à¸™à¸³à¹„à¸›à¹ƒà¸Šà¹‰'}
            />
          )}

          {!!aiSuggestedSchema.length && (
            <Card size="small" title="à¸Šà¹ˆà¸­à¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¹ˆà¸£à¸°à¸šà¸šà¹à¸™à¸°à¸™à¸³">
              <Space direction="vertical" style={{ width: '100%' }}>
                {normalizeSchema(aiSuggestedSchema).map((field, index) => (
                  <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 140px 100px 1fr 1fr 42px', gap: 8, alignItems: 'center' }}>
                    <Text>{index + 1}</Text>
                    <Input value={field.label} placeholder="à¸Šà¸·à¹ˆà¸­à¸„à¸³à¸–à¸²à¸¡" onChange={e => updateAiField(field.id, { label: e.target.value })} />
                    <Select value={field.type} options={FIELD_TYPES} onChange={value => updateAiField(field.id, { type: value })} />
                    <Space>
                      <Switch checked={field.required} onChange={checked => updateAiField(field.id, { required: checked })} />
                      <Text>à¸šà¸±à¸‡à¸„à¸±à¸š</Text>
                    </Space>
                    <Input
                      disabled={field.type !== 'select'}
                      value={field.options}
                      placeholder="à¸•à¸±à¸§à¹€à¸¥à¸·à¸­à¸à¸„à¸±à¹ˆà¸™à¸”à¹‰à¸§à¸¢ comma"
                      onChange={e => updateAiField(field.id, { options: e.target.value })}
                    />
                    <Input
                      value={field.note}
                      placeholder="à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸à¸ˆà¸²à¸à¸£à¸°à¸šà¸š"
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
        title={activeRequest?.title || 'à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥'}
        open={fillOpen}
        onCancel={() => setFillOpen(false)}
        onOk={submitRows}
        okText="à¸ªà¹ˆà¸‡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥"
        cancelText="à¸¢à¸à¹€à¸¥à¸´à¸"
        width={1180}
        destroyOnClose
      >
        <Space style={{ marginBottom: 12 }} wrap>
          {isAdmin && (
            <Select
              value={selectedSubmitDistrict || undefined}
              onChange={setSelectedSubmitDistrict}
              style={{ width: 180 }}
              placeholder="à¹€à¸¥à¸·à¸­à¸à¸­à¸³à¹€à¸ à¸­"
              options={(requestAssignments[activeRequest?.id] || []).map(item => ({ label: item.district, value: item.district }))}
            />
          )}
          <Radio.Group value={entryMode} onChange={e => setEntryMode(e.target.value)} optionType="button" buttonStyle="solid">
            <Radio.Button value="grid">à¸•à¸²à¸£à¸²à¸‡ CSV</Radio.Button>
            <Radio.Button value="form">à¸Ÿà¸­à¸£à¹Œà¸¡à¸—à¸µà¸¥à¸°à¸£à¸²à¸¢à¸à¸²à¸£</Radio.Button>
          </Radio.Group>
          <Button icon={<DownloadOutlined />} onClick={() => downloadTemplate()}>à¸”à¸²à¸§à¸™à¹Œà¹‚à¸«à¸¥à¸” Template</Button>
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
            <Button icon={<FileTextOutlined />}>à¸­à¸±à¸›à¹‚à¸«à¸¥à¸” CSV</Button>
          </label>
        </Space>
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="à¸„à¸±à¸”à¸¥à¸­à¸à¸ˆà¸²à¸ CSV/Google Sheets à¹à¸¥à¹‰à¸§à¸§à¸²à¸‡à¸¥à¸‡à¸Šà¹ˆà¸­à¸‡à¹à¸£à¸à¸‚à¸­à¸‡à¸•à¸²à¸£à¸²à¸‡à¹„à¸”à¹‰ à¸£à¸°à¸šà¸šà¸ˆà¸°à¹à¸•à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸¥à¸‡à¹à¸–à¸§à¹à¸¥à¸°à¸„à¸­à¸¥à¸±à¸¡à¸™à¹Œà¹ƒà¸«à¹‰" />
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
              <Button icon={<PlusOutlined />} onClick={() => setGridRows(prev => [...prev, {}])}>à¹€à¸žà¸´à¹ˆà¸¡à¹à¸–à¸§</Button>
              <Button danger disabled={gridRows.length <= 1} onClick={() => setGridRows(prev => prev.slice(0, -1))}>à¸¥à¸šà¹à¸–à¸§à¸ªà¸¸à¸”à¸—à¹‰à¸²à¸¢</Button>
            </Space>
          </>
        )}
      </Modal>

      <Modal
        title={`à¸œà¸¥à¸¥à¸±à¸žà¸˜à¹Œ: ${activeRequest?.title || ''}`}
        open={resultOpen}
        onCancel={() => setResultOpen(false)}
        footer={<Button onClick={() => setResultOpen(false)}>à¸›à¸´à¸”</Button>}
        width={1180}
      >
        <Space style={{ marginBottom: 12 }}>
          <Tag color="blue">à¸ªà¹ˆà¸‡à¹à¸¥à¹‰à¸§ {resultRows.length} à¹à¸–à¸§</Tag>
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

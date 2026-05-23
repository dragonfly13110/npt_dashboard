import React, { useState } from 'react';
import { Card, Button, Input, Select, Switch, Tabs, Table, Tag, Form, message, Typography, Divider, Radio, Space, Upload, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, SendOutlined, DownloadOutlined, UploadOutlined, MinusCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { downloadCsv, parseCsvFile, rowsToCsv } from '../utils/csv';

const { Option } = Select;
const { Title, Text } = Typography;

const PlantProtectionFormDemo = () => {
  // à¸ªà¹€à¸•à¸•à¸ˆà¸³à¸¥à¸­à¸‡à¸ªà¸³à¸«à¸£à¸±à¸šà¸à¸²à¸£à¹€à¸à¹‡à¸šà¸•à¸±à¸§à¸ªà¸£à¹‰à¸²à¸‡à¹€à¸­à¸à¸ªà¸²à¸£ (JSON Schema)
  // à¸„à¹ˆà¸²à¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™à¹€à¸›à¹‡à¸™à¹à¸šà¸šà¸‡à¹ˆà¸²à¸¢
  const simpleSchema = [
    { id: 'sys-1', type: 'select', label: 'à¸­à¸³à¹€à¸ à¸­', required: true, options: 'à¹€à¸¡à¸·à¸­à¸‡à¸™à¸„à¸£à¸›à¸à¸¡,à¸à¸³à¹à¸žà¸‡à¹à¸ªà¸™,à¸™à¸„à¸£à¸Šà¸±à¸¢à¸¨à¸£à¸µ,à¸”à¸­à¸™à¸•à¸¹à¸¡,à¸šà¸²à¸‡à¹€à¸¥à¸™,à¸ªà¸²à¸¡à¸žà¸£à¸²à¸™,à¸žà¸¸à¸—à¸˜à¸¡à¸“à¸‘à¸¥' },
    { id: 'sys-2', type: 'text', label: 'à¸•à¸³à¸šà¸¥', required: true },
    { id: '1', type: 'text', label: 'à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¸£à¸²à¸¢à¸‡à¸²à¸™ (à¹€à¸à¸©à¸•à¸£à¸à¸£/à¸à¸¥à¸¸à¹ˆà¸¡)', required: true },
    { id: '2', type: 'select', label: 'à¸Šà¸™à¸´à¸”à¸¨à¸±à¸•à¸£à¸¹à¸žà¸·à¸Šà¸—à¸µà¹ˆà¸žà¸š', required: true, options: 'à¹€à¸žà¸¥à¸µà¹‰à¸¢à¸à¸£à¸°à¹‚à¸”à¸”,à¸«à¸™à¸­à¸™à¸à¸£à¸°à¸—à¸¹à¹‰,à¹‚à¸£à¸„à¹ƒà¸šà¸”à¹ˆà¸²à¸‡' },
    { id: '3', type: 'number', label: 'à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¹€à¸ªà¸µà¸¢à¸«à¸²à¸¢à¹‚à¸”à¸¢à¸›à¸£à¸°à¸¡à¸²à¸“ (à¹„à¸£à¹ˆ)', required: false }
  ];

  const [formSchema, setFormSchema] = useState(simpleSchema);
  const [responses, setResponses] = useState([]);

  // à¸ªà¸³à¸«à¸£à¸±à¸šà¸à¸²à¸£à¸ªà¸¥à¸±à¸šà¹‚à¸«à¸¡à¸”à¹ƒà¸™ Tab 2
  const [entryViewMode, setEntryViewMode] = useState('form');
  const [gridData, setGridData] = useState([{}]); // à¹€à¸à¹‡à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸•à¸²à¸£à¸²à¸‡ (à¹€à¸£à¸´à¹ˆà¸¡ 1 à¹à¸–à¸§à¹€à¸›à¸¥à¹ˆà¸²)

  const [antForm] = Form.useForm();

  // Watch à¸„à¹ˆà¸²à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¹€à¸žà¸·à¹ˆà¸­à¸—à¸³ Conditional Logic
  const currentValues = Form.useWatch([], antForm);

  // à¸Ÿà¸±à¸‡à¸Šà¸±à¹ˆà¸™à¹€à¸Šà¹‡à¸„à¸§à¹ˆà¸²à¸Ÿà¸´à¸¥à¸”à¹Œà¸™à¸µà¹‰à¸„à¸§à¸£à¹à¸ªà¸”à¸‡à¹„à¸«à¸¡
  const isFieldVisible = (field) => {
    if (!field.visible_if) return true;
    const watchValue = currentValues?.[field.visible_if.field];
    return watchValue === field.visible_if.equals;
  };

  // --- Functions à¸ªà¸³à¸«à¸£à¸±à¸šà¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸¡à¸·à¸­à¸ªà¸£à¹‰à¸²à¸‡à¸Ÿà¸­à¸£à¹Œà¸¡ (Builder) ---
  const updateBuilderField = (id, key, value) => {
    setFormSchema(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeBuilderField = (id) => {
    setFormSchema(prev => prev.filter(f => f.id !== id));
  };

  const addBuilderField = () => {
    const newId = Date.now().toString();
    setFormSchema(prev => [...prev, { id: newId, type: 'text', label: '', required: false }]);
  };

  const handleBuildFromCsv = (file) => {
    parseCsvFile(file)
      .then((rawData) => {
        if (rawData.length > 0) {
          const headers = rawData[0];
          const newSchema = headers.filter(h => h).map((header, index) => ({
              id: `ex-${Date.now()}-${index}`,
              type: 'text',
              label: header,
              required: false
          }));
          setFormSchema(newSchema);
          message.success(`สร้างฟอร์มจาก CSV สำเร็จ พบทั้งหมด ${newSchema.length} คำถาม`);
        } else {
          message.warning('ไม่พบหัวคอลัมน์ในไฟล์ CSV');
        }
      })
      .catch(() => message.error('เกิดข้อผิดพลาดในการอ่านไฟล์ CSV'));
    return false;
  };

  const handleSingleSubmit = (values) => {
    const newResponse = { id: Date.now().toString(), timestamp: new Date().toLocaleString('th-TH'), answers: values };
    setResponses([...responses, newResponse]);
    message.success('à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹€à¸‚à¹‰à¸²à¸£à¸°à¸šà¸šà¸ªà¸³à¹€à¸£à¹‡à¸ˆ!');
    antForm.resetFields();
  };

  // --- Functions à¸ªà¸³à¸«à¸£à¸±à¸šà¸•à¸²à¸£à¸²à¸‡à¸ˆà¸³à¸¥à¸­à¸‡ CSV (Grid Mode) ---
  const flatSchema = formSchema.filter(f => f.type !== 'repeater'); // à¸•à¸²à¸£à¸²à¸‡à¹à¸šà¸™à¹† à¹„à¸¡à¹ˆà¸£à¸­à¸‡à¸£à¸±à¸š repeater à¸•à¸­à¸™à¸™à¸µà¹‰

  const updateGridValue = (rowIndex, fieldId, value) => {
    const newData = [...gridData];
    newData[rowIndex] = { ...newData[rowIndex], [fieldId]: value };
    setGridData(newData);
  };

  const handleGridPaste = (e, startRowIndex, startFieldId) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('Text');
    if (!pasteText) return;

    // à¹à¸¢à¸à¹à¸–à¸§ (à¸šà¸£à¸£à¸—à¸±à¸”) à¹à¸¥à¸° à¸„à¸­à¸¥à¸±à¸¡à¸™à¹Œ (tab) à¹à¸šà¸šà¸—à¸µà¹ˆ CSV à¸Šà¸­à¸šà¹ƒà¸Šà¹‰à¸à¹‡à¸­à¸›à¸›à¸µà¹‰
    const rows = pasteText.split(/\r?\n/).filter(r => r.length > 0 || r.trim() !== '');
    const pasteData = rows.map(r => r.split('\t'));

    const startColIndex = flatSchema.findIndex(f => f.id === startFieldId);
    if (startColIndex === -1) return;

    const newData = [...gridData];

    pasteData.forEach((rowValues, i) => {
      const targetRow = startRowIndex + i;
      if (!newData[targetRow]) newData[targetRow] = {}; // à¸ªà¸£à¹‰à¸²à¸‡à¹à¸–à¸§à¹ƒà¸«à¸¡à¹ˆà¸–à¹‰à¸²à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¸¡à¸µ

      rowValues.forEach((cellValue, j) => {
        const targetCol = startColIndex + j;
        if (targetCol < flatSchema.length) {
          const fieldId = flatSchema[targetCol].id;
          newData[targetRow][fieldId] = cellValue;
        }
      });
    });

    setGridData(newData);
  };

  const addGridRow = () => {
    setGridData([...gridData, {}]);
  };

  const handleDataFromCsv = (file) => {
    parseCsvFile(file)
      .then((rawData) => {
        if (rawData.length > 1) {
           const newGridData = [];
           for (let i = 1; i < rawData.length; i += 1) {
             const rowValues = rawData[i];
             if (!rowValues || rowValues.length === 0 || rowValues.every(c => c === undefined || c === null || c === '')) continue;
             const newRowObj = {};
             rowValues.forEach((cellValue, j) => {
                if (j < flatSchema.length) newRowObj[flatSchema[j].id] = cellValue;
             });
             newGridData.push(newRowObj);
           }
           if (newGridData.length > 0) {
             setGridData(newGridData);
             message.success(`นำเข้าข้อมูลลงตารางให้ตรวจสอบได้ ${newGridData.length} รายการ`);
           } else {
             message.warning('ไม่พบข้อมูลในไฟล์ CSV');
           }
        } else {
             message.warning('ไฟล์ CSV นี้ว่างเปล่า หรือไม่มีแถวข้อมูลถัดจากหัวตาราง');
        }
      })
      .catch(() => message.error('เกิดปัญหาในการดึงข้อมูลจาก CSV'));
    return false;
  };

  const handleDownloadTemplate = () => {
     const headers = flatSchema.map(f => f.label);
     downloadCsv('plant-protection-template.csv', rowsToCsv([headers]));
     message.success('สร้างไฟล์ Template สำเร็จ!');
  };

  const handleGridSubmit = () => {
    const newResponses = gridData.filter(row => Object.keys(row).length > 0).map(row => ({
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toLocaleString('th-TH'),
      answers: row
    }));

    setResponses([...responses, ...newResponses]);
    setGridData([{}]); // à¸£à¸µà¹€à¸‹à¹‡à¸•à¹€à¸›à¹‡à¸™à¸„à¹ˆà¸²à¸§à¹ˆà¸²à¸‡
    message.success(`à¸™à¸³à¹€à¸‚à¹‰à¸²à¹à¸¥à¸°à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ˆà¸²à¸à¸•à¸²à¸£à¸²à¸‡à¸ªà¸³à¹€à¸£à¹‡à¸ˆ ${newResponses.length} à¸£à¸²à¸¢à¸à¸²à¸£!`);
  };

  const gridColumns = flatSchema.map(field => ({
    title: field.label,
    dataIndex: field.id,
    key: field.id,
    render: (text, record, index) => (
      <Input
        value={record[field.id] || ''}
        onChange={(e) => updateGridValue(index, field.id, e.target.value)}
        onPaste={(e) => handleGridPaste(e, index, field.id)}
        placeholder={`à¸à¸£à¸­à¸ ${field.label}`}
        style={{ minWidth: 150 }}
      />
    )
  }));

  const renderFieldInput = (type, options) => {
    if (type === 'text') return <Input placeholder="à¸žà¸´à¸¡à¸žà¹Œà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡..." />;
    if (type === 'number') return <Input type="number" placeholder="0" style={{ width: '100%' }} />;
    if (type === 'select') return (
      <Select placeholder="-- à¸à¸£à¸¸à¸“à¸²à¹€à¸¥à¸·à¸­à¸ --">
        {options?.split(',').map(opt => <Option key={opt} value={opt.trim()}>{opt.trim()}</Option>)}
      </Select>
    );
    return <Input />;
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>à¸£à¸°à¸šà¸šà¸ªà¸£à¹‰à¸²à¸‡à¸„à¸³à¸‚à¸­à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸”à¹ˆà¸§à¸™ (Fast Entry Builder)</Title>
        <Upload beforeUpload={handleBuildFromCsv} showUploadList={false} accept=".csv,text/csv">
          <Button style={{ background: '#108ee9', color: '#fff' }} icon={<UploadOutlined />}>
            à¸™à¸³à¹€à¸‚à¹‰à¸²à¹„à¸Ÿà¸¥à¹Œ CSV à¸ªà¸£à¹‰à¸²à¸‡à¸Ÿà¸­à¸£à¹Œà¸¡à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´!
          </Button>
        </Upload>
      </Space>

      <Tabs defaultActiveKey="1" type="card">

        {/* Tab 1: Form Builder */}
        <Tabs.TabPane tab="1. à¸à¸²à¸£à¸­à¸­à¸à¹à¸šà¸šà¸Ÿà¸­à¸£à¹Œà¸¡ (à¸«à¸™à¹‰à¸²à¸ˆà¸­à¸‚à¸­à¸‡à¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”)" key="1">
          <Card title="à¹€à¸„à¸£à¸·à¹ˆà¸­à¸‡à¸¡à¸·à¸­à¸ªà¸£à¹‰à¸²à¸‡à¸„à¸³à¸–à¸²à¸¡ (à¹à¸šà¸šà¸‡à¹ˆà¸²à¸¢)" extra={<Button type="primary" icon={<SaveOutlined />}>à¸šà¸±à¸™à¸—à¸¶à¸à¹‚à¸„à¸£à¸‡à¸ªà¸£à¹‰à¸²à¸‡à¸Ÿà¸­à¸£à¹Œà¸¡</Button>}>
            <Alert message="à¸ªà¸²à¸¡à¸²à¸£à¸–à¸à¸” 'à¹€à¸žà¸´à¹ˆà¸¡à¸„à¸³à¸–à¸²à¸¡à¹ƒà¸«à¸¡à¹ˆ' à¸«à¸£à¸·à¸­à¸à¸”à¸›à¸¸à¹ˆà¸¡à¸­à¸±à¸›à¹‚à¸«à¸¥à¸” CSV à¸ªà¸µà¸Ÿà¹‰à¸²à¸”à¹‰à¸²à¸™à¸šà¸™à¹€à¸žà¸·à¹ˆà¸­à¹ƒà¸«à¹‰à¸£à¸°à¸šà¸šà¹à¸à¸°à¸«à¸±à¸§à¸„à¸­à¸¥à¸±à¸¡à¸™à¹Œà¸¡à¸²à¹€à¸›à¹‡à¸™à¸„à¸³à¸–à¸²à¸¡à¹à¸šà¸šà¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´" type="info" showIcon style={{ marginBottom: 20 }} />

            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
               <Space direction="vertical" style={{ width: '100%' }} size="middle">

                  {/* à¹à¸ªà¸”à¸‡à¸Ÿà¸´à¸¥à¸”à¹Œà¸—à¸µà¹ˆà¸ˆà¸±à¸‡à¸«à¸§à¸±à¸”à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸­à¸‡ */}
                  {formSchema.filter(f => !f.id.startsWith('sys-')).map((field, index) => (
                     <div key={field.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                       <span style={{ fontWeight: 'bold', width: '20px' }}>{index + 1}.</span>
                       <Input
                         value={field.label}
                         onChange={(e) => updateBuilderField(field.id, 'label', e.target.value)}
                         placeholder="à¸„à¸³à¸–à¸²à¸¡ à¹€à¸Šà¹ˆà¸™ à¸ˆà¸³à¸™à¸§à¸™à¸›à¸£à¸°à¸Šà¸²à¸à¸£, à¸žà¸·à¹‰à¸™à¸—à¸µà¹ˆà¹€à¸žà¸²à¸°à¸›à¸¥à¸¹à¸"
                         style={{ width: 400 }}
                       />
                       <Select
                         value={field.type}
                         onChange={(e) => updateBuilderField(field.id, 'type', e)}
                         style={{ width: 120 }}
                       >
                         <Option value="text">à¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡</Option>
                         <Option value="number">à¸•à¸±à¸§à¹€à¸¥à¸‚</Option>
                       </Select>
                       <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeBuilderField(field.id)}>à¸¥à¸š</Button>
                     </div>
                  ))}

                  <Button type="dashed" onClick={addBuilderField} block icon={<PlusOutlined />} style={{ marginTop: 8 }}>
                    à¹€à¸žà¸´à¹ˆà¸¡à¸„à¸³à¸–à¸²à¸¡à¹ƒà¸«à¸¡à¹ˆ
                  </Button>
               </Space>
            </div>
          </Card>
        </Tabs.TabPane>

        {/* Tab 2: Form Viewer (à¸£à¸§à¸šà¸£à¸§à¸¡à¸§à¸´à¸˜à¸µà¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥) */}
        <Tabs.TabPane tab="2. à¸ªà¹ˆà¸§à¸™à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ (à¹€à¸‚à¹‰à¸²à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¹‚à¸”à¸¢à¸­à¸³à¹€à¸ à¸­)" key="2">
          <Card>
            <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <Title level={4} style={{ color: '#d48806', margin: 0 }}>ðŸ’¡ à¸žà¸£à¸µà¸§à¸´à¸§à¸Ÿà¸­à¸£à¹Œà¸¡à¸—à¸µà¹ˆà¸ªà¸£à¹‰à¸²à¸‡:</Title>
              <Text style={{ color: '#5c5c5c' }}>à¸™à¸µà¹ˆà¸„à¸·à¸­à¸«à¸™à¹‰à¸²à¸•à¸²à¸—à¸µà¹ˆà¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸£à¸°à¸”à¸±à¸šà¸­à¸³à¹€à¸ à¸­à¸ˆà¸°à¹€à¸«à¹‡à¸™ à¸„à¸¸à¸“à¸ªà¸²à¸¡à¸²à¸£à¸–à¸—à¸”à¸ªà¸­à¸šà¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸«à¸£à¸·à¸­à¸­à¸±à¸›à¹‚à¸«à¸¥à¸” CSV à¹€à¸žà¸·à¹ˆà¸­à¸ªà¹ˆà¸‡à¹€à¸‚à¹‰à¸²à¸ªà¹ˆà¸§à¸™à¸à¸¥à¸²à¸‡à¹„à¸”à¹‰à¹€à¸¥à¸¢</Text>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0 }}>à¸Šà¹ˆà¸­à¸‡à¸—à¸²à¸‡à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥</Title>
              <Radio.Group value={entryViewMode} onChange={e => setEntryViewMode(e.target.value)} optionType="button" buttonStyle="solid">
                <Radio.Button value="form">à¹‚à¸«à¸¡à¸”à¸Ÿà¸­à¸£à¹Œà¸¡à¸›à¸à¸•à¸´ (à¸—à¸µà¸¥à¸°à¸£à¸²à¸¢à¸à¸²à¸£)</Radio.Button>
                <Radio.Button value="grid">à¹‚à¸«à¸¡à¸”à¸•à¸²à¸£à¸²à¸‡ CSV (à¸£à¸­à¸‡à¸£à¸±à¸šà¸à¸²à¸£à¸à¹‡à¸­à¸›à¸›à¸µà¹‰à¸§à¸²à¸‡)</Radio.Button>
              </Radio.Group>
            </div>

            {entryViewMode === 'form' ? (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <Form form={antForm} layout="vertical" onFinish={handleSingleSubmit} initialValues={{ q_plots: [{}] }}>

                  {formSchema.map((field) => {
                    // à¸‚à¹‰à¸²à¸¡à¸«à¸²à¸à¸•à¸´à¸”à¹€à¸‡à¸·à¹ˆà¸­à¸™à¹„à¸‚à¸§à¸´à¸ªà¸±à¸¢à¸—à¸±à¸¨à¸™à¹Œ (Conditional Logic)
                    if (!isFieldVisible(field)) return null;

                    // à¸ªà¹ˆà¸§à¸™à¸à¸²à¸£à¹€à¸£à¸™à¹€à¸”à¸­à¸£à¹Œà¹à¸šà¸š Repeater (à¸Ÿà¸­à¸£à¹Œà¸¡à¸‹à¹‰à¸­à¸™)
                    if (field.type === 'repeater') {
                      return (
                        <Card key={field.id} size="small" type="inner" title={field.label} style={{ marginBottom: 24, background: '#fafafa' }}>
                          <Form.List name={field.id}>
                            {(subFields, { add, remove }) => (
                              <>
                                {subFields.map(({ key, name, ...restField }) => (
                                  <div key={key} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 16, padding: '12px', background: '#fff', border: '1px solid #e8e8e8', borderRadius: 4 }}>

                                    {field.sub_fields.map(subItem => (
                                      <Form.Item
                                        key={subItem.id}
                                        {...restField}
                                        name={[name, subItem.id]}
                                        label={subItem.label}
                                        style={{ margin: 0, flex: 1 }}
                                      >
                                        {renderFieldInput(subItem.type, subItem.options)}
                                      </Form.Item>
                                    ))}

                                    {subFields.length > 1 && (
                                      <Button danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                                    )}
                                  </div>
                                ))}

                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                  {`à¹€à¸žà¸´à¹ˆà¸¡à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹à¸›à¸¥à¸‡à¹€à¸žà¸²à¸°à¸›à¸¥à¸¹à¸à¸—à¸µà¹ˆ ${subFields.length + 1}`}
                                </Button>
                              </>
                            )}
                          </Form.List>
                        </Card>
                      );
                    }

                    // à¸Ÿà¸´à¸¥à¸”à¹Œà¸˜à¸£à¸£à¸¡à¸”à¸²
                    return (
                      <Form.Item key={field.id} name={field.id} label={field.label} rules={[{ required: field.required, message: `à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥` }]}>
                        {renderFieldInput(field.type, field.options)}
                      </Form.Item>
                    );
                  })}

                  <Button type="primary" htmlType="submit" icon={<SendOutlined />} size="large" block>
                    à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸—à¸µà¸¥à¸°à¸£à¸²à¸¢à¸à¸²à¸£
                  </Button>
                </Form>
              </div>
            ) : (
              <div>
                <Alert message="à¸­à¸±à¸ˆà¸‰à¸£à¸´à¸¢à¸°à¸à¸§à¹ˆà¸²à¹€à¸”à¸´à¸¡!: à¸„à¸¸à¸“à¸ªà¸²à¸¡à¸²à¸£à¸–à¹„à¸› Copy à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸™ CSV (à¸¥à¸²à¸à¸„à¸¥à¸¸à¸¡à¸«à¸¥à¸²à¸¢à¹€à¸‹à¸¥à¸¥à¹Œ) à¹à¸¥à¹‰à¸§à¹€à¸­à¸²à¹€à¸¡à¸²à¸ªà¹Œà¸¡à¸²à¸„à¸¥à¸´à¸à¸—à¸µà¹ˆà¸Šà¹ˆà¸­à¸‡à¸‹à¹‰à¸²à¸¢à¸šà¸™à¸ªà¸¸à¸”à¸­à¸±à¸™à¹à¸£à¸ à¸ˆà¸²à¸à¸™à¸±à¹‰à¸™à¸à¸” Ctrl+V à¸§à¸²à¸‡à¸žà¸£à¸§à¸”à¹€à¸”à¸µà¸¢à¸§à¹„à¸”à¹‰à¹€à¸¥à¸¢ à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ˆà¸°à¹à¸•à¸à¸à¸£à¸°à¸ˆà¸¸à¸¢à¸¥à¸‡à¸¥à¹‡à¸­à¸à¹ƒà¸«à¹‰à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´!" type="info" showIcon style={{ marginBottom: 16 }} />

                <Space style={{ marginBottom: 16 }}>
                   <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                     1. à¹‚à¸«à¸¥à¸”à¹€à¸—à¸¡à¹€à¸žà¸¥à¸• CSV à¹„à¸›à¸à¸£à¸­à¸
                   </Button>
                   <Upload beforeUpload={handleDataFromCsv} showUploadList={false} accept=".csv,text/csv">
                      <Button style={{ background: '#52c41a', color: '#fff' }} icon={<UploadOutlined />}>
                        2. à¸­à¸±à¸›à¹‚à¸«à¸¥à¸” CSV à¸—à¸µà¹ˆà¸à¸£à¸­à¸à¹€à¸ªà¸£à¹‡à¸ˆà¹à¸¥à¹‰à¸§
                      </Button>
                   </Upload>
                </Space>

                <Table
                  columns={gridColumns}
                  dataSource={gridData.map((d, i) => ({...d, key: i}))}
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  size="small"
                  bordered
                />
                <Space style={{ marginTop: 16, width: '100%', justifyContent: 'space-between' }}>
                  <Button type="dashed" onClick={addGridRow} icon={<PlusOutlined />}>à¹€à¸žà¸´à¹ˆà¸¡à¹à¸–à¸§à¹€à¸›à¸¥à¹ˆà¸² 1 à¹à¸–à¸§</Button>
                  <Button type="primary" onClick={handleGridSubmit} icon={<SendOutlined />} size="large">à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸•à¸²à¸£à¸²à¸‡à¸—à¸±à¹‰à¸‡à¸«à¸¡à¸”à¹€à¸‚à¹‰à¸²à¸£à¸°à¸šà¸šà¸ªà¹ˆà¸§à¸™à¸à¸¥à¸²à¸‡</Button>
                </Space>
              </div>
            )}

          </Card>
        </Tabs.TabPane>

        {/* Tab 3: Dashboard */}
        <Tabs.TabPane tab={`3. à¸à¸²à¸™à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ªà¹ˆà¸§à¸™à¸à¸¥à¸²à¸‡ (à¹„à¸”à¹‰à¸£à¸±à¸šà¹à¸¥à¹‰à¸§ ${responses.length} à¸£à¸²à¸¢à¸à¸²à¸£)`} key="3">
          <Card title="à¸‚à¹‰à¸­à¸¡à¸¹à¸¥ JSON à¹ƒà¸™ Database à¸‚à¸­à¸‡à¸à¸²à¸£à¹€à¸à¹‡à¸šà¸‹à¸±à¸šà¸‹à¹‰à¸­à¸™">
            {responses.length === 0 ? (
              <Text type="secondary">à¸à¸£à¸¸à¸“à¸²à¸—à¸”à¸¥à¸­à¸‡à¸šà¸±à¸™à¸—à¸¶à¸à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¹ƒà¸™à¹‚à¸«à¸¡à¸”à¸•à¹ˆà¸²à¸‡à¹† à¹€à¸žà¸·à¹ˆà¸­à¸¡à¸²à¹à¸ªà¸”à¸‡à¸œà¸¥à¸«à¸™à¹‰à¸²à¸™à¸µà¹‰</Text>
            ) : (
              <div>
                <Alert message="à¹€à¸¡à¸·à¹ˆà¸­à¸Ÿà¸­à¸£à¹Œà¸¡à¸¡à¸µà¸„à¸§à¸²à¸¡à¸‹à¸±à¸šà¸‹à¹‰à¸­à¸™ à¸à¸²à¸£à¸£à¸±à¸™à¹ƒà¸«à¹‰à¹€à¸›à¹‡à¸™à¸•à¸²à¸£à¸²à¸‡ CSV à¹à¸šà¸š 2 à¸¡à¸´à¸•à¸´à¸ˆà¸°à¹€à¸›à¹‡à¸™à¹€à¸£à¸·à¹ˆà¸­à¸‡à¸¢à¸²à¸ à¸£à¸°à¸šà¸šà¸¡à¸±à¸à¸ˆà¸°à¸šà¸±à¸™à¸—à¸¶à¸à¹€à¸›à¹‡à¸™ JSON à¹à¸šà¸šà¸¥à¸¶à¸ (Nested JSON) à¹à¸—à¸™ à¸‹à¸¶à¹ˆà¸‡à¸¡à¸±à¸™à¹€à¸­à¸²à¹„à¸›à¸—à¸³à¸à¸£à¸²à¸Ÿà¸šà¸™ Dashboard à¸•à¹ˆà¸­à¹„à¸”à¹‰à¸‡à¹ˆà¸²à¸¢à¸¡à¸²à¸à¹†!" type="success" showIcon />

                {responses.map((resp, i) => (
                  <div key={resp.id} style={{ marginTop: 20, padding: 16, background: '#141414', borderRadius: 8 }}>
                    <Text style={{ color: '#49aa19', fontWeight: 'bold' }}>à¸£à¸²à¸¢à¸à¸²à¸£à¸ªà¹ˆà¸‡à¸—à¸µà¹ˆ {i + 1} (à¹€à¸§à¸¥à¸² {resp.timestamp})</Text>
                    <pre style={{ color: '#d4b106', margin: 0, marginTop: 10 }}>{JSON.stringify(resp.answers, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Tabs.TabPane>

      </Tabs>
    </div>
  );
};

export default PlantProtectionFormDemo;

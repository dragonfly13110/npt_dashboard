import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Switch, Tabs, Table, Tag, Form, message, Typography, Divider, Radio, Space, Upload, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, SendOutlined, DownloadOutlined, UploadOutlined, MinusCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { Title, Text } = Typography;

const PlantProtectionFormDemo = () => {
  // สเตตจำลองสำหรับการเก็บตัวสร้างเอกสาร (JSON Schema)
  // ค่าเริ่มต้นเป็นแบบง่าย
  const simpleSchema = [
    { id: 'sys-1', type: 'select', label: 'อำเภอ', required: true, options: 'เมืองนครปฐม,กำแพงแสน,นครชัยศรี,ดอนตูม,บางเลน,สามพราน,พุทธมณฑล' },
    { id: 'sys-2', type: 'text', label: 'ตำบล', required: true },
    { id: '1', type: 'text', label: 'ชื่อผู้รายงาน (เกษตรกร/กลุ่ม)', required: true },
    { id: '2', type: 'select', label: 'ชนิดศัตรูพืชที่พบ', required: true, options: 'เพลี้ยกระโดด,หนอนกระทู้,โรคใบด่าง' },
    { id: '3', type: 'number', label: 'พื้นที่เสียหายโดยประมาณ (ไร่)', required: false }
  ];

  const [formSchema, setFormSchema] = useState(simpleSchema);
  const [responses, setResponses] = useState([]);
  
  // สำหรับการสลับโหมดใน Tab 2
  const [entryViewMode, setEntryViewMode] = useState('form'); 
  const [gridData, setGridData] = useState([{}]); // เก็บข้อมูลตาราง (เริ่ม 1 แถวเปล่า)

  const [antForm] = Form.useForm();
  
  // Watch ค่าทั้งหมดเพื่อทำ Conditional Logic
  const currentValues = Form.useWatch([], antForm);

  // ฟังชั่นเช็คว่าฟิลด์นี้ควรแสดงไหม
  const isFieldVisible = (field) => {
    if (!field.visible_if) return true;
    const watchValue = currentValues?.[field.visible_if.field];
    return watchValue === field.visible_if.equals;
  };

  // --- Functions สำหรับเครื่องมือสร้างฟอร์ม (Builder) ---
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

  const handleBuildFromExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // อ่านแบบดึงเฉพาะหัวคอลัมน์ (row แรกสุด)
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if(rawData.length > 0) {
          const headers = rawData[0]; // แถวแรกของ Excel
          const newSchema = headers.filter(h => h).map((header, index) => ({
              id: `ex-${Date.now()}-${index}`,
              type: 'text', // ค่าเริ่มต้นให้เป็นกรอกข้อความก่อน
              label: header,
              required: false
          }));
          
          setFormSchema(newSchema);
          message.success(`สร้างฟอร์มจาก Excel ลุล่วง! พบทั้งหมด ${newSchema.length} คำถาม`);
        } else {
          message.warning("ไม่พบหัวคอลัมน์ในไฟล์ Excel");
        }
      } catch (err) {
        message.error("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel");
      }
    };
    reader.readAsBinaryString(file);
    return false; // หยุด default upload behavior
  };

  const handleSingleSubmit = (values) => {
    const newResponse = { id: Date.now().toString(), timestamp: new Date().toLocaleString('th-TH'), answers: values };
    setResponses([...responses, newResponse]);
    message.success('บันทึกข้อมูลเข้าระบบสำเร็จ!');
    antForm.resetFields();
  };

  // --- Functions สำหรับตารางจำลอง Excel (Grid Mode) ---
  const flatSchema = formSchema.filter(f => f.type !== 'repeater'); // ตารางแบนๆ ไม่รองรับ repeater ตอนนี้

  const updateGridValue = (rowIndex, fieldId, value) => {
    const newData = [...gridData];
    newData[rowIndex] = { ...newData[rowIndex], [fieldId]: value };
    setGridData(newData);
  };

  const handleGridPaste = (e, startRowIndex, startFieldId) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('Text');
    if (!pasteText) return;

    // แยกแถว (บรรทัด) และ คอลัมน์ (tab) แบบที่ Excel ชอบใช้ก็อปปี้
    const rows = pasteText.split(/\r?\n/).filter(r => r.length > 0 || r.trim() !== '');
    const pasteData = rows.map(r => r.split('\t'));

    const startColIndex = flatSchema.findIndex(f => f.id === startFieldId);
    if (startColIndex === -1) return;

    const newData = [...gridData];

    pasteData.forEach((rowValues, i) => {
      const targetRow = startRowIndex + i;
      if (!newData[targetRow]) newData[targetRow] = {}; // สร้างแถวใหม่ถ้ายังไม่มี

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

  const handleDataFromExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // อ่านข้อมูลมาเป็น 2D Array
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rawData.length > 1) { // แถวที่ 0 คือ Header เราต้องการข้อมูลตั้งแต่แถว 1
           const newGridData = [];
           for (let i = 1; i < rawData.length; i++) {
             const rowValues = rawData[i];
             // ข้ามแถวที่ว่างสนิท
             if (!rowValues || rowValues.length === 0 || rowValues.every(c => c === undefined || c === null || c === '')) continue;
             
             let newRowObj = {};
             rowValues.forEach((cellValue, j) => {
                if (j < flatSchema.length) {
                   const fieldId = flatSchema[j].id;
                   newRowObj[fieldId] = cellValue;
                }
             });
             newGridData.push(newRowObj);
           }
           if (newGridData.length > 0) {
             setGridData(newGridData);
             message.success(`นำเข้าข้อมูลลงตารางให้ตรวจสอบได้ ${newGridData.length} รายการ (กรุณากดปุ่มส่งข้อมูลเข้าระบบอีกครั้ง)`);
           } else {
             message.warning("ไม่พบข้อมูลในไฟล์ Excel (เห็นแค่หัวตาราง)");
           }
        } else {
             message.warning("ไฟล์ Excel นี้ว่างเปล่า หรือไม่มีแถวข้อมูลถัดจากหัวตาราง");
        }
      } catch (err) {
        message.error("เกิดปัญหาในการดึงข้อมูลจาก Excel");
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const handleDownloadTemplate = () => {
     const headers = flatSchema.map(f => f.label);
     const worksheet = XLSX.utils.aoa_to_sheet([headers]);
     const workbook = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
     XLSX.writeFile(workbook, "แบบฟอร์มฟอร์มกรอกข้อมูลระดับอำเภอ.xlsx");
     message.success("สร้างไฟล์ Template สำเร็จ!");
  };

  const handleGridSubmit = () => {
    const newResponses = gridData.filter(row => Object.keys(row).length > 0).map(row => ({
      id: Date.now().toString() + Math.random(),
      timestamp: new Date().toLocaleString('th-TH'),
      answers: row
    }));
    
    setResponses([...responses, ...newResponses]);
    setGridData([{}]); // รีเซ็ตเป็นค่าว่าง
    message.success(`นำเข้าและบันทึกข้อมูลจากตารางสำเร็จ ${newResponses.length} รายการ!`);
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
        placeholder={`กรอก ${field.label}`}
        style={{ minWidth: 150 }}
      />
    )
  }));

  const renderFieldInput = (type, options) => {
    if (type === 'text') return <Input placeholder="พิมพ์ข้อความ..." />;
    if (type === 'number') return <Input type="number" placeholder="0" style={{ width: '100%' }} />;
    if (type === 'select') return (
      <Select placeholder="-- กรุณาเลือก --">
        {options?.split(',').map(opt => <Option key={opt} value={opt.trim()}>{opt.trim()}</Option>)}
      </Select>
    );
    return <Input />;
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Space align="center" style={{ marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>ระบบสร้างคำขอข้อมูลด่วน (Fast Entry Builder)</Title>
        <Upload beforeUpload={handleBuildFromExcel} showUploadList={false} accept=".xlsx,.xls">
          <Button style={{ background: '#108ee9', color: '#fff' }} icon={<UploadOutlined />}>
            นำเข้าไฟล์ Excel สร้างฟอร์มอัตโนมัติ!
          </Button>
        </Upload>
      </Space>
      
      <Tabs defaultActiveKey="1" type="card">
        
        {/* Tab 1: Form Builder */}
        <Tabs.TabPane tab="1. การออกแบบฟอร์ม (หน้าจอของจังหวัด)" key="1">
          <Card title="เครื่องมือสร้างคำถาม (แบบง่าย)" extra={<Button type="primary" icon={<SaveOutlined />}>บันทึกโครงสร้างฟอร์ม</Button>}>
            <Alert message="สามารถกด 'เพิ่มคำถามใหม่' หรือกดปุ่มอัปโหลด Excel สีฟ้าด้านบนเพื่อให้ระบบแกะหัวคอลัมน์มาเป็นคำถามแบบอัตโนมัติ" type="info" showIcon style={{ marginBottom: 20 }} />

            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #d9d9d9' }}>
               <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  
                  {/* แสดงฟิลด์ที่จังหวัดเพิ่มเอง */}
                  {formSchema.filter(f => !f.id.startsWith('sys-')).map((field, index) => (
                     <div key={field.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#fff', padding: '8px', borderBottom: '1px solid #f0f0f0' }}>
                       <span style={{ fontWeight: 'bold', width: '20px' }}>{index + 1}.</span>
                       <Input 
                         value={field.label} 
                         onChange={(e) => updateBuilderField(field.id, 'label', e.target.value)}
                         placeholder="คำถาม เช่น จำนวนประชากร, พื้นที่เพาะปลูก" 
                         style={{ width: 400 }} 
                       />
                       <Select 
                         value={field.type} 
                         onChange={(e) => updateBuilderField(field.id, 'type', e)}
                         style={{ width: 120 }}
                       >
                         <Option value="text">ข้อความ</Option>
                         <Option value="number">ตัวเลข</Option>
                       </Select>
                       <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeBuilderField(field.id)}>ลบ</Button>
                     </div>
                  ))}

                  <Button type="dashed" onClick={addBuilderField} block icon={<PlusOutlined />} style={{ marginTop: 8 }}>
                    เพิ่มคำถามใหม่
                  </Button>
               </Space>
            </div>
          </Card>
        </Tabs.TabPane>

        {/* Tab 2: Form Viewer (รวบรวมวิธีกรอกข้อมูล) */}
        <Tabs.TabPane tab="2. ส่วนบันทึกข้อมูล (เข้าใช้งานโดยอำเภอ)" key="2">
          <Card>
            <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <Title level={4} style={{ color: '#d48806', margin: 0 }}>💡 พรีวิวฟอร์มที่สร้าง:</Title>
              <Text style={{ color: '#5c5c5c' }}>นี่คือหน้าตาที่ผู้ใช้งานระดับอำเภอจะเห็น คุณสามารถทดสอบกรอกข้อมูลหรืออัปโหลด Excel เพื่อส่งเข้าส่วนกลางได้เลย</Text>
            </div>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={5} style={{ margin: 0 }}>ช่องทางกรอกข้อมูล</Title>
              <Radio.Group value={entryViewMode} onChange={e => setEntryViewMode(e.target.value)} optionType="button" buttonStyle="solid">
                <Radio.Button value="form">โหมดฟอร์มปกติ (ทีละรายการ)</Radio.Button>
                <Radio.Button value="grid">โหมดตาราง Excel (รองรับการก็อปปี้วาง)</Radio.Button>
              </Radio.Group>
            </div>

            {entryViewMode === 'form' ? (
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <Form form={antForm} layout="vertical" onFinish={handleSingleSubmit} initialValues={{ q_plots: [{}] }}>
                  
                  {formSchema.map((field) => {
                    // ข้ามหากติดเงื่อนไขวิสัยทัศน์ (Conditional Logic)
                    if (!isFieldVisible(field)) return null;

                    // ส่วนการเรนเดอร์แบบ Repeater (ฟอร์มซ้อน)
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
                                  {`เพิ่มข้อมูลแปลงเพาะปลูกที่ ${subFields.length + 1}`}
                                </Button>
                              </>
                            )}
                          </Form.List>
                        </Card>
                      );
                    }

                    // ฟิลด์ธรรมดา
                    return (
                      <Form.Item key={field.id} name={field.id} label={field.label} rules={[{ required: field.required, message: `กรุณากรอกข้อมูล` }]}>
                        {renderFieldInput(field.type, field.options)}
                      </Form.Item>
                    );
                  })}
                  
                  <Button type="primary" htmlType="submit" icon={<SendOutlined />} size="large" block>
                    บันทึกข้อมูลทีละรายการ 
                  </Button>
                </Form>
              </div>
            ) : (
              <div>
                <Alert message="อัจฉริยะกว่าเดิม!: คุณสามารถไป Copy ข้อมูลใน Excel (ลากคลุมหลายเซลล์) แล้วเอาเมาส์มาคลิกที่ช่องซ้ายบนสุดอันแรก จากนั้นกด Ctrl+V วางพรวดเดียวได้เลย ข้อมูลจะแตกกระจุยลงล็อกให้อัตโนมัติ!" type="info" showIcon style={{ marginBottom: 16 }} />
                
                <Space style={{ marginBottom: 16 }}>
                   <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                     1. โหลดเทมเพลต Excel ไปกรอก
                   </Button>
                   <Upload beforeUpload={handleDataFromExcel} showUploadList={false} accept=".xlsx,.xls">
                      <Button style={{ background: '#52c41a', color: '#fff' }} icon={<UploadOutlined />}>
                        2. อัปโหลด Excel ที่กรอกเสร็จแล้ว
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
                  <Button type="dashed" onClick={addGridRow} icon={<PlusOutlined />}>เพิ่มแถวเปล่า 1 แถว</Button>
                  <Button type="primary" onClick={handleGridSubmit} icon={<SendOutlined />} size="large">บันทึกข้อมูลตารางทั้งหมดเข้าระบบส่วนกลาง</Button>
                </Space>
              </div>
            )}
            
          </Card>
        </Tabs.TabPane>

        {/* Tab 3: Dashboard */}
        <Tabs.TabPane tab={`3. ฐานข้อมูลส่วนกลาง (ได้รับแล้ว ${responses.length} รายการ)`} key="3">
          <Card title="ข้อมูล JSON ใน Database ของการเก็บซับซ้อน">
            {responses.length === 0 ? (
              <Text type="secondary">กรุณาทดลองบันทึกข้อมูลในโหมดต่างๆ เพื่อมาแสดงผลหน้านี้</Text>
            ) : (
              <div>
                <Alert message="เมื่อฟอร์มมีความซับซ้อน การรันให้เป็นตาราง Excel แบบ 2 มิติจะเป็นเรื่องยาก ระบบมักจะบันทึกเป็น JSON แบบลึก (Nested JSON) แทน ซึ่งมันเอาไปทำกราฟบน Dashboard ต่อได้ง่ายมากๆ!" type="success" showIcon />
                
                {responses.map((resp, i) => (
                  <div key={resp.id} style={{ marginTop: 20, padding: 16, background: '#141414', borderRadius: 8 }}>
                    <Text style={{ color: '#49aa19', fontWeight: 'bold' }}>รายการส่งที่ {i + 1} (เวลา {resp.timestamp})</Text>
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

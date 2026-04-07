import { useState } from 'react';
import { Modal, Button, Table, Select, Progress, Alert, Steps, Tag, Space, Upload } from 'antd';
import {
    UploadOutlined, FileTextOutlined, CheckCircleOutlined,
    WarningOutlined, CloudUploadOutlined, ArrowRightOutlined
} from '@ant-design/icons';

const { Dragger } = Upload;

/**
 * Parse CSV text → array of objects
 * รองรับ UTF-8 + BOM, comma/semicolon, ค่าที่มี quotes และขึ้นบรรทัดใหม่ในเซลล์
 */
function parseCsv(text) {
    // Remove BOM
    const clean = text.replace(/^\uFEFF/, '');
    if (!clean.trim()) return { headers: [], rows: [] };

    // Detect delimiter from first line
    const firstLine = clean.split(/\r?\n/)[0];
    const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';

    const rowsData = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < clean.length; i++) {
        const char = clean[i];
        
        if (char === '"') {
            if (inQuotes && clean[i + 1] === '"') {
                currentCell += '"';
                i++; // skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && clean[i + 1] === '\n') {
                i++; // skip \n
            }
            if (currentCell !== '' || currentRow.length > 0) {
                currentRow.push(currentCell.trim());
                rowsData.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    
    // Push the last row if file doesn't end with a newline
    if (currentCell !== '' || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rowsData.push(currentRow);
    }
    
    // Remove completely empty rows
    const validRows = rowsData.filter(row => row.some(cell => cell.trim() !== ''));

    if (validRows.length < 2) return { headers: [], rows: [] };

    // Remove newlines from headers (handles Excel Alt+Enter, e.g. "แปลงใหญ่\nปี" -> "แปลงใหญ่ปี")
    const headers = validRows[0].map(h => h.replace(/\r?\n/g, '').trim());
    
    const rows = [];
    for (let i = 1; i < validRows.length; i++) {
        const vals = validRows[i];
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = vals[idx] || '';
        });
        obj._rowNum = i + 1; // Preserve logical row number for error reporting
        rows.push(obj);
    }
    return { headers, rows };
}

export default function CsvImportModal({ open, onClose, tableName, columns, onSuccess }) {
    const [step, setStep] = useState(0); // 0=upload, 1=preview+map, 2=importing, 3=result
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [csvRows, setCsvRows] = useState([]);
    const [mapping, setMapping] = useState({}); // csvHeader → dbColumn
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState({ success: 0, failed: 0, errors: [] });

    // DB columns จาก columns prop (ตัดคอลัมน์ actions ออก)
    const dbColumns = columns
        .filter(c => c.dataIndex)
        .map(c => ({ 
            label: c.importHeader || (typeof c.title === 'string' ? c.title : c.dataIndex), 
            value: c.dataIndex 
        }));

    const reset = () => {
        setStep(0);
        setCsvHeaders([]);
        setCsvRows([]);
        setMapping({});
        setProgress(0);
        setResult({ success: 0, failed: 0, errors: [] });
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    // อ่านไฟล์ CSV
    const handleFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const { headers, rows } = parseCsv(e.target.result);
            if (headers.length === 0) {
                return;
            }
            setCsvHeaders(headers);
            setCsvRows(rows);

            // Auto-map: ถ้า CSV header ตรงกับ dbColumn → map อัตโนมัติ
            const autoMap = {};
            headers.forEach(h => {
                const match = dbColumns.find(
                    dc => dc.value.toLowerCase() === h.toLowerCase() ||
                        dc.label.toLowerCase() === h.toLowerCase()
                );
                if (match) autoMap[h] = match.value;
            });
            setMapping(autoMap);
            setStep(1);
        };
        reader.readAsText(file, 'UTF-8');
        return false; // ไม่ให้ antd upload อัตโนมัติ
    };

    // Import ข้อมูลเข้า Supabase
    const handleImport = async () => {
        setStep(2);

        // สร้าง records จาก mapping
        const records = csvRows.map(row => {
            const record = {};
            Object.entries(mapping).forEach(([csvCol, dbCol]) => {
                if (dbCol && row[csvCol] !== undefined && row[csvCol] !== '') {
                    record[dbCol] = row[csvCol];
                }
            });
            return { data: record, _rowNum: row._rowNum };
        }).filter(r => Object.keys(r.data).length > 0);

        const batchSize = 50;
        let success = 0;
        let failed = 0;
        const errors = [];

        const { supabase } = await import('../../supabaseClient');

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const batchData = batch.map(r => r.data);

            try {
                const { error } = await supabase.from(tableName).insert(batchData);
                if (error) {
                    failed += batch.length;
                    errors.push({
                        rows: `${batch[0]._rowNum}-${batch[batch.length - 1]._rowNum}`,
                        message: error.message,
                    });
                } else {
                    success += batch.length;
                }
            } catch (err) {
                failed += batch.length;
                errors.push({
                    rows: `${batch[0]._rowNum}-${batch[batch.length - 1]._rowNum}`,
                    message: err.message,
                });
            }

            setProgress(Math.round(((i + batch.length) / records.length) * 100));
        }

        setResult({ success, failed, errors });
        setStep(3);
    };

    const mappedCount = Object.values(mapping).filter(Boolean).length;
    const previewData = csvRows.slice(0, 5);

    // Preview table แสดงข้อมูล CSV ที่ map แล้ว
    const previewColumns = csvHeaders.map(h => ({
        title: (
            <div className="csv-col-header">
                <div className="csv-col-original">{h}</div>
                <Select
                    size="small"
                    placeholder="เลือก field..."
                    value={mapping[h] || undefined}
                    onChange={(val) => setMapping(prev => ({ ...prev, [h]: val }))}
                    options={[
                        { label: '— ข้าม —', value: '' },
                        ...dbColumns,
                    ]}
                    style={{ width: '100%', marginTop: 4 }}
                    allowClear
                />
            </div>
        ),
        dataIndex: h,
        key: h,
        width: 160,
        ellipsis: true,
    }));

    return (
        <Modal
            title="📥 นำเข้าข้อมูลจาก CSV"
            open={open}
            onCancel={handleClose}
            width={820}
            className="crud-modal csv-import-modal"
            footer={null}
            destroyOnClose
        >
            <Steps
                current={step}
                size="small"
                className="csv-steps"
                items={[
                    { title: 'เลือกไฟล์' },
                    { title: 'ตรวจสอบ' },
                    { title: 'นำเข้า' },
                    { title: 'ผลลัพธ์' },
                ]}
            />

            <div className="csv-step-content">
                {/* Step 0: Upload */}
                {step === 0 && (
                    <div className="csv-upload-zone">
                        <Dragger
                            accept=".csv,.txt"
                            showUploadList={false}
                            beforeUpload={handleFile}
                            multiple={false}
                        >
                            <div className="csv-upload-inner">
                                <CloudUploadOutlined className="csv-upload-icon" />
                                <p className="csv-upload-text">ลากไฟล์ CSV มาวางที่นี่</p>
                                <p className="csv-upload-hint">หรือกดเพื่อเลือกไฟล์ · รองรับ .csv, .txt (UTF-8)</p>
                            </div>
                        </Dragger>
                        <div className="csv-tips">
                            <Alert
                                type="info"
                                showIcon
                                message="คำแนะนำ"
                                description={
                                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                                        <li>ไฟล์ CSV ต้องมีแถวหัวข้อ (header) เป็นแถวแรก</li>
                                        <li>รองรับตัวคั่นทั้งเครื่องหมายจุลภาค (,) และ semicolon (;)</li>
                                        <li>ถ้าคอลัมน์ CSV ชื่อตรงกับชื่อ field ในระบบ จะ map ให้อัตโนมัติ</li>
                                    </ul>
                                }
                            />
                        </div>
                    </div>
                )}

                {/* Step 1: Preview + Column Mapping */}
                {step === 1 && (
                    <div className="csv-preview">
                        <div className="csv-preview-info">
                            <Space>
                                <Tag color="blue"><FileTextOutlined /> {csvRows.length} แถว</Tag>
                                <Tag color="green">{csvHeaders.length} คอลัมน์</Tag>
                                <Tag color={mappedCount > 0 ? 'green' : 'red'}>
                                    map แล้ว {mappedCount}/{csvHeaders.length}
                                </Tag>
                            </Space>
                        </div>
                        <div className="csv-mapping-hint">
                            เลือก field ที่ต้องการ map ในแต่ละคอลัมน์ (คอลัมน์ที่ไม่ได้ map จะถูกข้าม)
                        </div>
                        <Table
                            dataSource={previewData}
                            columns={previewColumns}
                            rowKey="_rowNum"
                            pagination={false}
                            scroll={{ x: 'max-content' }}
                            size="small"
                            className="csv-preview-table"
                        />
                        {csvRows.length > 5 && (
                            <div className="csv-preview-more">
                                ... แสดง 5 จาก {csvRows.length} แถว
                            </div>
                        )}
                        <div className="csv-preview-actions">
                            <Button onClick={() => { reset(); }}>
                                เลือกไฟล์ใหม่
                            </Button>
                            <Button
                                type="primary"
                                icon={<ArrowRightOutlined />}
                                onClick={handleImport}
                                disabled={mappedCount === 0}
                                className="add-btn"
                            >
                                นำเข้า {csvRows.length} แถว
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Importing */}
                {step === 2 && (
                    <div className="csv-importing">
                        <div className="csv-importing-icon">📤</div>
                        <h3>กำลังนำเข้าข้อมูล...</h3>
                        <Progress
                            percent={progress}
                            status="active"
                            strokeColor={{ '0%': '#1a7f37', '100%': '#2da44e' }}
                            style={{ maxWidth: 400, margin: '16px auto' }}
                        />
                        <p className="csv-importing-hint">กรุณาอย่าปิดหน้าต่างนี้</p>
                    </div>
                )}

                {/* Step 3: Results */}
                {step === 3 && (
                    <div className="csv-result">
                        <div className="csv-result-icon">
                            {result.failed === 0 ? '🎉' : '⚠️'}
                        </div>
                        <h3>นำเข้าเสร็จสิ้น</h3>

                        <div className="csv-result-stats">
                            <div className="csv-result-stat success">
                                <CheckCircleOutlined />
                                <span>{result.success} สำเร็จ</span>
                            </div>
                            {result.failed > 0 && (
                                <div className="csv-result-stat failed">
                                    <WarningOutlined />
                                    <span>{result.failed} ล้มเหลว</span>
                                </div>
                            )}
                        </div>

                        {result.errors.length > 0 && (
                            <div className="csv-result-errors">
                                <Alert
                                    type="error"
                                    showIcon
                                    message="รายละเอียดข้อผิดพลาด"
                                    description={
                                        <ul style={{ margin: 0, paddingLeft: 16, maxHeight: 150, overflow: 'auto' }}>
                                            {result.errors.map((err, i) => (
                                                <li key={i}>แถว {err.rows}: {err.message}</li>
                                            ))}
                                        </ul>
                                    }
                                />
                            </div>
                        )}

                        <div className="csv-result-actions">
                            <Button onClick={handleClose}>ปิด</Button>
                            <Button
                                type="primary"
                                className="add-btn"
                                onClick={() => {
                                    if (onSuccess) onSuccess();
                                    handleClose();
                                }}
                            >
                                เสร็จสิ้น
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}

import { useMemo, useState } from 'react';
import {
  Modal,
  Button,
  Table,
  Select,
  Progress,
  Alert,
  Steps,
  Tag,
  Space,
  Upload,
  Radio,
} from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloudUploadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { parseTableFile } from '../../utils/csv';
import { getImportPolicy, IMPORT_MODES } from './importPolicies';

const { Dragger } = Upload;

const MODE_OPTIONS = [
  {
    value: IMPORT_MODES.upsert,
    label: 'อัปเดต/เพิ่มใหม่',
    help: 'ถ้าเจอข้อมูลเดิมตามคีย์ จะอัปเดตแถวนั้น ถ้าไม่เจอจะเพิ่มใหม่',
  },
  {
    value: IMPORT_MODES.append,
    label: 'เพิ่มต่อท้าย',
    help: 'เพิ่มทุกแถวเป็นรายการใหม่ เหมาะกับข้อมูลคนละชุด',
  },
  {
    value: IMPORT_MODES.replaceScope,
    label: 'แทนที่ชุดข้อมูล',
    help: 'ลบข้อมูลเดิมใน scope เดียวกันก่อนนำเข้า ใช้เมื่อไฟล์เป็นชุดข้อมูลเต็ม',
  },
];

function makeRecord(row, mapping) {
  const record = {};
  Object.entries(mapping).forEach(([sourceColumn, dbColumn]) => {
    const value = row[sourceColumn];
    if (!dbColumn || value === undefined || value === '') return;

    if (String(dbColumn).startsWith('custom__')) {
      const fieldKey = String(dbColumn).replace(/^custom__/, '');
      record.custom_fields = {
        ...(record.custom_fields || {}),
        [fieldKey]: value,
      };
    } else {
      record[dbColumn] = value;
    }
  });
  return record;
}

function keySignature(record, fields) {
  return fields.map((field) => String(record[field] ?? '').trim()).join('|');
}

function findMissingKeyRows(records, fields) {
  if (!fields.length) return [];
  return records
    .filter(({ data }) =>
      fields.some((field) => String(data[field] ?? '').trim() === '')
    )
    .map((record) => record._rowNum);
}

function findDuplicateKeyRows(records, fields) {
  if (!fields.length) return [];
  const seen = new Map();
  const duplicateRows = [];

  records.forEach((record) => {
    const signature = keySignature(record.data, fields);
    if (!signature || signature.split('|').some((part) => part === '')) return;
    if (seen.has(signature)) duplicateRows.push(record._rowNum);
    else seen.set(signature, record._rowNum);
  });

  return duplicateRows;
}

async function countExistingRows(supabase, tableName, records, uniqueFields) {
  if (!records.length || !uniqueFields.length) return 0;

  let count = 0;
  const firstField = uniqueFields[0];
  const remainingFields = uniqueFields.slice(1);

  for (const record of records) {
    let query = supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .eq(firstField, record.data[firstField]);

    remainingFields.forEach((field) => {
      query = query.eq(field, record.data[field]);
    });

    const { count: rowCount, error } = await query;
    if (error) throw error;
    if ((rowCount || 0) > 0) count += 1;
  }

  return count;
}

export default function CsvImportModal({
  open,
  onClose,
  tableName,
  columns,
  onSuccess,
  importPolicy: importPolicyOverride = null,
}) {
  const importPolicy = useMemo(
    () => getImportPolicy(tableName, importPolicyOverride),
    [tableName, importPolicyOverride]
  );
  const canUpsert = importPolicy.uniqueFields.length > 0;
  const canReplaceScope = importPolicy.replaceScopeFields.length > 0;

  const [step, setStep] = useState(0);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importMode, setImportMode] = useState(
    canUpsert ? IMPORT_MODES.upsert : IMPORT_MODES.append
  );
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState({
    success: 0,
    inserted: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  });

  const dbColumns = columns
    .filter((column) => column.dataIndex)
    .map((column) => ({
      label:
        column.importHeader ||
        (typeof column.title === 'string' ? column.title : column.dataIndex),
      value: column.dataIndex,
    }));

  const records = useMemo(
    () =>
      csvRows
        .map((row) => ({
          data: makeRecord(row, mapping),
          _rowNum: row._rowNum,
        }))
        .filter((record) => Object.keys(record.data).length > 0),
    [csvRows, mapping]
  );

  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const previewData = csvRows.slice(0, 5);
  const activeKeyFields =
    importMode === IMPORT_MODES.append
      ? []
      : importMode === IMPORT_MODES.replaceScope
        ? importPolicy.replaceScopeFields
        : importPolicy.uniqueFields;
  const missingKeyRows = findMissingKeyRows(records, activeKeyFields);
  const duplicateKeyRows = findDuplicateKeyRows(
    records,
    importPolicy.uniqueFields
  );
  const keyFieldsMapped = activeKeyFields.every((field) =>
    Object.values(mapping).includes(field)
  );
  const importBlocked =
    mappedCount === 0 ||
    (importMode === IMPORT_MODES.upsert && (!canUpsert || !keyFieldsMapped)) ||
    (importMode === IMPORT_MODES.replaceScope &&
      (!canReplaceScope || !keyFieldsMapped)) ||
    missingKeyRows.length > 0 ||
    (importMode !== IMPORT_MODES.append && duplicateKeyRows.length > 0);

  const reset = () => {
    setStep(0);
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({});
    setImportMode(canUpsert ? IMPORT_MODES.upsert : IMPORT_MODES.append);
    setProgress(0);
    setResult({
      success: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file) => {
    try {
      const { headers, rows } = await parseTableFile(file);
      if (headers.length === 0) return false;

      const autoMap = {};
      headers.forEach((header) => {
        const match = dbColumns.find(
          (column) =>
            column.value.toLowerCase() === header.toLowerCase() ||
            String(column.label).toLowerCase() === header.toLowerCase()
        );
        if (match) autoMap[header] = match.value;
      });

      setCsvHeaders(headers);
      setCsvRows(rows);
      setMapping(autoMap);
      setImportMode(canUpsert ? IMPORT_MODES.upsert : IMPORT_MODES.append);
      setStep(1);
    } catch (error) {
      setResult({
        success: 0,
        inserted: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
        errors: [{ rows: '-', message: error.message }],
      });
      setStep(3);
    }
    return false;
  };

  const deleteReplaceScope = async (supabase, batchData) => {
    const scopes = new Map();
    batchData.forEach((record) => {
      const signature = keySignature(record, importPolicy.replaceScopeFields);
      if (signature) scopes.set(signature, record);
    });

    for (const scopeRecord of scopes.values()) {
      let query = supabase.from(tableName).delete();
      importPolicy.replaceScopeFields.forEach((field) => {
        query = query.eq(field, scopeRecord[field]);
      });
      const { error } = await query;
      if (error) throw error;
    }
  };

  const handleImport = async () => {
    setStep(2);

    const batchSize = 50;
    let success = 0;
    let inserted = 0;
    let updated = 0;
    let failed = 0;
    const errors = [];

    const { supabase } = await import('../../supabaseClient');

    try {
      if (importMode === IMPORT_MODES.replaceScope) {
        await deleteReplaceScope(
          supabase,
          records.map((record) => record.data)
        );
      } else if (importMode === IMPORT_MODES.upsert) {
        updated = await countExistingRows(
          supabase,
          tableName,
          records,
          importPolicy.uniqueFields
        );
      }
    } catch (error) {
      setResult({
        success: 0,
        inserted: 0,
        updated: 0,
        failed: records.length,
        skipped: 0,
        errors: [{ rows: 'ทั้งหมด', message: error.message }],
      });
      setStep(3);
      return;
    }

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchData = batch.map((record) => record.data);

      try {
        const query =
          importMode === IMPORT_MODES.upsert
            ? supabase.from(tableName).upsert(batchData, {
                onConflict: importPolicy.uniqueFields.join(','),
              })
            : supabase.from(tableName).insert(batchData);

        const { error } = await query;
        if (error) {
          failed += batch.length;
          errors.push({
            rows: `${batch[0]._rowNum}-${batch[batch.length - 1]._rowNum}`,
            message: error.message,
          });
        } else {
          success += batch.length;
        }
      } catch (error) {
        failed += batch.length;
        errors.push({
          rows: `${batch[0]._rowNum}-${batch[batch.length - 1]._rowNum}`,
          message: error.message,
        });
      }

      setProgress(Math.round(((i + batch.length) / records.length) * 100));
    }

    if (importMode === IMPORT_MODES.upsert)
      inserted = Math.max(success - updated, 0);
    else inserted = success;

    setResult({ success, inserted, updated, failed, skipped: 0, errors });
    setStep(3);
  };

  const previewColumns = csvHeaders.map((header) => ({
    title: (
      <div className="csv-col-header">
        <div className="csv-col-original">{header}</div>
        <Select
          size="small"
          placeholder="เลือก field..."
          value={mapping[header] || undefined}
          onChange={(value) =>
            setMapping((previous) => ({ ...previous, [header]: value }))
          }
          options={[{ label: '-- ข้าม --', value: '' }, ...dbColumns]}
          style={{ width: '100%', marginTop: 4 }}
          allowClear
        />
      </div>
    ),
    dataIndex: header,
    key: header,
    width: 160,
    ellipsis: true,
  }));

  const modeOptions = MODE_OPTIONS.map((option) => ({
    ...option,
    disabled:
      (option.value === IMPORT_MODES.upsert && !canUpsert) ||
      (option.value === IMPORT_MODES.replaceScope && !canReplaceScope),
  }));

  return (
    <Modal
      title="นำเข้าข้อมูลจาก CSV"
      open={open}
      onCancel={handleClose}
      width={900}
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
                <p className="csv-upload-hint">
                  รองรับ .csv และ .txt ขนาดไม่เกิน 4 MB
                  และใช้แถวแรกเป็นหัวคอลัมน์
                </p>
              </div>
            </Dragger>
            <div className="csv-tips">
              <Alert
                type="info"
                showIcon
                message="คำแนะนำ"
                description="ถ้าต้องการกันข้อมูลซ้ำ ให้เลือกโหมดอัปเดต/เพิ่มใหม่ และต้องมีคีย์ของตารางครบ เช่น ปีข้อมูล + รหัสระเบียน"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="csv-preview">
            <Space wrap className="csv-preview-info">
              <Tag color="blue">
                <FileTextOutlined /> {csvRows.length} แถว
              </Tag>
              <Tag color="green">{csvHeaders.length} คอลัมน์</Tag>
              <Tag color={mappedCount > 0 ? 'green' : 'red'}>
                map แล้ว {mappedCount}/{csvHeaders.length}
              </Tag>
              {canUpsert && (
                <Tag color="purple">
                  คีย์: {importPolicy.uniqueFields.join(' + ')}
                </Tag>
              )}
            </Space>

            <Radio.Group
              className="csv-import-mode"
              value={importMode}
              onChange={(event) => setImportMode(event.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              {modeOptions.map((option) => (
                <Radio.Button
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </Radio.Button>
              ))}
            </Radio.Group>
            <Alert
              type={importMode === IMPORT_MODES.append ? 'warning' : 'info'}
              showIcon
              message={
                MODE_OPTIONS.find((option) => option.value === importMode)
                  ?.label
              }
              description={
                MODE_OPTIONS.find((option) => option.value === importMode)
                  ?.help || ''
              }
              style={{ marginBottom: 12 }}
            />

            {importBlocked && (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
                message="ยังนำเข้าไม่ได้"
                description={
                  <Space direction="vertical" size={2}>
                    {mappedCount === 0 && (
                      <span>ต้อง map อย่างน้อย 1 คอลัมน์</span>
                    )}
                    {!keyFieldsMapped && activeKeyFields.length > 0 && (
                      <span>
                        ต้อง map คีย์ให้ครบ: {activeKeyFields.join(', ')}
                      </span>
                    )}
                    {missingKeyRows.length > 0 && (
                      <span>
                        แถวที่คีย์ไม่ครบ:{' '}
                        {missingKeyRows.slice(0, 10).join(', ')}
                      </span>
                    )}
                    {duplicateKeyRows.length > 0 && (
                      <span>
                        ไฟล์มีคีย์ซ้ำแถว:{' '}
                        {duplicateKeyRows.slice(0, 10).join(', ')}
                      </span>
                    )}
                  </Space>
                }
              />
            )}
            {!importBlocked &&
              importMode === IMPORT_MODES.append &&
              duplicateKeyRows.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="พบคีย์ซ้ำในไฟล์"
                  description={`โหมดเพิ่มต่อท้ายจะพยายามเพิ่มทุกแถว หากฐานข้อมูลมี unique constraint อาจนำเข้าไม่สำเร็จ แถวซ้ำ: ${duplicateKeyRows
                    .slice(0, 10)
                    .join(', ')}`}
                />
              )}

            <div className="csv-mapping-hint">
              เลือก field ที่ต้องการ map ในแต่ละคอลัมน์ คอลัมน์ที่ไม่ map
              จะถูกข้าม
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
              <Button onClick={reset}>เลือกไฟล์ใหม่</Button>
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={handleImport}
                disabled={importBlocked}
                className="add-btn"
              >
                นำเข้า {records.length} แถว
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="csv-importing">
            <div className="csv-importing-icon">Uploading</div>
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

        {step === 3 && (
          <div className="csv-result">
            <div className="csv-result-icon">
              {result.failed === 0 ? 'สำเร็จ' : 'มีข้อผิดพลาด'}
            </div>
            <h3>นำเข้าเสร็จสิ้น</h3>

            <div className="csv-result-stats">
              <div className="csv-result-stat success">
                <CheckCircleOutlined />
                <span>{result.success} สำเร็จ</span>
              </div>
              {result.inserted > 0 && (
                <div className="csv-result-stat success">
                  <CheckCircleOutlined />
                  <span>{result.inserted} เพิ่มใหม่</span>
                </div>
              )}
              {result.updated > 0 && (
                <div className="csv-result-stat success">
                  <CheckCircleOutlined />
                  <span>{result.updated} อัปเดต</span>
                </div>
              )}
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
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 16,
                        maxHeight: 150,
                        overflow: 'auto',
                      }}
                    >
                      {result.errors.map((error, index) => (
                        <li key={index}>
                          แถว {error.rows}: {error.message}
                        </li>
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

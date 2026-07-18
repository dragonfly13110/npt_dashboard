import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Spin,
  Input,
  Button,
  Row,
  Col,
  Space,
  Table,
  Tag,
  Empty,
  Select,
} from 'antd';
import {
  LineChartOutlined,
  CarOutlined,
  SearchOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  LinkOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useApiCache } from '../../hooks/useApiCache';
import { rowsToCsv } from '../../utils/csv';
import './AgriculturalPrices.css';

const SOURCE_URL = 'https://mex.moc.go.th/page/dit/checkprice/type/W/catid/4';
const OIL_SOURCE_URL = 'https://oil-price.bangchak.co.th/ApiOilPrice2/th';

const CATEGORIES = [
  { id: '3', label: '🥬 ผัก', text: 'ผัก' },
  { id: '4', label: '🍎 ผลไม้', text: 'ผลไม้' },
  { id: '7', label: '🌽 พืชไร่', text: 'พืชไร่' },
  { id: '10', label: '🌾 ข้าว', text: 'ข้าว' },
  { id: '5', label: '🌶️ ของแห้ง', text: 'ของแห้ง' },
];

const OIL_THEMES = {
  'ดีเซล B20': {
    bg: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
    text: '#f1f5f9',
    accent: '#94a3b8',
  },
  'ไฮดีเซล S': {
    bg: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
    text: '#ffffff',
    accent: '#93c5fd',
  },
  'แก๊สโซฮอล 95 S EVO': {
    bg: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
    text: '#ffffff',
    accent: '#fca5a5',
  },
  'แก๊สโซฮอล 91 S EVO': {
    bg: 'linear-gradient(135deg, #15803d 0%, #14532d 100%)',
    text: '#ffffff',
    accent: '#86efac',
  },
  'แก๊สโซฮอล E20 S EVO': {
    bg: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
    text: '#ffffff',
    accent: '#6ee7b7',
  },
  'แก๊สโซฮอล E85 S EVO': {
    bg: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
    text: '#ffffff',
    accent: '#c4b5fd',
  },
};

const FERTILIZER_DATA = [
  {
    key: '1',
    formula: '46-0-0 (ยูเรีย)',
    name: 'ปุ๋ยยูเรีย (บำรุงต้นและใบ)',
    brand: 'ตราหัววัวคันไถ / ตรามงกุฎ / ตราเจียไต๋',
    priceRange: '1,200 - 1,300',
    avgPrice: 1250,
    unit: 'กระสอบ (50 กก.)',
    note: 'ราคาคลี่คลายลงจากช่วงก่อนหน้า (อ้างอิงราคาแนะนำรายจังหวัด)',
  },
  {
    key: '2',
    formula: '15-15-15 (สูตรเสมอ)',
    name: 'ปุ๋ยสูตรเสมอ (บำรุงทุกส่วน/เร่งผล)',
    brand: 'ตรามงกุฎ / ตราเรือใบไข่มุก',
    priceRange: '1,300 - 1,450',
    avgPrice: 1375,
    unit: 'กระสอบ (50 กก.)',
    note: 'นิยมใช้ในสวนไม้ผลและพืชผัก',
  },
  {
    key: '3',
    formula: '16-20-0',
    name: 'ปุ๋ยบำรุงรากและหน่อ (เร่งดอก/ข้าวระยะแรก)',
    brand: 'ตราหัววัวคันไถ / ตราเจียไต๋',
    priceRange: '1,100 - 1,200',
    avgPrice: 1150,
    unit: 'กระสอบ (50 กก.)',
    note: 'ใช้มากในนาข้าวและบำรุงพืชผัก',
  },
  {
    key: '4',
    formula: '16-16-8',
    name: 'ปุ๋ยบำรุงนาข้าวและผลไม้',
    brand: 'ตราหัววัวคันไถ / ตรามงกุฎ',
    priceRange: '1,150 - 1,250',
    avgPrice: 1200,
    unit: 'กระสอบ (50 กก.)',
    note: 'เหมาะสำหรับนาดินทราย',
  },
  {
    key: '5',
    formula: '0-0-60 (โพแทสเซียม)',
    name: 'ปุ๋ยเพิ่มน้ำหนัก/ความหวาน/แป้ง',
    brand: 'ตราเรือใบไข่มุก / ตรามงกุฎ',
    priceRange: '1,400 - 1,500',
    avgPrice: 1450,
    unit: 'กระสอบ (50 กก.)',
    note: 'ใช้ในระยะผลไม้ก่อนเก็บเกี่ยวและมันสำปะหลัง',
  },
];

const FERTILIZER_COLUMNS = [
  {
    title: 'สูตรปุ๋ยเคมี',
    dataIndex: 'formula',
    key: 'formula',
    width: 180,
    render: (text) => (
      <Tag
        color="purple"
        style={{
          fontSize: '13px',
          fontWeight: 600,
          padding: '4px 8px',
          borderRadius: 6,
        }}
      >
        {text}
      </Tag>
    ),
  },
  {
    title: 'ชื่อสามัญ / การใช้งาน',
    dataIndex: 'name',
    key: 'name',
    render: (text, record) => (
      <div>
        <strong style={{ color: '#0f172a', fontSize: '14.5px' }}>{text}</strong>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: 4 }}>
          ยี่ห้อที่เป็นที่นิยม: {record.brand}
        </div>
      </div>
    ),
  },
  {
    title: 'ช่วงราคาแนะนำ (บาท)',
    dataIndex: 'priceRange',
    key: 'priceRange',
    width: 220,
    align: 'right',
    render: (val, record) => (
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontWeight: 800, fontSize: '16px', color: '#7c3aed' }}>
          {val}
        </span>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
          เฉลี่ยประมาณ: {record.avgPrice.toLocaleString('th-TH')} บาท
        </div>
      </div>
    ),
  },
  {
    title: 'หน่วยวัด',
    dataIndex: 'unit',
    key: 'unit',
    width: 140,
    render: (val) => (
      <Tag color="default" style={{ borderRadius: 6, fontWeight: 500 }}>
        {val}
      </Tag>
    ),
  },
  {
    title: 'คำแนะนำ/หมายเหตุ',
    dataIndex: 'note',
    key: 'note',
    width: 280,
    render: (text) => (
      <span style={{ fontSize: '13px', color: '#64748b' }}>{text}</span>
    ),
  },
];

const BUYING_POINTS_DATA = [
  {
    key: '1',
    type: 'ล้งส้มโอ',
    name: 'เครือข่ายวิสาหกิจชุมชนส้มโอมณฑลนครชัยศรี',
    area: 'ต.ทรงคนอง อ.สามพราน จ.นครปฐม',
    lat: '13.7314',
    lng: '100.2214',
    contact: '081-3402867 / 0-3438-8930',
    note: 'แหล่งรวบรวมและคัดแยกส้มโอนครชัยศรีแท้ มาตรฐาน GI (ทองดี/ขาวน้ำผึ้ง) ส่งออกและขายส่งในประเทศ',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.7314,100.2214',
  },
  {
    key: '2',
    type: 'ล้งส้มโอ',
    name: 'สวนส้มโอไทยทวี',
    area: 'ต.สัมปทวน อ.นครชัยศรี จ.นครปฐม',
    lat: '13.8215',
    lng: '100.1843',
    contact: '063-1891281',
    note: 'แหล่งคัดเลือกผลผลิตส้มโอ GI คุณภาพสูงและจำหน่ายกิ่งพันธุ์แท้ดั้งเดิม',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.8215,100.1843',
  },
  {
    key: '3',
    type: 'ล้งส้มโอ',
    name: 'สวนส้มโอประวิทย์',
    area: 'ต.ท่าตลาด อ.สามพราน จ.นครปฐม',
    lat: '13.7432',
    lng: '100.2081',
    contact: '081-3402867',
    note: 'ล้งรับซื้อ รวบรวม และแพ็คส้มโอส่งออกตลาดต่างประเทศและห้างสรรพสินค้า',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.7432,100.2081',
  },

  {
    key: '4',
    type: 'ล้งมะพร้าว',
    name: 'บริษัท ยัง ไทย โคโคนัท จำกัด (Young Thai Coconut)',
    area: 'ต.ดอนกรวย อ.ดำเนินสะดวก จ.ราชบุรี (เขตติดต่อ อ.สามพราน)',
    lat: '13.5235',
    lng: '99.9324',
    contact: '081-8575024 / 032-343110',
    note: 'โรงงานผู้ผลิต แปรรูป และรับซื้อผลผลิตมะพร้าวน้ำหอมสดตลอดปีเพื่อส่งออก',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.5235,99.9324',
  },
  {
    key: '5',
    type: 'ล้งมะพร้าว',
    name: 'บริษัท เค-เฟรช จำกัด (K-Fresh)',
    area: 'ต.หนองสองห้อง อ.บ้านแพ้ว จ.สมุทรสาคร (เขตติดต่อ อ.สามพราน)',
    lat: '13.5936',
    lng: '100.0712',
    contact: '034-481845',
    note: 'ล้งและโรงงานแปรรูปมะพร้าวน้ำหอมรายใหญ่ รับซื้อครอบคลุมพื้นที่ใกล้เคียงสามพราน',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.5936,100.0712',
  },
  {
    key: '6',
    type: 'ล้งมะพร้าว',
    name: 'เดอะแกรนด์ฟรุต (The Grand Fruit)',
    area: 'อ.บ้านแพ้ว จ.สมุทรสาคร (เขตติดต่อ อ.สามพราน)',
    lat: '13.6042',
    lng: '100.0815',
    contact: '086-3458988',
    note: 'โรงคัดบรรจุและรับซื้อมะพร้าวน้ำหอมอ่อนคัดเกรดส่งออก',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.6042,100.0815',
  },

  {
    key: '7',
    type: 'ลานมัน',
    name: 'ลานรับซื้อมันสำปะหลังรางพิกุล (กำแพงแสน)',
    area: 'ต.รางพิกุล อ.กำแพงแสน จ.นครปฐม',
    lat: '14.0253',
    lng: '99.9678',
    contact: 'ติดต่อเกษตรอำเภอกำแพงแสน',
    note: 'ลานรับซื้อเอกชน คัดเกรดและตรวจวัดเปอร์เซ็นต์เชื้อแป้งมันสำปะหลังสด',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=14.0253,99.9678',
  },
  {
    key: '8',
    type: 'ลานมัน',
    name: 'ลานมันพนมทวน (ใกล้เคียงกำแพงแสน)',
    area: 'อ.พนมทวน จ.กาญจนบุรี (รอยต่อ อ.กำแพงแสน นครปฐม)',
    lat: '14.1287',
    lng: '99.8512',
    contact: '034-564294 (พาณิชย์กาญจนบุรี)',
    note: 'ลานรับซื้อมันสำปะหลังสดขนาดใหญ่ของภูมิภาคตะวันตก',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=14.1287,99.8512',
  },
  {
    key: '9',
    type: 'ลานมัน',
    name: 'ลานรับซื้อมันสำปะหลังห้วยกระเจา',
    area: 'อ.ห้วยกระเจา จ.กาญจนบุรี (ติดแนวขอบ อ.กำแพงแสน เหนือ)',
    lat: '14.3312',
    lng: '99.7915',
    contact: 'ติดต่อพาณิชย์จังหวัดกาญจนบุรี',
    note: 'จุดรับซื้อมันสำปะหลังและลานมันแปรสภาพ แหล่งใหญ่อิงราคาแทรกแซงรัฐ',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=14.3312,99.7915',
  },

  {
    key: '10',
    type: 'โรงสีข้าว',
    name: 'บริษัท โรงสีกิจประเสริฐ จำกัด',
    area: 'ต.บางปลา อ.บางเลน จ.นครปฐม',
    lat: '13.9924',
    lng: '100.1878',
    contact: '034-966030',
    note: 'โรงสีข้าวรายใหญ่ รับซื้อข้าวเปลือกเจ้าและข้าวหอมปทุมจากเกษตรกรอำเภอบางเลน',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.9924,100.1878',
  },
  {
    key: '11',
    type: 'โรงสีข้าว',
    name: 'บริษัท โรงสีข้าวทวีพัฒนา จำกัด',
    area: 'ต.นราภิรมย์ อ.บางเลน จ.นครปฐม',
    lat: '13.9687',
    lng: '100.2812',
    contact: '034-398322',
    note: 'โรงสีข้าวขัดขาวและรับซื้อข้าวเปลือกนาปี/นาปรังคุณภาพ',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.9687,100.2812',
  },
  {
    key: '12',
    type: 'โรงสีข้าว',
    name: 'บริษัท โรงสีข้าวธัญสวัสดิ์ จำกัด',
    area: 'ต.บัวปากท่า อ.บางเลน จ.นครปฐม',
    lat: '14.1623',
    lng: '100.2012',
    contact: '034-399088',
    note: 'รับซื้อและสีแปรสภาพข้าวเปลือกหอมมะลิ ข้าวปทุมธานี และข้าวขาวทั่วไป',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=14.1623,100.2012',
  },
  {
    key: '13',
    type: 'โรงสีข้าว',
    name: 'โรงสีไทยธนานุกิจ',
    area: 'ต.บางปลา อ.บางเลน จ.นครปฐม',
    lat: '13.9856',
    lng: '100.1795',
    contact: '034-301147',
    note: 'ท่าข้าวและจุดรับซื้อข้าวเปลือก 5% และข้าวเปลือกความชื้นต่ำ',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.9856,100.1795',
  },
  {
    key: '14',
    type: 'โรงสีข้าว',
    name: 'บริษัท โรงสีรุ่งเรืองไพศาล จำกัด',
    area: 'ต.บัวปากท่า อ.บางเลน จ.นครปฐม',
    lat: '14.1523',
    lng: '100.1985',
    contact: '034-399020',
    note: 'โรงสีและลานอบข้าวเปลือก รับซื้อผลผลิตตลอดฤดูกาลเก็บเกี่ยว',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=14.1523,100.1985',
  },

  {
    key: '15',
    type: 'ตลาดกลาง',
    name: 'ตลาดปฐมมงคล (ตลาดกลางผักและผลไม้)',
    area: 'ต.พระปฐมเจดีย์ อ.เมือง จ.นครปฐม',
    lat: '13.8189',
    lng: '100.0658',
    contact: '081-8516225 / 034-241959',
    note: 'ตลาดกลางค้าส่งและรับซื้อผลผลิตทางการเกษตร ผัก ผลไม้ ใหญ่ที่สุดในนครปฐม (เปิด 24 ชม.)',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.8189,100.0658',
  },
  {
    key: '16',
    type: 'จุดรับซื้อ',
    name: 'สหกรณ์การเกษตรกำแพงแสน จำกัด',
    area: 'อ.กำแพงแสน จ.นครปฐม',
    lat: '14.0045',
    lng: '99.9981',
    contact: '034-351110',
    note: 'จุดรวบรวมผลผลิตข้าวเปลือก พืชไร่ และจุดจำหน่ายปัจจัยการผลิตเพื่อเกษตรกรสมาชิก',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=14.0045,99.9981',
  },
  {
    key: '17',
    type: 'จุดรับซื้อ',
    name: 'กลุ่มวิสาหกิจหน่อไม้ฝรั่งและพืชผักปลอดภัยนครปฐม',
    area: 'ต.ดอนยายหอม อ.เมือง จ.นครปฐม',
    lat: '13.7542',
    lng: '100.0895',
    contact: '034-340038 (สำนักงานเกษตรและสหกรณ์)',
    note: 'จุดรับซื้อ คัดแยก และตัดแต่งหน่อไม้ฝรั่งปลอดภัยส่งออกตลาดต่างประเทศ (GAP)',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.7542,100.0895',
  },
  {
    key: '18',
    type: 'จุดรับซื้อ',
    name: 'โรงงานน้ำตาลท่ามะกา (บจก. น้ำตาลท่ามะกา)',
    area: 'อ.ท่ามะกา จ.กาญจนบุรี (เขตติดต่อ อ.กำแพงแสน นครปฐม)',
    lat: '13.9234',
    lng: '99.7612',
    contact: '034-541014',
    note: 'โรงงานน้ำตาลทรายขนาดใหญ่ รับซื้ออ้อยสด (ส่งเสริมการตัดอ้อยสดลดฝุ่นละออง PM 2.5)',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=13.9234,99.7612',
  },
];

function getBuyingPointMapUrl(item) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${item.name} ${item.area}`
  )}`;
}

const BUYING_POINTS = BUYING_POINTS_DATA.map((item) => ({
  ...item,
  lat: 'search by place name',
  lng: 'not fixed GPS',
  mapQuery: `${item.name} ${item.area}`,
  mapUrl: getBuyingPointMapUrl(item),
}));

const BUYING_POINTS_COLUMNS = [
  {
    title: 'ประเภท',
    dataIndex: 'type',
    key: 'type',
    width: 130,
    render: (text) => {
      let color = 'default';
      if (text.includes('ล้งส้มโอ')) color = 'green';
      else if (text.includes('ล้งมะพร้าว')) color = 'cyan';
      else if (text.includes('ลานมัน')) color = 'orange';
      else if (text.includes('โรงสีข้าว')) color = 'gold';
      else if (text.includes('ตลาดกลาง')) color = 'blue';
      else if (text.includes('จุดรับซื้อ')) color = 'purple';
      return (
        <Tag color={color} style={{ fontWeight: 600, borderRadius: 6 }}>
          {text}
        </Tag>
      );
    },
  },
  {
    title: 'ชื่อจุดรับซื้อ / ล้ง',
    dataIndex: 'name',
    key: 'name',
    render: (text) => (
      <div>
        <strong style={{ color: '#0f172a', fontSize: '14.5px' }}>{text}</strong>
        <div style={{ fontSize: '12px', color: '#0969da', marginTop: 4 }}>
          ค้นหาใน Google Maps จากชื่อสถานที่และพื้นที่ ไม่ใช้พิกัดเดิม
        </div>
      </div>
    ),
  },
  {
    title: 'พื้นที่ตั้ง / อำเภอ',
    dataIndex: 'area',
    key: 'area',
    width: 250,
    render: (val) => (
      <span style={{ fontSize: '13px', color: '#334155' }}>{val}</span>
    ),
  },
  {
    title: 'ช่องทางติดต่อ',
    dataIndex: 'contact',
    key: 'contact',
    width: 200,
    render: (val) => (
      <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
        {val}
      </span>
    ),
  },
  {
    title: 'ข้อมูลรับซื้อ / หมายเหตุ',
    dataIndex: 'note',
    key: 'note',
    width: 260,
    render: (text) => (
      <span style={{ fontSize: '13px', color: '#64748b' }}>{text}</span>
    ),
  },
  {
    title: 'แผนที่นำทาง',
    key: 'map',
    width: 120,
    align: 'center',
    render: (_, record) => (
      <Button
        type="link"
        icon={<LinkOutlined />}
        href={record.mapUrl}
        target="_blank"
        rel="noreferrer"
        style={{ fontWeight: 600 }}
      >
        เปิดแผนที่
      </Button>
    ),
  },
];

async function fetchAgriPrices(catid) {
  const res = await fetch(
    `/.netlify/functions/moc-price-proxy?catid=${encodeURIComponent(catid)}`
  );
  if (!res.ok) throw new Error(`MOC price proxy returned ${res.status}`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.items)) {
    throw new Error(json.message || 'MOC price proxy returned no data');
  }
  return json;
}

async function fetchOilPrices() {
  // Try local endpoint first
  const localProxy = await fetch('/api/bangchak-oil-price?source=api-v2');
  if (
    localProxy.ok &&
    localProxy.headers.get('content-type')?.includes('application/json')
  ) {
    const json = await localProxy.json();
    const items = normalizeOilItems(json);
    if (items.length) {
      return {
        success: true,
        source: 'บริษัท บางจาก คอร์ปอเรชั่น จำกัด (มหาชน)',
        sourceUrl: OIL_SOURCE_URL,
        unit: 'บาท/ลิตร',
        items,
      };
    }
  }

  const res = await fetch(
    '/.netlify/functions/bangchak-oil-price-proxy?source=api-v2'
  );
  if (!res.ok)
    throw new Error(`Bangchak oil price proxy returned ${res.status}`);
  const json = await res.json();
  if (!json.success || !Array.isArray(json.items)) {
    throw new Error(
      json.message || 'Bangchak oil price proxy returned no data'
    );
  }
  return json;
}

function normalizeOilItems(json) {
  const payload = Array.isArray(json) ? json[0] : json;
  const rawOilList = payload?.OilList;
  const oilList =
    typeof rawOilList === 'string' ? JSON.parse(rawOilList) : rawOilList;
  if (!Array.isArray(oilList)) return [];

  const COMMON_OIL_ORDER = [
    'ดีเซล B20',
    'ไฮดีเซล S',
    'แก๊สโซฮอล 95 S EVO',
    'แก๊สโซฮอล 91 S EVO',
    'แก๊สโซฮอล E20 S EVO',
    'แก๊สโซฮอล E85 S EVO',
  ];

  return oilList
    .map((item) => {
      const name = String(item.OilName || '').trim();
      const today = String(item.PriceToday || '').trim();
      const tomorrow = String(item.PriceTomorrow || '').trim();
      if (name.includes('พรีเมียม') || name.includes('premium')) return null;
      return {
        name,
        today,
        tomorrow,
        diff: String(
          item.PriceDifTomorrow || item.PriceDifYesterday || ''
        ).trim(),
      };
    })
    .filter(
      (item) => item && COMMON_OIL_ORDER.some((o) => item.name.includes(o))
    )
    .sort((a, b) => {
      const getIndex = (name) => {
        const idx = COMMON_OIL_ORDER.findIndex((o) => name.includes(o));
        return idx === -1 ? 99 : idx;
      };
      return getIndex(a.name) - getIndex(b.name);
    });
}

function formatThaiDate(dateText) {
  if (!dateText) return '';
  const date = new Date(`${dateText}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return dateText;
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AgriculturalPrices() {
  useEffect(() => {
    document.title = 'ราคาสินค้าเกษตรและพลังงาน | ศูนย์ข้อมูลการเกษตรนครปฐม';
  }, []);

  const [selectedCategory, setSelectedCategory] = useState('4');
  const [searchQuery, setSearchQuery] = useState('');
  const [buyingSearchQuery, setBuyingSearchQuery] = useState('');
  const [buyingTypeFilter, setBuyingTypeFilter] = useState('All');

  const filteredBuyingPoints = useMemo(() => {
    return BUYING_POINTS.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(buyingSearchQuery.toLowerCase()) ||
        item.area.toLowerCase().includes(buyingSearchQuery.toLowerCase()) ||
        item.note.toLowerCase().includes(buyingSearchQuery.toLowerCase());
      const matchesType =
        buyingTypeFilter === 'All' || item.type === buyingTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [buyingSearchQuery, buyingTypeFilter]);

  const {
    data: agriData,
    isLoading: isAgriLoading,
    error: agriError,
    refetch: refetchAgri,
  } = useApiCache(
    ['moc-agri-prices', selectedCategory],
    () => fetchAgriPrices(selectedCategory),
    { staleMinutes: 30, cacheMinutes: 120 }
  );

  const {
    data: oilData,
    isLoading: isOilLoading,
    error: oilError,
    refetch: refetchOil,
  } = useApiCache(['bangchak-oil-prices-api-v2'], fetchOilPrices, {
    staleMinutes: 30,
    cacheMinutes: 120,
  });

  const oilItems = useMemo(() => oilData?.items || [], [oilData]);
  const rawCropItems = useMemo(() => agriData?.items || [], [agriData]);
  const dataDateText = formatThaiDate(agriData?.dataDate);
  const selectedCatLabel =
    CATEGORIES.find((c) => c.id === selectedCategory)?.text || '';

  // Filter crop items
  const filteredCropItems = useMemo(() => {
    if (!searchQuery.trim()) return rawCropItems;
    const q = searchQuery.toLowerCase().trim();
    return rawCropItems.filter(
      (item) =>
        item.product_name?.toLowerCase().includes(q) ||
        item.market_name?.toLowerCase().includes(q)
    );
  }, [rawCropItems, searchQuery]);

  const handleExportCSV = () => {
    if (!filteredCropItems.length) return;
    const headers = [
      'ชื่อผลผลิต',
      'ตลาด/ผู้ให้ข้อมูล',
      'ราคาช่วง',
      'ราคาเฉลี่ย',
      'หน่วย',
      'วันที่อัปเดต',
    ];
    const csvRows = [
      headers,
      ...filteredCropItems.map((item) =>
        [
          item.product_name || '',
          item.market_name || 'กรมการค้าภายใน',
          item.price_range || '',
          item.avg_price || '',
          item.unit || '',
          dataDateText || '',
        ]
      ),
    ];

    const csvContent = '\uFEFF' + rowsToCsv(csvRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ราคา_${selectedCatLabel}_${agriData?.dataDate || new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      title: 'ชื่อผลผลิตทางการเกษตร',
      dataIndex: 'product_name',
      key: 'product_name',
      fontWeight: 600,
      render: (text) => (
        <strong style={{ color: '#0f172a', fontSize: '14.5px' }}>{text}</strong>
      ),
    },
    {
      title: 'ราคาเฉลี่ย (บาท)',
      dataIndex: 'avg_price',
      key: 'avg_price',
      width: 150,
      align: 'right',
      render: (val, record) => {
        const num = Number(val);
        return (
          <div style={{ textAlign: 'right' }}>
            <span
              style={{ fontWeight: 800, fontSize: '16px', color: '#16a34a' }}
            >
              {Number.isNaN(num)
                ? val
                : num.toLocaleString('th-TH', { maximumFractionDigits: 2 })}
            </span>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {record.price_range && `ช่วง: ${record.price_range}`}
            </div>
          </div>
        );
      },
    },
    {
      title: 'หน่วยวัด',
      dataIndex: 'unit',
      key: 'unit',
      width: 120,
      render: (val) => (
        <Tag color="blue" style={{ borderRadius: 6, fontWeight: 500 }}>
          {val || '-'}
        </Tag>
      ),
    },
    {
      title: 'แหล่งข้อมูล',
      dataIndex: 'market_name',
      key: 'market_name',
      width: 160,
      render: (val) => (
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          {val || 'กรมการค้าภายใน'}
        </span>
      ),
    },
  ];

  const isDashboardPath = window.location.pathname.startsWith('/dashboard');

  return (
    <div className="agri-prices-container">
      {/* Header section */}
      <div className="prices-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isDashboardPath && (
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => window.history.back()}
              style={{ borderRadius: 8 }}
            />
          )}
          <div>
            <h2>
              <LineChartOutlined style={{ color: '#16a34a' }} />
              รายงานราคาสินค้าเกษตรและพลังงานวันนี้
            </h2>
            <p>
              รวบรวมข้อมูลราคาขายส่งผลผลิตทางการเกษตรและราคาแนะนำปุ๋ยเคมีจากกรมการค้าภายใน
              พร้อมราคาน้ำมันขายปลีกจากสถานีบริการน้ำมันบางจาก อัปเดตรายวัน
            </p>
          </div>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              refetchAgri();
              refetchOil();
            }}
            style={{ borderRadius: 8 }}
          >
            รีเฟรชข้อมูล
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* OIL PRICES SECTION */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '4px 0',
                }}
              >
                <CarOutlined style={{ fontSize: 20, color: '#0969da' }} />
                <span
                  style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}
                >
                  ⛽ ราคาน้ำมันวันนี้
                </span>
              </div>
            }
            extra={
              <a
                href={oilData?.sourceUrl || OIL_SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: '#0284c7', fontWeight: 600 }}
              >
                บางจาก <LinkOutlined />
              </a>
            }
            bordered={false}
            className="oil-prices-card"
          >
            {isOilLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin tip="กำลังอัปเดตราคาน้ำมัน..." />
              </div>
            ) : oilError ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 10px',
                  color: '#94a3b8',
                }}
              >
                <Empty description="ไม่สามารถดึงข้อมูลราคาน้ำมันได้ในขณะนี้" />
                <Button
                  type="primary"
                  size="small"
                  href={OIL_SOURCE_URL}
                  target="_blank"
                  style={{ marginTop: 12, borderRadius: 6 }}
                >
                  ตรวจสอบที่หน้าเว็บบางจาก
                </Button>
              </div>
            ) : (
              <div className="oil-cards-grid">
                {oilItems.map((item) => {
                  const cleanName = item.name
                    .replace('แก๊สโซฮอล', 'โซฮอล์')
                    .replace('ไฮดีเซล', 'ดีเซล');
                  const theme = OIL_THEMES[item.name] || {
                    bg: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
                    text: '#ffffff',
                    accent: '#e0f2fe',
                  };
                  const diffVal = Number(item.diff);
                  const diffText =
                    !Number.isNaN(diffVal) && diffVal !== 0
                      ? `${diffVal > 0 ? '+' : ''}${diffVal.toFixed(2)}`
                      : '0.00';

                  return (
                    <div
                      key={item.name}
                      className="oil-price-item-card"
                      style={{ background: theme.bg, color: theme.text }}
                    >
                      <div className="oil-card-header">
                        <span className="oil-brand-name">{cleanName}</span>
                        <span className="oil-tag">EVO</span>
                      </div>
                      <div className="oil-card-body">
                        <div className="oil-main-price">
                          <span>{item.today || '-'}</span>
                          <small style={{ color: theme.accent }}>
                            บาท/ลิตร
                          </small>
                        </div>
                        <div
                          className="oil-diff-info"
                          style={{
                            color:
                              diffVal > 0
                                ? '#fca5a5'
                                : diffVal < 0
                                  ? '#a7f3d0'
                                  : theme.accent,
                          }}
                        >
                          <span>พรุ่งนี้: {item.tomorrow || item.today}</span>
                          <span
                            className="diff-pill"
                            style={{
                              background:
                                diffVal > 0
                                  ? 'rgba(239, 68, 68, 0.25)'
                                  : diffVal < 0
                                    ? 'rgba(16, 185, 129, 0.25)'
                                    : 'rgba(255,255,255,0.1)',
                            }}
                          >
                            {diffText}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* AGRI PRICES SECTION */}
        <Col xs={24} lg={16}>
          <Card
            bordered={false}
            className="agri-prices-main-card"
            title={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '4px 0',
                }}
              >
                <LineChartOutlined style={{ fontSize: 20, color: '#16a34a' }} />
                <span
                  style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}
                >
                  🥦 ราคาผลผลิตขายส่ง
                </span>
              </div>
            }
            extra={
              <a
                href={agriData?.sourceUrl || SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: '#0284c7', fontWeight: 600 }}
              >
                กรมการค้าภายใน <LinkOutlined />
              </a>
            }
          >
            {/* Tab lists */}
            <div className="price-categories-tabs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`tab-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSearchQuery('');
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search & Export section */}
            <div className="search-export-bar">
              <Input
                placeholder={`ค้นหาผลผลิตในหมวด${selectedCatLabel}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ maxWidth: 320, borderRadius: 8 }}
                prefix={<SearchOutlined style={{ color: '#cbd5e1' }} />}
                allowClear
              />
              {filteredCropItems.length > 0 && (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleExportCSV}
                  className="export-csv-btn"
                >
                  ดาวน์โหลดข้อมูล (CSV)
                </Button>
              )}
            </div>

            {isAgriLoading ? (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <Spin tip={`กำลังดึงข้อมูลราคา${selectedCatLabel}...`} />
              </div>
            ) : agriError ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#94a3b8',
                }}
              >
                <Empty description="ไม่สามารถเชื่อมต่อข้อมูลกรมการค้าภายในได้" />
                <Button
                  type="primary"
                  href={SOURCE_URL}
                  target="_blank"
                  style={{ marginTop: 12, borderRadius: 6 }}
                >
                  ดูที่หน้าเว็บกรมการค้าภายใน
                </Button>
              </div>
            ) : (
              <div className="price-table-wrapper">
                <div
                  style={{
                    marginBottom: 12,
                    fontSize: 13,
                    color: '#64748b',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>พบ {filteredCropItems.length} รายการ</span>
                  <span>
                    {dataDateText
                      ? `อัปเดตล่าสุด ณ วันที่ ${dataDateText}`
                      : 'ข้อมูลล่าสุด'}
                  </span>
                </div>
                <Table
                  dataSource={filteredCropItems}
                  columns={columns}
                  rowKey={(record, index) => record.id || record.no || index}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: false,
                    showTotal: (total) => `ทั้งหมด ${total} รายการ`,
                  }}
                  locale={{
                    emptyText: (
                      <Empty description="ไม่พบผลผลิตที่ตรงกับการค้นหา" />
                    ),
                  }}
                  className="custom-price-table"
                  size="middle"
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* FERTILIZER PRICES SECTION */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card
            title={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '4px 0',
                }}
              >
                <ExperimentOutlined
                  style={{ fontSize: 20, color: '#7c3aed' }}
                />
                <span
                  style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}
                >
                  🧪 ราคาจำหน่ายปลีกแนะนำปุ๋ยเคมี (กระสอบ 50 กก.)
                </span>
              </div>
            }
            extra={
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                แหล่งข้อมูล: กรมการค้าภายใน (สายด่วน 1569) •
                ราคาแนะนำเขตกรุงเทพฯ/ปริมณฑล และอำเภอเมืองทั่วประเทศ
              </span>
            }
            bordered={false}
            className="fertilizer-prices-card"
            style={{
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div className="price-table-wrapper">
              <Table
                dataSource={FERTILIZER_DATA}
                columns={FERTILIZER_COLUMNS}
                pagination={false}
                size="middle"
                className="custom-price-table"
                scroll={{ x: 800 }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* BUYING POINTS SECTION */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card
            title={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '4px 0',
                }}
              >
                <EnvironmentOutlined
                  style={{ fontSize: 20, color: '#0969da' }}
                />
                <span
                  style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}
                >
                  📍 พิกัดจุดรับซื้อผลผลิตและล้งรายใหญ่ (นครปฐม & ใกล้เคียง)
                </span>
              </div>
            }
            extra={
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                รวมพิกัดล้งส้มโอ ล้งมะพร้าวน้ำหอม ลานรับซื้อมันสำปะหลัง
                และตลาดกลางผลผลิตหลัก
              </span>
            }
            bordered={false}
            className="buying-points-card"
            style={{
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
            }}
          >
            {/* Search & Filter Bar */}
            <div
              style={{
                marginBottom: 16,
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <Input
                placeholder="ค้นหาจุดรับซื้อ เช่น ส้มโอ, ดำเนินสะดวก, กำแพงแสน..."
                value={buyingSearchQuery}
                onChange={(e) => setBuyingSearchQuery(e.target.value)}
                style={{ maxWidth: 320, borderRadius: 8 }}
                prefix={<SearchOutlined style={{ color: '#cbd5e1' }} />}
                allowClear
              />
              <Select
                defaultValue="All"
                style={{ width: 180 }}
                onChange={(value) => setBuyingTypeFilter(value)}
                options={[
                  { value: 'All', label: 'ประเภททั้งหมด' },
                  { value: 'ล้งส้มโอ', label: 'ล้งส้มโอ' },
                  { value: 'ล้งมะพร้าว', label: 'ล้งมะพร้าว' },
                  { value: 'ลานมัน', label: 'ลานมันสำปะหลัง' },
                  { value: 'โรงสีข้าว', label: 'โรงสีข้าว / ท่าข้าว' },
                  { value: 'ตลาดกลาง', label: 'ตลาดกลางค้าส่ง' },
                  { value: 'จุดรับซื้อ', label: 'จุดรับซื้ออื่น ๆ' },
                ]}
              />
            </div>

            <div className="price-table-wrapper">
              <Table
                dataSource={filteredBuyingPoints}
                columns={BUYING_POINTS_COLUMNS}
                pagination={{
                  pageSize: 6,
                  showSizeChanger: false,
                  showTotal: (total) => `ทั้งหมด ${total} จุดรับซื้อ`,
                }}
                size="middle"
                className="custom-price-table"
                scroll={{ x: 900 }}
                locale={{
                  emptyText: (
                    <Empty description="ไม่พบจุดรับซื้อที่ตรงกับการค้นหา" />
                  ),
                }}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

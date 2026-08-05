import {
  ArrowRightOutlined,
  BookOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  ReadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { CLOUDINARY_ASSETS } from '../../config/cloudinaryAssets';
import { KnowledgeStats } from '../../components/PublicKnowledge';
import './KnowledgeHub.css';

const knowledgeCollections = [
  {
    to: '/public/pesticides',
    title: 'การใช้สารป้องกันกำจัดศัตรูพืช',
    description:
      'ค้นหาคำแนะนำการใช้สาร กลุ่มสาร อัตราใช้ และแนวทางจัดการศัตรูพืชอย่างปลอดภัย',
    detail: 'คลังสารเคมีและ MixLab',
    Icon: ExperimentOutlined,
    tone: 'chemical',
  },
  {
    to: '/public/fertilizers',
    title: 'การใช้ปุ๋ยสำหรับไม้ผล',
    description:
      'รวมคำแนะนำการจัดการธาตุอาหาร วิเคราะห์ดิน คำนวณแม่ปุ๋ย และการใช้ปุ๋ยสำหรับไม้ผลเศรษฐกิจ',
    detail: '9 บทไม้ผล · ตัวอย่างคำนวณ · เอกสารอ้างอิง',
    Icon: ReadOutlined,
    tone: 'fertilizer',
  },
  {
    to: '/public/orchids',
    title: 'กล้วยไม้',
    description:
      'รวมทั้งคู่มือการผลิตและงานวิจัยนวัตกรรมกล้วยไม้ โดยแยกคลังเนื้อหาให้เลือกอ่านตามวัตถุประสงค์',
    detail: '2 คลังความรู้ · AI กล้วยไม้ตัวเดียวกัน',
    Icon: BookOutlined,
    tone: 'orchid',
  },
  {
    to: '/public/farmer-manual',
    title: 'การขึ้นทะเบียนเกษตรกร',
    description:
      'ผู้ช่วยเฉพาะทางที่ค้นตอบเรื่องขึ้นทะเบียนและปรับปรุงทะเบียนเกษตรกร ปี 2569 จากคู่มือฉบับเต็ม',
    detail: '114 บทความ · 119 FAQ · PDF 90 หน้า',
    Icon: RobotOutlined,
    tone: 'farmer',
  },
  {
    to: '/public/rice',
    title: 'องค์ความรู้ข้าว',
    description:
      'รวมงานวิจัยข้าวเชิงลึก พร้อมเอกสารโรคและแมลงศัตรูข้าวจากต้นฉบับ พ.ศ. 2562',
    detail: '25 เอกสาร · งานวิจัยและศัตรูข้าว',
    Icon: ReadOutlined,
    tone: 'rice',
  },
  {
    to: '/public/machinery',
    title: 'เครื่องจักรการเกษตรล้ำสมัย',
    description:
      'รวมองค์ความรู้ Agriculture 4.0 ตั้งแต่รถแทรกเตอร์อัตโนมัติ โดรน หุ่นยนต์ ระบบพ่นสาร พลังงานทางเลือก ไปจนถึงเครื่องจักรสำหรับไทย',
    detail: '26 เอกสาร · 12 ด้านเทคโนโลยี',
    Icon: ToolOutlined,
    tone: 'machinery',
  },
  {
    to: '/public/stou-research',
    title: 'คลังงานวิจัย มสธ.',
    description:
      'รวมบทสรุปงานวิจัยจาก STOU Research Library พร้อมปีเอกสาร ผู้วิจัย Handle ID และลิงก์กลับ PDF ต้นฉบับ',
    detail: '172 บทสรุป · 3 ปีเอกสาร · มีแหล่งอ้างอิง',
    Icon: DatabaseOutlined,
    tone: 'stou',
  },
];

export default function KnowledgeHub() {
  return (
    <main className="knowledge-hub">
      <div className="knowledge-hub-nav">
        <Link to="/">🏠 กลับหน้าหลักแดชบอร์ด</Link>
      </div>

      <section
        className="knowledge-hub-hero"
        style={{
          '--knowledge-hub-image': `url("${CLOUDINARY_ASSETS.agriHero}")`,
        }}
      >
        <span className="knowledge-hub-kicker">KNOWLEDGE CENTER</span>
        <h1>องค์ความรู้การเกษตร</h1>
        <p>
          เลือกคลังความรู้ที่ต้องการ
          แล้วเปิดอ่านรายละเอียดแต่ละหัวข้อได้จากหน้าเฉพาะเรื่อง
        </p>
      </section>

      <KnowledgeStats
        tone="farmer"
        items={[
          {
            value: knowledgeCollections.length,
            label: 'คลังองค์ความรู้',
            icon: <DatabaseOutlined />,
          },
          {
            value: 'หลายด้าน',
            label: 'พืช สาร เทคโนโลยี และทะเบียน',
            icon: <BookOutlined />,
          },
          {
            value: 'ค้นหาได้',
            label: 'แยกตามหัวข้อและเอกสาร',
            icon: <ReadOutlined />,
          },
          {
            value: 'มีที่มา',
            label: 'ข้อมูลอ้างอิงในแต่ละคลัง',
            icon: <SafetyCertificateOutlined />,
          },
        ]}
      />

      <section className="knowledge-hub-grid" aria-label="ชุดองค์ความรู้">
        {knowledgeCollections.map(
          ({ to, title, description, detail, Icon, tone }) => (
            <Link key={to} to={to} className={`knowledge-hub-card ${tone}`}>
              <div className="knowledge-hub-card-icon">
                <Icon aria-hidden="true" />
              </div>
              <div className="knowledge-hub-card-body">
                <span className="knowledge-hub-card-detail">{detail}</span>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
              <span className="knowledge-hub-card-action">
                เปิดคลังความรู้ <ArrowRightOutlined aria-hidden="true" />
              </span>
            </Link>
          )
        )}
      </section>
    </main>
  );
}

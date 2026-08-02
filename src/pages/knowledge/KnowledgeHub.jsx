import {
  ArrowRightOutlined,
  BookOutlined,
  ExperimentOutlined,
  ReadOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
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
    title: 'คู่มือขึ้นทะเบียนเกษตรกร 2569',
    description:
      'คู่มือและแนวทางปฏิบัติสำหรับการขึ้นทะเบียนและปรับปรุงทะเบียนเกษตรกร ประจำปี 2569',
    detail: 'คลังคู่มือทะเบียนเกษตรกร',
    Icon: BookOutlined,
    tone: 'manual',
  },
  {
    to: '/public/rice',
    title: 'องค์ความรู้ข้าว',
    description:
      'รวมบทสรุปและงานวิจัยข้าวเชิงลึก ตั้งแต่จีโนมิกส์ CRISPR ความทนทานต่อสภาพอากาศ ข้าวคาร์บอนต่ำ ไปจนถึง AI และข้าวไทย',
    detail: '17 เอกสารวิจัยและบทสรุป',
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
];

export default function KnowledgeHub() {
  return (
    <main className="knowledge-hub">
      <div className="knowledge-hub-nav">
        <Link to="/">🏠 กลับหน้าหลักแดชบอร์ด</Link>
      </div>

      <section className="knowledge-hub-hero">
        <span className="knowledge-hub-kicker">KNOWLEDGE CENTER</span>
        <h1>องค์ความรู้การเกษตร</h1>
        <p>
          เลือกคลังความรู้ที่ต้องการ
          แล้วเปิดอ่านรายละเอียดแต่ละหัวข้อได้จากหน้าเฉพาะเรื่อง
        </p>
      </section>

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

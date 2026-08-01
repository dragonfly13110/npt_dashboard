import {
  ArrowRightOutlined,
  BookOutlined,
  ExperimentOutlined,
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

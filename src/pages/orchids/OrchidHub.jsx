import {
  ArrowRightOutlined,
  BookOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { CLOUDINARY_ASSETS } from '../../config/cloudinaryAssets';
import { KnowledgeStats } from '../../components/PublicKnowledge';
import './OrchidKnowledge.css';

const orchidCollections = [
  {
    to: '/public/orchids/production',
    title: 'การผลิตกล้วยไม้',
    detail: 'คู่มือหลัก 26 บทความ',
    count: 26,
    description:
      'คู่มือภาคปฏิบัติตั้งแต่การปลูกเลี้ยง โรงเรือน น้ำ ปุ๋ย โรค แมลง การขยายพันธุ์ และหลังการเก็บเกี่ยว',
    Icon: BookOutlined,
    tone: 'production',
  },
  {
    to: '/public/orchids/research',
    title: 'งานวิจัยและนวัตกรรมกล้วยไม้',
    detail: 'สรุปงานวิจัย 13 เอกสาร',
    count: 13,
    description:
      'งานวิจัยเชิงลึกด้านจีโนม การปรับปรุงพันธุ์ การออกดอก เนื้อเยื่อ หลังการเก็บเกี่ยว การอนุรักษ์ และอุตสาหกรรม',
    Icon: ExperimentOutlined,
    tone: 'research',
  },
];

export default function OrchidHub() {
  return (
    <main className="orchid-hub">
      <div className="orchid-hub-nav">
        <Link to="/public/knowledge-hub">← กลับศูนย์องค์ความรู้</Link>
        <Link to="/">🏠 หน้าหลัก</Link>
      </div>

      <section
        className="orchid-hub-hero"
        style={{
          '--knowledge-header-image': `url("${CLOUDINARY_ASSETS.agriHero}")`,
        }}
      >
        <span className="orchid-hub-kicker">ORCHID KNOWLEDGE</span>
        <h1>องค์ความรู้กล้วยไม้</h1>
        <p>
          เลือกอ่านคู่มือการผลิตหรือชุดงานวิจัย โดยแยกคลังเนื้อหาออกจากกัน
          แต่ใช้ AI กล้วยไม้ตัวเดียวกันในการค้นและตอบคำถาม
        </p>
      </section>

      <KnowledgeStats
        tone="orchid"
        items={[
          {
            value: orchidCollections.length,
            label: 'คลังแยกตามวัตถุประสงค์',
            icon: <DatabaseOutlined />,
          },
          {
            value: orchidCollections.reduce(
              (total, item) => total + item.count,
              0
            ),
            label: 'บทความและเอกสาร',
            icon: <BookOutlined />,
          },
          {
            value: 'AI เดียวกัน',
            label: 'ค้นหาและถามคำถาม',
            icon: <ExperimentOutlined />,
          },
          {
            value: 'มี source note',
            label: 'ขอบเขตการใช้ข้อมูล',
            icon: <SafetyCertificateOutlined />,
          },
        ]}
      />

      <section className="orchid-hub-grid" aria-label="คลังองค์ความรู้กล้วยไม้">
        {orchidCollections.map(
          ({ to, title, detail, description, Icon, tone }) => (
            <Link key={to} to={to} className={`orchid-hub-card ${tone}`}>
              <div className="orchid-hub-card-icon">
                <Icon aria-hidden="true" />
              </div>
              <div>
                <span className="orchid-hub-card-detail">{detail}</span>
                <h2>{title}</h2>
                <p>{description}</p>
                <span className="orchid-hub-card-action">
                  เปิดคลังนี้ <ArrowRightOutlined aria-hidden="true" />
                </span>
              </div>
            </Link>
          )
        )}
      </section>
    </main>
  );
}

import { Link } from 'react-router-dom';
import { BookOutlined } from '@ant-design/icons';
import { manualRegistry } from '../data/manualRegistry';
import './Manual.css';

const audiences = [
  ['กรรมการ', 'เริ่มจากภาพรวม จุดเด่น ความปลอดภัย และความพร้อมใช้งานจริง'],
  ['เจ้าหน้าที่', 'ดูขั้นตอนรวบรวม เตรียม และใช้งานข้อมูลในงานประจำ'],
  ['ผู้ดูแลระบบ', 'ตรวจสิทธิ์ ความปลอดภัย การ deploy และงานดูแลหลังส่งมอบ'],
  ['ทีมพัฒนา', 'ติดตั้งระบบ ต่อ Supabase และขยายผลไปจังหวัดอื่น'],
];

export default function Manual() {
  return (
    <main className="manual-page">
      <section className="manual-hero">
        <Link className="manual-back-link" to="/">
          กลับหน้าแรก
        </Link>
        <p className="manual-kicker">NPT Smart Agri Dashboard</p>
        <h1>ศูนย์คู่มือระบบ</h1>
        <p>
          รวมเอกสารสำหรับกรรมการ ผู้บริหาร เจ้าหน้าที่ ผู้ดูแลระบบ และทีมพัฒนา
          เพื่อใช้ระบบได้จริงและต่อยอดได้อย่างมั่นใจ
        </p>
      </section>

      <section className="manual-section" aria-labelledby="manual-audiences">
        <h2 id="manual-audiences">เริ่มอ่านตามบทบาท</h2>
        <div className="manual-audience-grid">
          {audiences.map(([title, description]) => (
            <article className="manual-audience" key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="manual-section" aria-labelledby="manual-list">
        <div className="manual-section-header">
          <div>
            <h2 id="manual-list">คู่มือบนเว็บ</h2>
            <p>เนื้อหาต้นฉบับจาก docs/manual พร้อมจัดเป็น portal บนเว็บ</p>
          </div>
          <span>{manualRegistry.length} บท</span>
        </div>

        <div className="manual-grid">
          {manualRegistry.map(
            ({ slug, title, file, audience, Icon }, index) => (
              <Link className="manual-card" key={file} to={`/manual/${slug}`}>
                <div className="manual-card-icon">
                  <Icon aria-hidden="true" />
                </div>
                <div>
                  <p className="manual-card-order">
                    บทที่ {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3>{title}</h3>
                  <p>{audience}</p>
                  <code>{file}</code>
                </div>
              </Link>
            )
          )}
        </div>
      </section>

      <section className="manual-readiness" aria-label="ความพร้อมของคู่มือ">
        <BookOutlined aria-hidden="true" />
        <div>
          <h2>สถานะรอบนี้</h2>
          <p>
            หน้าแรกของคู่มือพร้อมใช้งานแล้ว ขั้นถัดไปคือเพิ่มทางเข้าจากเมนูหลัก
            และสร้างหน้าอ่านเนื้อหา Markdown รายบท
          </p>
        </div>
      </section>
    </main>
  );
}

import { ArrowLeftOutlined, ExpandOutlined } from '@ant-design/icons';
import './Infographic.css';

const infographics = [1, 2, 3, 4].map((number) => ({
  number,
  src: `/images/infographics/npt-smart-agri-${number}.webp`,
  alt: `อินโฟกราฟิก NPT Smart Agri Dashboard แผ่นที่ ${number}`,
}));

export default function Infographic() {
  return (
    <main className="infographic-page">
      <header className="infographic-hero">
        <div className="infographic-hero-inner">
          <a className="infographic-back" href="/">
            <ArrowLeftOutlined aria-hidden="true" />
            กลับหน้าหลัก
          </a>
          <p className="infographic-eyebrow">NPT SMART AGRI DASHBOARD</p>
          <h1>Infographic</h1>
          <p>ภาพรวมแนวคิด ระบบ และประโยชน์ของศูนย์ข้อมูลเกษตรจังหวัดนครปฐม</p>
        </div>
      </header>

      <section className="infographic-gallery" aria-label="ชุดอินโฟกราฟิก">
        {infographics.map(({ number, src, alt }) => (
          <figure className="infographic-card" key={src}>
            <div className="infographic-card-heading">
              <span>แผ่นที่ {number}</span>
              <a href={src} target="_blank" rel="noopener noreferrer">
                <ExpandOutlined aria-hidden="true" />
                เปิดภาพขนาดจริง
              </a>
            </div>
            <a href={src} target="_blank" rel="noopener noreferrer">
              <img
                src={src}
                alt={alt}
                loading={number === 1 ? 'eager' : 'lazy'}
              />
            </a>
          </figure>
        ))}
      </section>
    </main>
  );
}

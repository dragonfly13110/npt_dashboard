import {
  EnvironmentOutlined,
  FacebookOutlined,
  LoginOutlined,
  MailOutlined,
  MessageOutlined,
  PhoneOutlined,
  LikeOutlined,
} from '@ant-design/icons';
import './LandingFooter.css';

const contactLinks = [
  {
    label: 'โทร 0 3425 3992',
    href: 'tel:034253992',
    Icon: PhoneOutlined,
  },
  {
    label: 'ส่งอีเมล',
    href: 'mailto:nakhonpathom@doae.go.th',
    detail: 'nakhonpathom@doae.go.th',
    Icon: MailOutlined,
  },
  {
    label: 'Facebook สำนักงาน',
    href: 'https://www.facebook.com/profile.php?id=61566480174328',
    detail: 'ติดตามข่าวสารและประกาศ',
    Icon: FacebookOutlined,
    external: true,
  },
];

function FooterLink({ href, label, detail, Icon, external }) {
  return (
    <a
      className="landing-footer-link-card"
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      <span className="landing-footer-link-icon">
        <Icon aria-hidden="true" />
      </span>
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
    </a>
  );
}

function FooterPanelButton({ label, detail, Icon, onClick, featured = false }) {
  return (
    <button
      className={`landing-footer-link-card landing-footer-button-card${featured ? ' landing-footer-featured-action' : ''}`}
      type="button"
      onClick={onClick}
    >
      <span className="landing-footer-link-icon">
        <Icon aria-hidden="true" />
      </span>
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
    </button>
  );
}

export default function LandingFooter({ onOpenPanel = () => {} }) {
  const compactLinks = [
    ...contactLinks,
    { label: 'แผนที่อัจฉริยะ', href: '/smart-map', Icon: EnvironmentOutlined },
    { label: 'เข้าสู่ระบบเจ้าหน้าที่', href: '/login', Icon: LoginOutlined },
  ];

  return (
    <footer
      className="landing-footer-v2"
      role="contentinfo"
      itemScope
      itemType="https://schema.org/GovernmentOrganization"
    >
      <div className="landing-footer-v2-inner">
        <section className="landing-footer-compact">
          <div className="landing-footer-agency">
            <span className="landing-footer-kicker">
              ศูนย์ข้อมูลเกษตรจังหวัดนครปฐม
            </span>
            <h2 itemProp="name">สำนักงานเกษตรจังหวัดนครปฐม</h2>
            <p>131 ถนนทรงพล อำเภอเมือง จังหวัดนครปฐม 73000</p>
          </div>

          <div className="landing-footer-quick-actions">
            {compactLinks.map((link) => (
              <FooterLink key={link.href} {...link} />
            ))}
            <FooterPanelButton
              label="ติดต่อสำนักงานเกษตรอำเภอ"
              Icon={MessageOutlined}
              onClick={() => onOpenPanel('contacts')}
            />
            <FooterPanelButton
              label="ประเมินเว็บไซต์"
              detail="แบบสำรวจความพึงพอใจ"
              Icon={LikeOutlined}
              onClick={() => onOpenPanel('websiteEvaluation')}
              featured
            />
          </div>
        </section>

        <div className="landing-footer-bottom">
          <p>
            ข้อมูลบนระบบนี้ใช้เพื่อการติดตามสถานการณ์และวางแผนเบื้องต้น
            โปรดตรวจสอบกับหน่วยงานต้นทางก่อนนำไปใช้อ้างอิงทางราชการ
          </p>
          <span>
            © {new Date().getFullYear()} ระบบฐานข้อมูลกลางเพื่อการเกษตร
          </span>
        </div>
      </div>
    </footer>
  );
}

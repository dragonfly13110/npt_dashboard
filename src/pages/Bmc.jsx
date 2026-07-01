import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BranchesOutlined,
  SettingOutlined,
  ToolOutlined,
  BulbOutlined,
  HeartOutlined,
  SendOutlined,
  TeamOutlined,
  DollarOutlined,
  WalletOutlined,
  PrinterOutlined,
  PictureOutlined,
  LeftOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import LandingFooter from '../components/widgets/LandingFooter';
import html2canvas from 'html2canvas';
import './Bmc.css';

export default function Bmc() {
  const navigate = useNavigate();

  useEffect(() => {
    // Set SEO Document Title
    document.title = 'Business Model Canvas (BMC) | NPT Smart Agri Dashboard';
    window.scrollTo(0, 0);
  }, []);

  const handleOpenFooterPanel = (panelName) => {
    // Redirect to home page with state to open corresponding panel
    navigate('/', { state: { openPanel: panelName } });
  };

  const handlePrint = () => {
    window.print();
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPNG = () => {
    const canvasElement = document.getElementById('bmc-canvas-area');
    if (!canvasElement) return;

    setIsExporting(true);

    // Smooth rendering timeout
    setTimeout(() => {
      html2canvas(canvasElement, {
        scale: 2, // Higher resolution for export
        useCORS: true,
        backgroundColor: '#f1f5f9',
        logging: false,
      })
        .then((canvas) => {
          const link = document.createElement('a');
          link.download = 'NPT_Smart_Agri_BMC.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        })
        .catch((err) => {
          console.error('Error generating image:', err);
        })
        .finally(() => {
          setIsExporting(false);
        });
    }, 300);
  };

  return (
    <div className="bmc-page-wrapper">
      {/* Navigation Top Header */}
      <div
        className="no-print"
        style={{
          padding: '12px 32px',
          maxWidth: '100%',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary)',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0,
          }}
        >
          <LeftOutlined /> กลับหน้าหลัก
        </button>
      </div>

      <div className="bmc-container">
        {/* BMC Header */}
        <header className="bmc-header">
          <h1 className="bmc-title">Business Model Canvas</h1>
          <p className="bmc-subtitle">
            NPT Smart Agri Dashboard
            (ระบบฐานข้อมูลกลางเพื่อการเกษตรจังหวัดนครปฐม)
          </p>
          <p className="bmc-description">
            แผนภาพโมเดลธุรกิจแสดงโครงสร้าง กิจกรรม ทรัพยากรหลัก
            และกลุ่มเป้าหมายของระบบ NPT Smart Agri Dashboard
            เพื่อช่วยให้ผู้ใช้เห็นภาพรวมของการสร้างคุณค่าและการจัดการระบบฐานข้อมูลและการเกษตรนครปฐม
          </p>
          <div className="bmc-actions no-print">
            <button className="bmc-btn bmc-btn-primary" onClick={handlePrint}>
              <PrinterOutlined /> สั่งพิมพ์ / บันทึก PDF
            </button>
            <button
              className="bmc-btn bmc-btn-secondary"
              onClick={handleDownloadPNG}
              disabled={isExporting}
            >
              <PictureOutlined />{' '}
              {isExporting ? 'กำลังส่งออก...' : 'ดาวน์โหลดเป็นรูปภาพ (PNG)'}
            </button>
          </div>
        </header>

        {/* The BMC Canvas Area (For Printing & Image Export) */}
        <main className="bmc-canvas" id="bmc-canvas-area">
          {/* Top 5-Column Grid */}
          <div className="bmc-top-grid">
            {/* 8. Key Partners (พันธมิตรหลัก) */}
            <section className="bmc-card bmc-partner-card">
              <div className="bmc-card-header">
                <span className="bmc-card-icon">
                  <BranchesOutlined />
                </span>
                <div className="bmc-card-title-group">
                  <h3 className="bmc-card-title-th">พันธมิตรหลัก</h3>
                  <span className="bmc-card-title-en">Key Partners</span>
                </div>
              </div>
              <div className="bmc-card-body">
                <ul className="bmc-list">
                  <li>
                    <div className="bmc-item-sub-title">หน่วยงานภายใน</div>
                    <ul
                      className="bmc-list"
                      style={{ gap: '6px', marginTop: '4px' }}
                    >
                      <li className="bmc-item">
                        <span className="bmc-item-number">•</span>
                        <span className="bmc-item-text">
                          เกษตรจังหวัดนครปฐม
                        </span>
                      </li>
                      <li className="bmc-item">
                        <span className="bmc-item-number">•</span>
                        <span className="bmc-item-text">
                          สำนักงานเกษตรอำเภอ
                        </span>
                      </li>
                      <li className="bmc-item">
                        <span className="bmc-item-number">•</span>
                        <span className="bmc-item-text">
                          กรมส่งเสริมการเกษตร
                        </span>
                      </li>
                    </ul>
                  </li>
                  <li>
                    <div className="bmc-item-sub-title">หน่วยงานภายนอก</div>
                    <ul
                      className="bmc-list"
                      style={{ gap: '6px', marginTop: '4px' }}
                    >
                      <li className="bmc-item">
                        <span className="bmc-item-number">•</span>
                        <span className="bmc-item-text">GISTDA</span>
                      </li>
                      <li className="bmc-item">
                        <span className="bmc-item-number">•</span>
                        <span className="bmc-item-text">
                          กรมอุตุนิยมวิทยา (Open-Meteo)
                        </span>
                      </li>
                      <li className="bmc-item">
                        <span className="bmc-item-number">•</span>
                        <span className="bmc-item-text">กระทรวงพาณิชย์</span>
                      </li>
                      <li className="bmc-item">
                        <span className="bmc-item-number">•</span>
                        <span className="bmc-item-text">กรมพัฒนาที่ดิน</span>
                      </li>
                      <li className="bmc-item">
                        <span className="bmc-item-number">•</span>
                        <span className="bmc-item-text">
                          มหาวิทยาลัย & ภาคีเครือข่าย
                        </span>
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </section>

            {/* 7. Key Activities (กิจกรรมหลัก) */}
            <section className="bmc-card bmc-activity-card">
              <div className="bmc-card-header">
                <span className="bmc-card-icon">
                  <SettingOutlined />
                </span>
                <div className="bmc-card-title-group">
                  <h3 className="bmc-card-title-th">กิจกรรมหลัก</h3>
                  <span className="bmc-card-title-en">Key Activities</span>
                </div>
              </div>
              <div className="bmc-card-body">
                <ul className="bmc-list">
                  <li className="bmc-item">
                    <span className="bmc-item-number">1.</span>
                    <span className="bmc-item-text">
                      รวบรวมและกลั่นกรองความถูกต้องของข้อมูล
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">2.</span>
                    <span className="bmc-item-text">
                      พัฒนาและดูแลระบบ (Dashboard, Map, AI, DB, API, RLS)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">3.</span>
                    <span className="bmc-item-text">
                      ประชาสัมพันธ์ ทดสอบ ประเมินผล และปรับปรุงระบบ
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">4.</span>
                    <span className="bmc-item-text">
                      จัดฝึกอบรมและทำคู่มือใช้งาน
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 6. Key Resources (ทรัพยากรหลัก) */}
            <section className="bmc-card bmc-resource-card">
              <div className="bmc-card-header">
                <span className="bmc-card-icon">
                  <ToolOutlined />
                </span>
                <div className="bmc-card-title-group">
                  <h3 className="bmc-card-title-th">ทรัพยากรหลัก</h3>
                  <span className="bmc-card-title-en">Key Resources</span>
                </div>
              </div>
              <div className="bmc-card-body">
                <ul className="bmc-list">
                  <li className="bmc-item">
                    <span className="bmc-item-number">1.</span>
                    <span className="bmc-item-text">
                      เทคโนโลยีหลัก (React, Supabase, Netlify)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">2.</span>
                    <span className="bmc-item-text">
                      ชุดข้อมูลเกษตรกรรม 5 กลุ่มงานหลัก
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">3.</span>
                    <span className="bmc-item-text">
                      ระบบแผนที่ GIS & โมเดลประมวลผล AI
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">4.</span>
                    <span className="bmc-item-text">
                      คู่มือระบบและเอกสารการใช้งาน
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">5.</span>
                    <span className="bmc-item-text">
                      ทีมบุคลากร (เจ้าของข้อมูล, ผู้ดูแล, นักพัฒนา)
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 2. Value Propositions (คุณค่าที่นำเสนอ) */}
            <section className="bmc-card bmc-value-card">
              <div className="bmc-card-header">
                <span className="bmc-card-icon">
                  <BulbOutlined />
                </span>
                <div className="bmc-card-title-group">
                  <h3 className="bmc-card-title-th">คุณค่าที่นำเสนอ</h3>
                  <span className="bmc-card-title-en">Value Propositions</span>
                </div>
              </div>
              <div className="bmc-card-body">
                <ul className="bmc-list">
                  <li className="bmc-item">
                    <span className="bmc-item-number">1.</span>
                    <span className="bmc-item-text">
                      ศูนย์รวมข้อมูลเกษตรครบวงจร (Single Source of Truth)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">2.</span>
                    <span className="bmc-item-text">
                      Dashboard & แผนที่ช่วยวางแผน ลดงานซ้ำซ้อนและเวลารายงาน
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">3.</span>
                    <span className="bmc-item-text">
                      แบ่งสิทธิ์ข้อมูลสาธารณะ (Public) และภายใน (Internal)
                      ชัดเจน
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">4.</span>
                    <span className="bmc-item-text">
                      AI ผู้ช่วย (น้องข้าวหลาม) ช่วยค้นหา วิเคราะห์
                      และพยากรณ์โรค
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">5.</span>
                    <span className="bmc-item-text">
                      พร้อมขยายผล (Scalable) สู่จังหวัดอื่นได้ทันที
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 4. Customer Relationships (ความสัมพันธ์กับลูกค้า) */}
            <section className="bmc-card bmc-relationship-card">
              <div className="bmc-card-header">
                <span className="bmc-card-icon">
                  <HeartOutlined />
                </span>
                <div className="bmc-card-title-group">
                  <h3 className="bmc-card-title-th">ความสัมพันธ์กับลูกค้า</h3>
                  <span className="bmc-card-title-en">
                    Customer Relationships
                  </span>
                </div>
              </div>
              <div className="bmc-card-body">
                <ul className="bmc-list">
                  <li className="bmc-item">
                    <span className="bmc-item-number">1.</span>
                    <span className="bmc-item-text">
                      บริการตัวเอง (Self-service) ผ่าน Portal & Dashboard
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">2.</span>
                    <span className="bmc-item-text">
                      มีผู้ช่วยตอบคำถาม (Chatbot) และเอกสารคู่มือ
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">3.</span>
                    <span className="bmc-item-text">
                      บริการตามสิทธิ์ผู้ใช้ (Role-based access)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">4.</span>
                    <span className="bmc-item-text">
                      ระบบส่งคำขอข้อมูลกลาง (Data Request)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">5.</span>
                    <span className="bmc-item-text">
                      พัฒนาต่อเนื่องผ่านกลไกรับ Feedback
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">6.</span>
                    <span className="bmc-item-text">
                      สร้างความมั่นใจด้านข้อมูลและความปลอดภัย
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 3. Channels (ช่องทาง) */}
            <section className="bmc-card bmc-channel-card">
              <div className="bmc-card-header">
                <span className="bmc-card-icon">
                  <SendOutlined />
                </span>
                <div className="bmc-card-title-group">
                  <h3 className="bmc-card-title-th">ช่องทาง</h3>
                  <span className="bmc-card-title-en">Channels</span>
                </div>
              </div>
              <div className="bmc-card-body">
                <ul className="bmc-list">
                  <li className="bmc-item">
                    <span className="bmc-item-number">1.</span>
                    <span className="bmc-item-text">
                      หนังสือราชการ & สื่อออนไลน์สำนักงาน
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">2.</span>
                    <span className="bmc-item-text">
                      เว็บไซต์หลัก (Browser บนคอมพิวเตอร์)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">3.</span>
                    <span className="bmc-item-text">
                      เว็บแอปบนมือถือ (Responsive Mobile Web)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">4.</span>
                    <span className="bmc-item-text">ไลน์ทางการ (LINE OA)</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 1. Customer Segments (กลุ่มลูกค้า) */}
            <section className="bmc-card bmc-customer-card">
              <div className="bmc-card-header">
                <span className="bmc-card-icon">
                  <TeamOutlined />
                </span>
                <div className="bmc-card-title-group">
                  <h3 className="bmc-card-title-th">กลุ่มลูกค้า</h3>
                  <span className="bmc-card-title-en">Customer Segments</span>
                </div>
              </div>
              <div className="bmc-card-body">
                <ul className="bmc-list">
                  <li className="bmc-item">
                    <span className="bmc-item-number">1.</span>
                    <span className="bmc-item-text">
                      ผู้บริหารระดับจังหวัด/อำเภอ (ใช้วางนโยบาย)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">2.</span>
                    <span className="bmc-item-text">
                      เจ้าหน้าที่เกษตร (ผู้ใช้งานหลัก/ดูแลข้อมูล)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">3.</span>
                    <span className="bmc-item-text">
                      เกษตรกรทั่วไป & กลุ่มเกษตรกร (แปลงใหญ่, วิสาหกิจชุมชน,
                      YSF)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">4.</span>
                    <span className="bmc-item-text">
                      ผู้ประกอบการ & นักลงทุนเกษตร
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">5.</span>
                    <span className="bmc-item-text">ประชาชนทั่วไป</span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">6.</span>
                    <span className="bmc-item-text">
                      หน่วยงานภาครัฐและเอกชนที่เกี่ยวข้อง
                    </span>
                  </li>
                </ul>
              </div>
            </section>
          </div>

          {/* Bottom 2-Column Grid */}
          <div className="bmc-bottom-row">
            {/* 9. Cost Structure (โครงสร้างต้นทุน) */}
            <section className="bmc-card bmc-cost-card">
              <div className="bmc-card-header">
                <span className="bmc-card-icon">
                  <DollarOutlined />
                </span>
                <div className="bmc-card-title-group">
                  <h3 className="bmc-card-title-th">โครงสร้างต้นทุน</h3>
                  <span className="bmc-card-title-en">Cost Structure</span>
                </div>
              </div>
              <div className="bmc-card-body">
                <ul className="bmc-list">
                  <li className="bmc-item">
                    <span className="bmc-item-number">1.</span>
                    <span className="bmc-item-text">
                      ค่าบริการประมวลผลโมเดล AI (API credits)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">2.</span>
                    <span className="bmc-item-text">
                      ค่าประเมินผลและวิจัยความพึงพอใจการใช้งาน
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">3.</span>
                    <span className="bmc-item-text">
                      ค่าสื่อประชาสัมพันธ์ คู่มือ และแผ่นพับ
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">4.</span>
                    <span className="bmc-item-text">
                      ค่าจัดทำคู่มือโครงสร้างระบบ (Architecture doc)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">5.</span>
                    <span className="bmc-item-text">
                      งบประมาณการฝึกอบรมสัมมนาผู้ใช้และเจ้าหน้าที่
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 5. Revenue Streams (กระแสรายได้) */}
            <section className="bmc-card bmc-revenue-card">
              <div className="bmc-card-header">
                <span className="bmc-card-icon">
                  <WalletOutlined />
                </span>
                <div className="bmc-card-title-group">
                  <h3 className="bmc-card-title-th">กระแสรายได้ / ผลตอบแทน</h3>
                  <span className="bmc-card-title-en">
                    Revenue Streams / Key Benefits
                  </span>
                </div>
              </div>
              <div className="bmc-card-body">
                <ul className="bmc-list">
                  <li className="bmc-item">
                    <span className="bmc-item-number">1.</span>
                    <span className="bmc-item-text">
                      ลดเวลารวบรวมและทำรายงานเกษตร 99%
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">2.</span>
                    <span className="bmc-item-text">
                      ค้นหาข้อมูลเชิงลึกเร็วขึ้น 360 เท่า (ในระดับวินาที)
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">3.</span>
                    <span className="bmc-item-text">
                      ลดความซ้ำซ้อนและข้อผิดพลาดของข้อมูล 100%
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">4.</span>
                    <span className="bmc-item-text">
                      เพิ่มประสิทธิภาพการตัดสินใจเชิงนโยบายของผู้บริหาร
                    </span>
                  </li>
                  <li className="bmc-item">
                    <span className="bmc-item-number">5.</span>
                    <span className="bmc-item-text">
                      โมเดลต้นแบบในการขอรับงบพัฒนาระบบ/นวัตกรรมภาครัฐ
                    </span>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </main>

        {/* Educational Info Section */}
        <section className="bmc-info-section no-print">
          <h2 className="bmc-info-title">
            <InfoCircleOutlined style={{ color: 'var(--primary)' }} />
            Business Model Canvas (BMC) คืออะไร?
          </h2>
          <p className="bmc-info-text">
            Business Model Canvas (BMC)
            คือเครื่องมือจัดการเชิงกลยุทธ์ที่ช่วยให้ผู้พัฒนาและผู้วางแผนงานเกษตรจังหวัด
            มองเห็นโครงสร้างระบบของระบบบริหารจัดการข้อมูลการเกษตรในหน้าเดียว
            โดยจำแนกองค์ประกอบออกเป็น 9 มิติหลัก ทำให้ระบบ NPT Smart Agri
            Dashboard
            สามารถดำเนินงานอย่างเป็นเอกภาพและตอบโจทย์กลุ่มเกษตรกรและผู้บริหารได้อย่างครบวงจร
          </p>
          <div className="bmc-info-grid">
            <div className="bmc-info-col">
              <h4>การส่งมอบคุณค่า (Value Propositions)</h4>
              <p>
                มุ่งเน้นการสร้าง "ศูนย์กลางข้อมูล" ที่บูรณาการจุดเด่นเชิงดิจิทัล
                เช่น ระบบช่วยวิเคราะห์ข้อมูลเชิงลึกด้วย AI
                และแผนที่พยากรณ์ความเสี่ยงโรคและแมลง
                เพื่อให้ผู้ใช้สามารถนำข้อมูลดิบไปใช้วางแผนการทำเกษตรกรรมได้อย่างรวดเร็วและคุ้มค่าที่สุด
              </p>
            </div>
            <div className="bmc-info-col">
              <h4>ประสิทธิภาพหลังบ้าน (Infrastructure)</h4>
              <p>
                มีการจับมือร่วมกับพันธมิตรที่น่าเชื่อถือ (เช่น
                สำนักงานเกษตรจังหวัดนครปฐม, GISTDA, กรมอุตุนิยมวิทยา)
                เพื่อผสานเครื่องมือระบบ React, Supabase และ Netlify ในการรวบรวม
                จัดการข้อมูลให้ปลอดภัยตามหลักสิทธิ์ Role-Based Access
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Landing page footer */}
      <div className="no-print">
        <LandingFooter onOpenPanel={handleOpenFooterPanel} />
      </div>
    </div>
  );
}

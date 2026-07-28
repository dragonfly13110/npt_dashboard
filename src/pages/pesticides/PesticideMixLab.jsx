import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';
import './Pesticides.css';

export default function PesticideMixLab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bench state
  const [chemA, setChemA] = useState(null);
  const [chemB, setChemB] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [isMixing, setIsMixing] = useState(false);
  const [history, setHistory] = useState([]);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Active view tab: 'lab' | 'matrix' | 'notes'
  const [activeTab, setActiveTab] = useState('lab');

  // Modal & Accordion state
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [toastMsg, setToastMsg] = useState('');

  // Search in matrix table
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixStatusFilter, setMatrixStatusFilter] = useState('all');

  useEffect(() => {
    fetch('/data/pesticides/mixing_matrix.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load mixing matrix');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading mixing matrix:', err);
        setLoading(false);
      });
  }, []);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  };

  // Filtered chemicals list
  const filteredChemicals = useMemo(() => {
    if (!data?.chemicals) return [];
    return data.chemicals.filter((chem) => {
      const matchesType = filterType === 'all' || chem.type === filterType;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        chem.name.toLowerCase().includes(q) ||
        (chem.englishName && chem.englishName.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [data, filterType, searchQuery]);

  // Chemical click handler
  const handleSelectChemical = (chem) => {
    if (chemA?.name === chem.name) {
      setChemA(null);
      setActiveResult(null);
      return;
    }
    if (chemB?.name === chem.name) {
      setChemB(null);
      setActiveResult(null);
      return;
    }

    if (!chemA) {
      setChemA(chem);
      setActiveResult(null);
      triggerToast(`เลือก ${chem.name} เป็นสาร A`);
    } else if (!chemB) {
      setChemB(chem);
      setActiveResult(null);
      triggerToast(`เลือก ${chem.name} เป็นสาร B`);
    } else {
      // Both filled, replace Chem B
      setChemB(chem);
      setActiveResult(null);
      triggerToast(`เปลี่ยนสาร B เป็น ${chem.name}`);
    }
  };

  // Find pair result in dataset
  const findPairResult = (name1, name2) => {
    if (!data?.pairs) return null;
    return (
      data.pairs.find(
        (p) =>
          (p.a === name1 && p.b === name2) || (p.a === name2 && p.b === name1)
      ) || null
    );
  };

  // Mixing action
  const handleMix = () => {
    if (!chemA || !chemB) return;
    setIsMixing(true);

    const match = findPairResult(chemA.name, chemB.name);
    const resultObj = match
      ? {
          ...match,
          chemAName: chemA.name,
          chemBName: chemB.name,
        }
      : {
          id: Date.now(),
          a: chemA.name,
          b: chemB.name,
          chemAName: chemA.name,
          chemBName: chemB.name,
          status: 'NA',
          meaning: 'ไม่พบข้อมูลคู่ผสมนี้ในผังวิชาการ 2568',
          note: null,
        };

    setActiveResult(resultObj);

    // Add to history
    setHistory((prev) => [
      {
        id: Date.now(),
        chemA: chemA.name,
        chemB: chemB.name,
        status: resultObj.status,
        meaning: resultObj.meaning,
        note: resultObj.note,
        timestamp: new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      ...prev.slice(0, 19),
    ]);

    setTimeout(() => {
      setIsMixing(false);
    }, 400);
  };

  // Random pair selection
  const handleRandomPair = () => {
    if (!data?.chemicals || data.chemicals.length < 2) return;
    const list = data.chemicals;
    const idxA = Math.floor(Math.random() * list.length);
    let idxB = Math.floor(Math.random() * list.length);
    while (idxB === idxA) {
      idxB = Math.floor(Math.random() * list.length);
    }
    setChemA(list[idxA]);
    setChemB(list[idxB]);
    setActiveResult(null);
    triggerToast(`สุ่มคู่สาร: ${list[idxA].name} + ${list[idxB].name}`);
  };

  // Reset entire bench
  const handleResetBench = () => {
    setChemA(null);
    setChemB(null);
    setActiveResult(null);
    setSearchQuery('');
    setFilterType('all');
    triggerToast('ล้างโต๊ะทดลองเรียบร้อย');
  };

  // Filtered pairs for Matrix View
  const filteredMatrixPairs = useMemo(() => {
    if (!data?.pairs) return [];
    return data.pairs.filter((p) => {
      const matchStatus =
        matrixStatusFilter === 'all' || p.status === matrixStatusFilter;
      const q = matrixSearch.trim().toLowerCase();
      const matchSearch =
        q === '' ||
        p.a.toLowerCase().includes(q) ||
        p.b.toLowerCase().includes(q) ||
        p.meaning.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [data, matrixStatusFilter, matrixSearch]);

  if (loading) {
    return (
      <div className="pesticide-mixlab-loading">
        <Spin
          size="large"
          description="กำลังโหลดระบบห้องทดลองจำลอง MixLab..."
        />
      </div>
    );
  }

  return (
    <div className="mixlab-page-container">
      {/* Intro Modal */}
      {showIntroModal && (
        <div
          className="mixlab-modal-backdrop"
          onClick={() => setShowIntroModal(false)}
        >
          <div
            className="mixlab-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>🧪 แล็บจำลองเพื่อการเรียนรู้</h2>
            <p>
              ระบบนี้ใช้สำหรับทดลองจับคู่กลุ่มสารเคมีเกษตร 2 ชนิด
              เพื่อตรวจสอบสถานะความเข้ากันได้เบื้องต้นจากผังวิชาการกรมวิชาการเกษตร
              (ฉบับปี 2568)
            </p>
            <ul className="mixlab-modal-list">
              <li>
                <strong>ผล “ผสมกันได้”</strong> ไม่ได้แปลว่าปลอดภัย
                หรือเหมาะกับทุกชนิดพืช หรือใช้อัตราใดก็ได้
              </li>
              <li>
                <strong>สูตรผลิตภัณฑ์</strong>{' '}
                ของแต่ละบริษัทการค้าอาจมีสารช่วยผสมที่ออกฤทธิ์ต่างกัน
              </li>
              <li>
                <strong>การใช้งานจริง</strong> ต้องตรวจสอบทะเบียน อ่านฉลาก
                และปฏิบัติตามคำแนะนำของกรมวิชาการเกษตรหรือผู้ผลิตอย่างเคร่งครัด
              </li>
            </ul>
            <button
              className="mixlab-primary-btn full-width"
              onClick={() => setShowIntroModal(false)}
            >
              เข้าใจแล้ว เริ่มทดลอง
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="mixlab-top-nav">
        <Link to="/public/pesticides" className="mixlab-back-link">
          ← กลับคลังความรู้ยากำจัดศัตรูพืช
        </Link>
        <button
          className="mixlab-outline-btn small"
          onClick={() => setShowIntroModal(true)}
        >
          ℹ️ คำแนะนำความปลอดภัย
        </button>
      </div>

      {/* Page Header */}
      <header className="mixlab-header">
        <div className="mixlab-brand">
          <div>
            <h1>MixLab ห้องทดลองจับคู่สารป้องกันกำจัดศัตรูพืช</h1>
            <p>
              เลือกสาร 2 กลุ่ม เพื่อตรวจสอบผังความเข้ากันได้จากฐานข้อมูล 528
              คู่ผสม (กรมวิชาการเกษตร 2568)
            </p>
          </div>
        </div>

        <div className="mixlab-warning-banner">
          <span className="warning-icon">⚠️</span>
          <div>
            <strong>ข้อควรรู้วิชาการ:</strong>{' '}
            ผังนี้แสดงระดับความเข้ากันได้เชิงเคมีเบื้องต้น
            ห้ามนำไปใช้แทนคำแนะนำบนฉลากจริง ตรวจสอบทะเบียนและสูตรสารก่อนผสมเสมอ
          </div>
        </div>
      </header>

      {/* Main View Mode Selector */}
      <div className="mixlab-tabs-nav">
        <button
          className={`mixlab-nav-tab ${activeTab === 'lab' ? 'active' : ''}`}
          onClick={() => setActiveTab('lab')}
        >
          🔬 โต๊ะทดลอง (Mix Bench)
        </button>
        <button
          className={`mixlab-nav-tab ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          📊 ค้นหาผัง 528 คู่ผสม (Matrix Table)
        </button>
        <button
          className={`mixlab-nav-tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          📜 หมายเหตุวิชาการ 23 ข้อ
        </button>
      </div>

      {/* ================= TAB 1: LAB BENCH ================= */}
      {activeTab === 'lab' && (
        <div className="mixlab-layout">
          {/* Main Lab Panel */}
          <main className="mixlab-main-panel">
            <div className="mixlab-panel-head">
              <h2>โต๊ะทดลองผสมสาร</h2>
              <p>คลิกเลือกสาร A และสาร B จากชั้นวางด้านล่าง หรือกดสุ่มคู่สาร</p>
            </div>

            <div className="mixlab-bench">
              <div className={`mixlab-stage ${isMixing ? 'is-mixing' : ''}`}>
                <div className="mixlab-shelf-line"></div>
                <div className="mixlab-flasks-grid">
                  {/* Slot A */}
                  <div className="mixlab-slot">
                    <div className="mixlab-slot-badge">สาร A</div>
                    <div className={`mixlab-tube ${!chemA ? 'empty' : ''}`}>
                      <svg viewBox="0 0 180 250" className="flask-svg">
                        <defs>
                          <clipPath id="clipPathA">
                            <path d="M58 18h64v27l-15 20v22l43 125c5 15-5 27-21 27H51c-16 0-26-12-21-27L73 87V65L58 45z" />
                          </clipPath>
                        </defs>
                        <path
                          d="M58 18h64v27l-15 20v22l43 125c5 15-5 27-21 27H51c-16 0-26-12-21-27L73 87V65L58 45z"
                          fill="rgba(255,255,255,0.75)"
                          stroke="#475569"
                          strokeWidth="5"
                        />
                        <rect
                          className="flask-liquid"
                          x="20"
                          y={chemA ? '90' : '220'}
                          width="140"
                          height={chemA ? '140' : '0'}
                          fill={
                            chemA?.type === 'insecticide'
                              ? '#3b82f6'
                              : '#10b981'
                          }
                          clipPath="url(#clipPathA)"
                        />
                        <path
                          d="M64 30h52"
                          stroke="#94a3b8"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="mixlab-tube-name">
                        {chemA ? (
                          <>
                            <strong>{chemA.name}</strong>
                            <small>
                              {chemA.type === 'insecticide'
                                ? 'สารกำจัดแมลง'
                                : 'สารป้องกันโรคพืช'}
                            </small>
                          </>
                        ) : (
                          <span className="empty-text">
                            ยังไม่ได้เลือกสาร A
                          </span>
                        )}
                      </div>
                    </div>
                    {chemA && (
                      <button
                        className="mixlab-clear-btn"
                        onClick={() => {
                          setChemA(null);
                          setActiveResult(null);
                        }}
                      >
                        ล้างสาร A
                      </button>
                    )}
                  </div>

                  {/* Mixer Center */}
                  <div className="mixlab-mixer">
                    <div
                      className={`mixlab-mix-icon ${
                        isMixing ? 'spinning' : ''
                      }`}
                    >
                      🧪
                    </div>
                    <button
                      className="mixlab-primary-btn mix-btn"
                      disabled={!chemA || !chemB || isMixing}
                      onClick={handleMix}
                    >
                      {isMixing ? 'กำลังทดลอง...' : 'ทดลองผสม'}
                    </button>
                    <button
                      className="mixlab-secondary-btn"
                      onClick={handleRandomPair}
                    >
                      🎲 สุ่มคู่สาร
                    </button>
                  </div>

                  {/* Slot B */}
                  <div className="mixlab-slot">
                    <div className="mixlab-slot-badge">สาร B</div>
                    <div className={`mixlab-tube ${!chemB ? 'empty' : ''}`}>
                      <svg viewBox="0 0 180 250" className="flask-svg">
                        <defs>
                          <clipPath id="clipPathB">
                            <path d="M58 18h64v27l-15 20v22l43 125c5 15-5 27-21 27H51c-16 0-26-12-21-27L73 87V65L58 45z" />
                          </clipPath>
                        </defs>
                        <path
                          d="M58 18h64v27l-15 20v22l43 125c5 15-5 27-21 27H51c-16 0-26-12-21-27L73 87V65L58 45z"
                          fill="rgba(255,255,255,0.75)"
                          stroke="#475569"
                          strokeWidth="5"
                        />
                        <rect
                          className="flask-liquid"
                          x="20"
                          y={chemB ? '90' : '220'}
                          width="140"
                          height={chemB ? '140' : '0'}
                          fill={
                            chemB?.type === 'insecticide'
                              ? '#f59e0b'
                              : '#8b5cf6'
                          }
                          clipPath="url(#clipPathB)"
                        />
                        <path
                          d="M64 30h52"
                          stroke="#94a3b8"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="mixlab-tube-name">
                        {chemB ? (
                          <>
                            <strong>{chemB.name}</strong>
                            <small>
                              {chemB.type === 'insecticide'
                                ? 'สารกำจัดแมลง'
                                : 'สารป้องกันโรคพืช'}
                            </small>
                          </>
                        ) : (
                          <span className="empty-text">
                            ยังไม่ได้เลือกสาร B
                          </span>
                        )}
                      </div>
                    </div>
                    {chemB && (
                      <button
                        className="mixlab-clear-btn"
                        onClick={() => {
                          setChemB(null);
                          setActiveResult(null);
                        }}
                      >
                        ล้างสาร B
                      </button>
                    )}
                  </div>

                  {/* Side Result Panel (Right next to Flask B) */}
                  <div className="mixlab-result-panel">
                    {activeResult ? (
                      <div
                        className={`mixlab-result-card status-${activeResult.status.replace(
                          /[!*]/g,
                          ''
                        )}`}
                      >
                        <div className="result-header">
                          <div className="result-badge-code">
                            {activeResult.status}
                          </div>
                          <div>
                            <h3 className="result-title">
                              {activeResult.meaning}
                            </h3>
                            <div className="result-pair-name">
                              {activeResult.chemAName} +{' '}
                              {activeResult.chemBName}
                            </div>
                          </div>
                        </div>

                        {activeResult.note &&
                          data?.specificNotes?.[activeResult.note] && (
                            <div className="result-specific-note">
                              <strong>
                                📌 {data.specificNotes[activeResult.note].title}
                                :
                              </strong>
                              <p>
                                {data.specificNotes[activeResult.note].text}
                              </p>
                            </div>
                          )}

                        <div className="result-disclaimer">
                          ℹ️ อ้างอิงตามผังการผสมสารป้องกันกำจัดศัตรูพืช
                          กรมวิชาการเกษตร (ปี 2568)
                        </div>
                      </div>
                    ) : (
                      <div className="mixlab-result-placeholder">
                        <div className="placeholder-icon">🧪</div>
                        <h4>ผลการทดลองผสม</h4>
                        <p>
                          เลือกสาร A และ B จากนั้นกด <strong>"ทดลองผสม"</strong>{' '}
                          เพื่อดูระดับความเข้ากันได้
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Shelf & Search Tools */}
            <div className="mixlab-shelf-tools">
              <div className="mixlab-search-bar">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อสาร ภาษาไทย หรือ English..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mixlab-search-input"
                />
                <button
                  className="mixlab-secondary-btn"
                  onClick={handleResetBench}
                >
                  🔄 เริ่มใหม่
                </button>
              </div>

              <div className="mixlab-category-filter">
                <button
                  className={`filter-btn ${
                    filterType === 'all' ? 'active' : ''
                  }`}
                  onClick={() => setFilterType('all')}
                >
                  ทั้งหมด ({data?.chemicals?.length || 33})
                </button>
                <button
                  className={`filter-btn ${
                    filterType === 'insecticide' ? 'active' : ''
                  }`}
                  onClick={() => setFilterType('insecticide')}
                >
                  🐛 สารกำจัดแมลง (22)
                </button>
                <button
                  className={`filter-btn ${
                    filterType === 'fungicide' ? 'active' : ''
                  }`}
                  onClick={() => setFilterType('fungicide')}
                >
                  🍄 สารป้องกันโรคพืช (11)
                </button>
              </div>

              {/* Chemical Grid */}
              <div className="mixlab-chemical-grid">
                {filteredChemicals.map((chem) => {
                  const isA = chemA?.name === chem.name;
                  const isB = chemB?.name === chem.name;

                  return (
                    <button
                      key={chem.name}
                      className={`mixlab-chem-card ${chem.type} ${
                        isA ? 'selected-a' : ''
                      } ${isB ? 'selected-b' : ''}`}
                      onClick={() => handleSelectChemical(chem)}
                    >
                      <div className="chem-card-content">
                        <strong>{chem.name}</strong>
                        <small>{chem.englishName}</small>
                      </div>
                      {isA && <span className="slot-tag slot-a">สาร A</span>}
                      {isB && <span className="slot-tag slot-b">สาร B</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </main>

          {/* Sidebar */}
          <aside className="mixlab-sidebar">
            {/* Legend Card */}
            <div className="mixlab-side-card">
              <h3>ความหมายของผล</h3>
              <div className="mixlab-legend-list">
                {data?.legend?.map((item) => (
                  <div key={item.status} className="legend-row">
                    <div
                      className="legend-badge"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.status}
                    </div>
                    <div className="legend-text">
                      <strong>{item.label}</strong>
                      <small>{item.desc}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* History Log */}
            <div className="mixlab-side-card">
              <h3>ประวัติการทดลอง ({history.length})</h3>
              <div className="mixlab-history-list">
                {history.length > 0 ? (
                  history.map((h) => (
                    <div key={h.id} className="history-item">
                      <div className="history-pair">
                        <b>
                          {h.chemA} + {h.chemB}
                        </b>
                        <span
                          className={`status-pill status-${h.status.replace(/[!*]/g, '')}`}
                        >
                          {h.status}
                        </span>
                      </div>
                      <small>{h.meaning}</small>
                    </div>
                  ))
                ) : (
                  <div className="history-empty">ยังไม่มีรายการทดลองผสม</div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ================= TAB 2: MATRIX TABLE ================= */}
      {activeTab === 'matrix' && (
        <div className="mixlab-matrix-view">
          <div className="matrix-header">
            <h2>ผังข้อมูลตารางคู่ผสม 528 รายการ</h2>
            <p>ค้นหาและสืบค้นสถานะความเข้ากันได้ของคู่สารทุกคู่ในระบบ</p>
          </div>

          <div className="matrix-filters">
            <input
              type="text"
              placeholder="ค้นหาชื่อสาร A, สาร B หรือสถานะ..."
              value={matrixSearch}
              onChange={(e) => setMatrixSearch(e.target.value)}
              className="mixlab-search-input"
            />
            <select
              value={matrixStatusFilter}
              onChange={(e) => setMatrixStatusFilter(e.target.value)}
              className="mixlab-select"
            >
              <option value="all">ทุกสถานะ (All Status)</option>
              <option value="+">+ ผสมกันได้</option>
              <option value="+!">+! ผสมได้ แต่ต้องระวัง</option>
              <option value="?">? รอคำรับรองผู้ผลิต</option>
              <option value="*n">*n มีหมายเหตุเฉพาะ</option>
              <option value="0">0 ไม่มีความจำเป็นต้องผสม</option>
              <option value="-">- ผสมกันไม่ได้</option>
              <option value="NA">NA ข้อมูลไม่ปรากฏ</option>
            </select>
          </div>

          <div className="matrix-table-wrapper">
            <table className="mixlab-table">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>สาร A</th>
                  <th>สาร B</th>
                  <th>สถานะ</th>
                  <th>ความหมาย / หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatrixPairs.length > 0 ? (
                  filteredMatrixPairs.map((pair, index) => (
                    <tr key={pair.id || index}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{pair.a}</strong>
                      </td>
                      <td>
                        <strong>{pair.b}</strong>
                      </td>
                      <td>
                        <span
                          className={`status-pill status-${pair.status.replace(
                            /[!*]/g,
                            ''
                          )}`}
                        >
                          {pair.status}
                        </span>
                      </td>
                      <td>
                        <div>{pair.meaning}</div>
                        {pair.note && data?.specificNotes?.[pair.note] && (
                          <small className="matrix-specific-note">
                            📌 {data.specificNotes[pair.note].text}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="table-no-data">
                      ไม่พบข้อมูลตามเงื่อนไขการค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ACADEMIC NOTES ================= */}
      {activeTab === 'notes' && (
        <div className="mixlab-notes-view">
          <div className="notes-header">
            <h2>หมายเหตุทั่วไป 17 ถึง 23 และข้อควรระวัง</h2>
            <p>
              สรุปหลักวิชาการสำคัญในการจัดการและผสมสารเคมีกำจัดศัตรูพืช
              กรมวิชาการเกษตร
            </p>
          </div>

          <div className="general-notes-list">
            {data?.generalNotes?.map((note) => (
              <div key={note.id} className="note-accordion-card">
                <button
                  className="note-card-title"
                  onClick={() =>
                    setExpandedNoteId(
                      expandedNoteId === note.id ? null : note.id
                    )
                  }
                >
                  <span>{note.title}</span>
                  <span>{expandedNoteId === note.id ? '➖' : '➕'}</span>
                </button>
                {expandedNoteId === note.id && (
                  <div className="note-card-body">
                    <p>{note.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="notes-source-box">
            <h3>ข้อมูลอ้างอิงทางวิชาการ</h3>
            <p>
              ถอดจาก 2 หน้าท้ายของเอกสารวิชาการ{' '}
              <strong>
                “คำแนะนำการใช้สารป้องกันกำจัดศัตรูพืชจากงานวิจัย ปี 2568”
              </strong>{' '}
              โดยกรมวิชาการเกษตร (ฉบับปรับปรุงเดือนสิงหาคม 2564)
            </p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && <div className="mixlab-toast">{toastMsg}</div>}
    </div>
  );
}

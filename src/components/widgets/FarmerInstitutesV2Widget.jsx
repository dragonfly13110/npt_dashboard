import { useEffect, useMemo, useState } from 'react';
import { BarChartOutlined, ReloadOutlined, SearchOutlined, TeamOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { barOption } from '../charts/echartOptions';
import { supabase } from '../../supabaseClient';
import { useApiCache } from '../../hooks/useApiCache';
import EChart from './EChart';
import {
    INSTITUTE_V2_TYPES,
    createFarmerGroupsRows,
    filterInstituteV2Rows,
    getInstituteV2Options,
    summarizeInstituteV2Rows,
} from '../../utils/farmerInstitutesV2';

const number = new Intl.NumberFormat('th-TH');
const DEFAULT_TYPE = 'large_plots';
const NPT_DISTRICTS = [
    'เมืองนครปฐม',
    'กำแพงแสน',
    'นครชัยศรี',
    'ดอนตูม',
    'บางเลน',
    'สามพราน',
    'พุทธมณฑล',
];

async function fetchInstituteV2Data() {
    const [
        largePlots,
        communityEnterprises,
        housewifeGroups,
        youngFarmerGroups,
        careerGroups,
        smartFarmers,
        youngSmartFarmers,
    ] = await Promise.all([
        supabase.from('large_plots').select('id, plot_name, commodity, district, subdistrict, member_count, area_rai, commodity_group, year, code, agency').order('year', { ascending: false }),
        supabase.from('community_enterprises').select('id, enterprise_type, enterprise_name, approval_date, district, subdistrict, village_no, member_count, level').order('id', { ascending: false }),
        supabase.from('housewife_farmer_groups').select('id,year,group_name,district,subdistrict,member_count,income,fund_management,activity,production_standard,potential_level,model_group,community_enterprise_registration').order('year', { ascending: false }),
        supabase.from('young_farmer_groups_detailed').select('id,data_year,group_name,district,subdistrict,member_count,income,fund_management,activity,potential_level,model_group').order('data_year', { ascending: false }),
        supabase.from('agricultural_career_groups').select('id,data_year,group_name,district,subdistrict,member_count,income,fund_management,activity,main_activity,production_standard,potential_level,community_enterprise_registration').order('data_year', { ascending: false }),
        supabase.from('smart_farmer_sf').select('id,data_year,record_code,sequence_no,district,agricultural_activity,production_standard,farmer_status,production_area').order('data_year', { ascending: false }),
        supabase.from('young_smart_farmer_ysf').select('id,data_year,record_code,sequence_no,district,agricultural_activity,production_standard,farmer_status,farm_area_rai,main_activity_type').order('data_year', { ascending: false }),
    ]);

    const failures = [largePlots, communityEnterprises, housewifeGroups, youngFarmerGroups, careerGroups, smartFarmers, youngSmartFarmers]
        .filter((result) => result.error)
        .map((result) => result.error.message);
    if (failures.length) throw new Error(failures.join(', '));

    return createFarmerGroupsRows({
        largePlots: largePlots.data || [],
        communityEnterprises: communityEnterprises.data || [],
        housewifeGroups: housewifeGroups.data || [],
        youngFarmerGroups: youngFarmerGroups.data || [],
        careerGroups: careerGroups.data || [],
        smartFarmers: smartFarmers.data || [],
        youngSmartFarmers: youngSmartFarmers.data || [],
    });
}

function StatPill({ label, value, tone = '#16a34a' }) {
    return (
        <div className="inst-v2-stat" style={{ '--tone': tone }}>
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function getStatCards(summary, activeType) {
    const isIndividual = activeType.key === 'smart_farmer_sf' || activeType.key === 'young_smart_farmer_ysf';
    if (isIndividual) {
        return [
            {
                label: 'จำนวนเกษตรกร',
                value: `${number.format(summary.totalRows)} คน`,
                tone: '#2563eb',
            },
            {
                label: 'อำเภอที่มีข้อมูล',
                value: `${number.format(summary.districtCount)} อำเภอ`,
                tone: '#16a34a',
            },
            {
                label: 'กิจกรรมเกษตร',
                value: `${number.format(summary.activityCount)} ประเภท`,
                tone: activeType.color,
            },
            {
                label: 'มาตรฐานเกษตร',
                value: `${number.format(summary.standardCount)} ประเภท`,
                tone: '#0f766e',
            },
        ];
    }
    return [
        {
            label: `จำนวน${activeType.unit}`,
            value: `${number.format(summary.totalRows)} ${activeType.unit}`,
            tone: '#2563eb',
        },
        {
            label: 'สมาชิกรวม',
            value: `${number.format(summary.totalMembers)} คน`,
            tone: '#16a34a',
        },
        {
            label: 'สมาชิกเฉลี่ย',
            value: `${number.format(Math.round(summary.averageMembers))} คน/${activeType.unit}`,
            tone: activeType.color,
        },
        {
            label: 'อำเภอที่มีข้อมูล',
            value: `${number.format(summary.districtCount)} อำเภอ`,
            tone: '#9333ea',
        },
    ];
}

export default function FarmerInstitutesV2Widget() {
    const { data: rows = [], isLoading, error, refetch } = useApiCache('farmer-groups-institutes-widget', fetchInstituteV2Data, {
        staleMinutes: 10,
        cacheMinutes: 60,
    });
    const [selectedYear, setSelectedYear] = useState('latest');
    const [selectedDistrict, setSelectedDistrict] = useState('all');
    const [selectedType, setSelectedType] = useState(DEFAULT_TYPE);
    const [search, setSearch] = useState('');
    const [displayLimit, setDisplayLimit] = useState(12);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        setDisplayLimit(12);
    }, [selectedYear, selectedDistrict, selectedType, search]);

    const activeTypeRows = useMemo(() => rows.filter((row) => row.typeKey === selectedType), [rows, selectedType]);
    const activeOptions = useMemo(() => getInstituteV2Options(activeTypeRows, INSTITUTE_V2_TYPES), [activeTypeRows]);
    const latestYear = activeOptions.years[0] || 'all';
    const effectiveYear = selectedYear === 'latest' ? latestYear : selectedYear;
    const activeYearRows = useMemo(() => (
        effectiveYear === 'all' ? activeTypeRows : activeTypeRows.filter((row) => row.year === effectiveYear)
    ), [activeTypeRows, effectiveYear]);
    const districtOptions = useMemo(() => {
        const available = new Set(activeYearRows.map((row) => row.district).filter(Boolean));
        const npt = NPT_DISTRICTS.filter((district) => available.has(district));
        const other = [...available]
            .filter((district) => !NPT_DISTRICTS.includes(district))
            .sort((a, b) => String(a).localeCompare(String(b), 'th'));
        return [...npt, ...other];
    }, [activeYearRows]);

    useEffect(() => {
        setSelectedYear('latest');
        setSelectedDistrict('all');
        setSearch('');
    }, [selectedType]);

    useEffect(() => {
        if (selectedDistrict !== 'all' && !districtOptions.includes(selectedDistrict)) {
            setSelectedDistrict('all');
        }
    }, [districtOptions, selectedDistrict]);

    const filteredRows = useMemo(() => filterInstituteV2Rows(rows, {
        year: effectiveYear,
        district: selectedDistrict,
        typeKey: selectedType,
        search,
    }), [effectiveYear, rows, search, selectedDistrict, selectedType]);

    const summary = useMemo(() => summarizeInstituteV2Rows(filteredRows), [filteredRows]);
    const totalSummary = useMemo(() => summarizeInstituteV2Rows(rows), [rows]);
    const activeType = INSTITUTE_V2_TYPES.find((type) => type.key === selectedType) || INSTITUTE_V2_TYPES[0];
    const hasActiveFilter = selectedYear !== 'latest' || selectedDistrict !== 'all' || search.trim();
    const statCards = useMemo(() => getStatCards(summary, activeType), [activeType, summary]);

    return (
        <section className={`inst-v2-widget bento-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`} style={{ gridArea: 'fi2' }}>
            <div className="inst-v2-head" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setIsExpanded(!isExpanded)}>
                <div>
                    <div className="inst-v2-eyebrow"><TeamOutlined /> ข้อมูลเกษตรกรและสถาบันเกษตรกร</div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        การพัฒนาเกษตรกรและกลุ่ม/สถาบันเกษตรกร
                        <span style={{ fontSize: '16px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {isExpanded ? <UpOutlined /> : <DownOutlined />}
                            <small style={{ fontSize: '11px', fontWeight: 'normal', color: '#94a3b8' }}>
                                ({isExpanded ? 'คลิกเพื่อย่อกลับ' : 'คลิกเพื่อขยายรายละเอียด'})
                            </small>
                        </span>
                    </h3>
                    <p>รวม แปลงใหญ่, วิสาหกิจชุมชน, กลุ่มแม่บ้าน, ยุวเกษตรกร, กลุ่มส่งเสริมอาชีพ, Smart Farmer และ YSF</p>
                </div>
                <button type="button" className="inst-v2-refresh" onClick={(e) => { e.stopPropagation(); refetch(); }} aria-label="โหลดข้อมูลใหม่">
                    <ReloadOutlined spin={isLoading} />
                </button>
            </div>

            {error ? (
                <div className="inst-v2-empty">โหลดข้อมูลไม่ได้: {error.message}</div>
            ) : (
                <>
                    <div className="inst-v2-type-tabs" role="tablist" aria-label="ประเภทข้อมูลกลุ่มและสถาบันเกษตรกร">
                        {INSTITUTE_V2_TYPES.map((type) => {
                            const typeRows = rows.filter((row) => row.typeKey === type.key);
                            const typeTotal = totalSummary.byType.find((item) => item.name === type.label)?.count || typeRows.length;
                            const isSelected = selectedType === type.key;
                            return (
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={isSelected}
                                    key={type.key}
                                    className={isSelected ? 'is-active' : ''}
                                    style={{ '--tone': type.color }}
                                    onClick={() => setSelectedType(type.key)}
                                >
                                    <span>{type.label}</span>
                                    <strong>{number.format(typeTotal)}</strong>
                                </button>
                            );
                        })}
                    </div>

                    <div className="inst-v2-active-title" style={{ '--tone': activeType.color }}>
                        <span>{activeType.label}</span>
                        <strong>{isLoading ? '...' : `${number.format(activeTypeRows.length)} ${activeType.unit}`}</strong>
                    </div>

                    <div className="inst-v2-toolbar">
                        <label>
                            <span>ปี</span>
                            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value === 'latest' || event.target.value === 'all' ? event.target.value : Number(event.target.value))}>
                                <option value="latest">ปีล่าสุด{latestYear !== 'all' ? ` (${latestYear})` : ''}</option>
                                <option value="all">ทุกปี</option>
                                {activeOptions.years.map((year) => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </label>
                        <label>
                            <span>อำเภอ</span>
                            <select value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)}>
                                <option value="all">ทุกอำเภอ</option>
                                {districtOptions.map((district) => <option key={district} value={district}>{district}</option>)}
                            </select>
                        </label>
                        <label className="inst-v2-search">
                            <span>ค้นหา</span>
                            <div>
                                <SearchOutlined />
                                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ชื่อกลุ่ม / กิจกรรม / มาตรฐาน / รหัส" />
                            </div>
                        </label>
                        {hasActiveFilter && (
                            <button type="button" className="inst-v2-clear" onClick={() => {
                                setSelectedYear('latest');
                                setSelectedDistrict('all');
                                setSearch('');
                            }}>
                                ล้างตัวกรอง
                            </button>
                        )}
                    </div>

                    <div className="inst-v2-stats">
                        {statCards.map((card) => (
                            <StatPill
                                key={card.label}
                                label={card.label}
                                value={isLoading ? '...' : card.value}
                                tone={card.tone}
                            />
                        ))}
                    </div>

                    <div className={`inst-v2-body ${!isExpanded ? 'is-collapsed' : ''}`}>
                        <div className="inst-v2-chart">
                            <div className="inst-v2-section-title"><BarChartOutlined /> สรุปตามอำเภอ</div>
                            {summary.byDistrict.length ? (
                                <EChart
                                    option={barOption(
                                        summary.byDistrict.slice(0, 8),
                                        [{ key: 'count', name: 'รายการ', color: activeType.color }],
                                        { layout: 'vertical', unit: 'รายการ', grid: { top: 8, right: 18, bottom: 8, left: 126 } }
                                    )}
                                    style={{ height: 260 }}
                                />
                            ) : (
                                <div className="inst-v2-empty">ไม่พบข้อมูลตามตัวกรอง</div>
                            )}
                            <div className="inst-v2-district-chips">
                                {summary.byDistrict.slice(0, 10).map((district) => (
                                    <button
                                        type="button"
                                        key={district.name}
                                        className={selectedDistrict === district.name ? 'is-active' : ''}
                                        onClick={() => setSelectedDistrict(selectedDistrict === district.name ? 'all' : district.name)}
                                    >
                                        {district.name} <strong>{number.format(district.count)}</strong>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="inst-v2-list">
                            <div className="inst-v2-section-title">
                                รายละเอียด ({number.format(filteredRows.length)} รายการ)
                            </div>
                            {(selectedType === 'smart_farmer_sf' || selectedType === 'young_smart_farmer_ysf') && (
                                <div className="inst-v2-privacy-note" style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px', marginBottom: '10px' }}>
                                    🔒 ซ่อนชื่อ-นามสกุลในหน้า public เพื่อคุ้มครองข้อมูลส่วนบุคคล (PDPA)
                                </div>
                            )}
                            {isLoading ? (
                                <div className="inst-v2-empty">กำลังโหลดข้อมูล...</div>
                            ) : filteredRows.length ? (
                                <>
                                    {filteredRows.slice(0, displayLimit).map((row) => (
                                        <article key={row.id} className="inst-v2-item" style={{ '--tone': row.typeColor }}>
                                            <div className="inst-v2-item-main">
                                                <span>{row.typeLabel}</span>
                                                <strong>{row.name}</strong>
                                                <p>{row.district}{row.subdistrict ? ` / ${row.subdistrict}` : ''}{row.activity ? ` • ${row.activity}` : ''}</p>
                                            </div>
                                            <div className="inst-v2-item-side">
                                                <strong>{number.format(row.metricValue)}</strong>
                                                <span>{row.metricLabel}</span>
                                                {row.year && <small>{row.year}</small>}
                                            </div>
                                        </article>
                                    ))}
                                    {filteredRows.length > displayLimit && (
                                        <button type="button" className="inst-v2-more" onClick={() => setDisplayLimit((value) => value + 12)}>
                                            โหลดเพิ่มอีก {number.format(Math.min(12, filteredRows.length - displayLimit))} รายการ
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="inst-v2-empty">ไม่พบข้อมูลตามตัวกรอง</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}

import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  AlertOutlined,
  BarChartOutlined,
  CloudOutlined,
  CopyOutlined,
  DollarOutlined,
  FilePdfOutlined,
  FireOutlined,
  ReloadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useDashboardData } from '../hooks/useDashboardData';
import { useApiCache } from '../hooks/useApiCache';
import { supabase } from '../supabaseClient';
import EChart from '../components/widgets/EChart';
import budgetSeed from '../data/budgetRound2_2569.json';
import './SituationRoom.css';

const { Text, Title } = Typography;
const AI_PROXY_URL = '/.netlify/functions/ai-proxy';
const GEMINI_SITUATION_MODEL = 'gemini-3.1-flash-lite';

const DISTRICT_CENTROIDS = [
  { name: 'เมืองนครปฐม', lat: 13.82, lon: 100.04 },
  { name: 'กำแพงแสน', lat: 14.01, lon: 99.98 },
  { name: 'บางเลน', lat: 14.02, lon: 100.17 },
  { name: 'ดอนตูม', lat: 13.98, lon: 100.08 },
  { name: 'นครชัยศรี', lat: 13.8, lon: 100.18 },
  { name: 'สามพราน', lat: 13.72, lon: 100.22 },
  { name: 'พุทธมณฑล', lat: 13.78, lon: 100.32 },
];

const money = (value) => Number(value || 0).toLocaleString('th-TH');
const pct = (value) =>
  Math.max(0, Math.min(100, Math.round(Number(value || 0) * 10) / 10));

function parseNotes(notes) {
  if (!notes || typeof notes !== 'string') return {};
  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { detail: notes };
  }
}

function normalizeBudgetStatus(status) {
  if (status === 'ส่งเบิกแล้ว') return 'ส่งเบิกแล้ว';
  if (['เสร็จสิ้น', 'เบิกจ่ายแล้ว', 'เบิกจ่ายเสร็จสิ้น'].includes(status))
    return 'เบิกจ่ายเสร็จสิ้น';
  return 'กำลังดำเนินการ';
}

function parseBudgetRow(row) {
  const notes = parseNotes(row.notes);
  return {
    id: row.id,
    project: notes.project || row.project_name || 'รายการงบประมาณ',
    district: notes.district || 'ไม่ระบุพื้นที่',
    budget: Number(row.budget_amount ?? notes.budget ?? 0),
    spent: Number(row.spent_amount ?? notes.spentAmount ?? 0),
    fiscalYear: Number(
      row.fiscal_year || notes.fiscalYear || budgetSeed.meta.fiscalYear || 0
    ),
    round: Number(
      row.budget_round || notes.round || budgetSeed.meta.round || 0
    ),
    status: normalizeBudgetStatus(row.status || notes.status),
  };
}

async function maybeData(query) {
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

async function fetchExecutiveSignals() {
  const [budgets, requests, assignments, hotspots, registry] =
    await Promise.all([
      maybeData(
        supabase
          .from('budgets')
          .select(
            'id,project_name,budget_amount,spent_amount,status,notes,fiscal_year,budget_round,created_at,updated_at,source_file'
          )
      ),
      maybeData(
        supabase
          .from('data_requests')
          .select('id,title,status,created_at')
          .order('created_at', { ascending: false })
          .limit(20)
      ),
      maybeData(supabase.from('data_request_assignments').select('id,status')),
      maybeData(
        supabase
          .from('fire_hotspots')
          .select('district,confidence,frp,acq_date')
          .order('acq_date', { ascending: false })
          .limit(200)
      ),
      maybeData(
        supabase
          .from('farmer_registry')
          .select(
            'district,data_year,target,total_updated_households,total_updated_area_rai,cutoff_date'
          )
          .order('data_year', { ascending: false })
          .order('district')
      ),
    ]);

  return { budgets, requests, assignments, hotspots, registry };
}

async function fetchWeatherRisk() {
  const results = await Promise.all(
    DISTRICT_CENTROIDS.map(async (district) => {
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}&longitude=${district.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max&forecast_days=3&timezone=Asia%2FBangkok`;
        const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${district.lat}&longitude=${district.lon}&current=pm2_5,european_aqi`;
        const [weatherRes, airRes] = await Promise.all([
          fetch(weatherUrl),
          fetch(airUrl),
        ]);
        if (!weatherRes.ok || !airRes.ok)
          throw new Error('weather unavailable');
        const weather = await weatherRes.json();
        const air = await airRes.json();
        const rainTotal = (weather.daily?.precipitation_sum || []).reduce(
          (sum, value) => sum + Number(value || 0),
          0
        );
        const rainProbability = Math.max(
          ...(weather.daily?.precipitation_probability_max || [0]).map(
            (value) => Number(value || 0)
          )
        );
        const pm25 = Number(air.current?.pm2_5 || 0);
        return {
          ...district,
          temp: Number(weather.current?.temperature_2m || 0),
          humidity: Number(weather.current?.relative_humidity_2m || 0),
          wind: Number(weather.current?.wind_speed_10m || 0),
          rainTotal,
          rainProbability,
          pm25,
          riskScore:
            (rainProbability >= 70 ? 2 : 0) +
            (rainTotal >= 20 ? 2 : 0) +
            (pm25 >= 37.5 ? 2 : pm25 >= 25 ? 1 : 0),
        };
      } catch {
        return {
          ...district,
          temp: 0,
          humidity: 0,
          wind: 0,
          rainTotal: 0,
          rainProbability: 0,
          pm25: 0,
          riskScore: 0,
        };
      }
    })
  );

  const valid = results.filter(
    (item) => item.temp || item.pm25 || item.rainTotal
  );
  const divisor = valid.length || 1;
  return {
    districts: results.sort((a, b) => b.riskScore - a.riskScore),
    avgTemp: valid.reduce((sum, item) => sum + item.temp, 0) / divisor,
    avgPm25: valid.reduce((sum, item) => sum + item.pm25, 0) / divisor,
    maxRainProbability: Math.max(
      ...results.map((item) => item.rainProbability),
      0
    ),
    maxRainTotal: Math.max(...results.map((item) => item.rainTotal), 0),
  };
}

function buildBudgetSummary(rows) {
  const parsedRows = rows.length ? rows.map(parseBudgetRow) : [];
  const latestFiscalYear = parsedRows.reduce(
    (latest, row) => Math.max(latest, Number(row.fiscalYear || 0)),
    0
  );
  const fiscalRows = latestFiscalYear
    ? parsedRows.filter(
        (row) => Number(row.fiscalYear || 0) === latestFiscalYear
      )
    : parsedRows;
  const latestRound = fiscalRows.reduce(
    (latest, row) => Math.max(latest, Number(row.round || 0)),
    0
  );
  const currentRows = latestRound
    ? fiscalRows.filter((row) => Number(row.round || 0) === latestRound)
    : fiscalRows;
  const fallbackTotal = Number(budgetSeed?.meta?.totalBudget || 0);
  const totalBudget = currentRows.length
    ? currentRows.reduce((sum, row) => sum + row.budget, 0)
    : fallbackTotal;
  const totalSpent = currentRows.reduce((sum, row) => sum + row.spent, 0);
  const statusCounts = currentRows.reduce((map, row) => {
    map[row.status] = (map[row.status] || 0) + 1;
    return map;
  }, {});
  const topProjects = currentRows.length
    ? [...currentRows].sort((a, b) => b.budget - a.budget).slice(0, 5)
    : (budgetSeed.projectSummary || []).slice(0, 5).map((item) => ({
        project: item.project,
        district: 'แผนจังหวัด',
        budget: item.budget,
        spent: 0,
        status: 'รอติดตามผลเบิกจ่าย',
      }));

  return {
    rows: currentRows,
    fiscalYear: latestFiscalYear || Number(budgetSeed?.meta?.fiscalYear || 0),
    round: latestRound || Number(budgetSeed?.meta?.round || 0),
    totalBudget,
    totalSpent,
    progress: totalBudget ? pct((totalSpent / totalBudget) * 100) : 0,
    statusCounts,
    topProjects,
  };
}

function buildRegistrySummary(rows) {
  const years = rows
    .map((row) => Number(row.data_year))
    .filter(Number.isFinite);
  const activeYear = years.length ? Math.max(...years) : null;
  const activeRows = activeYear
    ? rows.filter((row) => Number(row.data_year) === activeYear)
    : rows;
  const districtRows = activeRows.filter(
    (row) => !['จังหวัดนครปฐม', 'นครปฐม'].includes(row.district)
  );
  const provinceRow = activeRows.find((row) =>
    ['จังหวัดนครปฐม', 'นครปฐม'].includes(row.district)
  );

  const target =
    Number(provinceRow?.target) ||
    districtRows.reduce((sum, row) => sum + (Number(row.target) || 0), 0);
  const updated =
    Number(provinceRow?.total_updated_households) ||
    districtRows.reduce(
      (sum, row) => sum + (Number(row.total_updated_households) || 0),
      0
    );
  const area =
    Number(provinceRow?.total_updated_area_rai) ||
    districtRows.reduce(
      (sum, row) => sum + (Number(row.total_updated_area_rai) || 0),
      0
    );
  const latestCutoff = activeRows
    .map((row) => row.cutoff_date)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    activeYear,
    target,
    updated,
    area,
    latestCutoff,
    progress: target > 0 ? pct((updated / target) * 100) : 0,
    remaining: target > 0 ? Math.max(target - updated, 0) : null,
  };
}

function buildDistrictRanking(districtStats, hotspots) {
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 7);
  const recentHotspots = hotspots.filter((row) => {
    if (!row.acq_date) return false;
    return new Date(row.acq_date) >= recentCutoff;
  });
  const hotspotCounts = recentHotspots.reduce((map, row) => {
    const name = row.district || 'ไม่ระบุ';
    map[name] = (map[name] || 0) + 1;
    return map;
  }, {});

  return Object.entries(districtStats || {})
    .map(([name, stats]) => {
      const fire = Number(hotspotCounts[name] || 0);
      const pestArea = Number(stats.pestArea || 0);
      const disasterArea = Number(stats.disasterArea || 0);
      const score =
        fire * 8 +
        pestArea / 120 +
        disasterArea / 150 +
        Number(stats.lp || 0) / 2 +
        Number(stats.ce || 0) / 4;
      return {
        name,
        area: Number(stats.area || 0),
        households: Number(stats.house || 0),
        ce: Number(stats.ce || 0),
        lp: Number(stats.lp || 0),
        fire,
        pestArea,
        disasterArea,
        score: Math.round(score),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function buildAlerts({
  weatherRisk,
  budget,
  pendingRequests,
  pendingAssignments,
  ranking,
}) {
  const alerts = [];
  const topDistrict = ranking[0];
  const topWeather = weatherRisk.districts[0];

  if (
    topDistrict &&
    (topDistrict.fire > 0 ||
      topDistrict.pestArea > 0 ||
      topDistrict.disasterArea > 0)
  ) {
    alerts.push({
      level: 'critical',
      title: `พื้นที่ต้องติดตาม: ${topDistrict.name}`,
      detail: `จุดความร้อน ${topDistrict.fire.toLocaleString()} จุด, พื้นที่ศัตรูพืช ${(topDistrict.pestArea || 0).toLocaleString()} ไร่`,
    });
  }
  if (topWeather?.riskScore > 0) {
    alerts.push({
      level: topWeather.riskScore >= 4 ? 'critical' : 'warning',
      title: `สภาพอากาศเสี่ยง: ${topWeather.name}`,
      detail: `โอกาสฝน ${topWeather.rainProbability}% / PM2.5 ${topWeather.pm25.toFixed(1)} µg/m³`,
    });
  }
  if (budget.totalBudget > 0 && budget.progress < 60) {
    alerts.push({
      level: 'warning',
      title: 'ความคืบหน้างบประมาณยังต่ำกว่า 60%',
      detail: `เบิกจ่าย ${budget.progress}% จากงบรวม ${money(budget.totalBudget)} บาท`,
    });
  }
  if (pendingRequests > 0 || pendingAssignments > 0) {
    alerts.push({
      level: 'info',
      title: 'มีคำขอข้อมูลที่ยังต้องติดตาม',
      detail: `คำขอเปิดอยู่ ${pendingRequests} รายการ / assignment รอส่ง ${pendingAssignments} รายการ`,
    });
  }
  alerts.push({
    level: 'success',
    title: 'ข้อมูลภาพรวมพร้อมใช้สำหรับ briefing',
    detail: `ครอบคลุม ${Object.keys(ranking || {}).length || DISTRICT_CENTROIDS.length} อำเภอ พร้อมข้อมูลพื้นที่ กลุ่ม และแปลงใหญ่`,
  });

  return alerts.slice(0, 5);
}

function buildRecommendedActions({
  weatherRisk,
  budget,
  pendingRequests,
  ranking,
}) {
  const actions = [];
  const topDistrict = ranking[0];
  const topWeather = weatherRisk.districts[0];

  if (
    topDistrict &&
    (topDistrict.fire > 0 ||
      topDistrict.pestArea > 0 ||
      topDistrict.disasterArea > 0)
  ) {
    actions.push(
      `ให้กลุ่มอารักขาพืชตรวจสอบ ${topDistrict.name} ก่อน โดยดูจุดความร้อนและพื้นที่ศัตรูพืชเป็นลำดับแรก`
    );
  }
  if (topWeather?.rainProbability >= 60) {
    actions.push(
      `แจ้งอำเภอ ${topWeather.name} เตรียมแผนสื่อสารความเสี่ยงฝนและติดตามพื้นที่เสี่ยงน้ำขัง`
    );
  }
  if (budget.progress < 75) {
    actions.push(
      'เร่งทบทวนรายการงบที่ยังไม่ส่งเบิกและนัดเจ้าของโครงการอัปเดตสถานะภายในสัปดาห์นี้'
    );
  }
  if (pendingRequests > 0) {
    actions.push(
      'มอบหมายเจ้าของคำขอข้อมูลที่ยังเปิดอยู่ และกำหนดเส้นตายตอบกลับให้ชัดเจน'
    );
  }
  actions.push(
    'ใช้รายงานผู้บริหารชุดนี้เป็นวาระเปิดประชุม: สถานการณ์เสี่ยง, งบ, คำขอข้อมูล, และพื้นที่ต้องติดตาม'
  );
  return actions.slice(0, 5);
}

function buildPrompt(snapshot) {
  return `คุณคือผู้ช่วยวิเคราะห์สถานการณ์สำหรับผู้บริหารสำนักงานเกษตรจังหวัดนครปฐม
สรุปเป็นภาษาไทยแบบสั้นมาก ตรงประเด็น ไม่เปิดเผยข้อมูลส่วนบุคคล

ข้อมูลวันนี้:
${JSON.stringify(snapshot, null, 2)}

ตอบกลับไม่เกิน 5 บรรทัด:
1. ภาพรวมวันนี้ 1 บรรทัด
2. จุดที่ต้องจับตา 2 ข้อ
3. งานที่ควรมอบหมาย 2 ข้อ`;
}

function buildGenerationConfig(model) {
  const base = {
    temperature: 0.25,
    maxOutputTokens: 700,
  };

  if (model.includes('flash-lite') || model.startsWith('gemini-1.5')) {
    return base;
  }

  if (model.startsWith('gemini-2.5')) {
    return {
      ...base,
      thinkingConfig: { thinkingBudget: 256 },
    };
  }

  return {
    ...base,
    thinkingConfig: { thinkingLevel: 'low' },
  };
}

function extractGeminiText(payload) {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim() || ''
  );
}

function weatherRiskOption(data) {
  return {
    color: ['#38bdf8', '#fb923c', '#10b981'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      type: 'scroll',
      bottom: 0,
      textStyle: { color: '#475569', fontSize: 10 },
    },
    grid: { top: 20, right: 42, bottom: 50, left: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLabel: { color: '#64748b', fontSize: 10, interval: 0 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '% / µg',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#eef2f7', type: 'dashed' } },
      },
      {
        type: 'value',
        name: 'มม.',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        type: 'bar',
        name: 'โอกาสฝน (%)',
        data: data.map((item) => item.rainProbability || 0),
        itemStyle: { color: '#38bdf8', borderRadius: [4, 4, 0, 0] },
      },
      {
        type: 'bar',
        name: 'ฝุ่น PM2.5 (µg)',
        data: data.map((item) => item.pm25 || 0),
        itemStyle: { color: '#fb923c', borderRadius: [4, 4, 0, 0] },
      },
      {
        type: 'line',
        yAxisIndex: 1,
        name: 'ฝนรวม (มม.)',
        data: data.map((item) => item.rainTotal || 0),
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { color: '#10b981', width: 2.5 },
        itemStyle: { color: '#10b981' },
      },
    ],
  };
}

function isCompleteBriefing(text) {
  if (!text) return false;
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length >= 80 && /\p{L}/u.test(normalized);
}

async function callGeminiSituationModel(model, snapshot) {
  const response = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'gemini',
      body: {
        model,
        contents: [{ role: 'user', parts: [{ text: buildPrompt(snapshot) }] }],
        generationConfig: buildGenerationConfig(model),
      },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `AI briefing unavailable (${response.status}) ${body.slice(0, 180)}`
    );
  }
  const payload = await response.json();
  const text = extractGeminiText(payload);
  if (!isCompleteBriefing(text)) {
    const finishReason = payload.candidates?.[0]?.finishReason || 'UNKNOWN';
    throw new Error(
      `incomplete response (${finishReason}): ${text.slice(0, 80) || 'empty'}`
    );
  }
  return text;
}

async function callSituationAi(snapshot) {
  const text = await callGeminiSituationModel(GEMINI_SITUATION_MODEL, snapshot);
  return { text, model: GEMINI_SITUATION_MODEL };
}

function riskLabel(item, index) {
  if (index === 0 || item.fire > 0 || item.score >= 20)
    return { text: 'เสี่ยงสูง', color: 'red' };
  if (index < 3 || item.pestArea > 0 || item.score >= 10)
    return { text: 'ต้องติดตาม', color: 'orange' };
  return { text: 'เฝ้าระวัง', color: 'blue' };
}

export default function SituationRoom() {
  const reportRef = useRef(null);
  const {
    stats,
    loading: dashboardLoading,
    districtStats,
    lpStats,
    agriStats,
    instituteStats,
  } = useDashboardData();
  const {
    data: signals = {},
    isLoading: signalsLoading,
    refetch: refetchSignals,
  } = useApiCache('executive-situation-signals', fetchExecutiveSignals, {
    staleMinutes: 5,
  });
  const {
    data: weatherRisk = {
      districts: [],
      avgTemp: 0,
      avgPm25: 0,
      maxRainProbability: 0,
      maxRainTotal: 0,
    },
    isLoading: weatherLoading,
    refetch: refetchWeather,
  } = useApiCache('executive-weather-risk', fetchWeatherRisk, {
    staleMinutes: 10,
  });
  const [aiBriefing, setAiBriefing] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const budget = useMemo(
    () => buildBudgetSummary(signals.budgets || []),
    [signals.budgets]
  );
  const registry = useMemo(
    () => buildRegistrySummary(signals.registry || []),
    [signals.registry]
  );
  const ranking = useMemo(
    () => buildDistrictRanking(districtStats, signals.hotspots || []),
    [districtStats, signals.hotspots]
  );
  const pendingRequests = useMemo(
    () =>
      (signals.requests || []).filter(
        (item) => item.status === 'published' || item.status === 'draft'
      ).length,
    [signals.requests]
  );
  const pendingAssignments = useMemo(
    () =>
      (signals.assignments || []).filter((item) => item.status !== 'submitted')
        .length,
    [signals.assignments]
  );
  const totalRecords = useMemo(
    () => (stats || []).reduce((sum, item) => sum + Number(item.count || 0), 0),
    [stats]
  );
  const situationLoading = dashboardLoading || signalsLoading || weatherLoading;

  const alerts = useMemo(
    () =>
      buildAlerts({
        weatherRisk,
        budget,
        pendingRequests,
        pendingAssignments,
        ranking,
      }),
    [budget, pendingAssignments, pendingRequests, ranking, weatherRisk]
  );
  const actions = useMemo(
    () =>
      buildRecommendedActions({
        weatherRisk,
        budget,
        pendingRequests,
        ranking,
      }),
    [budget, pendingRequests, ranking, weatherRisk]
  );
  const decisionItems = useMemo(
    () =>
      alerts.map((alert, index) => ({
        ...alert,
        action: actions[index] || actions[actions.length - 1],
      })),
    [actions, alerts]
  );
  const snapshot = useMemo(
    () => ({
      generatedAt: new Date().toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
      }),
      totalRecords,
      agriculture: {
        households: agriStats.households || 0,
        cropAreaRai: agriStats.crop_area || 0,
        largePlots: lpStats.total || 0,
        farmerInstituteGroups: instituteStats.total || 0,
      },
      weather: {
        avgTemp: Number(weatherRisk.avgTemp || 0).toFixed(1),
        avgPm25: Number(weatherRisk.avgPm25 || 0).toFixed(1),
        maxRainProbability: weatherRisk.maxRainProbability || 0,
        maxRainTotal: Number(weatherRisk.maxRainTotal || 0).toFixed(1),
        highestRiskDistrict: weatherRisk.districts?.[0]?.name || '-',
      },
      budget: {
        totalBudget: budget.totalBudget,
        totalSpent: budget.totalSpent,
        progress: budget.progress,
      },
      registry: {
        activeYear: registry.activeYear,
        target: registry.target,
        updated: registry.updated,
        progress: registry.progress,
        remaining: registry.remaining,
      },
      pendingRequests,
      pendingAssignments,
      topDistricts: ranking.slice(0, 3),
      alerts: alerts.map(({ title, detail }) => ({ title, detail })),
      recommendedActions: actions,
    }),
    [
      actions,
      agriStats,
      alerts,
      budget,
      instituteStats,
      lpStats,
      pendingAssignments,
      pendingRequests,
      ranking,
      registry,
      totalRecords,
      weatherRisk,
    ]
  );

  const handleRefresh = () => {
    refetchSignals();
    refetchWeather();
  };

  const handleGenerateReport = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const { text, model } = await callSituationAi(snapshot);
      setAiBriefing(`${text}\n\nใช้โมเดล: ${model}`);
    } catch (err) {
      setAiBriefing('');
      console.warn('[SituationRoom] AI briefing failed:', err.message);
      setAiError(
        'ยังเรียก AI ไม่สำเร็จ ระบบแสดง action จากข้อมูลจริงให้ใช้เป็น fallback แล้ว กรุณาตรวจ GEMINI_API_KEY, ALLOWED_ORIGINS และสิทธิ์ใช้งานโมเดล Gemini ใน Netlify'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="situation-room" ref={reportRef}>
      <div className="situation-hero">
        <div>
          <Tag color="green">Executive Decision Support</Tag>
          <Title level={2}>Executive Situation Room</Title>
          <Text type="secondary">อัปเดต {snapshot.generatedAt}</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            รีเฟรชข้อมูล
          </Button>
          <Button
            type="primary"
            icon={<RobotOutlined />}
            loading={aiLoading}
            onClick={handleGenerateReport}
          >
            สรุป AI
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={handlePrint}>
            PDF
          </Button>
        </Space>
      </div>

      {situationLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          <Row gutter={[14, 14]} className="situation-kpis">
            <Col xs={24} sm={12} xl={6}>
              <Card className="kpi-card kpi-records" bordered={false}>
                <div className="kpi-content">
                  <div className="kpi-info">
                    <span className="kpi-title">ข้อมูลรวมในระบบ</span>
                    <span className="kpi-value">{money(totalRecords)}</span>
                    <span className="kpi-suffix">รายการ</span>
                  </div>
                  <div className="kpi-icon-glow">
                    <BarChartOutlined />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="kpi-card kpi-area" bordered={false}>
                <div className="kpi-content">
                  <div className="kpi-info">
                    <span className="kpi-title">พื้นที่เกษตร</span>
                    <span className="kpi-value">
                      {money(agriStats.crop_area)}
                    </span>
                    <span className="kpi-suffix">ไร่</span>
                  </div>
                  <div className="kpi-icon-glow">
                    <CloudOutlined />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="kpi-card kpi-budget" bordered={false}>
                <div className="kpi-content">
                  <div className="kpi-info">
                    <span className="kpi-title">งบประมาณรวม</span>
                    <span className="kpi-value">
                      {money(budget.totalBudget)}
                    </span>
                    <span className="kpi-suffix">บาท</span>
                  </div>
                  <div className="kpi-icon-glow">
                    <DollarOutlined />
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="kpi-card kpi-alerts" bordered={false}>
                <div className="kpi-content">
                  <div className="kpi-info">
                    <span className="kpi-title">คำขอข้อมูลค้างติดตาม</span>
                    <span className="kpi-value">
                      {pendingRequests + pendingAssignments}
                    </span>
                    <span className="kpi-suffix">รายการ</span>
                  </div>
                  <div className="kpi-icon-glow">
                    <AlertOutlined />
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="situation-main-grid">
            <Col xs={24} xl={14}>
              <Card
                title="Decision Queue"
                className="situation-card decision-card"
              >
                <div className="decision-list">
                  {decisionItems.map((item, index) => (
                    <div
                      className={`decision-item ${item.level}`}
                      key={item.title}
                    >
                      <div className="decision-rank">{index + 1}</div>
                      <div>
                        <div className="decision-title">{item.title}</div>
                        <div className="decision-detail">{item.detail}</div>
                        <div className="decision-action">{item.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col xs={24} xl={10}>
              <Card
                title="พื้นที่ต้องติดตาม"
                extra={<Tag color="green">จุดความร้อน 7 วันล่าสุด</Tag>}
                className="situation-card ranking-card"
              >
                {ranking.length ? (
                  <div className="ranking-list">
                    {ranking.map((item, index) => {
                      const rankClass =
                        index === 0
                          ? 'rank-top-1'
                          : index === 1
                            ? 'rank-top-2'
                            : index === 2
                              ? 'rank-top-3'
                              : '';
                      return (
                        <div
                          className={`ranking-row ${rankClass}`}
                          key={item.name}
                        >
                          <span className="rank-number">{index + 1}</span>
                          <div className="rank-main">
                            <strong>{item.name}</strong>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                              }}
                            >
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                พื้นที่เกษตร {money(item.area)} ไร่ · วิสาหกิจ{' '}
                                {money(item.ce)} · แปลงใหญ่ {money(item.lp)}
                              </Text>
                              <div className="rank-indicators">
                                {item.fire > 0 && (
                                  <span className="mini-indicator fire">
                                    <FireOutlined /> จุดความร้อน {item.fire} จุด
                                  </span>
                                )}
                                {item.pestArea > 0 && (
                                  <span className="mini-indicator pest">
                                    <AlertOutlined /> ศัตรูพืช{' '}
                                    {money(item.pestArea)} ไร่
                                  </span>
                                )}
                                {item.disasterArea > 0 && (
                                  <span className="mini-indicator disaster">
                                    <ThunderboltOutlined /> ประสบภัย{' '}
                                    {money(item.disasterArea)} ไร่
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Tag color={riskLabel(item, index).color}>
                            {riskLabel(item, index).text}
                          </Tag>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty description="ยังไม่มีข้อมูลจัดอันดับ" />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={6}>
              <Card title="สถานการณ์รวมจังหวัด" className="situation-card">
                <div className="province-snapshot compact">
                  <div>
                    <Text type="secondary">ครัวเรือน</Text>
                    <strong>{money(agriStats.households)}</strong>
                  </div>
                  <div>
                    <Text type="secondary">แปลงใหญ่</Text>
                    <strong>{money(lpStats.total)}</strong>
                  </div>
                  <div>
                    <Text type="secondary">กลุ่ม/สถาบัน</Text>
                    <strong>{money(instituteStats.total)}</strong>
                  </div>
                  <div>
                    <Text type="secondary">ฝน 3 วัน</Text>
                    <strong>
                      {Number(weatherRisk.maxRainTotal || 0).toFixed(1)} มม.
                    </strong>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card
                title={
                  <Space>
                    <span>ทะเบียนเกษตรกร</span>
                    <Tag color="blue">ปี {registry.activeYear || '-'}</Tag>
                  </Space>
                }
                className="situation-card registry-card"
              >
                <div className="registry-progress">
                  <Progress
                    type="dashboard"
                    percent={registry.progress}
                    size={122}
                    strokeColor="#16a34a"
                  />
                  <div className="registry-progress-meta">
                    <span>
                      ปรับปรุงแล้ว <strong>{money(registry.updated)}</strong>{' '}
                      ครัวเรือน
                    </span>
                    <span>
                      เป้าหมาย <strong>{money(registry.target)}</strong>{' '}
                      ครัวเรือน
                    </span>
                    {registry.remaining !== null && (
                      <span>
                        คงเหลือ <strong>{money(registry.remaining)}</strong>{' '}
                        ครัวเรือน
                      </span>
                    )}
                    <span>
                      พื้นที่ปรับปรุง{' '}
                      <strong>{money(Math.round(registry.area))}</strong> ไร่
                    </span>
                    {registry.latestCutoff && (
                      <Text type="secondary">
                        ข้อมูลถึง {registry.latestCutoff}
                      </Text>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card
                title={
                  <Space>
                    <span>Progress งบประมาณ</span>
                    <Tag color="blue">FY {budget.fiscalYear || '-'}</Tag>
                    <Tag color="green">Round {budget.round || '-'}</Tag>
                  </Space>
                }
                className="situation-card"
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    margin: '8px 0',
                  }}
                >
                  <Progress
                    type="dashboard"
                    percent={budget.progress}
                    strokeColor={{
                      '0%': '#10b981',
                      '100%': '#3b82f6',
                    }}
                  />
                </div>
                <div className="budget-mini">
                  <span>
                    เบิกจ่ายแล้ว <strong>{money(budget.totalSpent)}</strong> บาท
                  </span>
                  <span>
                    งบรวม <strong>{money(budget.totalBudget)}</strong> บาท
                  </span>
                </div>
                <div className="top-projects">
                  {budget.topProjects.slice(0, 3).map((project) => (
                    <div key={`${project.project}-${project.budget}`}>
                      <Text ellipsis>{project.project}</Text>
                      <strong>{money(project.budget)}</strong>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={6}>
              <Card title="Weather / PM / Rain" className="situation-card">
                <EChart
                  option={weatherRiskOption(weatherRisk.districts.slice(0, 7))}
                  style={{ height: 220 }}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card title="Pending Data Requests" className="situation-card">
                <div className="request-summary">
                  <div>
                    <strong>{pendingRequests}</strong>
                    <span>คำขอเปิดอยู่</span>
                  </div>
                  <div>
                    <strong>{pendingAssignments}</strong>
                    <span>assignment รอส่ง</span>
                  </div>
                </div>
                <div className="request-list">
                  {(signals.requests || []).slice(0, 5).map((item) => (
                    <div key={item.id}>
                      <Text ellipsis>{item.title || 'คำขอข้อมูล'}</Text>
                      <Tag
                        color={
                          item.status === 'published' ? 'green' : 'default'
                        }
                      >
                        {item.status}
                      </Tag>
                    </div>
                  ))}
                  {!(signals.requests || []).length && (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="ไม่มีคำขอข้อมูลล่าสุด"
                    />
                  )}
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <RobotOutlined style={{ color: '#16a34a' }} />
                    <span>AI Brief</span>
                  </Space>
                }
                className="situation-card ai-briefing-card"
                extra={
                  aiBriefing && (
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => {
                        navigator.clipboard.writeText(
                          aiBriefing.replace(/\n\nใช้โมเดล: .*/, '')
                        );
                        message.success('คัดลอกรายงานสรุปไปยังคลิปบอร์ดแล้ว');
                      }}
                    >
                      คัดลอก
                    </Button>
                  )
                }
              >
                {aiLoading && <Skeleton active paragraph={{ rows: 5 }} />}
                {!aiLoading && aiError && (
                  <Alert type="warning" showIcon message={aiError} />
                )}
                {!aiLoading && aiBriefing && (
                  <div className="ai-briefing-text">{aiBriefing}</div>
                )}
                {!aiLoading && !aiBriefing && !aiError && (
                  <Empty description="กด 'สรุป AI' เพื่อให้ Gemini สรุปสั้นจากข้อมูลหน้านี้" />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

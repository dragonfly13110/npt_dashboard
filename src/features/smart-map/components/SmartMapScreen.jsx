import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import subdistrictGeoJSON from '../../../data/nakhon_pathom_subdistricts.json';
import {
  getSubdistrictsForDistrict,
  normalizePlaceName,
} from '../../../utils/geojsonBoundaries';
import {
  useSmartMapLayerStatus,
  useSmartMapPoints,
  useSmartMapSoil,
  useSmartMapSummary,
  useSmartMapWeather,
} from '../hooks/useSmartMapApi';
import 'leaflet/dist/leaflet.css';
import '../../../pages/SmartMap.css';
import SmartMapHeader from './SmartMapHeader';
import SmartMapCanvas from './SmartMapCanvas';
import SmartMapKpiBar from './SmartMapKpiBar';
import SmartMapLayerPanel from './SmartMapLayerPanel';
import SmartMapDetailPanel from './SmartMapDetailPanel';
import SmartMapComparisonDialog from './SmartMapComparisonDialog';
import {
  EMPTY_AREA_SELECTION,
  areaSummaryScope,
  choroplethScope,
  selectDistrict,
  selectSubdistrict,
} from '../utils/areaSelection';

// ===== CHOROPLETH CONFIG =====
const METRICS = [
  {
    key: 'area',
    label: 'พื้นที่เกษตร',
    unit: 'ไร่',
    icon: '🌾',
    colors: ['#6ee7b7', '#34d399', '#059669', '#064e3b'],
  },
  {
    key: 'house',
    label: 'ครัวเรือน',
    unit: 'ราย',
    icon: '🏠',
    colors: ['#93c5fd', '#60a5fa', '#2563eb', '#1e3a5f'],
  },
  {
    key: 'ce',
    label: 'วิสาหกิจชุมชน',
    unit: 'แห่ง',
    icon: '🤝',
    colors: ['#d8b4fe', '#c084fc', '#9333ea', '#4a1d6b'],
  },
  {
    key: 'lp',
    label: 'แปลงใหญ่',
    unit: 'แปลง',
    icon: '🌱',
    colors: ['#fdba74', '#fb923c', '#ea580c', '#7c2d12'],
  },
  {
    key: 'farmerRegistry',
    label: 'Farmer Registry',
    unit: 'households',
    icon: '📋',
    colors: ['#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a'],
  },
  {
    key: 'geoplotProgress',
    label: 'GEOPLOTS',
    unit: '%',
    icon: '🗺️',
    colors: ['#fde68a', '#fbbf24', '#d97706', '#92400e'],
  },
  {
    key: 'groupCount',
    label: 'Group Count',
    unit: 'groups',
    icon: '👥',
    colors: ['#ddd6fe', '#a78bfa', '#7c3aed', '#4c1d95'],
  },
  {
    key: 'fireCount',
    label: 'Hotspot Count',
    unit: 'hotspots',
    icon: '🔥',
    colors: ['#fecaca', '#f87171', '#dc2626', '#7f1d1d'],
  },
];

const MARKER_LAYERS = [
  {
    key: 'young_farmer',
    apiLayer: 'young_farmer_groups',
    label: 'กลุ่มยุวเกษตรกร',
    color: '#fbbf24',
    icon: '🧑‍🌾',
  },
  {
    key: 'career_group',
    apiLayer: 'career_groups',
    label: 'กลุ่มอาชีพการเกษตร',
    color: '#a855f7',
    icon: '🚜',
  },
  {
    key: 'housewife_group',
    apiLayer: 'housewife_groups',
    label: 'กลุ่มแม่บ้านเกษตรกร',
    color: '#14b8a6',
    icon: '👩‍🌾',
  },
  {
    key: 'forecast',
    apiLayer: 'forecast_plots',
    label: 'แปลงพยากรณ์',
    color: '#ec4899',
    icon: '🔬',
  },
  {
    key: 'hotspot',
    apiLayer: 'fire_hotspots',
    label: 'จุดความร้อน',
    color: '#ef4444',
    icon: '🔥',
  },
  {
    key: 'agri_tourism',
    apiLayer: 'agri_tourism',
    label: 'ท่องเที่ยวเกษตร (ข้อมูลพิกัดไม่พร้อม)',
    color: '#94a3b8',
    icon: '📍',
    disabled: true,
  },
  {
    key: 'gis_areas',
    apiLayer: 'gis_areas',
    label: 'GIS (ยังไม่มีข้อมูล)',
    color: '#94a3b8',
    icon: '📍',
    disabled: true,
  },
];

const DISTRICT_CENTROIDS = {
  เมืองนครปฐม: [13.82, 100.04],
  กำแพงแสน: [14.01, 99.98],
  บางเลน: [14.02, 100.17],
  ดอนตูม: [13.98, 100.08],
  นครชัยศรี: [13.8, 100.18],
  สามพราน: [13.72, 100.22],
  พุทธมณฑล: [13.78, 100.32],
};

// ===== WEATHER & PM2.5 HELPERS =====
const getWeatherDetails = (code) => {
  if (code === null || code === undefined)
    return { label: 'ไม่ทราบ', icon: '❓' };
  if (code === 0) return { label: 'ท้องฟ้าแจ่มใส', icon: '☀️' };
  if ([1, 2, 3].includes(code)) return { label: 'มีเมฆบางส่วน', icon: '⛅' };
  if ([45, 48].includes(code)) return { label: 'มีหมอก', icon: '🌫️' };
  if ([51, 53, 55].includes(code)) return { label: 'ฝนละออง', icon: '🌧️' };
  if ([61, 63, 65].includes(code)) return { label: 'ฝนตก', icon: '🌧️' };
  if ([71, 73, 75].includes(code)) return { label: 'หิมะตก', icon: '❄️' };
  if ([80, 81, 82].includes(code)) return { label: 'ฝนตกชุก', icon: '🌦️' };
  if ([95, 96, 99].includes(code))
    return { label: 'พายุฝนฟ้าคะนอง', icon: '⛈️' };
  return { label: 'มีฝน/มีเมฆ', icon: '🌧️' };
};

const getPm25Color = (val) => {
  if (val === null || val === undefined) return '#64748b';
  if (val <= 15) return '#06b6d4'; // ดีมาก (Very Good) - ฟ้า/เขียวเข้ม
  if (val <= 25) return '#10b981'; // ดี (Good) - เขียว
  if (val <= 37.5) return '#eab308'; // ปานกลาง (Moderate) - เหลือง
  if (val <= 75) return '#f97316'; // เริ่มมีผลกระทบ (Unhealthy for Sensitive) - ส้ม
  return '#ef4444'; // มีผลกระทบต่อสุขภาพ (Unhealthy) - แดง
};

const getPm25LevelLabel = (val) => {
  if (val === null || val === undefined) return 'ไม่มีข้อมูล';
  if (val <= 15) return 'ดีมาก';
  if (val <= 25) return 'ดี';
  if (val <= 37.5) return 'ปานกลาง';
  if (val <= 75) return 'เริ่มมีผลกระทบ';
  return 'อันตรายต่อสุขภาพ';
};

function summaryToStats(summary) {
  const metrics = summary?.metrics || {};
  return {
    area: metrics.farmAreaRai || 0,
    house: metrics.farmerHouseholds || 0,
    ce: metrics.communityEnterprises || 0,
    lp: metrics.largePlots || 0,
    sfSfCount: metrics.smartFarmers || 0,
    ysfCount: metrics.youngSmartFarmers || 0,
    fireCount: metrics.hotspotCount || 0,
    farmerRegistry: metrics.farmerRegistryHouseholds || 0,
    geoplotProgress: metrics.geoplotProgressPercent || 0,
    groupCount: metrics.groupCount || 0,
  };
}

function weatherByDistrict(weather) {
  return Object.fromEntries(
    (weather?.data || []).map((row) => [
      row.district,
      {
        ...row,
        loading: false,
        error: row.weatherStatus !== 'ok' && row.airQualityStatus !== 'ok',
      },
    ])
  );
}

function markersFromFeatures(key, collection) {
  return (collection?.data?.features || []).map((feature) => {
    const properties = feature.properties || {};
    const [lon, lat] = feature.geometry?.coordinates || [];
    const base = {
      id: feature.id,
      district: properties.district,
      subdistrict: properties.subdistrict,
      lat,
      lon,
      type: key,
    };
    if (
      key === 'young_farmer' ||
      key === 'career_group' ||
      key === 'housewife_group'
    ) {
      return {
        ...base,
        name: properties.group_name,
        memberCount: properties.member_count,
        activity: properties.activity,
        typeLabel:
          key === 'young_farmer' ? 'กลุ่มยุวเกษตรกร' : 'กลุ่มอาชีพการเกษตร',
      };
    }
    if (key === 'forecast') {
      return {
        ...base,
        name: properties.crop_type
          ? `แปลงพยากรณ์ ${properties.crop_type}`
          : 'แปลงพยากรณ์',
        typeLabel: 'แปลงพยากรณ์',
        cropType: properties.crop_type,
        area: properties.planted_area_rai,
        status: properties.crop_status,
      };
    }
    return {
      ...base,
      name: `จุดความร้อน ${properties.acq_date || ''} ${properties.acq_time ? `${String(properties.acq_time).slice(0, 2)}:${String(properties.acq_time).slice(2)} น.` : ''}`,
      typeLabel: 'จุดความร้อนสะสม',
      confidence: properties.confidence,
      frp: properties.frp,
    };
  });
}

// ===== MAIN COMPONENT =====
export default function SmartMapScreen() {
  const navigate = useNavigate();

  const [MapComponents, setMapComponents] = useState(null);
  const [geoJSONData, setGeoJSONData] = useState(null);
  const [isSoilLayerVisible, setIsSoilLayerVisible] = useState(false);
  const [showSubdistrictLayer, setShowSubdistrictLayer] = useState(true);
  const [activeMetric, setActiveMetric] = useState('area');
  const [visibleLayers, setVisibleLayers] = useState({
    young_farmer: false,
    career_group: false,
    housewife_group: false,
    forecast: false,
    hotspot: false,
  });
  const [mapZoom, setMapZoom] = useState(10);
  const [areaSelection, setAreaSelection] = useState(EMPTY_AREA_SELECTION);
  const [panelClosing, setPanelClosing] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [bbox, setBbox] = useState(null);
  const bboxTimer = useRef(null);

  // AI Insights states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState({});
  const [aiError, setAiError] = useState(null);

  // Simulation Sliders states
  const [simRiceConversion, setSimRiceConversion] = useState(0);
  const [simResidueManagement, setSimResidueManagement] = useState(0);

  // Basemap selector & search states
  const [basemap, setBasemap] = useState('osm'); // default to Thai OpenStreetMap
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  // Comparison Mode states
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareWithDistrictName, setCompareWithDistrictName] = useState(null);
  const [compSimRiceConversion, setCompSimRiceConversion] = useState(0);
  const [compSimResidueManagement, setCompSimResidueManagement] = useState(0);

  const selectedDistrict = areaSelection.district || null;
  const selectedSubdistrict = areaSelection.subdistrict || null;
  const selectedScope = areaSummaryScope(areaSelection);
  const mapScope = choroplethScope(areaSelection);
  const provinceSummary = useSmartMapSummary({ level: 'province' });
  const selectedSummary = useSmartMapSummary(selectedScope);
  const mapSummary = useSmartMapSummary(mapScope);
  const layerStatus = useSmartMapLayerStatus();
  const weather = useSmartMapWeather();
  const soil = useSmartMapSoil({ enabled: isSoilLayerVisible });
  const youngFarmerPoints = useSmartMapPoints('young_farmer_groups', {
    enabled: visibleLayers.young_farmer,
    bbox,
  });
  const careerGroupPoints = useSmartMapPoints('career_groups', {
    enabled: visibleLayers.career_group,
    bbox,
  });
  const housewifeGroupPoints = useSmartMapPoints('housewife_groups', {
    enabled: visibleLayers.housewife_group,
    bbox,
  });
  const forecastPoints = useSmartMapPoints('forecast_plots', {
    enabled: visibleLayers.forecast,
    bbox,
  });
  const hotspotPoints = useSmartMapPoints('fire_hotspots', {
    enabled: visibleLayers.hotspot,
    bbox,
  });

  const provinceTotals = useMemo(
    () => summaryToStats(provinceSummary.data),
    [provinceSummary.data]
  );
  const selectedData = useMemo(
    () =>
      selectedDistrict && (selectedSummary.data || mapSummary.data)
        ? summaryToStats(
            selectedSummary.data?.availability === 'district_only'
              ? mapSummary.data
              : selectedSummary.data
          )
        : null,
    [selectedDistrict, selectedSummary.data, mapSummary.data]
  );
  const districtStats = useMemo(
    () =>
      areaSelection.level === 'province'
        ? Object.fromEntries(
            (mapSummary.data?.breakdown || []).map((area) => [
              normalizePlaceName(area.districtName),
              summaryToStats({ metrics: area.metrics }),
            ])
          )
        : {},
    [areaSelection.level, mapSummary.data]
  );
  const subdistrictStats = useMemo(
    () =>
      areaSelection.level === 'province'
        ? {}
        : Object.fromEntries(
            (mapSummary.data?.breakdown || []).map((area) => [
              normalizePlaceName(area.subdistrictName),
              summaryToStats({ metrics: area.metrics }),
            ])
          ),
    [areaSelection.level, mapSummary.data]
  );
  const weatherData = useMemo(
    () => weatherByDistrict(weather.data),
    [weather.data]
  );
  const allCoords = useMemo(
    () => ({
      young_farmer: markersFromFeatures('young_farmer', youngFarmerPoints.data),
      career_group: markersFromFeatures('career_group', careerGroupPoints.data),
      housewife_group: markersFromFeatures(
        'housewife_group',
        housewifeGroupPoints.data
      ),
      forecast: markersFromFeatures('forecast', forecastPoints.data),
      hotspot: markersFromFeatures('hotspot', hotspotPoints.data),
    }),
    [
      youngFarmerPoints.data,
      careerGroupPoints.data,
      housewifeGroupPoints.data,
      forecastPoints.data,
      hotspotPoints.data,
    ]
  );
  const layerErrors = {
    young_farmer: youngFarmerPoints.error,
    career_group: careerGroupPoints.error,
    housewife_group: housewifeGroupPoints.error,
    forecast: forecastPoints.error,
    hotspot: hotspotPoints.error,
  };
  const layerStatusById = useMemo(
    () =>
      Object.fromEntries(
        (layerStatus.data?.layers || []).map((layer) => [layer.id, layer])
      ),
    [layerStatus.data]
  );
  const soilLayerData = soil.data?.data || null;
  const soilLayerMeta = soil.data?.meta || null;
  const soilLayerLoading = soil.isLoading;
  const soilLayerError = soil.error?.message || null;
  const layerMetaByKey = {
    young_farmer: youngFarmerPoints.data?.meta,
    career_group: careerGroupPoints.data?.meta,
    housewife_group: housewifeGroupPoints.data?.meta,
    forecast: forecastPoints.data?.meta,
    hotspot: hotspotPoints.data?.meta,
  };

  useEffect(() => () => window.clearTimeout(bboxTimer.current), []);

  // Reset simulation and AI error when district changes
  useEffect(() => {
    setSimRiceConversion(0);
    setSimResidueManagement(0);
    setAiError(null);
  }, [areaSelection]);

  // Compute totals for KPI bar
  const totals = provinceTotals;

  // Load Leaflet + GeoJSON
  useEffect(() => {
    import('../../../data/nakhon_pathom_districts.json').then((m) =>
      setGeoJSONData(m.default)
    );
    Promise.all([import('leaflet'), import('react-leaflet')]).then(
      ([L, RL]) => {
        delete L.default.Icon.Default.prototype._getIconUrl;
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
        setMapComponents({ L: L.default, ...RL });
      }
    );
  }, []);

  // Search Suggestions logic
  const suggestions = useMemo(() => {
    if (!searchQuery) return [];
    const cleanQuery = searchQuery.replace(/^อ\./, '').trim();
    if (!cleanQuery) return [];
    return Object.keys(DISTRICT_CENTROIDS).filter((name) =>
      name.includes(cleanQuery)
    );
  }, [searchQuery]);

  const handleSelectDistrictByName = useCallback(
    (name) => {
      setSearchQuery(`อ.${name}`);
      let areaSqkm = 0;
      if (geoJSONData && geoJSONData.features) {
        const feat = geoJSONData.features.find(
          (f) => f.properties?.amp_th === name
        );
        if (feat) {
          areaSqkm = feat.properties?.area_sqkm || 0;
        }
      }
      setPanelClosing(false);
      setAreaSelection((selection) =>
        selectDistrict(selection, { name, areaSqkm })
      );
    },
    [geoJSONData]
  );

  const handleSearchChange = useCallback((val) => {
    setSearchQuery(val);
  }, []);

  const toggleLayer = useCallback(
    (key) => {
      const layer = MARKER_LAYERS.find((item) => item.key === key);
      if (
        layer?.disabled ||
        (layerStatusById[layer?.apiLayer]?.availability &&
          layerStatusById[layer.apiLayer].availability !== 'active')
      ) {
        return;
      }
      setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    [layerStatusById]
  );

  const clearPointLayers = useCallback(() => {
    setVisibleLayers((prev) =>
      Object.fromEntries(Object.keys(prev).map((key) => [key, false]))
    );
  }, []);

  const handleBoundsChange = useCallback((nextBbox) => {
    window.clearTimeout(bboxTimer.current);
    bboxTimer.current = window.setTimeout(() => setBbox(nextBbox), 300);
  }, []);

  const toggleSoilLayer = useCallback(() => {
    setIsSoilLayerVisible((prev) => !prev);
  }, []);

  // Close panel with animation
  const closePanel = useCallback(() => {
    setPanelClosing(true);
    setTimeout(() => {
      setAreaSelection(EMPTY_AREA_SELECTION);
      setPanelClosing(false);
    }, 300);
  }, []);

  const handleResetView = useCallback(() => {
    closePanel();
    setTimeout(() => {
      setResetKey((prev) => prev + 1);
    }, 300);
  }, [closePanel]);

  // Get metric info
  const currentMetric = METRICS.find((m) => m.key === activeMetric) || null;
  const choroplethStats =
    areaSelection.level === 'province' ? districtStats : subdistrictStats;

  // Compute choropleth min/max
  const { minVal, maxVal } = useMemo(() => {
    if (!choroplethStats || Object.keys(choroplethStats).length === 0)
      return { minVal: 0, maxVal: 1 };
    if (!activeMetric) return { minVal: 0, maxVal: 1 };
    const vals = Object.values(choroplethStats).map(
      (d) => d[activeMetric] || 0
    );
    return { minVal: Math.min(...vals), maxVal: Math.max(...vals, 1) };
  }, [choroplethStats, activeMetric]);

  // Color interpolation for choropleth
  const getDistrictColor = useCallback(
    (value) => {
      const t = maxVal > minVal ? (value - minVal) / (maxVal - minVal) : 0.5;
      const colors = currentMetric?.colors || METRICS[0].colors;
      const idx = Math.min(Math.floor(t * colors.length), colors.length - 1);
      return colors[idx];
    },
    [minVal, maxVal, currentMetric]
  );

  const visibleSubdistrictFeatures = useMemo(() => {
    if (!selectedDistrict) return subdistrictGeoJSON.features || [];
    return getSubdistrictsForDistrict(
      subdistrictGeoJSON,
      selectedDistrict.name
    );
  }, [selectedDistrict]);

  // Memoized Policy Simulation calculations
  const simulationResults = useMemo(() => {
    if (!selectedData) {
      return {
        waterSaved: 0,
        incomeAdded: 0,
        hotspotReduction: 0,
        co2Reduced: 0,
      };
    }
    const ricePrung = selectedData.ricePrung || 0;
    const ricePi = selectedData.ricePi || 0;
    const totalRice = ricePrung + ricePi;

    // Water saved: (ricePrung * conversion_rate) * 600 m3
    const waterSaved = Math.round(ricePrung * (simRiceConversion / 100) * 600);

    // Additional Income: (ricePrung * conversion_rate) * 12,000 Baht
    const incomeAdded = Math.round(
      ricePrung * (simRiceConversion / 100) * 12000
    );

    // Hotspot Reduction: residue_management * 0.8
    const hotspotReduction = simResidueManagement * 0.8;

    // CO2 Reduced: totalRice * residue_management * 0.35
    const co2Reduced = totalRice * (simResidueManagement / 100) * 0.35;

    return { waterSaved, incomeAdded, hotspotReduction, co2Reduced };
  }, [selectedData, simRiceConversion, simResidueManagement]);

  // Async handler to call Gemini API for district-specific agricultural insights
  const handleGenerateAIInsight = useCallback(
    async (districtName) => {
      if (!districtName || !selectedData) return;

      setAiLoading(true);
      setAiError(null);

      try {
        const { callAI } = await import('../../../services/aiService');

        // Format agricultural land usage distribution for the AI prompt
        const cropsStr = [
          selectedData.ricePi > 0
            ? `- นาปี: ${selectedData.ricePi.toLocaleString()} ไร่`
            : '',
          selectedData.ricePrung > 0
            ? `- นาปรัง: ${selectedData.ricePrung.toLocaleString()} ไร่`
            : '',
          selectedData.field > 0
            ? `- พืชไร่: ${selectedData.field.toLocaleString()} ไร่`
            : '',
          selectedData.fruit > 0
            ? `- ไม้ผล: ${selectedData.fruit.toLocaleString()} ไร่`
            : '',
          (selectedData.veg || 0) + (selectedData.herb || 0) > 0
            ? `- ผักและสมุนไพร: ${((selectedData.veg || 0) + (selectedData.herb || 0)).toLocaleString()} ไร่`
            : '',
          selectedData.flow > 0
            ? `- ไม้ดอก: ${selectedData.flow.toLocaleString()} ไร่`
            : '',
        ]
          .filter(Boolean)
          .join('\n');

        const systemPrompt = `คุณคือผู้เชี่ยวชาญด้านข้อมูลเกษตรอัจฉริยะ (Smart Agriculture Analyst) ของจังหวัดนครปฐม
หน้าที่ของคุณคือวิเคราะห์ข้อมูลสถิติเกษตรระดับอำเภอ และให้คำแนะนำเชิงยุทธศาสตร์ที่เฉียบคม ตรงจุด ปฏิบัติได้จริง
เขียนคำตอบเป็นภาษาไทยที่เป็นทางการ กระชับ และสร้างสรรค์`;

        const userPrompt = `โปรดวิเคราะห์ข้อมูลสถิติการเกษตรของ อำเภอ${districtName} จังหวัดนครปฐม ดังนี้:
- พื้นที่เกษตรกรรมทั้งหมด: ${(selectedData.area || 0).toLocaleString()} ไร่ (${selectedDistrict.areaSqkm?.toFixed(1)} ตร.กม.)
- จำนวนครัวเรือนเกษตรกร: ${(selectedData.house || 0).toLocaleString()} ครัวเรือน
- เครือข่ายเกษตรกร: วิสาหกิจชุมชน ${selectedData.ce || 0} แห่ง, แปลงใหญ่ ${selectedData.lp || 0} แปลง, ศพก. ${selectedData.lc || 0} แห่ง, ศจช. ${selectedData.pc || 0} แห่ง, ศดปช. ${selectedData.sfc || 0} แห่ง
- กลุ่มสถาบัน: กลุ่มแม่บ้านเกษตรกร ${selectedData.instHousewives || 0} กลุ่ม, ยุวเกษตรกร ${selectedData.instYoung || 0} กลุ่ม, กลุ่มส่งเสริมอาชีพ ${selectedData.instCareer || 0} กลุ่ม
- เกษตรกรชั้นนำ: Smart Farmer ${selectedData.sfSfCount || 0} ราย, Young Smart Farmer ${selectedData.ysfCount || 0} ราย
- ภัยคุกคาม: พื้นที่ประสบภัยพิบัติ ${(selectedData.disasterArea || 0).toLocaleString()} ไร่, ศัตรูพืชระบาด ${(selectedData.pestArea || 0).toLocaleString()} ไร่, จุดความร้อน PM2.5 สะสม ${selectedData.fireCount || 0} จุด
- โครงสร้างการเพาะปลูกพืช:
${cropsStr}

คำชี้แจงในการตอบ:
1. วิเคราะห์วิสัยทัศน์ จุดเด่น หรือโอกาสในการพัฒนาของอำเภอนี้โดยอิงจากสถิติตัวเลข
2. ชี้ประเด็นความเสี่ยงหรือจุดท้าทายหลัก (เช่น ภัยแล้ง โรคพืช ความร้อน)
3. เสนอแนะนโยบายเชิงรุก 1-2 ข้อที่เป็นรูปธรรม (เช่น การปรับนโยบาย conversion หรือ การจัดการเศษวัสดุแบบไร้มลพิษ)

ข้อจำกัดสำคัญมาก:
- ตอบเป็นภาษาไทยที่กระชับและเป็นทางการ
- สรุปแยกเป็น 3 หัวข้อสั้นๆ (ใช้สัญลักษณ์ 🎯 โอกาสพัฒนา, ⚠️ ความท้าทายหลัก, 💡 ข้อเสนอแนะเชิงรุก)
- ความยาวรวมไม่เกิน 4-5 ประโยค
- ห้ามใช้ markdown หนาบางซ้อนกันยุ่งเหยิง เอาแบบอ่านง่ายสบายตาที่สุด`;

        const response = await callAI('gemini', systemPrompt, userPrompt, {
          deepThinking: false,
        });

        if (response) {
          setAiInsights((prev) => ({
            ...prev,
            [districtName]: response,
          }));
        } else {
          throw new Error(
            'ไม่ได้รับข้อมูลวิเคราะห์จาก AI กรุณาลองใหม่อีกครั้ง'
          );
        }
      } catch (err) {
        console.error('AI Insight Error: ', err);
        setAiError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI');
      } finally {
        setAiLoading(false);
      }
    },
    [selectedData, selectedDistrict]
  );

  // Loading state
  if (!MapComponents || !geoJSONData || provinceSummary.isLoading) {
    return (
      <div className="smart-map-page">
        <div className="smart-map-loading">
          <div className="loading-spinner" />
          <div className="loading-text">กำลังโหลดแผนที่อัจฉริยะ...</div>
        </div>
      </div>
    );
  }

  // ===== CROP DATA FOR SELECTED DISTRICT =====
  const cropChartData = selectedData
    ? [
        { label: 'นาปี', value: selectedData.ricePi || 0, color: '#22c55e' },
        {
          label: 'นาปรัง',
          value: selectedData.ricePrung || 0,
          color: '#3b82f6',
        },
        { label: 'พืชไร่', value: selectedData.field || 0, color: '#eab308' },
        { label: 'ไม้ผล', value: selectedData.fruit || 0, color: '#f97316' },
        {
          label: 'ผัก/สมุนไพร',
          value: (selectedData.veg || 0) + (selectedData.herb || 0),
          color: '#8b5cf6',
        },
        { label: 'ไม้ดอก', value: selectedData.flow || 0, color: '#ec4899' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="smart-map-page">
      <SmartMapHeader
        navigate={navigate}
        onReset={handleResetView}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchFocused={isSearchFocused}
        setSearchFocused={setIsSearchFocused}
        suggestions={suggestions}
        onSelectDistrict={handleSelectDistrictByName}
        onClearSearch={(e) => {
          e.stopPropagation();
          setSearchQuery('');
          closePanel();
        }}
        controlsOpen={isControlsOpen}
        setControlsOpen={setIsControlsOpen}
      />

      {/* ===== LAYER CONTROL PANEL ===== */}
      <SmartMapLayerPanel
        isOpen={isControlsOpen}
        onControlsClose={() => setIsControlsOpen(false)}
        metrics={METRICS}
        activeMetric={activeMetric}
        onMetricToggle={(metricKey) =>
          setActiveMetric((current) =>
            current === metricKey ? null : metricKey
          )
        }
        markerLayers={MARKER_LAYERS}
        visibleLayers={visibleLayers}
        onLayerToggle={toggleLayer}
        onClearPointLayers={clearPointLayers}
        layerStatusById={layerStatusById}
        layerMetaByKey={layerMetaByKey}
        isSoilLayerVisible={isSoilLayerVisible}
        soilLayerTitle="Load LDD soil series polygons"
        soilLayerLoading={soilLayerLoading}
        soilLayerError={soilLayerError}
        onSoilLayerToggle={toggleSoilLayer}
        showSubdistrictLayer={showSubdistrictLayer}
        onSubdistrictLayerToggle={() =>
          setShowSubdistrictLayer((current) => !current)
        }
        basemap={basemap}
        onBasemapChange={setBasemap}
        currentMetric={currentMetric}
        minVal={minVal}
        maxVal={maxVal}
      />

      <SmartMapDetailPanel
        selectedDistrict={selectedDistrict}
        selectedSubdistrict={selectedSubdistrict}
        selectedData={selectedData}
        summaryAvailability={selectedSummary.data?.availability}
        panelClosing={panelClosing}
        onClose={closePanel}
        onCompare={() => {
          setIsCompareOpen(true);
          const otherDistricts = Object.keys(DISTRICT_CENTROIDS).filter(
            (name) => name !== selectedDistrict.name
          );
          setCompareWithDistrictName(otherDistricts[0]);
        }}
        weather={weatherData[selectedDistrict?.name]}
        getWeatherDetails={getWeatherDetails}
        getPm25Color={getPm25Color}
        getPm25LevelLabel={getPm25LevelLabel}
        cropChartData={cropChartData}
        simRiceConversion={simRiceConversion}
        onRiceConversionChange={setSimRiceConversion}
        simResidueManagement={simResidueManagement}
        onResidueManagementChange={setSimResidueManagement}
        simulationResults={simulationResults}
        aiLoading={aiLoading}
        aiError={aiError}
        aiInsight={aiInsights[selectedDistrict?.name]}
        onGenerateAIInsight={() =>
          selectedDistrict && handleGenerateAIInsight(selectedDistrict.name)
        }
      />
      {/* ===== KPI STATS BAR ===== */}
      {!selectedDistrict && <SmartMapKpiBar totals={totals} />}

      {isCompareOpen && selectedDistrict && selectedData && (
        <SmartMapComparisonDialog
          selectedDistrict={selectedDistrict}
          selectedData={selectedData}
          districtStats={districtStats}
          districtNames={Object.keys(DISTRICT_CENTROIDS)}
          compareWithDistrictName={compareWithDistrictName}
          onCompareDistrictChange={setCompareWithDistrictName}
          onClose={() => setIsCompareOpen(false)}
          weatherData={weatherData}
          getWeatherDetails={getWeatherDetails}
          getPm25Color={getPm25Color}
          getPm25LevelLabel={getPm25LevelLabel}
          cropChartData={cropChartData}
          simRiceConversion={simRiceConversion}
          onSimRiceConversionChange={setSimRiceConversion}
          simResidueManagement={simResidueManagement}
          onSimResidueManagementChange={setSimResidueManagement}
          simulationResults={simulationResults}
          compareAreaSqkm={
            geoJSONData.features?.find(
              (feature) =>
                feature.properties?.amp_th === compareWithDistrictName
            )?.properties?.area_sqkm
          }
          compSimRiceConversion={compSimRiceConversion}
          onCompSimRiceConversionChange={setCompSimRiceConversion}
          compSimResidueManagement={compSimResidueManagement}
          onCompSimResidueManagementChange={setCompSimResidueManagement}
        />
      )}

      <SmartMapCanvas
        MapComponents={MapComponents}
        geoJSONData={geoJSONData}
        resetKey={resetKey}
        selectedDistrict={selectedDistrict}
        selectedSubdistrict={selectedSubdistrict}
        basemap={basemap}
        isControlsOpen={isControlsOpen}
        setMapZoom={setMapZoom}
        districtCentroids={DISTRICT_CENTROIDS}
        activeMetric={activeMetric}
        districtStats={districtStats}
        subdistrictStats={subdistrictStats}
        choroplethLevel={
          areaSelection.level === 'province' ? 'district' : 'subdistrict'
        }
        weatherData={weatherData}
        getDistrictColor={getDistrictColor}
        getWeatherDetails={getWeatherDetails}
        getPm25Color={getPm25Color}
        getPm25LevelLabel={getPm25LevelLabel}
        setPanelClosing={setPanelClosing}
        onSelectDistrict={(district) =>
          setAreaSelection((selection) => selectDistrict(selection, district))
        }
        onSelectSubdistrict={(district, subdistrict) =>
          setAreaSelection((selection) =>
            selectSubdistrict(selectDistrict(selection, district), subdistrict)
          )
        }
        isSoilLayerVisible={isSoilLayerVisible}
        soilLayerData={soilLayerData}
        soilLayerMeta={soilLayerMeta}
        showSubdistrictLayer={showSubdistrictLayer}
        mapZoom={mapZoom}
        visibleSubdistrictFeatures={visibleSubdistrictFeatures}
        markerLayers={MARKER_LAYERS}
        visibleLayers={visibleLayers}
        allCoords={allCoords}
        layerErrors={layerErrors}
        onBoundsChange={handleBoundsChange}
      />
    </div>
  );
}

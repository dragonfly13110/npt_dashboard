import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '../../../hooks/useDashboardData';
import { supabase } from '../../../supabaseClient';
import { utmToLatLng } from '../../../utils/geo';
import subdistrictGeoJSON from '../../../data/nakhon_pathom_subdistricts.json';
import { getSubdistrictsForDistrict } from '../../../utils/geojsonBoundaries';
import 'leaflet/dist/leaflet.css';
import '../../../pages/SmartMap.css';
import SmartMapHeader from './SmartMapHeader';
import SmartMapCanvas from './SmartMapCanvas';
import SmartMapKpiBar from './SmartMapKpiBar';
import SmartMapLayerPanel from './SmartMapLayerPanel';

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
];

const MARKER_LAYERS = [
  {
    key: 'young_farmer',
    label: 'กลุ่มยุวเกษตรกร',
    color: '#fbbf24',
    icon: '🧑‍🌾',
  },
  {
    key: 'career_group',
    label: 'กลุ่มอาชีพการเกษตร',
    color: '#a855f7',
    icon: '🚜',
  },
  { key: 'forecast', label: 'แปลงพยากรณ์', color: '#ec4899', icon: '🔬' },
  { key: 'hotspot', label: 'จุดความร้อน', color: '#ef4444', icon: '🔥' },
];

const SOIL_LAYER_URL =
  import.meta.env.VITE_SOIL_LAYER_URL ||
  '/gis/soil/nakhon-pathom-soil-series.geojson';
const SOIL_LAYER_METADATA_URL =
  import.meta.env.VITE_SOIL_LAYER_METADATA_URL || '';

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

// ===== MINI BAR CHART (pure CSS) =====
function MiniBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d) => (
        <div
          key={d.label}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#475569',
              minWidth: 72,
              textAlign: 'right',
            }}
          >
            {d.label}
          </span>
          <div
            style={{
              flex: 1,
              height: 14,
              background: 'rgba(15, 23, 42, 0.06)',
              borderRadius: 7,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.max((d.value / max) * 100, 2)}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${d.color}cc, ${d.color})`,
                borderRadius: 7,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: '#1e293b',
              minWidth: 50,
              textAlign: 'right',
            }}
          >
            {d.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ===== MAIN COMPONENT =====
export default function SmartMapScreen() {
  const navigate = useNavigate();
  const { loading: dataLoading, districtStats } = useDashboardData();

  const [MapComponents, setMapComponents] = useState(null);
  const [geoJSONData, setGeoJSONData] = useState(null);
  const [soilLayerData, setSoilLayerData] = useState(null);
  const [soilLayerMeta, setSoilLayerMeta] = useState(null);
  const [soilLayerLoading, setSoilLayerLoading] = useState(false);
  const [soilLayerError, setSoilLayerError] = useState(null);
  const [isSoilLayerVisible, setIsSoilLayerVisible] = useState(false);
  const [showSubdistrictLayer, setShowSubdistrictLayer] = useState(true);
  const [activeMetric, setActiveMetric] = useState('area');
  const [visibleLayers, setVisibleLayers] = useState({
    young_farmer: false,
    career_group: false,
    forecast: false,
    hotspot: false,
  });
  const [mapZoom, setMapZoom] = useState(10);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedSubdistrict, setSelectedSubdistrict] = useState(null);
  const [panelClosing, setPanelClosing] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // AI Insights states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState({});
  const [aiError, setAiError] = useState(null);

  // Simulation Sliders states
  const [simRiceConversion, setSimRiceConversion] = useState(0);
  const [simResidueManagement, setSimResidueManagement] = useState(0);

  // Basemap selector & Search & Weather states
  const [basemap, setBasemap] = useState('osm'); // default to Thai OpenStreetMap
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [weatherData, setWeatherData] = useState({});
  const [isControlsOpen, setIsControlsOpen] = useState(false);

  // All farm coordinates
  const [allCoords, setAllCoords] = useState({
    young_farmer: [],
    career_group: [],
    forecast: [],
    hotspot: [],
  });

  // Comparison Mode states
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareWithDistrictName, setCompareWithDistrictName] = useState(null);
  const [compSimRiceConversion, setCompSimRiceConversion] = useState(0);
  const [compSimResidueManagement, setCompSimResidueManagement] = useState(0);

  // Reset simulation and AI error when district changes
  useEffect(() => {
    setSimRiceConversion(0);
    setSimResidueManagement(0);
    setAiError(null);
  }, [selectedDistrict]);

  // Compute totals for KPI bar
  const totals = useMemo(() => {
    if (!districtStats || Object.keys(districtStats).length === 0) {
      return { area: 0, house: 0, ce: 0, lp: 0, sf: 0 };
    }
    const vals = Object.values(districtStats);
    return {
      area: vals.reduce((s, d) => s + (d.area || 0), 0),
      house: vals.reduce((s, d) => s + (d.house || 0), 0),
      ce: vals.reduce((s, d) => s + (d.ce || 0), 0),
      lp: vals.reduce((s, d) => s + (d.lp || 0), 0),
      sf: 0, // SF count is from a different source, placeholder
    };
  }, [districtStats]);

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

  // Fetch live weather and PM2.5 for all districts
  const fetchWeatherAndAirQuality = useCallback(async () => {
    const results = {};
    await Promise.all(
      Object.entries(DISTRICT_CENTROIDS).map(async ([name, [lat, lon]]) => {
        try {
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;
          const weatherRes = await fetch(weatherUrl);
          const weatherDataJson = await weatherRes.json();

          const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,european_aqi`;
          const aqRes = await fetch(aqUrl);
          const aqDataJson = await aqRes.json();

          results[name] = {
            temp: weatherDataJson.current?.temperature_2m ?? null,
            humidity: weatherDataJson.current?.relative_humidity_2m ?? null,
            windSpeed: weatherDataJson.current?.wind_speed_10m ?? null,
            weatherCode: weatherDataJson.current?.weather_code ?? null,
            pm25: aqDataJson.current?.pm2_5 ?? null,
            aqi: aqDataJson.current?.european_aqi ?? null,
            loading: false,
          };
        } catch (e) {
          console.error(`Failed to fetch weather for ${name}`, e);
          results[name] = { loading: false, error: true };
        }
      })
    );
    setWeatherData(results);
  }, []);

  useEffect(() => {
    fetchWeatherAndAirQuality();
  }, [fetchWeatherAndAirQuality]);

  useEffect(() => {
    if (!isSoilLayerVisible || soilLayerData) return;
    if (!SOIL_LAYER_URL && !SOIL_LAYER_METADATA_URL) {
      setSoilLayerError('Soil layer URL is not configured.');
      return;
    }

    const controller = new AbortController();
    const loadSoilLayer = async () => {
      setSoilLayerLoading(true);
      setSoilLayerError(null);

      try {
        let geojsonUrl = SOIL_LAYER_URL;
        if (SOIL_LAYER_METADATA_URL) {
          const metadataRes = await fetch(SOIL_LAYER_METADATA_URL, {
            signal: controller.signal,
          });
          if (!metadataRes.ok) {
            throw new Error(`Metadata request failed: ${metadataRes.status}`);
          }
          const metadata = await metadataRes.json();
          setSoilLayerMeta(metadata);
          geojsonUrl =
            metadata.geojsonUrl ||
            metadata.geojson_url ||
            metadata.url ||
            SOIL_LAYER_URL;
        }

        if (!geojsonUrl) {
          throw new Error('Soil layer GeoJSON URL is missing.');
        }

        const layerRes = await fetch(geojsonUrl, {
          signal: controller.signal,
        });
        if (!layerRes.ok) {
          throw new Error(`Soil layer request failed: ${layerRes.status}`);
        }
        const layerGeoJson = await layerRes.json();
        setSoilLayerData(layerGeoJson);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to load soil layer', error);
          setSoilLayerError(error.message || 'Failed to load soil layer.');
          setIsSoilLayerVisible(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSoilLayerLoading(false);
        }
      }
    };

    loadSoilLayer();
    return () => controller.abort();
  }, [isSoilLayerVisible, soilLayerData]);

  // Fetch coordinates for GIS, Young Farmers, Career Groups, Forecast Plots, and Fire Hotspots from Supabase
  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        // Fetch Young Farmers (all that have coordinates)
        const { data: youngFarmerData } = await supabase
          .from('young_farmer_groups_detailed')
          .select(
            'group_name, district, subdistrict, member_count, activity, lat, lon'
          )
          .not('lat', 'is', null)
          .not('lon', 'is', null);

        // Fetch Agricultural Career Groups (all that have coordinates)
        const { data: careerGroupData } = await supabase
          .from('agricultural_career_groups')
          .select(
            'group_name, district, subdistrict, member_count, activity, lat, lon'
          )
          .not('lat', 'is', null)
          .not('lon', 'is', null);

        // Fetch Forecast Plots (all that have coord_x, coord_y)
        const { data: forecastData } = await supabase
          .from('forecast_plots')
          .select(
            'id, district, subdistrict, crop_type, planted_area_rai, crop_status, coord_x, coord_y'
          );

        // Fetch Fire Hotspots (all that have coordinates)
        const { data: hotspotData } = await supabase
          .from('fire_hotspots')
          .select(
            'id, acq_date, acq_time, confidence, frp, district, subdistrict, latitude, longitude'
          )
          .not('latitude', 'is', null);

        // Parse Young Farmer
        const youngFarmerPts = (youngFarmerData || [])
          .map((r) => ({
            name: r.group_name,
            district: r.district,
            subdistrict: r.subdistrict,
            memberCount: r.member_count,
            activity: r.activity,
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            type: 'young_farmer',
            typeLabel: 'กลุ่มยุวเกษตรกร',
          }))
          .filter((p) => !isNaN(p.lat) && !isNaN(p.lon));

        // Parse Career Group
        const careerGroupPts = (careerGroupData || [])
          .map((r) => ({
            name: r.group_name,
            district: r.district,
            subdistrict: r.subdistrict,
            memberCount: r.member_count,
            activity: r.activity,
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
            type: 'career_group',
            typeLabel: 'กลุ่มอาชีพการเกษตร',
          }))
          .filter((p) => !isNaN(p.lat) && !isNaN(p.lon));

        // Parse Forecast (UTM to Lat/Lng)
        const forecastPts = (forecastData || [])
          .map((item) => {
            const x = parseFloat(item.coord_x);
            const y = parseFloat(item.coord_y);
            if (isNaN(x) || isNaN(y) || x === 0 || y === 0) return null;
            const { lat, lng } = utmToLatLng(x, y, 47, 'N');
            if (lat === 0 && lng === 0) return null;
            return {
              id: item.id,
              name: item.crop_type
                ? `แปลงพยากรณ์ ${item.crop_type}`
                : 'แปลงพยากรณ์',
              district: item.district,
              subdistrict: item.subdistrict,
              lat,
              lon: lng,
              type: 'forecast',
              typeLabel: 'แปลงพยากรณ์',
              cropType: item.crop_type,
              area: item.planted_area_rai,
              status: item.crop_status,
            };
          })
          .filter(Boolean);

        // Parse Hotspots
        const hotspotPts = (hotspotData || [])
          .map((r) => ({
            id: r.id,
            name: `จุดความร้อน ${r.acq_date} ${r.acq_time ? r.acq_time.substring(0, 2) + ':' + r.acq_time.substring(2) + ' น.' : ''}`,
            district: r.district,
            subdistrict: r.subdistrict,
            lat: parseFloat(r.latitude),
            lon: parseFloat(r.longitude),
            confidence: r.confidence,
            frp: r.frp,
            type: 'hotspot',
            typeLabel: 'จุดความร้อนสะสม',
          }))
          .filter((p) => !isNaN(p.lat) && !isNaN(p.lon));

        setAllCoords({
          young_farmer: youngFarmerPts,
          career_group: careerGroupPts,
          forecast: forecastPts,
          hotspot: hotspotPts,
        });
      } catch (err) {
        console.error('Error fetching map coordinates data:', err);
      }
    };

    fetchCoordinates();
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
      setSelectedSubdistrict(null);
      setSelectedDistrict({
        name,
        areaSqkm,
      });
    },
    [geoJSONData]
  );

  const handleSearchChange = useCallback((val) => {
    setSearchQuery(val);
  }, []);

  // Toggle marker layers (mutually exclusive)
  const toggleLayer = useCallback((key) => {
    setVisibleLayers((prev) => {
      const nextState = {};
      Object.keys(prev).forEach((k) => {
        nextState[k] = k === key ? !prev[k] : false;
      });
      return nextState;
    });
  }, []);

  const toggleSoilLayer = useCallback(() => {
    setIsSoilLayerVisible((prev) => !prev);
  }, []);

  // Close panel with animation
  const closePanel = useCallback(() => {
    setPanelClosing(true);
    setTimeout(() => {
      setSelectedDistrict(null);
      setSelectedSubdistrict(null);
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

  // Compute choropleth min/max
  const { minVal, maxVal } = useMemo(() => {
    if (!districtStats || Object.keys(districtStats).length === 0)
      return { minVal: 0, maxVal: 1 };
    if (!activeMetric) return { minVal: 0, maxVal: 1 };
    const vals = Object.values(districtStats).map((d) => d[activeMetric] || 0);
    return { minVal: Math.min(...vals), maxVal: Math.max(...vals, 1) };
  }, [districtStats, activeMetric]);

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

  // Get selected district data for panel
  const selectedData = useMemo(() => {
    if (!selectedDistrict || !districtStats) return null;
    return districtStats[selectedDistrict.name] || null;
  }, [selectedDistrict, districtStats]);

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
  if (!MapComponents || !geoJSONData || dataLoading) {
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
        isSoilLayerVisible={isSoilLayerVisible}
        soilLayerTitle={
          SOIL_LAYER_URL || SOIL_LAYER_METADATA_URL
            ? 'Load LDD soil series polygons from external storage'
            : 'Set VITE_SOIL_LAYER_URL or VITE_SOIL_LAYER_METADATA_URL'
        }
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

      {/* ===== DISTRICT DETAIL PANEL ===== */}
      {selectedDistrict && selectedData && (
        <div
          className={`district-panel ${panelClosing ? 'district-panel-closing' : ''}`}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="panel-drag-handle"></div>
          <div className="panel-header">
            <div>
              <div className="panel-district-name">
                อ.{selectedDistrict.name}
              </div>
              <div className="panel-district-area">
                พื้นที่ {selectedDistrict.areaSqkm?.toFixed(1)} ตร.กม.
                {selectedSubdistrict ? ` | ต.${selectedSubdistrict.name}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="panel-compare-btn"
                onClick={() => {
                  setIsCompareOpen(true);
                  const otherDistricts = Object.keys(DISTRICT_CENTROIDS).filter(
                    (n) => n !== selectedDistrict.name
                  );
                  setCompareWithDistrictName(otherDistricts[0]);
                }}
                title="เปรียบเทียบข้อมูลรายอำเภอ"
              >
                📊 เปรียบเทียบ
              </button>
              <button
                className="panel-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  closePanel();
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* ===== WEATHER & PM2.5 CARD ===== */}
          <div className="panel-section weather-live-card">
            <div className="panel-section-title">
              🌤️ สภาพอากาศสดและฝุ่น PM2.5
            </div>
            {weatherData[selectedDistrict.name] ? (
              (() => {
                const w = weatherData[selectedDistrict.name];
                if (w.loading) {
                  return (
                    <div className="weather-loading">
                      กำลังโหลดข้อมูลสภาพอากาศ...
                    </div>
                  );
                }
                if (w.error) {
                  return (
                    <div className="weather-error">
                      ไม่สามารถดึงข้อมูลสภาพอากาศได้
                    </div>
                  );
                }
                const weatherInfo = getWeatherDetails(w.weatherCode);
                const pmColor = getPm25Color(w.pm25);
                const pmLabel = getPm25LevelLabel(w.pm25);
                return (
                  <div className="weather-detail-grid">
                    <div className="weather-main-info">
                      <span className="weather-icon-large">
                        {weatherInfo.icon}
                      </span>
                      <div>
                        <div className="weather-temp-val">
                          {w.temp !== null ? `${w.temp}°C` : '--'}
                        </div>
                        <div className="weather-desc">{weatherInfo.label}</div>
                      </div>
                    </div>
                    <div
                      className="weather-pm25-card"
                      style={{ borderLeftColor: pmColor }}
                    >
                      <div className="pm25-val-wrapper">
                        <span
                          className="pm25-number"
                          style={{ color: pmColor }}
                        >
                          {w.pm25 !== null ? w.pm25 : '--'}
                        </span>
                        <span className="pm25-unit">µg/m³</span>
                      </div>
                      <div
                        className="pm25-badge"
                        style={{
                          backgroundColor: pmColor + '15',
                          color: pmColor,
                        }}
                      >
                        {pmLabel}
                      </div>
                      <div className="pm25-label">ระดับฝุ่น PM2.5</div>
                    </div>
                    <div className="weather-sub-details">
                      <div className="weather-sub-item">
                        <span className="sub-icon">💧</span>
                        <div>
                          <div className="sub-val">
                            {w.humidity !== null ? `${w.humidity}%` : '--'}
                          </div>
                          <div className="sub-lbl">ความชื้น</div>
                        </div>
                      </div>
                      <div className="weather-sub-item">
                        <span className="sub-icon">💨</span>
                        <div>
                          <div className="sub-val">
                            {w.windSpeed !== null
                              ? `${w.windSpeed} กม./ชม.`
                              : '--'}
                          </div>
                          <div className="sub-lbl">ความเร็วลม</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="weather-loading">กำลังโหลดข้อมูลสภาพอากาศ...</div>
            )}
          </div>

          <div className="panel-section">
            <div className="panel-section-title">ตัวชี้วัดหลัก</div>
            <div className="panel-stats-grid">
              <div className="panel-stat">
                <div className="panel-stat-icon">🌾</div>
                <div className="panel-stat-value">
                  {(selectedData.area || 0).toLocaleString()}
                </div>
                <div className="panel-stat-label">พื้นที่เกษตร (ไร่)</div>
              </div>
              <div className="panel-stat">
                <div className="panel-stat-icon">🏠</div>
                <div className="panel-stat-value">
                  {(selectedData.house || 0).toLocaleString()}
                </div>
                <div className="panel-stat-label">ครัวเรือนเกษตรกร</div>
              </div>
              <div className="panel-stat">
                <div className="panel-stat-icon">🤝</div>
                <div className="panel-stat-value">
                  {(selectedData.ce || 0).toLocaleString()}
                </div>
                <div className="panel-stat-label">วิสาหกิจชุมชน</div>
              </div>
              <div className="panel-stat">
                <div className="panel-stat-icon">🌱</div>
                <div className="panel-stat-value">
                  {(selectedData.lp || 0).toLocaleString()}
                </div>
                <div className="panel-stat-label">แปลงใหญ่</div>
              </div>
            </div>
          </div>

          {cropChartData.length > 0 && (
            <div className="panel-section">
              <div className="panel-section-title">
                สัดส่วนพื้นที่เพาะปลูก (ไร่)
              </div>
              <MiniBarChart data={cropChartData} />
            </div>
          )}

          {/* ===== POLICY SIMULATION SECTION ===== */}
          <div className="panel-section policy-simulation">
            <div className="panel-section-title">
              🎛️ จำลองผลลัพธ์การปรับนโยบาย (What-If)
            </div>

            {/* Rice conversion slider */}
            <div className="simulation-slider-group">
              <div className="slider-header">
                <span className="slider-label">
                  เปลี่ยนนาปรังเป็นพืชสวน/พืชไร่
                </span>
                <span className="slider-value">{simRiceConversion}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={simRiceConversion}
                onChange={(e) => setSimRiceConversion(parseInt(e.target.value))}
                disabled={!(selectedData.ricePrung > 0)}
                className="sim-range-input"
              />
              {!(selectedData.ricePrung > 0) && (
                <div className="slider-hint-disabled">
                  ไม่มีพื้นที่นาปรังในอำเภอนี้
                </div>
              )}
            </div>

            {/* Residue management slider */}
            <div className="simulation-slider-group">
              <div className="slider-header">
                <span className="slider-label">
                  ลดการเผาเศษวัสดุทางการเกษตร
                </span>
                <span className="slider-value">{simResidueManagement}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={simResidueManagement}
                onChange={(e) =>
                  setSimResidueManagement(parseInt(e.target.value))
                }
                disabled={
                  !(
                    (selectedData.ricePi || 0) + (selectedData.ricePrung || 0) >
                    0
                  )
                }
                className="sim-range-input"
              />
              {!(
                (selectedData.ricePi || 0) + (selectedData.ricePrung || 0) >
                0
              ) && (
                <div className="slider-hint-disabled">
                  ไม่มีพื้นที่ปลูกข้าวในอำเภอนี้
                </div>
              )}
            </div>

            {/* Simulation results grid */}
            <div className="simulation-results-grid">
              <div className="sim-result-card water-saved">
                <div className="sim-card-icon">💧</div>
                <div className="sim-card-value">
                  {simulationResults.waterSaved.toLocaleString()}
                </div>
                <div className="sim-card-label">ประหยัดน้ำสะสม (ลบ.ม.)</div>
              </div>
              <div className="sim-result-card income-added">
                <div className="sim-card-icon">💰</div>
                <div className="sim-card-value">
                  +{simulationResults.incomeAdded.toLocaleString()}
                </div>
                <div className="sim-card-label">
                  รายได้เกษตรกรที่เพิ่ม (บาท)
                </div>
              </div>
              <div className="sim-result-card co2-reduced">
                <div className="sim-card-icon">🍃</div>
                <div className="sim-card-value">
                  {simulationResults.co2Reduced.toLocaleString(undefined, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                </div>
                <div className="sim-card-label">ลดปล่อย CO2e (ตัน)</div>
              </div>
              <div className="sim-result-card hotspot-reduction">
                <div className="sim-card-icon">🔥</div>
                <div className="sim-card-value">
                  -
                  {simulationResults.hotspotReduction.toLocaleString(
                    undefined,
                    { minimumFractionDigits: 1, maximumFractionDigits: 1 }
                  )}
                  %
                </div>
                <div className="sim-card-label">ลดจุดความร้อนเกษตร</div>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section-title">ศูนย์เรียนรู้และกลุ่ม</div>
            <div className="panel-mini-stats">
              <div className="panel-mini-stat">
                <div className="panel-mini-stat-value">
                  {selectedData.lc || 0}
                </div>
                <div className="panel-mini-stat-label">ศพก.</div>
              </div>
              <div className="panel-mini-stat">
                <div className="panel-mini-stat-value">
                  {selectedData.pc || 0}
                </div>
                <div className="panel-mini-stat-label">ศจช.</div>
              </div>
              <div className="panel-mini-stat">
                <div className="panel-mini-stat-value">
                  {selectedData.sfc || 0}
                </div>
                <div className="panel-mini-stat-label">ศดปช.</div>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section-title">กลุ่มสถาบันเกษตรกร</div>
            <div className="panel-mini-stats">
              <div className="panel-mini-stat">
                <div className="panel-mini-stat-value">
                  {selectedData.instHousewives || 0}
                </div>
                <div className="panel-mini-stat-label">แม่บ้าน</div>
              </div>
              <div className="panel-mini-stat">
                <div className="panel-mini-stat-value">
                  {selectedData.instYoung || 0}
                </div>
                <div className="panel-mini-stat-label">ยุวเกษตร</div>
              </div>
              <div className="panel-mini-stat">
                <div className="panel-mini-stat-value">
                  {selectedData.instCareer || 0}
                </div>
                <div className="panel-mini-stat-label">อาชีพ</div>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section-title">เกษตรกรปราดเปรื่อง (ราย)</div>
            <div
              className="panel-mini-stats"
              style={{ gridTemplateColumns: '1fr 1fr' }}
            >
              <div className="panel-mini-stat">
                <div className="panel-mini-stat-value">
                  {selectedData.sfSfCount || 0}
                </div>
                <div className="panel-mini-stat-label">Smart Farmer</div>
              </div>
              <div className="panel-mini-stat">
                <div className="panel-mini-stat-value">
                  {selectedData.ysfCount || 0}
                </div>
                <div className="panel-mini-stat-label">Young Smart</div>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section-title">ภัยพิบัติและจุดความร้อน</div>
            <div className="panel-stats-grid">
              <div className="panel-stat">
                <div className="panel-stat-icon">⚠️</div>
                <div className="panel-stat-value">
                  {(selectedData.disasterArea || 0).toLocaleString()}
                </div>
                <div className="panel-stat-label">พื้นที่ภัยพิบัติ (ไร่)</div>
              </div>
              <div className="panel-stat">
                <div className="panel-stat-icon">🐛</div>
                <div className="panel-stat-value">
                  {(selectedData.pestArea || 0).toLocaleString()}
                </div>
                <div className="panel-stat-label">ศัตรูพืชระบาด (ไร่)</div>
              </div>
              <div
                className="panel-stat"
                style={{
                  gridColumn: 'span 2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                }}
              >
                <span style={{ fontSize: '20px' }}>🔥</span>
                <div style={{ textAlign: 'left' }}>
                  <div className="panel-stat-value">
                    {selectedData.fireCount || 0}
                  </div>
                  <div className="panel-stat-label">จุดความร้อน PM2.5 สะสม</div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== AI INSIGHTS SECTION ===== */}
          <div className="panel-section ai-insights-section">
            <div className="panel-section-title">
              🤖 คำแนะนำยุทธศาสตร์เชิงพื้นที่ (AI Insight)
            </div>

            {aiError && (
              <div className="ai-error-banner">
                <span className="ai-error-icon">⚠️</span>
                <span className="ai-error-text">{aiError}</span>
                <button
                  className="ai-retry-btn"
                  onClick={() => handleGenerateAIInsight(selectedDistrict.name)}
                >
                  ลองใหม่
                </button>
              </div>
            )}

            {aiLoading && (
              <div className="ai-loading-container">
                <div className="ai-pulse-loader">
                  <div className="ai-pulse-bar" />
                  <div className="ai-pulse-bar" />
                  <div className="ai-pulse-bar" />
                </div>
                <div className="ai-loading-text">
                  Gemini กำลังวิเคราะห์ข้อมูลเชิงลึก...
                </div>
              </div>
            )}

            {!aiLoading && !aiError && !aiInsights[selectedDistrict.name] && (
              <button
                className="ai-generate-btn"
                onClick={() => handleGenerateAIInsight(selectedDistrict.name)}
              >
                <span className="ai-btn-sparkle">✨</span>{' '}
                วิเคราะห์ศักยภาพพื้นที่ด้วย AI
              </button>
            )}

            {!aiLoading && !aiError && aiInsights[selectedDistrict.name] && (
              <div className="ai-insight-card">
                <div className="ai-insight-header">
                  <span className="ai-insight-tag">🪄 Gemini Analyst</span>
                  <button
                    className="ai-refresh-btn"
                    onClick={() =>
                      handleGenerateAIInsight(selectedDistrict.name)
                    }
                    title="วิเคราะห์ใหม่"
                  >
                    🔄
                  </button>
                </div>
                <div className="ai-insight-content">
                  {aiInsights[selectedDistrict.name]}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== KPI STATS BAR ===== */}
      {!selectedDistrict && <SmartMapKpiBar totals={totals} />}

      {/* ===== DISTRICT COMPARISON MODAL ===== */}
      {isCompareOpen && selectedDistrict && selectedData && (
        <div
          className="district-compare-modal-overlay"
          onClick={() => setIsCompareOpen(false)}
        >
          <div
            className="district-compare-modal"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="compare-modal-header">
              <h2>📊 เปรียบเทียบข้อมูลรายอำเภอ (District Comparison)</h2>
              <button
                className="compare-modal-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCompareOpen(false);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setIsCompareOpen(false);
                }}
              >
                ✕
              </button>
            </div>

            <div className="compare-modal-body">
              {/* Column A (Selected District) */}
              <div className="compare-column compare-column-a">
                <div className="compare-column-header">
                  <div className="compare-district-title">
                    อ.{selectedDistrict.name} (หลัก)
                  </div>
                  <div className="compare-district-subtitle">
                    พื้นที่ {selectedDistrict.areaSqkm?.toFixed(1)} ตร.กม.
                  </div>
                </div>

                {/* Stats A */}
                <div className="compare-section">
                  <h3>🌾 สถิติหลัก</h3>
                  <div className="compare-stat-row">
                    <span>พื้นที่เกษตรกรรม</span>
                    <strong>
                      {(selectedData.area || 0).toLocaleString()} ไร่
                    </strong>
                  </div>
                  <div className="compare-stat-row">
                    <span>ครัวเรือนเกษตร</span>
                    <strong>
                      {(selectedData.house || 0).toLocaleString()} ราย
                    </strong>
                  </div>
                  <div className="compare-stat-row">
                    <span>วิสาหกิจชุมชน</span>
                    <strong>
                      {(selectedData.ce || 0).toLocaleString()} แห่ง
                    </strong>
                  </div>
                  <div className="compare-stat-row">
                    <span>แปลงใหญ่</span>
                    <strong>
                      {(selectedData.lp || 0).toLocaleString()} แปลง
                    </strong>
                  </div>
                  <div className="compare-stat-row">
                    <span>Smart Farmer</span>
                    <strong>
                      {(selectedData.sfSfCount || 0).toLocaleString()} ราย
                    </strong>
                  </div>
                  <div className="compare-stat-row">
                    <span>Young Smart Farmer</span>
                    <strong>
                      {(selectedData.ysfCount || 0).toLocaleString()} ราย
                    </strong>
                  </div>
                </div>

                {/* Weather A */}
                <div className="compare-section compare-weather">
                  <h3>🌤️ อากาศสด & PM2.5</h3>
                  {weatherData[selectedDistrict.name] ? (
                    (() => {
                      const w = weatherData[selectedDistrict.name];
                      const weatherInfo = getWeatherDetails(w.weatherCode);
                      const pmColor = getPm25Color(w.pm25);
                      return (
                        <div className="compare-weather-grid">
                          <div className="compare-weather-main">
                            <span className="compare-weather-icon">
                              {weatherInfo.icon}
                            </span>
                            <span>
                              {w.temp !== null ? `${w.temp}°C` : '--'} (
                              {weatherInfo.label})
                            </span>
                          </div>
                          <div
                            className="compare-pm-badge"
                            style={{
                              backgroundColor: pmColor + '15',
                              color: pmColor,
                              borderColor: pmColor,
                            }}
                          >
                            PM2.5: {w.pm25 !== null ? w.pm25 : '--'} µg/m³ (
                            {getPm25LevelLabel(w.pm25)})
                          </div>
                          <div className="compare-weather-subs">
                            <span>
                              💧 ชื้น:{' '}
                              {w.humidity !== null ? `${w.humidity}%` : '--'}
                            </span>
                            <span>
                              💨 ลม:{' '}
                              {w.windSpeed !== null
                                ? `${w.windSpeed} กม./ชม.`
                                : '--'}
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="compare-no-data">ไม่มีข้อมูลสภาพอากาศ</div>
                  )}
                </div>

                {/* Crops A */}
                <div className="compare-section">
                  <h3>🚜 สัดส่วนพื้นที่เพาะปลูก</h3>
                  <MiniBarChart data={cropChartData} />
                </div>

                {/* Disasters & Fire A */}
                <div className="compare-section">
                  <h3>⚠️ ภัยพิบัติ & จุดความร้อน</h3>
                  <div className="compare-stat-row">
                    <span>พื้นที่ประสบภัย</span>
                    <strong>
                      {(selectedData.disasterArea || 0).toLocaleString()} ไร่
                    </strong>
                  </div>
                  <div className="compare-stat-row">
                    <span>ศัตรูพืชระบาด</span>
                    <strong>
                      {(selectedData.pestArea || 0).toLocaleString()} ไร่
                    </strong>
                  </div>
                  <div className="compare-stat-row">
                    <span>จุดความร้อนสะสม</span>
                    <strong>
                      {(selectedData.fireCount || 0).toLocaleString()} จุด
                    </strong>
                  </div>
                </div>

                {/* What-If A */}
                <div className="compare-section compare-policy-box">
                  <h3>🎛️ จำลองผลลัพธ์ยุทธศาสตร์ (What-If)</h3>

                  <div className="simulation-slider-group">
                    <div className="slider-header">
                      <span className="slider-label">
                        เปลี่ยนนาปรัง: {simRiceConversion}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={simRiceConversion}
                      onChange={(e) =>
                        setSimRiceConversion(parseInt(e.target.value))
                      }
                      disabled={!(selectedData.ricePrung > 0)}
                      className="sim-range-input"
                    />
                  </div>

                  <div className="simulation-slider-group">
                    <div className="slider-header">
                      <span className="slider-label">
                        ลดการเผา: {simResidueManagement}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={simResidueManagement}
                      onChange={(e) =>
                        setSimResidueManagement(parseInt(e.target.value))
                      }
                      disabled={
                        !(
                          (selectedData.ricePi || 0) +
                            (selectedData.ricePrung || 0) >
                          0
                        )
                      }
                      className="sim-range-input"
                    />
                  </div>

                  <div className="compare-sim-results">
                    <div className="sim-res-item">
                      💧 ประหยัดน้ำ:{' '}
                      <strong>
                        {simulationResults.waterSaved.toLocaleString()}
                      </strong>{' '}
                      ลบ.ม.
                    </div>
                    <div className="sim-res-item">
                      💰 รายได้เพิ่ม:{' '}
                      <strong>
                        +{simulationResults.incomeAdded.toLocaleString()}
                      </strong>{' '}
                      บาท
                    </div>
                    <div className="sim-res-item">
                      🍃 ลด CO2e:{' '}
                      <strong>{simulationResults.co2Reduced.toFixed(1)}</strong>{' '}
                      ตัน
                    </div>
                    <div className="sim-res-item">
                      🔥 ลดจุดร้อน:{' '}
                      <strong>
                        -{simulationResults.hotspotReduction.toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column B (District to compare) */}
              <div className="compare-column compare-column-b">
                <div className="compare-column-header">
                  <div className="compare-selector-wrapper">
                    <label>เปรียบเทียบกับ:</label>
                    <select
                      value={compareWithDistrictName || ''}
                      onChange={(e) =>
                        setCompareWithDistrictName(e.target.value)
                      }
                      className="compare-district-select"
                    >
                      {Object.keys(DISTRICT_CENTROIDS)
                        .filter((n) => n !== selectedDistrict.name)
                        .map((name) => (
                          <option key={name} value={name}>
                            อ.{name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="compare-district-subtitle">
                    พื้นที่{' '}
                    {geoJSONData.features
                      ?.find(
                        (f) => f.properties?.amp_th === compareWithDistrictName
                      )
                      ?.properties?.area_sqkm?.toFixed(1) || '--'}{' '}
                    ตร.กม.
                  </div>
                </div>

                {(() => {
                  const compData = districtStats[compareWithDistrictName];
                  if (!compData)
                    return (
                      <div className="compare-no-data">
                        ไม่มีข้อมูลสำหรับอำเภอนี้
                      </div>
                    );

                  // Comp Crop Data
                  const compCropChartData = [
                    {
                      label: 'นาปี',
                      value: compData.ricePi || 0,
                      color: '#22c55e',
                    },
                    {
                      label: 'นาปรัง',
                      value: compData.ricePrung || 0,
                      color: '#3b82f6',
                    },
                    {
                      label: 'พืชไร่',
                      value: compData.field || 0,
                      color: '#eab308',
                    },
                    {
                      label: 'ไม้ผล',
                      value: compData.fruit || 0,
                      color: '#f97316',
                    },
                    {
                      label: 'ผัก/สมุนไพร',
                      value: (compData.veg || 0) + (compData.herb || 0),
                      color: '#8b5cf6',
                    },
                    {
                      label: 'ไม้ดอก',
                      value: compData.flow || 0,
                      color: '#ec4899',
                    },
                  ].filter((d) => d.value > 0);

                  // Comp Simulation results
                  const compRicePrung = compData.ricePrung || 0;
                  const compRicePi = compData.ricePi || 0;
                  const compTotalRice = compRicePrung + compRicePi;
                  const compWaterSaved = Math.round(
                    compRicePrung * (compSimRiceConversion / 100) * 600
                  );
                  const compIncomeAdded = Math.round(
                    compRicePrung * (compSimRiceConversion / 100) * 12000
                  );
                  const compHotspotReduction = compSimResidueManagement * 0.8;
                  const compCo2Reduced =
                    compTotalRice * (compSimResidueManagement / 100) * 0.35;

                  return (
                    <>
                      {/* Stats B */}
                      <div className="compare-section">
                        <h3>🌾 สถิติหลัก</h3>
                        <div className="compare-stat-row">
                          <span>พื้นที่เกษตรกรรม</span>
                          <strong>
                            {(compData.area || 0).toLocaleString()} ไร่
                          </strong>
                        </div>
                        <div className="compare-stat-row">
                          <span>ครัวเรือนเกษตร</span>
                          <strong>
                            {(compData.house || 0).toLocaleString()} ราย
                          </strong>
                        </div>
                        <div className="compare-stat-row">
                          <span>วิสาหกิจชุมชน</span>
                          <strong>
                            {(compData.ce || 0).toLocaleString()} แห่ง
                          </strong>
                        </div>
                        <div className="compare-stat-row">
                          <span>แปลงใหญ่</span>
                          <strong>
                            {(compData.lp || 0).toLocaleString()} แปลง
                          </strong>
                        </div>
                        <div className="compare-stat-row">
                          <span>Smart Farmer</span>
                          <strong>
                            {(compData.sfSfCount || 0).toLocaleString()} ราย
                          </strong>
                        </div>
                        <div className="compare-stat-row">
                          <span>Young Smart Farmer</span>
                          <strong>
                            {(compData.ysfCount || 0).toLocaleString()} ราย
                          </strong>
                        </div>
                      </div>

                      {/* Weather B */}
                      <div className="compare-section compare-weather">
                        <h3>🌤️ อากาศสด & PM2.5</h3>
                        {weatherData[compareWithDistrictName] ? (
                          (() => {
                            const w = weatherData[compareWithDistrictName];
                            const weatherInfo = getWeatherDetails(
                              w.weatherCode
                            );
                            const pmColor = getPm25Color(w.pm25);
                            return (
                              <div className="compare-weather-grid">
                                <div className="compare-weather-main">
                                  <span className="compare-weather-icon">
                                    {weatherInfo.icon}
                                  </span>
                                  <span>
                                    {w.temp !== null ? `${w.temp}°C` : '--'} (
                                    {weatherInfo.label})
                                  </span>
                                </div>
                                <div
                                  className="compare-pm-badge"
                                  style={{
                                    backgroundColor: pmColor + '15',
                                    color: pmColor,
                                    borderColor: pmColor,
                                  }}
                                >
                                  PM2.5: {w.pm25 !== null ? w.pm25 : '--'} µg/m³
                                  ({getPm25LevelLabel(w.pm25)})
                                </div>
                                <div className="compare-weather-subs">
                                  <span>
                                    💧 ชื้น:{' '}
                                    {w.humidity !== null
                                      ? `${w.humidity}%`
                                      : '--'}
                                  </span>
                                  <span>
                                    💨 ลม:{' '}
                                    {w.windSpeed !== null
                                      ? `${w.windSpeed} กม./ชม.`
                                      : '--'}
                                  </span>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="compare-no-data">
                            ไม่มีข้อมูลสภาพอากาศ
                          </div>
                        )}
                      </div>

                      {/* Crops B */}
                      <div className="compare-section">
                        <h3>🚜 สัดส่วนพื้นที่เพาะปลูก</h3>
                        <MiniBarChart data={compCropChartData} />
                      </div>

                      {/* Disasters & Fire B */}
                      <div className="compare-section">
                        <h3>⚠️ ภัยพิบัติ & จุดความร้อน</h3>
                        <div className="compare-stat-row">
                          <span>พื้นที่ประสบภัย</span>
                          <strong>
                            {(compData.disasterArea || 0).toLocaleString()} ไร่
                          </strong>
                        </div>
                        <div className="compare-stat-row">
                          <span>ศัตรูพืชระบาด</span>
                          <strong>
                            {(compData.pestArea || 0).toLocaleString()} ไร่
                          </strong>
                        </div>
                        <div className="compare-stat-row">
                          <span>จุดความร้อนสะสม</span>
                          <strong>
                            {(compData.fireCount || 0).toLocaleString()} จุด
                          </strong>
                        </div>
                      </div>

                      {/* What-If B */}
                      <div className="compare-section compare-policy-box">
                        <h3>🎛️ จำลองผลลัพธ์ยุทธศาสตร์ (What-If)</h3>

                        <div className="simulation-slider-group">
                          <div className="slider-header">
                            <span className="slider-label">
                              เปลี่ยนนาปรัง: {compSimRiceConversion}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="5"
                            value={compSimRiceConversion}
                            onChange={(e) =>
                              setCompSimRiceConversion(parseInt(e.target.value))
                            }
                            disabled={!(compData.ricePrung > 0)}
                            className="sim-range-input"
                          />
                        </div>

                        <div className="simulation-slider-group">
                          <div className="slider-header">
                            <span className="slider-label">
                              ลดการเผา: {compSimResidueManagement}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="10"
                            value={compSimResidueManagement}
                            onChange={(e) =>
                              setCompSimResidueManagement(
                                parseInt(e.target.value)
                              )
                            }
                            disabled={
                              !(
                                (compData.ricePi || 0) +
                                  (compData.ricePrung || 0) >
                                0
                              )
                            }
                            className="sim-range-input"
                          />
                        </div>

                        <div className="compare-sim-results">
                          <div className="sim-res-item">
                            💧 ประหยัดน้ำ:{' '}
                            <strong>{compWaterSaved.toLocaleString()}</strong>{' '}
                            ลบ.ม.
                          </div>
                          <div className="sim-res-item">
                            💰 รายได้เพิ่ม:{' '}
                            <strong>+{compIncomeAdded.toLocaleString()}</strong>{' '}
                            บาท
                          </div>
                          <div className="sim-res-item">
                            🍃 ลด CO2e:{' '}
                            <strong>{compCo2Reduced.toFixed(1)}</strong> ตัน
                          </div>
                          <div className="sim-res-item">
                            🔥 ลดจุดร้อน:{' '}
                            <strong>-{compHotspotReduction.toFixed(1)}%</strong>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
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
        weatherData={weatherData}
        getDistrictColor={getDistrictColor}
        getWeatherDetails={getWeatherDetails}
        getPm25Color={getPm25Color}
        getPm25LevelLabel={getPm25LevelLabel}
        setPanelClosing={setPanelClosing}
        setSelectedDistrict={setSelectedDistrict}
        setSelectedSubdistrict={setSelectedSubdistrict}
        isSoilLayerVisible={isSoilLayerVisible}
        soilLayerData={soilLayerData}
        soilLayerMeta={soilLayerMeta}
        showSubdistrictLayer={showSubdistrictLayer}
        mapZoom={mapZoom}
        visibleSubdistrictFeatures={visibleSubdistrictFeatures}
        markerLayers={MARKER_LAYERS}
        visibleLayers={visibleLayers}
        allCoords={allCoords}
      />
    </div>
  );
}

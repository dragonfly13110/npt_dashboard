import { lazy } from 'react';

export const widgetDetailRegistry = {
  weather: {
    title: 'รายละเอียดสภาพอากาศ',
    component: lazy(() => import('../../widgets/WeatherWidget')),
  },
  airQuality: {
    title: 'รายละเอียดคุณภาพอากาศ',
    component: lazy(() => import('../../widgets/AirQualityWidget')),
  },
  hotspots: {
    title: 'รายละเอียดจุดความร้อนสะสม',
    component: lazy(() => import('../../widgets/HotspotWidget')),
  },
  prices: {
    title: 'ราคาสินค้าเกษตรรายวัน',
    component: lazy(() => import('../../widgets/AgriPricesWidget')),
  },
  soilMoisture: {
    title: 'รายละเอียดความชื้นดินรายอำเภอ',
    component: lazy(() => import('../../widgets/SoilMoistureWidget')),
    props: { defaultExpanded: true },
  },
  reservoir: {
    title: 'รายละเอียดสถานการณ์น้ำ',
    component: lazy(() => import('../../widgets/DamReservoirWidget')),
    props: { defaultExpanded: true },
  },
  diseaseForecast: {
    title: 'รายละเอียดพยากรณ์และเตือนภัยโรค-แมลงศัตรูพืช',
    component: lazy(() => import('../../widgets/DiseaseForecastDetail')),
  },
  farmerInstitutes: {
    title: 'ข้อมูลเกษตรกรและสถาบันเกษตรกร',
    component: lazy(() => import('../../widgets/FarmerInstitutesV2Widget')),
  },
};

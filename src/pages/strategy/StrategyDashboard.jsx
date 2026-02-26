import GroupDashboard from '../../components/GroupDashboard';

const tables = [
    { table: 'farmer_registry', label: 'ทะเบียนเกษตรกร', icon: '📋', color: 'purple' },
    { table: 'gis_areas', label: 'พิกัด GIS', icon: '📍', color: 'blue' },
    { table: 'disasters', label: 'ภัยพิบัติ', icon: '⚡', color: 'red' },
    { table: 'kpi_plans', label: 'แผน/KPI', icon: '🎯', color: 'orange' },
];

export default function StrategyDashboard() {
    return <GroupDashboard title="ยุทธศาสตร์และสารสนเทศ" icon="🎯" color="blue" tables={tables} />;
}

import GroupDashboard from '../../components/GroupDashboard';

const tables = [
    { table: 'pest_outbreaks', label: 'พื้นที่ระบาด', icon: '🐛', color: 'red' },
    { table: 'pest_centers', label: 'ศจช.', icon: '🏥', color: 'blue' },
    { table: 'biocontrol_stock', label: 'ชีวภัณฑ์', icon: '🧪', color: 'green' },
    { table: 'fire_hotspots', label: 'จุดเฝ้าระวัง PM2.5', icon: '🔥', color: 'orange' },
];

export default function ProtectionDashboard() {
    return <GroupDashboard title="อารักขาพืช" icon="🛡️" color="red" tables={tables} />;
}

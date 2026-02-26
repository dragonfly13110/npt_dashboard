import GroupDashboard from '../../components/GroupDashboard';

const tables = [
    { table: 'personnel', label: 'บุคลากร', icon: '👥', color: 'green' },
    { table: 'assets', label: 'พัสดุ/ครุภัณฑ์', icon: '💻', color: 'blue' },
    { table: 'budgets', label: 'งบประมาณ', icon: '💰', color: 'orange' },
];

export default function AdminDashboard() {
    return <GroupDashboard title="ฝ่ายบริหารทั่วไป" icon="🏢" color="green" tables={tables} />;
}

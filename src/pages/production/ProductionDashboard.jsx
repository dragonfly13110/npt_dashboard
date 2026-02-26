import GroupDashboard from '../../components/GroupDashboard';

const tables = [
    { table: 'large_plots', label: 'แปลงใหญ่', icon: '🌾', color: 'green' },
    { table: 'learning_centers', label: 'ศพก.', icon: '🏫', color: 'blue' },
    { table: 'certifications', label: 'มาตรฐาน GAP', icon: '✅', color: 'orange' },
    { table: 'crop_production', label: 'ผลผลิตพืช', icon: '📊', color: 'purple' },
];

export default function ProductionDashboard() {
    return <GroupDashboard title="ส่งเสริมและพัฒนาการผลิต" icon="🌱" color="green" tables={tables} />;
}

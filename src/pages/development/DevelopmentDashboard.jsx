import GroupDashboard from '../../components/GroupDashboard';

const tables = [
    { table: 'community_enterprises', label: 'วิสาหกิจชุมชน', icon: '🤝', color: 'blue' },
    { table: 'smart_farmers', label: 'เกษตรกรรุ่นใหม่', icon: '🧑‍🌾', color: 'orange' },
    { table: 'farmer_groups', label: 'กลุ่มแม่บ้าน/ยุวฯ', icon: '👩‍🌾', color: 'green' },
    { table: 'agri_tourism', label: 'ท่องเที่ยวเกษตร', icon: '🏕️', color: 'purple' },
];

export default function DevelopmentDashboard() {
    return <GroupDashboard title="ส่งเสริมและพัฒนาเกษตรกร" icon="🤝" color="purple" tables={tables} />;
}

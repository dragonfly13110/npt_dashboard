import {
    BankOutlined,
    ExperimentOutlined,
    ExportOutlined,
    GlobalOutlined,
    LineChartOutlined,
    ReadOutlined,
    TeamOutlined
} from '@ant-design/icons';
import './AgencyLinksPanel.css';

const agencyLinkGroups = [
    {
        title: 'กระทรวงและส่วนกลาง',
        description: 'ช่องทางหลักของกระทรวงและระบบข้อมูลส่วนกลาง',
        Icon: BankOutlined,
        links: [
            { title: 'กระทรวงเกษตรและสหกรณ์', subtitle: 'MOAC', href: 'https://www.moac.go.th/' },
            { title: 'สำนักงานปลัดกระทรวงเกษตรและสหกรณ์', subtitle: 'OPS MOAC', href: 'https://www.opsmoac.go.th/' },
            { title: 'ศูนย์ข้อมูลเกษตรแห่งชาติ', subtitle: 'NABC Data Catalog', href: 'https://nabc-catalog.oae.go.th/' },
            { title: 'สำนักงานเกษตรและสหกรณ์จังหวัดนครปฐม', subtitle: 'MOAC Nakhon Pathom', href: 'https://www.opsmoac.go.th/nakhonpathom-home' },
        ],
    },
    {
        title: 'ส่งเสริมการเกษตรและพืช',
        description: 'งานส่งเสริม พืช ดิน ข้าว หม่อนไหม และพื้นที่เกษตร',
        Icon: ReadOutlined,
        links: [
            { title: 'กรมส่งเสริมการเกษตร', subtitle: 'DOAE', href: 'https://www.doae.go.th/' },
            { title: 'สำนักงานเกษตรจังหวัดนครปฐม', subtitle: 'Nakhon Pathom DOAE', href: 'https://nakhonpathom.doae.go.th/' },
            { title: 'กรมวิชาการเกษตร', subtitle: 'DOA', href: 'https://www.doa.go.th/' },
            { title: 'กรมพัฒนาที่ดิน', subtitle: 'LDD', href: 'https://www.ldd.go.th/' },
            { title: 'กรมการข้าว', subtitle: 'Rice Department', href: 'https://www.ricethailand.go.th/' },
            { title: 'กรมหม่อนไหม', subtitle: 'QSDS', href: 'https://qsds.go.th/' },
        ],
    },
    {
        title: 'น้ำ ปศุสัตว์ ประมง และฝนหลวง',
        description: 'ข้อมูลน้ำ สัตว์ ประมง และการปฏิบัติการฝนหลวง',
        Icon: ExperimentOutlined,
        links: [
            { title: 'กรมชลประทาน', subtitle: 'RID', href: 'https://www.rid.go.th/index.php/th/' },
            { title: 'กรมปศุสัตว์', subtitle: 'DLD', href: 'https://www.dld.go.th/' },
            { title: 'กรมประมง', subtitle: 'DOF', href: 'https://www.fisheries.go.th/' },
            { title: 'กรมฝนหลวงและการบินเกษตร', subtitle: 'Royal Rainmaking', href: 'https://www.royalrain.go.th/royalrain/Home.aspx' },
        ],
    },
    {
        title: 'มาตรฐาน เศรษฐกิจ สหกรณ์ และที่ดิน',
        description: 'มาตรฐานสินค้า เศรษฐกิจการเกษตร สหกรณ์ และสิทธิที่ดิน',
        Icon: LineChartOutlined,
        links: [
            { title: 'สำนักงานมาตรฐานสินค้าเกษตรและอาหารแห่งชาติ', subtitle: 'ACFS', href: 'https://www.acfs.go.th/' },
            { title: 'สำนักงานเศรษฐกิจการเกษตร', subtitle: 'OAE', href: 'https://www.oae.go.th/' },
            { title: 'กรมส่งเสริมสหกรณ์', subtitle: 'CPD', href: 'https://www.cpd.go.th/' },
            { title: 'กรมตรวจบัญชีสหกรณ์', subtitle: 'CAD', href: 'https://www.cad.go.th/' },
            { title: 'สำนักงานการปฏิรูปที่ดินเพื่อเกษตรกรรม', subtitle: 'ALRO', href: 'https://www.alro.go.th/' },
        ],
    },
];

export default function AgencyLinksPanel() {
    return (
        <div className="agency-links-panel">
            <div className="agency-links-heading">
                <div className="agency-links-heading-icon">
                    <GlobalOutlined aria-hidden="true" />
                </div>
                <div>
                    <h2>ทางลัดเว็บไซต์หน่วยงาน</h2>
                    <p>รวมช่องทางเว็บหลักของกระทรวงเกษตรและสหกรณ์ กรม และหน่วยงานที่ใช้บ่อย</p>
                </div>
            </div>

            <div className="agency-links-grid">
                {agencyLinkGroups.map(({ title, description, Icon, links }) => (
                    <section className="agency-link-group" key={title}>
                        <div className="agency-link-group-header">
                            <span className="agency-link-group-icon">
                                <Icon aria-hidden="true" />
                            </span>
                            <div>
                                <h3>{title}</h3>
                                <p>{description}</p>
                            </div>
                        </div>

                        <div className="agency-link-list">
                            {links.map(link => (
                                <a
                                    className="agency-link-item"
                                    href={link.href}
                                    aria-label={link.title}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    key={link.href}
                                >
                                    <span className="agency-link-text">
                                        <strong>{link.title}</strong>
                                        <span>{link.subtitle}</span>
                                    </span>
                                    <ExportOutlined aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <div className="agency-links-note">
                <TeamOutlined aria-hidden="true" />
                <span>เปิดลิงก์ในแท็บใหม่ เพื่อให้ยังกลับมาหน้าศูนย์ข้อมูลเกษตรจังหวัดนครปฐมได้ทันที</span>
            </div>
        </div>
    );
}

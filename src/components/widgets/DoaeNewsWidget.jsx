import { useApiCache } from '../../hooks/useApiCache';

/**
 * ดึงข่าวจาก WP REST API ของ สนง.เกษตรจังหวัดนครปฐม
 * category 15 = ข่าวแจ้งเตือน (ศัตรูพืช/โรคพืช)
 * category 1  = ข่าวส่งเสริมการเกษตร
 */
async function fetchDoaeNews() {
    const [alertRes, newsRes] = await Promise.all([
        fetch('/api/doae-npt/wp-json/wp/v2/posts?categories=15&per_page=4&orderby=date&order=desc&_fields=id,date,title,excerpt,link'),
        fetch('/api/doae-npt/wp-json/wp/v2/posts?categories=1&per_page=4&orderby=date&order=desc&_fields=id,date,title,excerpt,link')
    ]);

    if (!alertRes.ok && !newsRes.ok) throw new Error('DOAE API error');

    const alerts = alertRes.ok ? await alertRes.json() : [];
    const news = newsRes.ok ? await newsRes.json() : [];

    return { alerts, news };
}

/** strip WP HTML tags from excerpt */
function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, '').replace(/\[&hellip;\]|\[…\]/g, '...').trim();
}

/** format Thai date */
function formatThaiDate(isoDate) {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** decode unicode entities from WP title */
function decodeEntities(str) {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
}

export default function DoaeNewsWidget() {
    const { data, isLoading, error } = useApiCache(
        'doae-npt-news-v2',
        fetchDoaeNews,
        { staleMinutes: 360, cacheMinutes: 720 } // cache 6h, stale 6h
    );

    const alerts = data?.alerts || [];
    const news = data?.news || [];

    return (
        <div className="doae-hq-widget">
            <div className="doae-hq-header" style={{background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'}}>
                <div className="doae-hq-header-left">
                    <div className="doae-hq-logo" style={{background:'#dcfce3', color:'#16a34a'}}>🌾</div>
                    <div>
                        <h3>ข่าวสารจากสำนักงานเกษตรจังหวัดนครปฐม</h3>
                        <span>nakhonpathom.doae.go.th</span>
                    </div>
                </div>
                <a
                    href="https://nakhonpathom.doae.go.th"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doae-hq-viewall"
                    style={{color: '#0369a1', background: 'rgba(3,105,161,0.08)', borderColor: 'rgba(3,105,161,0.15)'}}
                >
                    ดูทั้งหมด →
                </a>
            </div>

            <div className="doae-news-widget" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }}>
                {/* ===== PEST ALERTS ===== */}
                <div className="doae-section doae-alerts">
                <div className="doae-section-header">
                    <div className="doae-section-icon doae-icon-alert">🐛</div>
                    <div>
                        <h4>แจ้งเตือนศัตรูพืช / โรคพืช</h4>
                        <span>ข้อมูลจาก สนง.เกษตรจังหวัดนครปฐม</span>
                    </div>
                </div>
                <div className="doae-items">
                    {isLoading ? (
                        <>
                            <div className="doae-skeleton" />
                            <div className="doae-skeleton" />
                            <div className="doae-skeleton" />
                        </>
                    ) : error || alerts.length === 0 ? (
                        <div className="doae-empty">
                            {error ? '⚠️ ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่' : 'ไม่มีข่าวแจ้งเตือนล่าสุด'}
                        </div>
                    ) : (
                        alerts.map(post => (
                            <a
                                key={post.id}
                                href={post.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="doae-item doae-item-alert"
                            >
                                <div className="doae-item-badge">⚠️</div>
                                <div className="doae-item-body">
                                    <div className="doae-item-title">
                                        {decodeEntities(post.title?.rendered)}
                                    </div>
                                    <div className="doae-item-excerpt">
                                        {stripHtml(post.excerpt?.rendered).slice(0, 100)}
                                    </div>
                                    <div className="doae-item-date">{formatThaiDate(post.date)}</div>
                                </div>
                            </a>
                        ))
                    )}
                </div>
            </div>

            {/* ===== AGRI NEWS ===== */}
            <div className="doae-section doae-news">
                <div className="doae-section-header">
                    <div className="doae-section-icon doae-icon-news">📰</div>
                    <div>
                        <h4>ข่าวส่งเสริมการเกษตร</h4>
                        <span>กิจกรรม / โครงการ / อบรม</span>
                    </div>
                </div>
                <div className="doae-items">
                    {isLoading ? (
                        <>
                            <div className="doae-skeleton" />
                            <div className="doae-skeleton" />
                            <div className="doae-skeleton" />
                        </>
                    ) : error || news.length === 0 ? (
                        <div className="doae-empty">
                            {error ? '⚠️ ไม่สามารถเชื่อมต่อได้' : 'ไม่มีข่าวล่าสุด'}
                        </div>
                    ) : (
                        news.map(post => (
                            <a
                                key={post.id}
                                href={post.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="doae-item doae-item-news"
                            >
                                <div className="doae-item-badge">🌾</div>
                                <div className="doae-item-body">
                                    <div className="doae-item-title">
                                        {decodeEntities(post.title?.rendered)}
                                    </div>
                                    <div className="doae-item-excerpt">
                                        {stripHtml(post.excerpt?.rendered).slice(0, 100)}
                                    </div>
                                    <div className="doae-item-date">{formatThaiDate(post.date)}</div>
                                </div>
                            </a>
                        ))
                    )}
                </div>
            </div>

            </div>
        </div>
    );
}

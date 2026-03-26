import { useApiCache } from '../../hooks/useApiCache';
import './EscNewsWidget.css';

async function fetchEscNews() {
    const res = await fetch('/api/doae-esc/wp-json/wp/v2/posts?per_page=4&orderby=date&order=desc&_fields=id,date,title,excerpt,link');
    if (!res.ok) throw new Error('DOAE ESC API error');
    return await res.json();
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

export default function EscNewsWidget() {
    const { data, isLoading, error } = useApiCache(
        'doae-esc-news-v1',
        fetchEscNews,
        { staleMinutes: 360, cacheMinutes: 720 }
    );

    const escNews = data || [];

    return (
        <div className="esc-news-widget">
            <div className="doae-section-header esc-header">
                <div className="doae-section-icon doae-icon-news" style={{background:'#fef3c7', color:'#d97706'}}>⚙️</div>
                <div>
                    <h4>ข่าวส่งเสริมการเกษตร</h4>
                    <span>ศูนย์วิทยบริการเพื่อส่งเสริมการเกษตร • esc.doae.go.th</span>
                </div>
            </div>
            
            <div className="esc-items">
                {isLoading ? (
                    <>
                        <div className="doae-skeleton" />
                        <div className="doae-skeleton" />
                        <div className="doae-skeleton" />
                        <div className="doae-skeleton" />
                    </>
                ) : error || escNews.length === 0 ? (
                    <div className="doae-empty">
                        {error ? '⚠️ ไม่สามารถเชื่อมต่อได้' : 'ไม่มีข่าวล่าสุด'}
                    </div>
                ) : (
                    escNews.map(post => (
                        <a
                            key={post.id}
                            href={post.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="doae-item esc-item"
                        >
                            <div className="doae-item-badge" style={{background:'#fde68a'}}>⚙️</div>
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

            <div className="esc-credit">
                <span>ที่มา: </span>
                <a href="https://esc.doae.go.th" target="_blank" rel="noopener noreferrer">
                    esc.doae.go.th
                </a>
            </div>
        </div>
    );
}

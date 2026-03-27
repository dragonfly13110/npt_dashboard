import { useApiCache } from '../../hooks/useApiCache';

/**
 * ดึงข่าวล่าสุดจาก www.doae.go.th (กรมส่งเสริมการเกษตร ส่วนกลาง)
 * - ข่าวทั่วไป: /posts ล่าสุด 6 รายการ
 * - รวมรูป featured_media เพื่อแสดง thumbnail
 */
async function fetchDoaeHqNews() {
    const res = await fetch(
        '/api/doae-hq/home-new-2024/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_embed=wp:featuredmedia'
    );
    if (!res.ok) throw new Error(`DOAE HQ API error: ${res.status}`);
    const posts = await res.json();

    // ดึง thumbnail URL จาก _embedded
    return posts.map(post => {
        let thumb = '';
        try {
            const media = post._embedded?.['wp:featuredmedia']?.[0];
            thumb = media?.media_details?.sizes?.medium?.source_url
                || media?.media_details?.sizes?.thumbnail?.source_url
                || media?.source_url
                || '';
        } catch { /* no thumbnail */ }
        return { ...post, thumb };
    });
}

/** strip WP HTML tags */
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

/** decode HTML entities */
function decodeEntities(str) {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
}

export default function DoaeHqNewsWidget() {
    const { data: posts, isLoading, error } = useApiCache(
        'doae-hq-news-v2',
        fetchDoaeHqNews,
        { staleMinutes: 360, cacheMinutes: 720 }
    );

    const items = posts || [];

    return (
        <div className="doae-hq-widget">
            {/* Header */}
            <div className="doae-hq-header">
                <div className="doae-hq-header-left">
                    <div className="doae-hq-logo">🏛️</div>
                    <div>
                        <h3>ข่าวจากกรมส่งเสริมการเกษตร</h3>
                        <span>กระทรวงเกษตรและสหกรณ์ • doae.go.th</span>
                    </div>
                </div>
                <a
                    href="https://www.doae.go.th/home-new-2024/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doae-hq-viewall"
                >
                    ดูทั้งหมด →
                </a>
            </div>

            {/* News Grid */}
            <div className="doae-hq-grid">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="doae-hq-card doae-hq-skeleton">
                            <div className="doae-hq-thumb-skel" />
                            <div className="doae-hq-body-skel">
                                <div className="doae-hq-line-skel long" />
                                <div className="doae-hq-line-skel medium" />
                                <div className="doae-hq-line-skel short" />
                            </div>
                        </div>
                    ))
                ) : error ? (
                    <div className="doae-hq-error">
                        ⚠️ ไม่สามารถโหลดข่าวได้ กรุณาลองใหม่ภายหลัง
                    </div>
                ) : items.length === 0 ? (
                    <div className="doae-hq-error">ไม่มีข่าวล่าสุด</div>
                ) : (
                    items.map(post => (
                        <a
                            key={post.id}
                            href={post.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="doae-hq-card"
                        >
                            {post.thumb ? (
                                <div
                                    className="doae-hq-thumb"
                                    style={{ backgroundImage: `url(${post.thumb})` }}
                                />
                            ) : (
                                <div className="doae-hq-thumb doae-hq-thumb-placeholder">
                                    <span>🌾</span>
                                </div>
                            )}
                            <div className="doae-hq-body">
                                <div className="doae-hq-card-date">
                                    {formatThaiDate(post.date)}
                                </div>
                                <div className="doae-hq-card-title">
                                    {decodeEntities(post.title?.rendered)}
                                </div>
                                <div className="doae-hq-card-excerpt">
                                    {stripHtml(post.excerpt?.rendered).slice(0, 120)}
                                </div>
                            </div>
                        </a>
                    ))
                )}
            </div>

            {/* Footer credit */}
            <div className="doae-hq-footer">
                <span>ที่มา: </span>
                <a href="https://www.doae.go.th/home-new-2024/" target="_blank" rel="noopener noreferrer">
                    www.doae.go.th
                </a>
                <span> &bull; กรมส่งเสริมการเกษตร กระทรวงเกษตรและสหกรณ์</span>
            </div>
        </div>
    );
}

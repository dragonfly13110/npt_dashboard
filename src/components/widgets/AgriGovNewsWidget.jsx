import { useState } from 'react';
import { useApiCache } from '../../hooks/useApiCache';
import './AgriRssNewsWidget.css';



/**
 * Feed configuration — มี 2 ประเภท:
 *   type:'wp'  → ดึงจาก WordPress REST API (ผ่าน proxy)
 *   type:'rss' → ดึงจาก rss2json.com
 */
const FEEDS = [
    {
        key: 'doae-hq',
        label: 'กรมส่งเสริมฯ',
        icon: '🏛️',
        type: 'wp',
        url: '/api/doae-hq/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_embed=wp:featuredmedia',
        sourceShort: 'doae.go.th',
        sourceUrl: 'https://www.doae.go.th/home-new-2024/',
        placeholder: '🏛️',
    },
    {
        key: 'doae-npt',
        label: 'เกษตร นครปฐม',
        icon: '🌾',
        type: 'wp',
        url: '/api/doae-npt/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_fields=id,date,title,excerpt,link',
        sourceShort: 'nakhonpathom.doae.go.th',
        sourceUrl: 'https://nakhonpathom.doae.go.th',
        placeholder: '🌾',
    },
    {
        key: 'doae-esc',
        label: 'ศูนย์วิทยบริการฯ',
        icon: '⚙️',
        type: 'wp',
        url: '/api/doae-esc/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_fields=id,date,title,excerpt,link',
        sourceShort: 'esc.doae.go.th',
        sourceUrl: 'https://esc.doae.go.th',
        placeholder: '⚙️',
    },
    {
        key: 'moac',
        label: 'กระทรวงเกษตรฯ',
        icon: '🏢',
        type: 'rss',
        url: 'https://www.opsmoac.go.th/all-rss',
        sourceShort: 'opsmoac.go.th',
        sourceUrl: 'https://www.opsmoac.go.th',
        placeholder: '🏢',
    }
];

// ========== Helper Functions ==========

/** Strip HTML tags */
function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&hellip;|…/g, '...').replace(/\s+/g, ' ').trim();
}

/** Decode HTML entities (from WP titles) */
function decodeEntities(str) {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
}

/** Format Thai date */
function formatThaiDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// ========== Fetch Functions ==========

/** Fetch RSS feed using proxy and DOMParser to bypass rss2json limits */
async function fetchRssFeed(feedUrl) {
    const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
    const json = await res.json();
    if (!json.contents) throw new Error('Proxy returned empty content');

    const parser = new DOMParser();
    const xml = parser.parseFromString(json.contents, 'text/xml');
    const items = xml.querySelectorAll('item');

    return Array.from(items).slice(0, 6).map(item => {
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        
        let description = '';
        const contentEncoded = item.getElementsByTagNameNS('*', 'encoded');
        if (contentEncoded.length > 0) {
            description = contentEncoded[0].textContent;
        } else {
            description = item.querySelector('description')?.textContent || '';
        }

        let thumbnail = '';
        const enclosure = item.querySelector('enclosure[type^="image"]');
        if (enclosure) {
            thumbnail = enclosure.getAttribute('url');
        } else {
            const mediaContent = item.getElementsByTagNameNS('*', 'content');
            if (mediaContent.length > 0 && mediaContent[0].getAttribute('medium') === 'image') {
                thumbnail = mediaContent[0].getAttribute('url');
            } else {
                const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) thumbnail = imgMatch[1];
            }
        }

        const cleanTitle = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();

        return {
            title: cleanTitle,
            link,
            description,
            pubDate,
            thumbnail
        };
    });
}

/** Fetch WordPress REST API posts & normalize to same shape */
async function fetchWpFeed(apiUrl) {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`WP API error: ${res.status}`);
    const posts = await res.json();
    return posts.map(post => {
        // Try to extract thumbnail from _embedded
        let thumb = '';
        try {
            const media = post._embedded?.['wp:featuredmedia']?.[0];
            thumb = media?.media_details?.sizes?.medium?.source_url
                || media?.media_details?.sizes?.thumbnail?.source_url
                || media?.source_url
                || '';
        } catch { /* no thumbnail */ }
        return {
            title: decodeEntities(post.title?.rendered || ''),
            link: post.link,
            description: stripHtml(post.excerpt?.rendered || ''),
            pubDate: post.date,
            thumbnail: thumb,
        };
    });
}

/** Fetch all feeds concurrently */
async function fetchAllGovFeeds() {
    const results = await Promise.allSettled(
        FEEDS.map(feed =>
            feed.type === 'wp' ? fetchWpFeed(feed.url) : fetchRssFeed(feed.url)
        )
    );
    const data = {};
    FEEDS.forEach((feed, i) => {
        data[feed.key] = results[i].status === 'fulfilled' ? results[i].value : [];
    });
    return data;
}

// ========== Component ==========

export default function AgriGovNewsWidget() {
    const [activeTab, setActiveTab] = useState('doae-hq');

    const { data, isLoading, error } = useApiCache(
        'agri-gov-news-v2',
        fetchAllGovFeeds,
        { staleMinutes: 120, cacheMinutes: 360 }
    );

    const allFeeds = data || {};
    const currentItems = allFeeds[activeTab] || [];
    const currentFeed = FEEDS.find(f => f.key === activeTab);

    return (
        <div className="agri-rss-widget agri-rss-widget--gov">
            {/* Header */}
            <div className="agri-rss-header">
                <div className="agri-rss-header-left">
                    <div className="agri-rss-logo">🏛️</div>
                    <div>
                        <h3>ข่าวจากหน่วยงานภาครัฐ</h3>
                        <span>กระทรวงเกษตรฯ • กรมส่งเสริมการเกษตร • เกษตรจังหวัด</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="agri-rss-tabs">
                {FEEDS.map(feed => (
                    <button
                        key={feed.key}
                        className={`agri-rss-tab${activeTab === feed.key ? ' active' : ''}`}
                        onClick={() => setActiveTab(feed.key)}
                    >
                        <span className="agri-rss-tab-icon">{feed.icon}</span>
                        {feed.label}
                        {allFeeds[feed.key] && allFeeds[feed.key].length > 0 && (
                            <span className="agri-rss-tab-count">
                                {allFeeds[feed.key].length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="agri-rss-content">
                <div className="agri-rss-grid">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="agri-rss-skeleton" />
                        ))
                    ) : error && currentItems.length === 0 ? (
                        <div className="agri-rss-empty">
                            <span>📡</span>
                            ⚠️ ไม่สามารถโหลดข่าวได้ กรุณาลองใหม่ภายหลัง
                        </div>
                    ) : currentItems.length === 0 ? (
                        <div className="agri-rss-empty">
                            <span>📭</span>
                            ไม่มีข่าวล่าสุด
                        </div>
                    ) : (
                        currentItems.map((item, idx) => (
                            <a
                                key={`${activeTab}-${idx}`}
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="agri-rss-card"
                            >
                                {item.thumbnail ? (
                                    <div
                                        className="agri-rss-thumb"
                                        style={{
                                            backgroundImage: `url(${item.thumbnail})`
                                        }}
                                    />
                                ) : (
                                    <div className="agri-rss-thumb agri-rss-thumb-placeholder">
                                        {currentFeed?.placeholder || '🏛️'}
                                    </div>
                                )}
                                <div className="agri-rss-card-body">
                                    <div className="agri-rss-card-source">
                                        <span className="source-dot" />
                                        {currentFeed?.sourceShort}
                                    </div>
                                    <div className="agri-rss-card-title">
                                        {item.title || 'ไม่มีหัวข้อ'}
                                    </div>
                                    <div className="agri-rss-card-excerpt">
                                        {stripHtml(item.description).slice(0, 120)}
                                    </div>
                                    <div className="agri-rss-card-date">
                                        {formatThaiDate(item.pubDate)}
                                    </div>
                                </div>
                            </a>
                        ))
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="agri-rss-footer">
                <span>
                    ที่มา:{' '}
                    <a href={currentFeed?.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {currentFeed?.sourceShort}
                    </a>
                </span>
                <span className="agri-rss-powered">
                    ดึงข้อมูลผ่าน WP API / RSS Feed
                </span>
            </div>
        </div>
    );
}

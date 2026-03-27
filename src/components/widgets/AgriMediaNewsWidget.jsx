import { useState } from 'react';
import { useApiCache } from '../../hooks/useApiCache';
import './AgriRssNewsWidget.css';



const FEEDS = [
    {
        key: 'prachachat',
        label: 'ประชาชาติธุรกิจ',
        icon: '📰',
        url: 'https://www.prachachat.net/feed/agriculture',
        sourceShort: 'prachachat.net',
        sourceUrl: 'https://www.prachachat.net/agriculture',
        placeholder: '📰',
    },
    {
        key: 'kasetkaoklai',
        label: 'เกษตรก้าวไกล',
        icon: '🌿',
        url: 'https://www.kasetkaoklai.com/home/feed',
        sourceShort: 'kasetkaoklai.com',
        sourceUrl: 'https://www.kasetkaoklai.com',
        placeholder: '🌿',
    },
    {
        key: 'kasettumkin',
        label: 'เกษตรทำกิน',
        icon: '🧑‍🌾',
        url: 'https://kasettumkin.com/feed',
        sourceShort: 'kasettumkin.com',
        sourceUrl: 'https://kasettumkin.com',
        placeholder: '🧑‍🌾',
    },
    {
        key: 'thairath',
        label: 'ไทยรัฐ',
        icon: '📺',
        url: 'https://www.thairath.co.th/rss/agriculture',
        sourceShort: 'thairath.co.th',
        sourceUrl: 'https://www.thairath.co.th/agriculture',
        placeholder: '📺',
    },
    {
        key: 'dailynews',
        label: 'เดลินิวส์',
        icon: '🗞️',
        url: 'https://www.dailynews.co.th/feed',
        sourceShort: 'dailynews.co.th',
        sourceUrl: 'https://www.dailynews.co.th',
        placeholder: '🗞️',
    }
];

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

        // Clean up entities in title
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

/** Fetch all feeds concurrently */
async function fetchAllFeeds() {
    const results = await Promise.allSettled(
        FEEDS.map(feed => fetchRssFeed(feed.url))
    );
    const data = {};
    FEEDS.forEach((feed, i) => {
        data[feed.key] = results[i].status === 'fulfilled' ? results[i].value : [];
    });
    return data;
}

/** Strip HTML tags */
function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Format Thai date */
function formatThaiDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export default function AgriMediaNewsWidget() {
    const [activeTab, setActiveTab] = useState('prachachat');

    const { data, isLoading, error } = useApiCache(
        'agri-media-rss-v1',
        fetchAllFeeds,
        { staleMinutes: 120, cacheMinutes: 360 }
    );

    const allFeeds = data || {};
    const currentItems = allFeeds[activeTab] || [];
    const currentFeed = FEEDS.find(f => f.key === activeTab);

    return (
        <div className="agri-rss-widget">
            {/* Header */}
            <div className="agri-rss-header">
                <div className="agri-rss-header-left">
                    <div className="agri-rss-logo">📰</div>
                    <div>
                        <h3>ข่าวเกษตรจากสื่อมวลชน</h3>
                        <span>อัปเดตข่าวสารจากสำนักข่าว</span>
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
                        {allFeeds[feed.key] && (
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
                                {item.thumbnail || item.enclosure?.link ? (
                                    <div
                                        className="agri-rss-thumb"
                                        style={{
                                            backgroundImage: `url(${item.thumbnail || item.enclosure?.link})`
                                        }}
                                    />
                                ) : (
                                    <div className="agri-rss-thumb agri-rss-thumb-placeholder">
                                        {currentFeed?.placeholder || '📰'}
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
                                        {stripHtml(item.description || item.content).slice(0, 120)}
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
                    ดึงข้อมูลผ่าน RSS Feed
                </span>
            </div>
        </div>
    );
}

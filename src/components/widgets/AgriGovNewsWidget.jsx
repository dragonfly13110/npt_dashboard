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
        originalUrl: 'https://www.doae.go.th/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_embed=wp:featuredmedia',
        sourceShort: 'doae.go.th',
        sourceUrl: 'https://www.doae.go.th/',
        placeholder: '🏛️',
    },
    {
        key: 'doae-npt',
        label: 'เกษตร นครปฐม',
        icon: '🌾',
        type: 'wp',
        url: '/api/doae-npt/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_fields=id,date,title,excerpt,link,featured_media,_links,_embedded&_embed=wp:featuredmedia',
        originalUrl: 'https://nakhonpathom.doae.go.th/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_fields=id,date,title,excerpt,link,featured_media,_links,_embedded&_embed=wp:featuredmedia',
        sourceShort: 'nakhonpathom.doae.go.th',
        sourceUrl: 'https://nakhonpathom.doae.go.th',
        placeholder: '🌾',
    },
    {
        key: 'doae-esc',
        label: 'ศูนย์วิทยบริการฯ',
        icon: '⚙️',
        type: 'wp',
        url: '/api/doae-esc/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_fields=id,date,title,excerpt,link,featured_media,_links,_embedded&_embed=wp:featuredmedia',
        originalUrl: 'https://esc.doae.go.th/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_fields=id,date,title,excerpt,link,featured_media,_links,_embedded&_embed=wp:featuredmedia',
        sourceShort: 'esc.doae.go.th',
        sourceUrl: 'https://esc.doae.go.th',
        placeholder: '⚙️',
    },
    {
        key: 'agritec',
        label: 'สถาบันเทคโนโลยีเกษตร',
        icon: '🌾',
        type: 'wp',
        url: '/api/agritec/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_fields=id,date,title,excerpt,link,featured_media,_links,_embedded&_embed=wp:featuredmedia',
        originalUrl: 'https://www.nstda.or.th/agritec/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_fields=id,date,title,excerpt,link,featured_media,_links,_embedded&_embed=wp:featuredmedia',
        sourceShort: 'nstda.or.th/agritec',
        sourceUrl: 'https://www.nstda.or.th/agritec/',
        placeholder: '🌾',
    },
    {
        key: 'ictc',
        label: 'เทคโนโลยีเกษตรดิจิทัล',
        icon: '💻',
        type: 'wp',
        url: '/api/ictc/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_embed=wp:featuredmedia',
        originalUrl: 'https://ictc.doae.go.th/wp-json/wp/v2/posts?per_page=6&orderby=date&order=desc&_embed=wp:featuredmedia',
        sourceShort: 'ictc.doae.go.th',
        sourceUrl: 'https://ictc.doae.go.th/',
        placeholder: '💻',
    }
    // Removed agritec (สถาบันเทคโนโลยีเกษตร) - not working on live site
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

/** Fetch with timeout helper */
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
}

/** Parse RSS XML string into normalized items */
function parseRssXml(xmlStr) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlStr, 'text/xml');
    const parseError = xml.querySelector('parsererror');
    if (parseError) throw new Error('XML parse error');

    const items = xml.querySelectorAll('item');
    return Array.from(items).slice(0, 6).map(item => {
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent
            || item.querySelector('guid')?.textContent || '';
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
        return { title: cleanTitle, link, description, pubDate, thumbnail };
    });
}

/** Strategy 0: Internal Netlify/Vite Proxy */
async function fetchViaInternalProxy(proxyUrl) {
    const res = await fetchWithTimeout(proxyUrl, {}, 8000);
    if (!res.ok) throw new Error(`internal proxy error: ${res.status}`);
    const xmlStr = await res.text();
    return parseRssXml(xmlStr);
}

/** Strategy 1: rss2json.com */
async function fetchViaRss2Json(feedUrl) {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=6`;
    const res = await fetchWithTimeout(apiUrl, {}, 8000);
    if (!res.ok) throw new Error(`rss2json error: ${res.status}`);
    const json = await res.json();
    if (json.status !== 'ok' || !json.items?.length) throw new Error('rss2json: no items');
    return json.items.map(item => ({
        title: item.title || '',
        link: item.link || item.guid || '',
        description: item.description || item.content || '',
        pubDate: item.pubDate || '',
        thumbnail: item.thumbnail || item.enclosure?.link || '',
    }));
}

/** Strategy 2: allorigins proxy */
async function fetchViaAllOrigins(feedUrl) {
    const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
    const res = await fetchWithTimeout(apiUrl, {}, 10000);
    if (!res.ok) throw new Error(`allorigins error: ${res.status}`);
    const json = await res.json();
    if (!json.contents) throw new Error('allorigins: empty content');
    return parseRssXml(json.contents);
}

/** Strategy 3: corsproxy.io */
async function fetchViaCorsProxy(feedUrl) {
    const apiUrl = `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`;
    const res = await fetchWithTimeout(apiUrl, {}, 10000);
    if (!res.ok) throw new Error(`corsproxy error: ${res.status}`);
    const xmlStr = await res.text();
    return parseRssXml(xmlStr);
}

/** Fetch RSS feed via multiple strategies */
async function fetchRssFeed(feed) {
    // 1. Try internal local proxy (or Netlify proxy)
    try {
        const items = await fetchViaInternalProxy(feed.url);
        if (items && items.length > 0) return items;
    } catch (e) {
        console.warn(`[${feed.key}] Internal proxy failed:`, e);
    }
    
    // 2. Fallback to rss2json
    try {
        const items = await fetchViaRss2Json(feed.originalUrl);
        if (items && items.length > 0) return items;
    } catch (e) {
        console.warn(`[${feed.key}] Rss2Json failed:`, e);
    }

    // 3. Fallback to allorigins
    try {
        const urlsToTry = [feed.originalUrl, ...(feed.fallbackUrls || [])];
        for (const u of urlsToTry) {
            try {
                const items = await fetchViaAllOrigins(u);
                if (items && items.length > 0) return items;
            } catch (err) {}
        }
    } catch (e) {
        console.warn(`[${feed.key}] AllOrigins failed:`, e);
    }

    throw new Error(`All fetch strategies failed for ${feed.key}`);
}

function normalizeWpPosts(posts) {
    if (!Array.isArray(posts)) return [];
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

/** Fetch WordPress REST API posts & normalize to same shape */
async function fetchWpFeed(feed) {
    // 1. Try local proxy
    try {
        console.log(`[${feed.key}] Trying local proxy: ${feed.url}`);
        const res = await fetchWithTimeout(feed.url, {}, 8000);
        console.log(`[${feed.key}] Local proxy status: ${res.status}`);
        if (res.ok) {
            const posts = await res.json();
            console.log(`[${feed.key}] Got ${posts.length} posts from local proxy`);
            const normalized = normalizeWpPosts(posts);
            if (normalized.length > 0) return normalized;
        }
    } catch (e) {
        console.warn(`[${feed.key}] WP Local Proxy failed:`, e.message);
    }

    // 2. Try allorigins proxy
    if (feed.originalUrl) {
        try {
            console.log(`[${feed.key}] Trying allorigins proxy for: ${feed.originalUrl}`);
            const apiUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.originalUrl)}`;
            const res = await fetchWithTimeout(apiUrl, {}, 10000);
            if (res.ok) {
                const json = await res.json();
                if (json.contents) {
                    const posts = JSON.parse(json.contents);
                    console.log(`[${feed.key}] Got ${posts.length} posts from allorigins`);
                    const normalized = normalizeWpPosts(posts);
                    if (normalized.length > 0) return normalized;
                }
            }
        } catch (e) {
            console.warn(`[${feed.key}] WP AllOrigins failed:`, e.message);
        }

        // 3. Try corsproxy.io
        try {
            console.log(`[${feed.key}] Trying corsproxy.io for: ${feed.originalUrl}`);
            const apiUrl = `https://corsproxy.io/?${encodeURIComponent(feed.originalUrl)}`;
            const res = await fetchWithTimeout(apiUrl, {}, 10000);
            if (res.ok) {
                const posts = await res.json();
                console.log(`[${feed.key}] Got ${posts.length} posts from corsproxy`);
                const normalized = normalizeWpPosts(posts);
                if (normalized.length > 0) return normalized;
            }
        } catch (e) {
            console.warn(`[${feed.key}] WP corsproxy failed:`, e);
        }
    }

    throw new Error(`All WP fetch strategies failed for ${feed.key}`);
}

/** Fetch all feeds concurrently */
async function fetchAllGovFeeds() {
    const results = await Promise.allSettled(
        FEEDS.map(feed => {
            if (feed.type === 'wp') return fetchWpFeed(feed);
            // RSS:
            return fetchRssFeed(feed);
        })
    );
    const data = {};
    let allFailed = true;

    FEEDS.forEach((feed, i) => {
        if (results[i].status === 'fulfilled' && results[i].value && results[i].value.length > 0) {
            data[feed.key] = results[i].value;
            allFailed = false;
        } else {
            console.error(`Gov Feed ${feed.key} completely failed`, results[i].reason);
            data[feed.key] = [];
        }
    });

    if (allFailed) {
        throw new Error("All government feeds failed to load.");
    }
    return data;
}


// ========== Component ==========

export default function AgriGovNewsWidget() {
    const [activeTab, setActiveTab] = useState('doae-hq');

    const { data, isLoading, error } = useApiCache(
        'agri-gov-news-v4',
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

import * as cheerio from 'cheerio';
import { getLiveDomain, resolveKey, DOMAIN_KEYS, SiteKey } from './config';

type CheerioRoot = ReturnType<typeof cheerio.load>;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function safeFetch(url: string, referer?: string) {
    const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': referer || url },
        signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    return res.text();
}

// ─── Parse article cards (moviesmod.farm WordPress structure) ────────────────
function parseArticles($: CheerioRoot, domain: string) {
    const movies: { title: string; url: string; imageUrl: string; quality: string; year: string }[] = [];
    const seen = new Set<string>();

    $('article').each((_, el) => {
        const $el = $(el);

        // moviesmod.farm: <a class="post-image"> has the canonical URL
        const $postLink = $el.find('a.post-image, a[rel="bookmark"]').first();
        const href = $postLink.attr('href') || $el.find('h2 a, h3 a').first().attr('href') || '';
        if (!href || seen.has(href)) return;

        // Title: h2.title.front-view-title > a  (exact moviesmod.farm structure)
        const title = $el.find('h2.title a, h2.front-view-title a, .title.front-view-title a, h2 a, h3 a').first().text().trim()
            || $el.find('img').first().attr('alt') || '';
        if (!title) return;
        seen.add(href);

        const fullUrl = href.startsWith('http') ? href : `${domain}${href}`;
        const qualityM = title.match(/4K|2160p|1080p|720p|480p/i);
        const yearM = title.match(/\b(19|20)\d{2}\b/);
        const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';

        movies.push({
            title: title.replace(/^Download\s+/i, '').replace(/\s*\[.*?\]/g, '').trim(),
            url: fullUrl,
            imageUrl: img,
            quality: qualityM?.[0]?.toUpperCase() || 'HD',
            year: yearM?.[0] || '',
        });
    });

    return movies;
}

// ─── Fetch Home / Search Page ──────────────────────────────────────────────── 
export async function fetchMoviesPage(rawKey: string, page = 1, query = '') {
    const key = resolveKey(rawKey);
    const domain = await getLiveDomain(key);

    let url: string;
    if (query) {
        // moviesmod.farm redirects /?s=query → /search/query, use direct path
        url = `${domain}/search/${encodeURIComponent(query)}${page > 1 ? `/page/${page}` : ''}`;
    } else if (page > 1) {
        url = `${domain}/page/${page}/`;
    } else {
        url = `${domain}/`;
    }

    const html = await safeFetch(url, domain);
    const $ = cheerio.load(html);
    const movies = parseArticles($, domain);
    const hasNext = $('.pagination .next, .nav-next a, .next.page-numbers').length > 0;

    return {
        success: true,
        provider: key,
        category: DOMAIN_KEYS[key],
        baseDomain: domain,
        page,
        query,
        movies,
        hasNextPage: hasNext,
        totalFound: movies.length,
    };
}

// ─── Fetch Movie/Series Details ────────────────────────────────────────────── 
export async function fetchMovieDetails(url: string) {
    const html = await safeFetch(url);
    const $ = cheerio.load(html);

    const title = $('h1.entry-title, h1').first().text().replace(/^Download\s+/i, '').trim()
        || $('meta[property="og:title"]').attr('content') || '';
    const imageUrl = $('meta[property="og:image"]').attr('content')
        || $('.entry-content img').first().attr('src') || '';
    const description = $('meta[name="description"]').attr('content')
        || $('.entry-content > p').first().text().trim().slice(0, 500) || '';

    // Detect languages from title
    const langs = new Set<string>();
    if (/hindi|hin\b/i.test(title)) langs.add('Hindi');
    if (/english|eng\b/i.test(title)) langs.add('English');
    if (/telugu|tel\b/i.test(title)) langs.add('Telugu');
    if (/tamil|tam\b/i.test(title)) langs.add('Tamil');
    if (/malay?alam/i.test(title)) langs.add('Malayalam');
    if (/kannada/i.test(title)) langs.add('Kannada');
    if (/dual.?audio|multi/i.test(title)) { langs.add('Hindi'); langs.add('English'); }
    if (/japanese|anime/i.test(title)) langs.add('Japanese');
    if (/korean/i.test(title)) langs.add('Korean');
    if (!langs.size) langs.add('Unknown');

    // Parse download groups by headings
    const downloadGroups: {
        title: string;
        quality: string;
        lang: string;
        links: { server: string; url: string; size: string }[];
    }[] = [];
    
    let currentHeading = 'Download';
    let currentQuality = 'HD';
    let currentLinks: { server: string; url: string; size: string }[] = [];

    const DOWNLOAD_HOSTS = [
        'leechpro', 'modpro', 'hubdrive', 'gdflix', 'drivemax', 'vcloud',
        'mdrive', 'pixeldrain', 'mixdrop', 'gdtot', 'filepress', 'hubcloud',
        'buzzheavier', 'filedot', 'getlinks', 'hblinks', 'drivebot', 'drivehub',
        'filesfm', '1drv', 'mega.nz', 'gofile', 'anonfiles', 'uploadhaven',
    ];

    $('h2, h3, h4, a').each((_, el) => {
        const tag = $(el).prop('tagName')?.toLowerCase() || '';
        if (['h2', 'h3', 'h4'].includes(tag)) {
            if (currentLinks.length) {
                const langHint = [...langs].join(', ');
                downloadGroups.push({ title: currentHeading, quality: currentQuality, lang: langHint, links: currentLinks });
            }
            const text = $(el).text().replace(/^Download\s+/i, '').trim();
            const qM = text.match(/4K|2160p|1080p|720p|480p|360p/i);
            currentHeading = text;
            currentQuality = qM?.[0]?.toUpperCase() || 'HD';
            currentLinks = [];
            return;
        }
        if (tag === 'a') {
            const href = $(el).attr('href') || '';
            if (!href.startsWith('http')) return;
            const text = $(el).text().trim().toLowerCase();
            if (text.match(/home|about|privacy|telegram|facebook|instagram|contact|category|tag/)) return;
            
            const cls = $(el).attr('class') || '';
            const isBtn = cls.includes('btn') || cls.includes('button') || cls.includes('maxbutton') || cls.includes('wp-block');
            const isHost = DOWNLOAD_HOSTS.some(h => href.includes(h));
            if (isBtn || isHost) {
                const displayText = $(el).text().trim();
                const sizeM = displayText.match(/\[?(\d+(?:\.\d+)?)\s*(MB|GB)\]?/i);
                currentLinks.push({
                    server: displayText || 'Server',
                    url: href,
                    size: sizeM ? `${sizeM[1]}${sizeM[2].toUpperCase()}` : '',
                });
            }
        }
    });
    if (currentLinks.length) {
        downloadGroups.push({ title: currentHeading, quality: currentQuality, lang: [...langs].join(', '), links: currentLinks });
    }

    // Direct stream links (if any MP4/M3U8 exist in HTML)
    const bodyHtml = $.html();
    const streamLinks: { quality: string; url: string; format: string }[] = [];
    (bodyHtml.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi) || []).forEach(u =>
        streamLinks.push({ quality: 'Auto', url: u, format: 'MP4' })
    );
    (bodyHtml.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi) || []).forEach(u =>
        streamLinks.push({ quality: 'Auto', url: u, format: 'M3U8' })
    );

    return {
        success: true,
        data: {
            title,
            imageUrl,
            description,
            languages: [...langs],
            downloadGroups,
            streamLinks,
            originalUrl: url,
        }
    };
}

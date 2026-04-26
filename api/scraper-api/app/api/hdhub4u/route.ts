import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// ─── Domain Resolution ────────────────────────────────────────────────────────
// HDHub4u frequently changes subdomains. We try known ones and follow redirects.
const KNOWN_DOMAINS = [
  'https://new6.hdhub4u.fo',
  'https://new5.hdhub4u.fo',
  'https://new4.hdhub4u.fo',
  'https://hdhub4u.fo',
];

let activeDomain: string | null = null;
let domainCheckedAt = 0;
const DOMAIN_TTL = 1000 * 60 * 30; // 30 min cache

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

async function getActiveDomain(): Promise<string> {
  const now = Date.now();
  if (activeDomain && now - domainCheckedAt < DOMAIN_TTL) return activeDomain;

  for (const d of KNOWN_DOMAINS) {
    try {
      const r = await fetch(d + '/', {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        // Follow redirect to get actual domain
        activeDomain = new URL(r.url).origin;
        domainCheckedAt = now;
        return activeDomain;
      }
    } catch { /* try next */ }
  }
  // Fallback
  activeDomain = KNOWN_DOMAINS[0];
  domainCheckedAt = now;
  return activeDomain;
}

// ─── Normalize URL to active domain ───────────────────────────────────────────
// Old cached URLs like new4.hdhub4u.fo → new6.hdhub4u.fo
async function normalizeUrl(url: string): Promise<string> {
  const domain = await getActiveDomain();
  try {
    const u = new URL(url);
    if (u.hostname.includes('hdhub4u')) {
      return domain + u.pathname + u.search;
    }
  } catch { /* invalid url */ }
  return url;
}

// ─── Home / Recent Movies ─────────────────────────────────────────────────────
async function fetchHome(page: number) {
  const domain = await getActiveDomain();
  const url = page > 1 ? `${domain}/page/${page}/` : `${domain}/`;

  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': domain },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const $ = cheerio.load(html);

  const movies: { id: string; title: string; url: string; imageUrl: string }[] = [];

  // Primary selector: article cards
  $('article, .recent-movies li, ul.recent-movies li').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a[href]').first();
    const href = $a.attr('href') || '';
    const $img = $el.find('img').first();
    const img = $img.attr('src') || $img.attr('data-src') || '';
    const title =
      $img.attr('alt') || $img.attr('title') ||
      $a.attr('title') || $el.find('h2, h3, .title').first().text().trim();

    if (title && href && href.includes('hdhub4u')) {
      const id = href.split('/').filter(Boolean).pop() || '';
      movies.push({ id, title, url: href, imageUrl: img });
    }
  });

  return { success: true, data: { recentMovies: movies, page, totalItems: movies.length } };
}

// ─── Search ───────────────────────────────────────────────────────────────────
async function fetchSearch(query: string, page: number) {
  const domain = await getActiveDomain();
  const url = `${domain}/?s=${encodeURIComponent(query)}&page=${page}`;

  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': domain },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
  const html = await r.text();
  const $ = cheerio.load(html);

  const results: { id: string; title: string; url: string; imageUrl: string; year: string }[] = [];

  $('article, .films-list .item, ul.recent-movies li').each((_, el) => {
    const $el = $(el);
    const $a = $el.find('a[href]').first();
    const href = $a.attr('href') || '';
    const $img = $el.find('img').first();
    const img = $img.attr('src') || $img.attr('data-src') || '';
    const title =
      $a.attr('title') || $el.find('h2, h3, .title, .film-name').first().text().trim() ||
      $img.attr('alt') || '';

    const yearM = title.match(/\((\d{4})\)/);
    const id = href.split('/').filter(Boolean).pop() || '';

    if (title && href.includes('hdhub4u')) {
      results.push({ id, title: title.trim(), url: href, imageUrl: img, year: yearM ? yearM[1] : '' });
    }
  });

  return {
    success: true,
    data: { query, page, results, totalResults: results.length },
  };
}

// ─── Movie Details ─────────────────────────────────────────────────────────────
async function fetchDetails(rawUrl: string) {
  const url = await normalizeUrl(rawUrl);
  const domain = await getActiveDomain();

  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': domain },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${url}`);
  const html = await r.text();
  const $ = cheerio.load(html);

  const title =
    $('h1.entry-title').text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim();

  const imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('.entry-content img').first().attr('src') || '';

  const description =
    $('meta[name="description"]').attr('content') ||
    $('.entry-content p').first().text().trim() || '';

  // ── Extract language and quality from title ──
  const langs = new Set<string>();
  if (/hindi|hin\b/i.test(title)) langs.add('Hindi');
  if (/english|eng\b/i.test(title)) langs.add('English');
  if (/telugu|tel\b/i.test(title)) langs.add('Telugu');
  if (/tamil|tam\b/i.test(title)) langs.add('Tamil');
  if (/malay?alam/i.test(title)) langs.add('Malayalam');
  if (/kannada/i.test(title)) langs.add('Kannada');
  if (/urdu/i.test(title)) langs.add('Urdu');
  if (/dual.?audio|multi/i.test(title)) { langs.add('Hindi'); langs.add('English'); }
  if (langs.size === 0) langs.add('Unknown');

  const downloadLinks: { quality: string; size: string; url: string; lang: string }[] = [];
  const episodes: { episode: string; links: { quality: string; size: string; url: string }[] }[] = [];

  let currentEpisode: string | null = null;
  let currentEpisodeLinks: { quality: string; size: string; url: string }[] = [];

  // Walk all h3/h4/h5 tags — each is a quality + link
  $('h3, h4, h5').each((_, el) => {
    const $h = $(el);
    const headingText = $h.text().trim();

    // Detect episode headers
    if (headingText.match(/\bEP(iSODE)?\s*\d+\b|S\d+E\d+/i) && !$h.find('a[href]').length) {
      if (currentEpisode && currentEpisodeLinks.length) {
        episodes.push({ episode: currentEpisode, links: [...currentEpisodeLinks] });
      }
      currentEpisode = headingText;
      currentEpisodeLinks = [];
      return;
    }

    $h.find('a[href]').each((_, a) => {
      const href = $(a).attr('href') || '';
      const text = $(a).text().trim() || headingText;

      if (!href.startsWith('http')) return;
      // Skip internal/social/nav links and image CDNs
      if (href.includes('hdhub4u') || href.includes('4khdhub') || href.includes('imdb.com')) return;
      if (href.includes('catimages.org') || href.includes('wp-content') || href.includes('.jpg') || href.includes('.png') || href.includes('.webp')) return;
      if (text.toLowerCase().match(/watch\s*online|player|home|about|contact|telegram|disclaimer|request/)) return;
      // Only include links that point to known download/bypass hosts
      const isDownloadHost = href.includes('gadgetsweb') || href.includes('hubdrive') || href.includes('hubcloud') || 
                             href.includes('vcloud') || href.includes('modpro') || href.includes('leechpro') ||
                             href.includes('drivehub') || href.includes('filepress') || href.includes('drivemax') ||
                             href.includes('pixeldrain') || href.includes('getlinks') || href.includes('hblinks') ||
                             href.includes('drivebot') || href.includes('filedot') || href.includes('mdrive');
      if (!isDownloadHost) return;

      const qM = text.match(/(4K|2160p|1080p|720p|480p|360p)/i);
      const sM = text.match(/\[?(\d+(?:\.\d+)?)\s*(MB|GB)\]?/i);
      const quality = qM ? qM[1].toUpperCase() : headingText.match(/(4K|2160p|1080p|720p|480p|360p)/i)?.[1] || 'Unknown';
      const size = sM ? `${sM[1]}${sM[2].toUpperCase()}` : '';
      // Language hint from heading
      const langHint = headingText.match(/hindi|english|telugu|tamil/i)?.[0] || '';

      const lk = { quality, size, url: href, lang: langHint || [...langs].join(', ') };

      if (currentEpisode) {
        currentEpisodeLinks.push(lk);
      } else {
        downloadLinks.push(lk);
      }
    });
  });

  // Save last episode
  if (currentEpisode && currentEpisodeLinks.length) {
    episodes.push({ episode: currentEpisode, links: [...currentEpisodeLinks] });
  }

  // Fallback: parse paragraph <a> tags if no h3/h4 links found
  if (!downloadLinks.length && !episodes.length) {
    $('p a[href], .maxbutton a[href], .wp-block-button a[href]').each((_, a) => {
      const href = $(a).attr('href') || '';
      const text = $(a).text().trim();
      if (!href.startsWith('http') || href.includes('hdhub4u')) return;
      if (!text || text.toLowerCase().match(/home|about|privacy|telegram/)) return;
      const qM = text.match(/(4K|2160p|1080p|720p|480p|360p)/i);
      const sM = text.match(/\[?(\d+(?:\.\d+)?)\s*(MB|GB)\]?/i);
      downloadLinks.push({
        quality: qM ? qM[1].toUpperCase() : 'HD',
        size: sM ? `${sM[1]}${sM[2].toUpperCase()}` : '',
        url: href,
        lang: [...langs].join(', '),
      });
    });
  }

  return {
    success: true,
    data: {
      title,
      imageUrl,
      description,
      languages: [...langs],
      downloadLinks,
      episodes,
      originalUrl: url,
    },
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action') || 'home';
  const page = parseInt(searchParams.get('page') || '1');
  const q = searchParams.get('q') || '';
  const url = searchParams.get('url') || '';

  try {
    // Route via action param for unified endpoint, OR via subpath URLs
    if (action === 'search' || q) {
      const data = await fetchSearch(q, page);
      return NextResponse.json(data);
    }
    if (action === 'details' || url) {
      if (!url) return NextResponse.json({ success: false, error: 'url param required' }, { status: 400 });
      const data = await fetchDetails(url);
      return NextResponse.json(data);
    }
    // Default: home
    const data = await fetchHome(page);
    return NextResponse.json(data);

  } catch (err: unknown) {
    console.error('[hdhub4u]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

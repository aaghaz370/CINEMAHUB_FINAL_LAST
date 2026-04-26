import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getBaseUrl } from '@/lib/baseurl';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

type CheerioRoot = ReturnType<typeof cheerio.load>;

async function fetch$(url: string, referer?: string): Promise<{ $: CheerioRoot; finalUrl: string; status: number }> {
  const r = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': referer || url,
    },
    signal: AbortSignal.timeout(15000),
  });
  const html = await r.text();
  return { $: cheerio.load(html), finalUrl: r.url, status: r.status };
}

// ─── Parse article cards (moviesmod.farm WordPress structure) ──────────────────
function parseArticles($: CheerioRoot, baseUrl: string) {
  const movies: { title: string; url: string; imageUrl: string; quality: string; year: string }[] = [];
  const seen = new Set<string>();

  $('article').each((_, el) => {
    const $el = $(el);
    // moviesmod.farm: <a class="post-image"> has the canonical URL
    const href = $el.find('a.post-image, a[rel="bookmark"]').first().attr('href')
      || $el.find('h2 a, h3 a').first().attr('href') || '';
    if (!href || seen.has(href)) return;

    // Title: h2.title.front-view-title > a is exact moviesmod.farm structure
    const title = $el.find('h2.title a, h2.front-view-title a, .title.front-view-title a, h2 a, h3 a').first().text().trim()
      || $el.find('img').first().attr('alt') || '';
    if (!title) return;
    seen.add(href);

    const qualityM = title.match(/4K|2160p|1080p|720p|480p/i);
    const yearM = title.match(/\b(19|20)\d{2}\b/);
    const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';

    movies.push({
      title: title.replace(/^Download\s+/i, '').replace(/\s*\[.*?\]/g, '').trim(),
      url: href.startsWith('http') ? href : `${baseUrl}${href}`,
      imageUrl: img,
      quality: qualityM ? qualityM[0].toUpperCase() : 'HD',
      year: yearM ? yearM[0] : '',
    });
  });

  return movies;
}

// ─── Home ─────────────────────────────────────────────────────────────────────
async function fetchHome(page = 1) {
  const baseUrl = await getBaseUrl('Moviesmod');
  const url = page > 1 ? `${baseUrl}page/${page}/` : baseUrl;
  const { $ } = await fetch$(url, baseUrl);
  const movies = parseArticles($, baseUrl);
  const hasNext = $('.pagination .next, .nav-next a').length > 0;
  return { success: true, provider: 'mod', source: 'moviesmod.farm', page, movies, hasNextPage: hasNext };
}

// ─── Search ───────────────────────────────────────────────────────────────────
async function fetchSearch(query: string, page = 1) {
  const baseUrl = await getBaseUrl('Moviesmod');
  // moviesmod.farm uses /search/query (/?s= redirects there)
  const url = `${baseUrl}search/${encodeURIComponent(query)}${page > 1 ? `/page/${page}` : ''}`;
  const { $, status } = await fetch$(url, baseUrl);
  if (status !== 200) throw new Error(`HTTP ${status}`);
  const movies = parseArticles($, baseUrl);
  return { success: true, query, provider: 'mod', movies, totalResults: movies.length };
}

// ─── Details ─────────────────────────────────────────────────────────────────
async function fetchDetails(inputUrl: string) {
  const baseUrl = await getBaseUrl('Moviesmod');
  const { $ } = await fetch$(inputUrl, baseUrl);

  const title = $('h1.entry-title, h1').first().text().replace(/^Download\s+/i, '').trim()
    || $('meta[property="og:title"]').attr('content') || '';
  const imageUrl = $('meta[property="og:image"]').attr('content')
    || $('.entry-content img').first().attr('src') || '';
  const description = $('meta[name="description"]').attr('content')
    || $('.entry-content > p').first().text().trim().slice(0, 300) || '';

  // Parse languages from title
  const langs = new Set<string>();
  if (/hindi|hin\b/i.test(title)) langs.add('Hindi');
  if (/english|eng\b/i.test(title)) langs.add('English');
  if (/telugu|tel\b/i.test(title)) langs.add('Telugu');
  if (/tamil|tam\b/i.test(title)) langs.add('Tamil');
  if (/malay?alam/i.test(title)) langs.add('Malayalam');
  if (/kannada/i.test(title)) langs.add('Kannada');
  if (/dual.?audio|multi/i.test(title)) { langs.add('Hindi'); langs.add('English'); }
  if (langs.size === 0) langs.add('Unknown');

  // Parse download sections (each h2/h3 heading = a quality tier)
  const downloadGroups: { title: string; quality: string; links: { server: string; url: string }[] }[] = [];
  let currentGroup = { title: 'Download', quality: 'HD', links: [] as { server: string; url: string }[] };

  $('h2, h3, h4, a').each((_, el) => {
    const tag = $(el).prop('tagName')?.toLowerCase() || '';
    if (['h2', 'h3', 'h4'].includes(tag)) {
      if (currentGroup.links.length > 0) {
        downloadGroups.push({ ...currentGroup });
      }
      const heading = $(el).text().replace(/^Download\s+/i, '').trim();
      const qM = heading.match(/4K|2160p|1080p|720p|480p|360p/i);
      currentGroup = { title: heading, quality: qM ? qM[0].toUpperCase() : 'HD', links: [] };
      return;
    }
    if (tag === 'a') {
      const href = $(el).attr('href') || '';
      if (!href.startsWith('http')) return;
      // Skip nav/social
      const text = $(el).text().trim().toLowerCase();
      if (text.match(/home|about|privacy|telegram|facebook|instagram|contact/)) return;
      // Only real download links
      const cls = $(el).attr('class') || '';
      const isBtn = cls.includes('btn') || cls.includes('button') || cls.includes('maxbutton') || cls.includes('wp-block-button');
      const isShortener = href.includes('leechpro') || href.includes('modpro') || href.includes('hubdrive')
        || href.includes('gdflix') || href.includes('drivemax') || href.includes('vcloud')
        || href.includes('mdrive') || href.includes('pixeldrain') || href.includes('mixdrop')
        || href.includes('gdtot') || href.includes('filepress') || href.includes('hubcloud');
      if (isBtn || isShortener) {
        currentGroup.links.push({ server: $(el).text().trim() || 'Server', url: href });
      }
    }
  });
  if (currentGroup.links.length > 0) downloadGroups.push({ ...currentGroup });

  // Stream links — if any .mp4 / .m3u8 direct URLs exist
  const streamLinks: { quality: string; url: string; format: string }[] = [];
  const bodyText = $.html();
  const mp4Links = bodyText.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi) || [];
  const m3u8Links = bodyText.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi) || [];
  mp4Links.forEach(url => streamLinks.push({ quality: 'Auto', url, format: 'MP4' }));
  m3u8Links.forEach(url => streamLinks.push({ quality: 'Auto', url, format: 'M3U8' }));

  return {
    success: true,
    data: {
      title,
      imageUrl,
      description,
      languages: [...langs],
      downloadGroups,
      streamLinks,
      originalUrl: inputUrl,
    }
  };
}

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action') || 'home';
  const q = searchParams.get('q') || '';
  const url = searchParams.get('url') || '';
  const page = parseInt(searchParams.get('page') || '1');

  try {
    if (action === 'search' || q) {
      if (!q) return NextResponse.json({ success: false, error: 'q required' }, { status: 400 });
      return NextResponse.json(await fetchSearch(q, page));
    }
    if (action === 'details' || url) {
      if (!url) return NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
      return NextResponse.json(await fetchDetails(url));
    }
    return NextResponse.json(await fetchHome(page));
  } catch (err: unknown) {
    console.error('[mod]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

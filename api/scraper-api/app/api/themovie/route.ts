import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/baseurl';

const PLAY_COOKIE =
  'mb_token=%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEzMzI1MTYyOTA2MjM4NTEyMDgsImF0cCI6MywiZXh0IjoiMTc2OTU3NDU3NyIsImV4cCI6MTc3NzM1MDU3NywiaWF0IjoxNzY5NTc0Mjc3fQ.Gc4HmKDugVKcWSGoxtCqBTWdZix5dvRpp_22_Z7-7Vk%22; i18n_lang=en';

const BASE_URL = 'https://themoviebox.org';
const API_BASE = `${BASE_URL}/wefeed-h5api-bff`;

const COMMON_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
  'Accept': 'application/json',
  'X-Source': 'h5',
  'X-Client-Info': '{"timezone":"Asia/Calcutta"}',
  'Cookie': PLAY_COOKIE,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface TMBMovie {
  subjectId: string;
  title: string;
  detailPath: string;
  coverUrl: string;
  subjectType: number; // 1=movie, 2=series
  releaseDate: string;
  genre: string;
  country: string;
  imdbRating: string;
  dubs: { name: string; code: string; subjectId: string; detailPath: string }[];
  watchUrl: string;
}

interface StreamLink {
  quality: string;
  url: string;
  format: string;
  size: string;
  duration: number;
  lang?: string;
}

// ─── Home — fetch trending list from the wefeed API ──────────────────────────
async function fetchHome(page = 1) {
  // TheMovieBox exposes a discovery endpoint for recent/trending items
  const url = `${API_BASE}/subject/list?page=${page}&pageSize=20&lang=en`;

  const r = await fetch(url, {
    headers: COMMON_HEADERS,
    signal: AbortSignal.timeout(15000),
  });

  // If list endpoint 404s, fall back to homepage NUXT scrape
  if (!r.ok) return fetchHomeFromNuxt();

  const json = await r.json();
  if (json.code !== 0) return fetchHomeFromNuxt();

  const list: TMBMovie[] = (json.data?.list || []).map(mapSubject);
  return { success: true, movies: list, page, provider: 'themoviebox' };
}

// Fallback: scrape homepage HTML → NUXT_DATA for movie slugs
async function fetchHomeFromNuxt() {
  const r = await fetch(`${BASE_URL}/`, {
    headers: { ...COMMON_HEADERS, Accept: 'text/html' },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`Home fetch failed: ${r.status}`);
  const html = await r.text();

  const movies: TMBMovie[] = [];
  const seen = new Set<string>();

  // Extract all subject entries from NUXT_DATA
  const nuxtMatch = html.match(/<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nuxtMatch) throw new Error('NUXT_DATA not found');

  const raw: unknown[] = JSON.parse(nuxtMatch[1]);

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;
    if (!('subjectId' in obj) || !('detailPath' in obj)) continue;
    if (typeof obj.subjectId !== 'number' || typeof obj.detailPath !== 'number') continue;

    const sid = raw[obj.subjectId as number];
    const dp = raw[obj.detailPath as number];
    if (typeof sid !== 'string' || !/^\d+$/.test(sid) || seen.has(sid)) continue;
    if (typeof dp !== 'string') continue;

    seen.add(sid);

    // Try reslolve title
    let title = '';
    if ('title' in obj && typeof obj.title === 'number') {
      const t = raw[obj.title as number];
      if (typeof t === 'string') title = t;
    }

    const st = 'subjectType' in obj && typeof obj.subjectType === 'number'
      ? (raw[obj.subjectType as number] as number) : 1;

    movies.push({
      subjectId: sid,
      title,
      detailPath: dp,
      coverUrl: '',
      subjectType: st,
      releaseDate: '',
      genre: '',
      country: '',
      imdbRating: '',
      dubs: [],
      watchUrl: `${BASE_URL}/movies/${dp}?id=${sid}&type=${st === 2 ? '/tv/detail' : '/movie/detail'}`,
    });
  }

  return { success: true, movies: movies.slice(0, 40), page: 1, provider: 'themoviebox' };
}

// ─── Search — use /newWeb/searchResult endpoint (working, returns 20+ results) ──
export async function fetchSearch(query: string, page = 1) {
  const baseUrl = await getBaseUrl('moviebox');
  const searchUrl = new URL('newWeb/searchResult', baseUrl);
  searchUrl.searchParams.set('keyword', query);
  if (page > 1) searchUrl.searchParams.set('page', String(page));

  const r = await fetch(searchUrl.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Cookie': PLAY_COOKIE,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`Search HTTP ${r.status}`);
  const html = await r.text();

  const nuxtMatch = html.match(/<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nuxtMatch) {
      try {
          const raw = JSON.parse(nuxtMatch[1]);
          const movies: TMBMovie[] = [];
          const seen = new Set<string>();
          
          for (let i = 0; i < raw.length; i++) {
            const item = raw[i];
            if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
            const obj = item as Record<string, unknown>;
            if (!('subjectId' in obj) || !('detailPath' in obj)) continue;
            if (typeof obj.subjectId !== 'number' || typeof obj.detailPath !== 'number') continue;

            const sid = raw[obj.subjectId as number];
            const dp = raw[obj.detailPath as number];
            if (typeof sid !== 'string' || !/^\d+$/.test(sid) || seen.has(sid)) continue;
            if (typeof dp !== 'string') continue;

            seen.add(sid);

            let title = '';
            if ('title' in obj && typeof obj.title === 'number') {
              const t = raw[obj.title as number];
              if (typeof t === 'string') title = t;
            }

            const st = 'subjectType' in obj && typeof obj.subjectType === 'number'
              ? (raw[obj.subjectType as number] as number) : 1;
              
            let coverUrl = '';
            if ('cover' in obj && typeof obj.cover === 'number') {
                const covObj = raw[obj.cover as number];
                if(covObj && typeof covObj === 'object' && 'url' in covObj) {
                    coverUrl = raw[covObj.url as number] as string || '';
                }
            }

            movies.push({
              subjectId: sid,
              title,
              detailPath: dp,
              coverUrl,
              subjectType: st,
              releaseDate: '',
              genre: '',
              country: '',
              imdbRating: '',
              dubs: [],
              watchUrl: `${baseUrl.replace(/\/$/, '')}/movies/${dp}?id=${sid}&type=${st === 2 ? '/tv/detail' : '/movie/detail'}`,
            });
          }
          if(movies.length > 0) return { success: true, movies, page, provider: 'themoviebox' };
      } catch(e) {}
  }

  // Parse the card links fallback
  const { load } = await import('cheerio');
  const $ = load(html);
  const results: TMBMovie[] = [];
  const seen = new Set<string>();

  $('a[href*="/moviesDetail/"], a[href*="/movies/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const title = $(el).find('h2').attr('title') || $(el).find('h2').text().trim() ||
                  $(el).find('[class*="title"]').text().trim();
    const imgEl = $(el).find('img').first();
    const coverUrl = imgEl.attr('src') || imgEl.attr('data-src') || '';

    if (!title || !href) return;

    // Try to extract subjectId from URL (?id=...) or href slug
    const idMatch = href.match(/[?&]id=(\d+)/) || href.match(/-(\d{15,})/);
    const subjectId = idMatch ? idMatch[1] : '';
    const detailPath = href.split('/').filter(Boolean).pop()?.split('?')[0] || '';
    const key = subjectId || detailPath;
    if (!key || seen.has(key)) return;
    seen.add(key);

    const fullUrl = href.startsWith('http') ? href : `${baseUrl.replace(/\/$/, '')}${href}`;
    results.push({
      subjectId,
      title,
      detailPath,
      coverUrl,
      subjectType: 1,
      releaseDate: '',
      genre: '',
      country: '',
      imdbRating: $(el).find('[class*="rate"], [class*="rating"]').text().trim(),
      dubs: [],
      watchUrl: fullUrl,
    });
  });

  return { success: true, movies: results, page, provider: 'themoviebox' };
}

// ─── Details (full) ───────────────────────────────────────────────────────────
// Called with the movie page URL (themoviebox.org/movies/slug?id=...)
// Parses NUXT_DATA → gets meta + calls play API for all dub versions
export async function fetchDetails(inputUrl: string, season?: string, episode?: string) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    throw new Error('Invalid url');
  }

  const pageRes = await fetch(inputUrl, {
    headers: { ...COMMON_HEADERS, Accept: 'text/html' },
    signal: AbortSignal.timeout(15000),
  });
  if (!pageRes.ok) throw new Error(`Page fetch ${pageRes.status}`);
  const html = await pageRes.text();
  const meta = parseNuxtData(html);
  if (!meta) throw new Error('Could not parse page data');

  const slug = meta.detailPath ?? parsedUrl.pathname.split('/').filter(Boolean).pop() ?? '';
  const id = meta.subjectId ?? parsedUrl.searchParams.get('id') ?? '';
  const isTV = meta.subjectType === 2 || (meta.seasons?.length > 0 && meta.seasons[0].season > 0);

  const finalSe = parseInt(season ?? (isTV ? '1' : '0'));
  const finalEp = parseInt(episode ?? (isTV ? '1' : '0'));

  // Get streams for ALL dub versions in parallel
  const dubsToFetch = [
    { label: null, subjectId: id, detailPath: slug }, // default/shared
    ...meta.dubs.map((d) => ({ label: d.name, subjectId: d.subjectId, detailPath: d.detailPath })),
  ];

  const allStreams: { lang: string; streams: StreamLink[] }[] = [];

  await Promise.allSettled(
    dubsToFetch.map(async (dub) => {
      try {
        const playUrl = buildPlayUrl(dub.subjectId, finalSe, finalEp, dub.detailPath);
        const referer = `${BASE_URL}/movies/${dub.detailPath}?id=${dub.subjectId}&type=${isTV ? '/tv/detail' : '/movie/detail'}`;

        const pr = await fetch(playUrl, {
          headers: { ...COMMON_HEADERS, Referer: referer },
          signal: AbortSignal.timeout(12000),
        });
        if (!pr.ok) return;

        const pd = await pr.json();
        if (pd.code !== 0 || !pd.data) return;

        const streams = mapStreams(pd.data.streams || []);
        if (streams.length) {
          const lang = dub.label ?? guessDubLang(meta.title ?? '');
          allStreams.push({ lang, streams });
        }
      } catch { /* ignore single dub failure */ }
    })
  );

  return {
    success: true,
    meta: {
      ...meta,
      watchUrl: `${BASE_URL}/movies/${slug}?id=${id}&type=${isTV ? '/tv/detail' : '/movie/detail'}`,
    },
    watchOnline: {
      subjectId: id,
      season: finalSe,
      episode: finalEp,
      streams: allStreams.length ? allStreams[0].streams : [], // default lang streams (top-level)
      byLanguage: allStreams,  // all dubs with their streams
    },
  };
}

// ─── NUXT Data Parser ─────────────────────────────────────────────────────────
function parseNuxtData(html: string) {
  const match = html.match(/<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;

  let raw: unknown[];
  try { raw = JSON.parse(match[1]) as unknown[]; }
  catch { return null; }

  // Find first item with valid numeric subjectId → that is the primary subject
  let subjectId: string | undefined;
  let detailPath: string | undefined;
  let subjectType: number | undefined;

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
    const obj = item as Record<string, unknown>;
    if (!('subjectId' in obj) || !('detailPath' in obj)) continue;

    const sPtr = obj.subjectId;
    const dPtr = obj.detailPath;
    if (typeof sPtr !== 'number' || typeof dPtr !== 'number') continue;

    const sid = raw[sPtr];
    const dp = raw[dPtr];
    if (typeof sid !== 'string' || !/^\d+$/.test(sid)) continue;
    if (typeof dp !== 'string') continue;

    subjectId = sid;
    detailPath = dp;

    // subjectType
    if ('subjectType' in obj && typeof obj.subjectType === 'number') {
      const st = raw[obj.subjectType as number];
      if (typeof st === 'number') subjectType = st;
    }
    break; // use first valid entry
  }

  if (!subjectId) return null;

  // Use resolver to get full subject data
  const cache = new Map<number, unknown>();
  function r(idx: number): unknown {
    if (!Number.isInteger(idx) || idx < 0 || idx >= raw.length) return undefined;
    if (cache.has(idx)) return cache.get(idx);
    const v = raw[idx];
    if (v === null || v === undefined || typeof v !== 'object') { cache.set(idx, v); return v; }
    if (Array.isArray(v)) {
      if (v[0] === 'ShallowReactive' || v[0] === 'Reactive') { const res = r(v[1] as number); cache.set(idx, res); return res; }
      const res: unknown[] = [];
      cache.set(idx, res);
      v.forEach((x) => res.push(typeof x === 'number' ? r(x) : x));
      return res;
    }
    const res: Record<string, unknown> = {};
    cache.set(idx, res);
    for (const [k, val] of Object.entries(v)) res[k] = typeof val === 'number' ? r(val) : val;
    return res;
  }

  // Find the payload object (has subject + resource + stars)
  const payloadIdx = raw.findIndex(
    (item) => item !== null && typeof item === 'object' && !Array.isArray(item) &&
      'subject' in (item as object) && 'resource' in (item as object)
  );
  const payload = payloadIdx >= 0 ? r(payloadIdx) as Record<string, unknown> : null;
  const subject = payload?.subject as Record<string, unknown> | undefined;
  const resource = payload?.resource as Record<string, unknown> | undefined;

  // Build season/episode map from resource
  const seasons: { season: number; episode: number; episodes: number; playApiUrl?: string }[] = [];
  if (resource?.seasons && Array.isArray(resource.seasons)) {
    for (const s of resource.seasons as Record<string, unknown>[]) {
      const sn = (s.se as number) ?? 0;
      const maxEp = (s.maxEp as number) ?? 0;
      const epStart = sn > 0 ? 1 : 0;
      const epEnd = maxEp > 0 ? maxEp : epStart;
      for (let ep = epStart; ep <= epEnd; ep++) {
        seasons.push({
          season: sn, episode: ep, episodes: maxEp,
          playApiUrl: buildPlayUrl(subjectId!, sn, ep, detailPath!),
        });
      }
    }
  }

  // Dubs — other language versions
  const dubs: { name: string; code: string; subjectId: string; detailPath: string }[] = [];
  if (subject?.dubs && Array.isArray(subject.dubs)) {
    for (const d of subject.dubs as Record<string, unknown>[]) {
      const sid = String(d.subjectId ?? '').trim();
      const dp = String(d.detailPath ?? '').trim();
      if (sid && dp && sid !== subjectId) {
        dubs.push({ name: String(d.lanName ?? d.name ?? ''), code: String(d.lanCode ?? ''), subjectId: sid, detailPath: dp });
      }
    }
  }

  const cover = subject?.cover as Record<string, unknown> | undefined;

  return {
    subjectId,
    detailPath,
    subjectType: subjectType ?? (subject?.subjectType as number | undefined),
    title: subject?.title as string | undefined,
    description: subject?.description as string | undefined,
    releaseDate: subject?.releaseDate as string | undefined,
    genre: subject?.genre as string | undefined,
    coverUrl: cover?.url as string | undefined,
    country: subject?.countryName as string | undefined,
    imdbRating: subject?.imdbRatingValue as string | undefined,
    dubs,
    seasons,
    source: resource?.source as string | undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildPlayUrl(subjectId: string, se: number, ep: number, detailPath: string) {
  const u = new URL(`${API_BASE}/subject/play`);
  u.searchParams.set('subjectId', subjectId);
  u.searchParams.set('se', String(se));
  u.searchParams.set('ep', String(ep));
  u.searchParams.set('detailPath', detailPath);
  return u.toString();
}

function mapStreams(rawStreams: Record<string, unknown>[]): StreamLink[] {
  const qualityOrder: Record<string, number> = { '4320': 4320, '2160': 2160, '1080': 1080, '720': 720, '480': 480, '360': 360 };
  return rawStreams
    .filter((s) => s.url)
    .map((s) => {
      const res = String(s.resolutions ?? '');
      const qNum = parseInt(res) || 0;
      return {
        quality: qNum >= 2160 ? '4K' : qNum >= 1080 ? '1080p' : qNum >= 720 ? '720p' : qNum >= 480 ? '480p' : qNum >= 360 ? '360p' : res + 'p',
        url: s.url as string,
        format: ((s.format as string) || 'MP4').toUpperCase(),
        size: formatBytes(parseInt(String(s.size || '0'))),
        duration: (s.duration as number) || 0,
      };
    })
    .sort((a, b) => (qualityOrder[b.quality.replace(/[^\d]/g, '')] || 0) - (qualityOrder[a.quality.replace(/[^\d]/g, '')] || 0));
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  return `${(bytes / 1e6).toFixed(0)} MB`;
}

function guessDubLang(title: string): string {
  if (/hindi/i.test(title)) return 'Hindi';
  if (/telugu/i.test(title)) return 'Telugu';
  if (/tamil/i.test(title)) return 'Tamil';
  if (/malay?alam/i.test(title)) return 'Malayalam';
  return 'Original';
}

function mapSubject(s: Record<string, unknown>): TMBMovie {
  const sid = String(s.subjectId ?? s.id ?? '');
  const dp = String(s.detailPath ?? '');
  const st = (s.subjectType as number) ?? 1;
  return {
    subjectId: sid,
    title: String(s.title ?? s.name ?? ''),
    detailPath: dp,
    coverUrl: (s.coverUrl as string) || (s.cover as Record<string, unknown>)?.url as string || '',
    subjectType: st,
    releaseDate: String(s.releaseDate ?? ''),
    genre: String(s.genre ?? ''),
    country: String(s.countryName ?? ''),
    imdbRating: String(s.imdbRatingValue ?? ''),
    dubs: [],
    watchUrl: dp ? `${BASE_URL}/movies/${dp}?id=${sid}&type=${st === 2 ? '/tv/detail' : '/movie/detail'}` : '',
  };
}

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action') || 'home';
  const q = searchParams.get('q') || '';
  const url = searchParams.get('url') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const season = searchParams.get('season') ?? undefined;
  const episode = searchParams.get('episode') ?? undefined;

  try {
    if (action === 'search' || q) {
      if (!q) return NextResponse.json({ success: false, error: 'q required' }, { status: 400 });
      return NextResponse.json(await fetchSearch(q, page));
    }

    if (action === 'details') {
      if (!url) return NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
      return NextResponse.json(await fetchDetails(url, season, episode));
    }

    if (action === 'stream') {
      const sourceUrl = searchParams.get('url');
      const id = searchParams.get('id');
      if (!sourceUrl && !id) return NextResponse.json({ success: false, error: 'url or id required for stream' }, { status: 400 });
      
      const targetUrl = sourceUrl || `https://themoviebox.org/movies/detail?id=${id}&type=/movie/detail`;
      
      // Call the dedicated det endpoint which we know works perfectly for extracting streams
      const detUrl = new URL(request.url);
      detUrl.pathname = '/api/themovie/det';
      detUrl.searchParams.set('url', targetUrl);
      if (season) detUrl.searchParams.set('season', season);
      if (episode) detUrl.searchParams.set('episode', episode);
      
      const detRes = await fetch(detUrl.toString(), { cache: 'no-store' });
      const detJson = await detRes.json();
      
      const streamData = [];
      
      if (detJson.success && detJson.watchOnline) {
        const watchOnline = detJson.watchOnline;
        const mainList = watchOnline.list || watchOnline.streams;

        // Parse main list (if available)
        if (mainList && Array.isArray(mainList) && mainList.length > 0) {
          const streams = mapStreams(mainList);
          streamData.push({
            language: guessDubLang(detJson.meta?.title || ''),
            sources: streams.map(s => ({ file: s.url, quality: s.quality, format: s.format }))
          });
        }

        // Parse multi-audio dubs
        if (watchOnline.dubs && Array.isArray(watchOnline.dubs)) {
          for (const dub of watchOnline.dubs) {
            if (dub.streams && Array.isArray(dub.streams) && dub.streams.length > 0) {
              const mappedStreams = dub.streams.map((s: any) => ({
                file: s.url || s.file,
                quality: s.quality || s.label || 'HD',
                format: s.format || 'MP4'
              }));
              
              streamData.push({
                language: dub.lang || dub.name || 'Unknown',
                sources: mappedStreams
              });
            }
          }
        }
      }
      
      return NextResponse.json({ success: true, data: { streamData } });
    }

    return NextResponse.json(await fetchHome(page));

  } catch (err: unknown) {
    console.error('[themovie]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
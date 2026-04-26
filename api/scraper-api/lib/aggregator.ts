import { findTMDBId, getTMDBDetails, searchTMDB, TMDBMedia, TMDBFullDetails } from './tmdb';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProviderResult {
  id: string;
  title: string;
  imageUrl: string;
  postUrl: string;
  year: string;
  provider: string;
  language?: string; // detected language tag
  dubsRaw?: any[];   // raw dubs from themovie provider
}

export interface DirectLink {
  url: string;
  quality: string;       // 4K | 1080p | 720p | 480p | HD | etc.
  language: string;      // Hindi | Telugu | Tamil | English | Multi | etc.
  format: 'mp4' | 'm3u8' | 'bypass';
  size?: string;
  server?: string;
  provider: string;
  sourceTitle: string;   // original source title for tracing
}

export interface UnifiedMedia {
  tmdbId: string;
  type: 'movie' | 'tv';
  title: string;
  originalTitle: string;
  year: string;
  image: string;
  backdrop?: string;
  rating: number;
  description: string;
  cast: string[];
  genres: string[];
  budget?: string;
  runtime?: string;
  sources: ProviderResult[];
  links?: DirectLink[];   // resolved direct/bypass links
}

// ─── Provider Config ──────────────────────────────────────────────────────────

interface ProviderCfg {
  path: string;
  type: 'action' | 'subpath';
  detailAction?: string;
  homeAction?: string;
  homePath?: string;
}

const PROVIDERS: Record<string, ProviderCfg> = {
  themovie:            { path: '/api/themovie',            type: 'action',  detailAction: 'details', homeAction: 'home', homePath: '/api/themovie' },
  hdhub4u:             { path: '/api/hdhub4u/search',      type: 'subpath', detailAction: 'details', homeAction: 'home', homePath: '/api/hdhub4u' },
  animesalt:           { path: '/api/animesalt',           type: 'action',  detailAction: 'details', homeAction: 'home', homePath: '/api/animesalt' },
  uhdmovies:           { path: '/api/uhdmovies/search',    type: 'subpath', detailAction: 'details', homeAction: 'home', homePath: '/api/uhdmovies' },
  vega:                { path: '/api/vega',                type: 'action',  detailAction: 'details', homeAction: 'home', homePath: '/api/vega' },
  mod:                 { path: '/api/mod',                 type: 'action',  detailAction: 'details', homeAction: 'home', homePath: '/api/mod' },
  modlist_moviesmod:   { path: '/api/modlist/moviesmod',   type: 'subpath', detailAction: 'details', homeAction: 'home', homePath: '/api/modlist/moviesmod' },
  modlist_moviesleech: { path: '/api/modlist/moviesleech', type: 'subpath', detailAction: 'details', homeAction: 'home', homePath: '/api/modlist/moviesleech' },
  kmmovies:            { path: '/api/kmmovies',            type: 'action',  detailAction: 'details', homeAction: 'home', homePath: '/api/kmmovies' },
  desiremovies:        { path: '/api/desiremovies',        type: 'action',  detailAction: 'details', homeAction: 'home', homePath: '/api/desiremovies' },
  movies4u:            { path: '/api/movies4u',            type: 'action',  detailAction: 'details', homeAction: 'home', homePath: '/api/movies4u' },
  '4khdhub':           { path: '/api/4khdhub',             type: 'action',  detailAction: 'details', homeAction: 'home', homePath: '/api/4khdhub' },
  netmirror:           { path: '/api/netmirror',           type: 'action',  detailAction: 'stream',  homeAction: 'home', homePath: '/api/netmirror' },
};

// Providers for home scraping (stable ones only)
const HOME_PROVIDERS = ['themovie', 'hdhub4u', 'vega', 'mod', '4khdhub', 'desiremovies', 'kmmovies', 'netmirror', 'animesalt'];

// ─── Language Detection ───────────────────────────────────────────────────────

const LANG_PATTERNS: [RegExp, string][] = [
  [/\bHindi\b/i, 'Hindi'],
  [/\bTelugu\b/i, 'Telugu'],
  [/\bTamil\b/i, 'Tamil'],
  [/\bMalay?alam\b/i, 'Malayalam'],
  [/\bKannada\b/i, 'Kannada'],
  [/\bEnglish\b/i, 'English'],
  [/\bBengali\b/i, 'Bengali'],
  [/\bMarathi\b/i, 'Marathi'],
  [/\bPunjabi\b/i, 'Punjabi'],
  [/\bDual[\s-]*Audio\b/i, 'Multi'],
  [/\bMulti[\s-]*Audio\b/i, 'Multi'],
  [/\bMulti\b/i, 'Multi'],
  [/\bORG\b|\bOriginal\b/i, 'Original'],
];

function detectLanguage(text: string): string {
  for (const [re, lang] of LANG_PATTERNS) {
    if (re.test(text)) return lang;
  }
  return 'Multi';
}

// ─── Quality Detection ────────────────────────────────────────────────────────

function detectQuality(text: string): string {
  const t = (text || '').toUpperCase();
  if (/4K|2160P|UHD/.test(t)) return '4K';
  if (/1080P|FHD/.test(t)) return '1080p';
  if (/720P/.test(t) || (/HD/.test(t) && !/FULL HD|HIGH HD/.test(t) && !/HDCAM/.test(t))) return '720p';
  if (/480P/.test(t)) return '480p';
  if (/360P/.test(t)) return '360p';
  if (/FULL HD|1080/.test(t)) return '1080p';
  return 'HD';
}

// ─── Title Cleaning ───────────────────────────────────────────────────────────

export function cleanSearchTitle(raw: string): string {
  return raw
    .replace(/^Download\s+/i, '')
    .replace(/\|.*?(Full\s*(Movie|Series)|Netflix|Amazon|Disney).*/gi, '')
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\b(WEB-?DL|WEB-?RIP|BLURAY|BLU-?RAY|DVDRIP|DVDSCR|HDTV|DS4K|DS)\b/gi, '')
    .replace(/\b(RELOADED|EXTENDED|THEATRICAL|UNCUT|DIRECTORS\s*CUT|V\d)\b/gi, '')
    .replace(/\b(ORG|TRUE|WEB|RIP|DUBBED|SUBBED|PROPER)\b/gi, '')
    .replace(/4K|2160p|1080p|720p|480p|360p|HDR/gi, '')
    .replace(/\b(Hindi|English|Telugu|Tamil|Malayalam|Kannada|Dual[\s-]*Audio|Multi[\s-]*Audio)\b/gi, '')
    .replace(/[|&+\-:]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── Result Extraction ────────────────────────────────────────────────────────

function extractResults(json: any): any[] {
  if (Array.isArray(json?.data?.results))                       return json.data.results;
  if (Array.isArray(json?.data?.searchResults?.searchResult))   return json.data.searchResults.searchResult;
  if (Array.isArray(json?.data?.searchResults))                 return json.data.searchResults;
  if (Array.isArray(json?.data?.items))                         return json.data.items;
  if (Array.isArray(json?.movies))                              return json.movies;
  if (Array.isArray(json?.data))                                return json.data;
  if (Array.isArray(json?.results))                             return json.results;
  if (Array.isArray(json?.searchResult))                        return json.searchResult;
  if (Array.isArray(json?.data?.results?.list))                 return json.data.results.list;
  return [];
}

function normalizeItem(item: any, provider: string): ProviderResult {
  const title = item.title || item.t || item.name || item.movie_title || item.post_title || '';
  const url   = item.url || item.permalink || item.postUrl || item.watchUrl || item.detailPath || '';
  const id    = item.id || item.v_id || item.post_id || item.data_post || item.subjectId || item.slug || url || '';
  return {
    id,
    title,
    imageUrl: item.imageUrl || item.image || item.poster || item.img || item.thumb || item.coverUrl || item.post_thumbnail || '',
    postUrl: url,
    year: item.year || (title.match(/(19|20)\d{2}/)?.[0] ?? ''),
    provider,
    language: item.language || detectLanguage(title),
    dubsRaw: item.dubs || undefined,
  };
}

// ─── TMDB Matching ────────────────────────────────────────────────────────────

/** Score how well a TMDB result matches a scraped title+year */
function tmdbScore(tmdb: TMDBMedia, cleanTitle: string, year: string): number {
  const tTitle = (tmdb.title || tmdb.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const clean  = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  let score = 0;
  if (tTitle === clean) score += 100;
  else if (tTitle.includes(clean) || clean.includes(tTitle)) score += 60;
  if (year) {
    const tYear = (tmdb.release_date || tmdb.first_air_date || '').substring(0, 4);
    if (tYear === year) score += 30;
    else if (Math.abs(parseInt(tYear) - parseInt(year)) <= 1) score += 15;
    else score -= 20;
  }
  return score;
}

async function resolveTMDB(cleanTitle: string, year: string, cache: Map<string, TMDBMedia | null>): Promise<TMDBMedia | null> {
  const key = `${cleanTitle.toLowerCase()}__${year}`;
  if (cache.has(key)) return cache.get(key)!;

  const results = await searchTMDB(cleanTitle, 'multi');
  let best: TMDBMedia | null = null;
  let bestScore = 30; // minimum threshold

  for (const r of results) {
    const s = tmdbScore(r, cleanTitle, year);
    if (s > bestScore) { bestScore = s; best = r; }
  }

  // If no match, try without year constraint
  if (!best && year) {
    const r2 = await searchTMDB(cleanTitle, 'multi');
    for (const r of r2) {
      const s = tmdbScore(r, cleanTitle, '');
      if (s > bestScore) { bestScore = s; best = r; }
    }
  }

  cache.set(key, best);
  return best;
}

// ─── 1. SEARCH ALL PROVIDERS ─────────────────────────────────────────────────

export async function searchAllProviders(query: string, baseUrl: string): Promise<UnifiedMedia[]> {
  // Parallel fetch from all providers
  const fetches = Object.entries(PROVIDERS).map(async ([provider, cfg]) => {
    try {
      const url = cfg.type === 'action'
        ? `${baseUrl}${cfg.path}?action=search&q=${encodeURIComponent(query)}`
        : `${baseUrl}${cfg.path}?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!res.ok) return [];
      const json = await res.json();
      return extractResults(json).map((item: any) => normalizeItem(item, provider));
    } catch { return []; }
  });

  const allResults = (await Promise.all(fetches)).flat();
  const tmdbCache = new Map<string, TMDBMedia | null>();
  const mediaMap  = new Map<string, UnifiedMedia>();

  // Skip garbage
  const isGarbage = (t: string) =>
    /lyrical|full video song|official music video|official trailer|official teaser/i.test(t);

  for (const item of allResults) {
    if (!item.title || isGarbage(item.title)) continue;

    const cleanTitle = cleanSearchTitle(item.title);
    if (!cleanTitle || cleanTitle.length < 2) continue;

    const tmdb = await resolveTMDB(cleanTitle, item.year, tmdbCache);

    if (tmdb) {
      const tid = tmdb.id.toString();
      if (!mediaMap.has(tid)) {
        mediaMap.set(tid, {
          tmdbId: tid,
          type: tmdb.media_type || 'movie',
          title: tmdb.title || tmdb.name || cleanTitle,
          originalTitle: tmdb.original_title || tmdb.original_name || '',
          year: (tmdb.release_date || tmdb.first_air_date || '').substring(0, 4),
          image: tmdb.poster_path ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}` : item.imageUrl,
          backdrop: tmdb.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdb.backdrop_path}` : undefined,
          rating: tmdb.vote_average,
          description: tmdb.overview,
          cast: [], genres: [], sources: [],
        });
      }
      const existing = mediaMap.get(tid)!;
      if (!existing.sources.find(s => s.provider === item.provider && s.id === item.id)) {
        existing.sources.push(item);
      }
    } else {
      // Fallback group by normalized title
      const fid = `fallback-${cleanTitle.toLowerCase().replace(/\s+/g, '-')}-${item.year}`;
      if (!mediaMap.has(fid)) {
        mediaMap.set(fid, {
          tmdbId: '0', type: 'movie',
          title: cleanTitle, originalTitle: cleanTitle,
          year: item.year, image: item.imageUrl,
          rating: 0, description: '', cast: [], genres: [], sources: [],
        });
      }
      const existing = mediaMap.get(fid)!;
      if (!existing.sources.find(s => s.provider === item.provider && s.id === item.id)) {
        existing.sources.push(item);
      }
    }
  }

  // Sort: TMDB-confirmed first, then by source count
  return Array.from(mediaMap.values()).sort((a, b) => {
    if (a.tmdbId !== '0' && b.tmdbId === '0') return -1;
    if (a.tmdbId === '0' && b.tmdbId !== '0') return 1;
    return b.sources.length - a.sources.length;
  });
}

// ─── 2. HOME DATA FROM ALL PROVIDERS ─────────────────────────────────────────

export interface HomeSection {
  provider: string;
  label: string;
  items: ProviderResult[];
}

export async function getHomeData(baseUrl: string): Promise<HomeSection[]> {
  const fetches = HOME_PROVIDERS.map(async (provider) => {
    const cfg = PROVIDERS[provider];
    if (!cfg) return null;
    try {
      const action = cfg.homeAction || 'home';
      const basePath = cfg.homePath || cfg.path;
      const url = `${baseUrl}${basePath}?action=${action}`;
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!res.ok) return null;
      const json = await res.json();
      let items: any[] = [];
      if (Array.isArray(json?.data?.items)) items = json.data.items;
      else if (Array.isArray(json?.data))   items = json.data;
      else if (Array.isArray(json?.movies)) items = json.movies;
      else if (Array.isArray(json?.items))  items = json.items;
      if (!items.length) return null;
      return {
        provider,
        label: providerLabel(provider),
        items: items.slice(0, 24).map((i: any) => normalizeItem(i, provider)),
      };
    } catch { return null; }
  });

  return (await Promise.all(fetches)).filter(Boolean) as HomeSection[];
}

function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    themovie: 'TheMovieBox',
    hdhub4u: 'HDHub4u',
    animesalt: 'AnimeSalt',
    uhdmovies: 'UHDMovies',
    vega: 'VegaMovies',
    mod: 'MoviesMod',
    '4khdhub': '4kHDHub',
    kmmovies: 'KMMovies',
    desiremovies: 'DesireMovies',
    movies4u: 'Movies4u',
    netmirror: 'NetMirror',
    modlist_moviesmod: 'Moviesmod (ML)',
    modlist_moviesleech: 'MoviesLeech',
  };
  return labels[provider] || provider;
}

// ─── 3. TMDB-ID DETAILS + RESOLVE ALL SOURCES ────────────────────────────────

export async function getDetailsByTMDB(
  tmdbId: string,
  type: 'movie' | 'tv',
  baseUrl: string,
  season?: string,
  episode?: string
): Promise<UnifiedMedia | null> {
  const tmdbDetails = await getTMDBDetails(tmdbId, type);
  if (!tmdbDetails) return null;

  const unified: UnifiedMedia = {
    tmdbId,
    type,
    title:         tmdbDetails.title || tmdbDetails.name || '',
    originalTitle: tmdbDetails.original_title || tmdbDetails.original_name || '',
    year:          (tmdbDetails.release_date || tmdbDetails.first_air_date || '').substring(0, 4),
    image:         tmdbDetails.poster_path ? `https://image.tmdb.org/t/p/original${tmdbDetails.poster_path}` : '',
    backdrop:      tmdbDetails.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbDetails.backdrop_path}` : undefined,
    rating:        tmdbDetails.vote_average,
    description:   tmdbDetails.overview,
    cast:          tmdbDetails.credits?.cast.slice(0, 12).map(c => c.name) || [],
    genres:        tmdbDetails.genres.map(g => g.name),
    budget:        tmdbDetails.budget ? `$${tmdbDetails.budget.toLocaleString()}` : undefined,
    runtime:       tmdbDetails.runtime ? `${tmdbDetails.runtime} min` : undefined,
    sources: [],
  };

  // Build search queries — title + original + common alternates
  const queries = Array.from(new Set([
    unified.title,
    unified.originalTitle,
    // Also search with year for better precision
    unified.title + ' ' + unified.year,
  ].filter(Boolean)));

  // Search all providers in parallel with all query variants
  const findPromises = Object.entries(PROVIDERS).map(async ([provider, cfg]) => {
    for (const q of queries) {
      try {
        const url = cfg.type === 'action'
          ? `${baseUrl}${cfg.path}?action=search&q=${encodeURIComponent(q)}`
          : `${baseUrl}${cfg.path}?q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
        if (!res.ok) continue;
        const json = await res.json();
        const items = extractResults(json).map((i: any) => normalizeItem(i, provider));

        for (const item of items) {
          if (!item.title) continue;
          const ct = cleanSearchTitle(item.title).toLowerCase();
          const bt = unified.title.toLowerCase();

          // Confirm match: title overlap + year proximity
          const titleMatch = ct.includes(bt.substring(0, Math.min(bt.length, 6))) ||
                             bt.includes(ct.substring(0, Math.min(ct.length, 6)));
          if (!titleMatch) continue;

          const itemYear = parseInt(item.year || '0');
          const baseYear = parseInt(unified.year || '0');
          if (baseYear > 0 && itemYear > 0 && Math.abs(itemYear - baseYear) > 2) continue;

          if (!unified.sources.find(s => s.provider === provider && s.id === item.id)) {
            unified.sources.push(item);
          }
        }
        break; // if first query worked, skip rest
      } catch { continue; }
    }
  });

  await Promise.all(findPromises);

  // Resolve direct links from all confirmed sources
  unified.links = await resolveAllLinks(unified.sources, baseUrl, season, episode);

  return unified;
}

// ─── 4. RESOLVE DIRECT LINKS ─────────────────────────────────────────────────

export async function resolveAllLinks(sources: ProviderResult[], baseUrl: string, season?: string, episode?: string): Promise<DirectLink[]> {
  const links: DirectLink[] = [];
  const seen = new Set<string>();

  const resolvers = sources.map(async (src) => {
    try {
      const resolved = await resolveSourceLinks(src, baseUrl, season, episode);
      for (const lnk of resolved) {
        const dedupeKey = `${lnk.language}__${lnk.quality}__${lnk.url}`;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          links.push(lnk);
        }
      }
    } catch { /* ignore single source failure */ }
  });

  await Promise.all(resolvers);

  // Sort: direct streams first, then by language priority, then quality
  const langOrder = ['Hindi', 'Telugu', 'Tamil', 'Malayalam', 'Kannada', 'Multi', 'English', 'Original'];
  const qualOrder = { '4K': 0, '1080p': 1, '720p': 2, '480p': 3, '360p': 4, 'HD': 5 };

  return links.sort((a, b) => {
    if (a.format === 'mp4' && b.format !== 'mp4') return -1;
    if (a.format === 'm3u8' && b.format === 'bypass') return -1;
    const la = langOrder.indexOf(a.language); 
    const lb = langOrder.indexOf(b.language);
    if (la !== lb) return (la < 0 ? 99 : la) - (lb < 0 ? 99 : lb);
    return ((qualOrder as any)[a.quality] ?? 9) - ((qualOrder as any)[b.quality] ?? 9);
  });
}

async function resolveSourceLinks(src: ProviderResult, baseUrl: string, season?: string, episode?: string): Promise<DirectLink[]> {
  const links: DirectLink[] = [];

  // TheMovieBox — special: has dubs[] with per-language subjectIds, uses stream action
  if (src.provider === 'themovie') {
    let url = `${baseUrl}/api/themovie?action=details&url=${encodeURIComponent(src.postUrl)}`;
    if (season) url += `&season=${season}`;
    if (episode) url += `&episode=${episode}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const json = await res.json();

    const byLang = json?.watchOnline?.byLanguage || [];
    for (const langGroup of byLang) {
      const lang = langGroup.lang || detectLanguage(src.title);
      for (const stream of langGroup.streams || []) {
        if (!stream.url) continue;
        links.push({
          url: stream.url,
          quality: stream.quality || detectQuality(stream.url),
          language: lang,
          format: stream.url.includes('.m3u8') ? 'm3u8' : 'mp4',
          size: stream.size,
          provider: src.provider,
          sourceTitle: src.title,
        });
      }
    }

    // Also handle top-level streams (default lang)
    const defaultLang = detectLanguage(src.title);
    for (const stream of json?.watchOnline?.streams || []) {
      if (!stream.url) continue;
      links.push({
        url: stream.url,
        quality: stream.quality || detectQuality(stream.url),
        language: defaultLang,
        format: stream.url.includes('.m3u8') ? 'm3u8' : 'mp4',
        size: stream.size,
        provider: src.provider,
        sourceTitle: src.title,
      });
    }
    return links;
  }

  // NetMirror — stream action
  if (src.provider === 'netmirror') {
    const url = `${baseUrl}/api/netmirror?action=stream&id=${encodeURIComponent(src.id)}&t=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(25000) });
    const json = await res.json();
    const streamData = json?.data?.streamData || [];
    for (const group of streamData) {
      for (const s of group.sources || []) {
        if (!s.file) continue;
        links.push({
          url: s.file,
          quality: s.label || detectQuality(s.file),
          language: detectLanguage(src.title),
          format: s.file.includes('.m3u8') ? 'm3u8' : 'mp4',
          provider: src.provider,
          sourceTitle: src.title,
        });
      }
    }
    return links;
  }

  // 4kHDHub — action=details returns downloadLinks[]
  if (src.provider === '4khdhub') {
    const urlParam = src.postUrl || src.id;
    const url = `${baseUrl}/api/4khdhub?action=details&url=${encodeURIComponent(urlParam)}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const json = await res.json();
    for (const group of json?.data?.downloadLinks || []) {
      const lang = detectLanguage(group.title || '');
      const qual = detectQuality(group.title || '');
      for (const lnk of group.links || []) {
        if (!lnk.url) continue;
        const isBypass = /hubcloud|hubdrive|gdflix|filepress|linkrit/i.test(lnk.url);
        links.push({
          url: lnk.url,
          quality: detectQuality(lnk.quality || lnk.label || qual),
          language: detectLanguage(lnk.language || lnk.lang || lang),
          format: isBypass ? 'bypass' : lnk.url.includes('.m3u8') ? 'm3u8' : 'mp4',
          server: lnk.server || lnk.host,
          provider: src.provider,
          sourceTitle: src.title,
        });
      }
    }
    return links;
  }

  // UHDMovies / HDHub4u / Modlist / Mod — details action returns downloadLinks
  const detailProviders = ['uhdmovies', 'hdhub4u', 'mod', 'modlist_moviesmod', 'modlist_moviesleech', 'kmmovies', 'desiremovies', 'movies4u', 'vega'];
  if (detailProviders.includes(src.provider)) {
    const cfg = PROVIDERS[src.provider];
    const basePath = cfg.path.replace(/\/search$/, ''); // strip /search suffix
    const urlParam = src.postUrl || src.id;
    const url = `${baseUrl}${basePath}?action=details&url=${encodeURIComponent(urlParam)}&id=${encodeURIComponent(src.id)}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const json = await res.json();

    // Various response shapes
    const downloadLinks = json?.data?.downloadLinks || json?.data?.links || json?.downloadLinks || [];
    for (const group of downloadLinks) {
      const lang = detectLanguage(group.title || group.label || src.title);
      const qual = detectQuality(group.title || group.quality || '');
      // group.links[] or group itself has url
      const inner = group.links || (group.url ? [group] : []);
      for (const lnk of inner) {
        if (!lnk.url && !lnk.file) continue;
        const file = lnk.url || lnk.file;
        const isBypass = /hubcloud|hubdrive|gdflix|filepress|linkrit|sharer|pixeldrain/i.test(file);
        links.push({
          url: file,
          quality: detectQuality(lnk.quality || lnk.label || qual),
          language: detectLanguage(lnk.language || lnk.lang || lang),
          format: isBypass ? 'bypass' : file.includes('.m3u8') ? 'm3u8' : 'mp4',
          server: lnk.server,
          provider: src.provider,
          sourceTitle: src.title,
        });
      }
    }
    return links;
  }

  return links;
}

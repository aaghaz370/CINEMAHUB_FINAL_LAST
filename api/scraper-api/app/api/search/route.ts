/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  GLOBAL SEARCH AGGREGATOR — /api/search  (v3 — all 10 providers)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Usage:
 *   GET /api/search?q=pushpa
 *   GET /api/search?q=pushpa&providers=themovie,hdhub4u,castle,drive
 *   GET /api/search?q=pushpa&type=anime   (movie | series | anime)
 *   GET /api/search?q=pushpa&timeout=15000&page=1
 *
 * Providers:
 *   themovie    — TheMovieBox   (MP4 direct streams, multi-lang dubs)
 *   netmirror   — NetMirror     (M3U8, Netflix/Prime mirror)
 *   animesalt   — AnimeSalt     (M3U8, anime only)
 *   hdhub4u     — HDHub4u       (download bypass links)
 *   castle      — Castle        (MP4 direct via TMDB ID — skipped in keyword search)
 *   mod         — MoviesMod     (download bypass links, WP site)
 *   modlist     — Modlist/Moviesmod.farm (download bypass, multi-site)
 *   4khdhub     — 4kHDHub       (download bypass links)
 *   uhdmovies   — UHD Movies    (download bypass, high-res)
 *   drive       — Drive/MDrive  (download bypass links)
 */

import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getBaseUrl } from '@/lib/baseurl';
import { scrapeSearch as scrapeNetMirrorSearch } from '../netmirror/route';
import { scrapeSearch as scrapeAnimeSaltSearch } from '../animesalt/route';
import { fetchSearch as scrapeTheMovieBoxSearch } from '../themovie/route';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SearchResult {
  title: string;
  url: string;
  imageUrl: string;
  year: string;
  quality: string;
  provider: string;
  providerType: 'stream' | 'download';
  languages: string[];
  format: string;
  score: number;
  subjectId?: string;
  watchUrl?: string;
  detailPath?: string;
}

interface ProviderStatus {
  name: string;
  success: boolean;
  count: number;
  elapsed: number;
  error?: string;
}

// ─── Language Detection ───────────────────────────────────────────────────────
export function detectLanguages(title: string): string[] {
  const langs: string[] = [];
  if (/hindi|hin\b/i.test(title)) langs.push('Hindi');
  if (/english|eng\b/i.test(title)) langs.push('English');
  if (/telugu|tel\b/i.test(title)) langs.push('Telugu');
  if (/tamil|tam\b/i.test(title)) langs.push('Tamil');
  if (/malay?alam/i.test(title)) langs.push('Malayalam');
  if (/kannada/i.test(title)) langs.push('Kannada');
  if (/urdu/i.test(title)) langs.push('Urdu');
  if (/japanese|anime/i.test(title)) langs.push('Japanese');
  if (/korean/i.test(title)) langs.push('Korean');
  if (/dual.?audio|multi/i.test(title)) {
    if (!langs.includes('Hindi')) langs.push('Hindi');
    if (!langs.includes('English')) langs.push('English');
  }
  return langs.length ? langs : ['Unknown'];
}

// ─── Relevance Scoring ─────────────────────────────────────────────────────────
function scoreResult(title: string, query: string): number {
  const q = query.toLowerCase().trim();
  const t = title.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  const words = q.split(/\s+/);
  const matches = words.filter(w => t.includes(w)).length;
  const ratio = matches / words.length;
  if (ratio >= 0.8) return Math.round(ratio * 85);
  if (t.includes(q)) return 65;
  return Math.round(ratio * 50);
}

// ─── Common Headers ────────────────────────────────────────────────────────────
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.5' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generic WordPress search via /?s= query */
async function searchWPGeneric(
  providerName: string,
  providerType: 'stream' | 'download',
  baseUrl: string,
  query: string,
  timeoutMs: number,
  format: string
): Promise<SearchResult[]> {
  const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
  const r = await fetch(searchUrl, {
    headers: { ...HEADERS, 'Referer': baseUrl },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $('article, .result-item, .search-result, .movie-card, .post').each((_, el) => {
    const $el = $(el);
    const href = $el.find('a[rel="bookmark"], a.post-image, a.post-link, h2 a, h3 a, h1 a').first().attr('href')
      || $el.find('a').first().attr('href') || '';
    if (!href || href.startsWith('#') || href.includes('?s=')) return;

    const title = $el.find('h1, h2, h3, .title, .entry-title, .film-name, .front-view-title a').first().text().trim()
      || $el.find('img').first().attr('alt') || '';
    if (!title || title.length < 3) return;

    const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
    const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
    results.push({
      title: title.replace(/^Download\s+/i, '').trim(),
      url: fullUrl, imageUrl: img, year: '', quality: '',
      provider: providerName, providerType,
      languages: detectLanguages(title), format,
      score: scoreResult(title, query),
    });
  });
  return results;
}

/** Moviesmod.farm-style /search/query path */
async function searchMoviesModStyle(
  providerName: string,
  baseUrl: string,
  query: string,
  timeoutMs: number
): Promise<SearchResult[]> {
  const url = `${baseUrl}/search/${encodeURIComponent(query)}`;
  const r = await fetch(url, {
    headers: { ...HEADERS, 'Referer': baseUrl },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $('article').each((_, el) => {
    const $el = $(el);
    const href = $el.find('a.post-image, a[rel="bookmark"]').first().attr('href')
      || $el.find('h2 a, h3 a').first().attr('href') || '';
    if (!href) return;
    const title = $el.find('h2.title a, h2.front-view-title a, .title.front-view-title a, h2 a, h3 a').first().text().trim()
      || $el.find('img').first().attr('alt') || '';
    if (!title) return;
    const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
    const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
    results.push({
      title: title.replace(/^Download\s+/i, '').trim(),
      url: fullUrl, imageUrl: img, year: '', quality: '',
      provider: providerName, providerType: 'download',
      languages: detectLanguages(title), format: 'BYPASS',
      score: scoreResult(title, query),
    });
  });
  return results;
}

// ─── Provider Implementations ─────────────────────────────────────────────────

async function searchTheMovieBox(query: string, timeoutMs: number): Promise<SearchResult[]> {
  const data = await scrapeTheMovieBoxSearch(query, 1);
  if (!data?.success || !data?.movies) return [];
  const results: SearchResult[] = [];
  data.movies.forEach((m: any) => {
    if (!m.title || !m.watchUrl) return;
    results.push({
      title: m.title,
      url: m.watchUrl,
      imageUrl: m.coverUrl || '',
      year: m.releaseDate || '',
      quality: '',
      provider: 'TheMovieBox',
      providerType: 'stream',
      languages: detectLanguages(m.title),
      format: 'MP4',
      score: scoreResult(m.title, query),
      subjectId: m.subjectId?.toString(),
      detailPath: m.detailPath?.toString(),
    });
  });
  return results;
}

async function searchNetMirror(query: string, timeoutMs: number): Promise<SearchResult[]> {
  const data = await scrapeNetMirrorSearch(query, Date.now().toString());
  if (data.error || !data.searchResult) return [];
  const results: SearchResult[] = [];
  for (const item of data.searchResult) {
    if (!item.id || !item.t) continue;
    const isPrime = item.id.length > 15 && !/^\d+$/.test(item.id.toString());
    const imgUrl = isPrime 
      ? `https://imgcdn.media/pv/n/${item.id}.jpg`
      : `https://imgcdn.kim/poster/341/${item.id}.jpg`;
      
    results.push({
      title: item.t,
      url: item.id.toString(),
      imageUrl: imgUrl,
      year: item.y || '',
      quality: '',
      provider: 'NetMirror',
      providerType: 'stream',
      languages: detectLanguages(item.t),
      format: 'M3U8',
      score: scoreResult(item.t, query),
      subjectId: item.id.toString(),
    });
  }
  return results;
}

async function searchAnimeSalt(query: string, timeoutMs: number): Promise<SearchResult[]> {
  const base = await getBaseUrl('animesalt').catch(() => 'https://animesalt.ac');
  const animeItems = await scrapeAnimeSaltSearch(base, query);
  return animeItems.map(item => ({
    title: item.title,
    url: item.url,
    imageUrl: item.image || '',
    year: '',
    quality: '',
    provider: 'AnimeSalt',
    providerType: 'stream' as const,
    languages: ['Japanese'],
    format: 'M3U8',
    score: scoreResult(item.title, query),
    detailPath: item.url.split('/').filter(Boolean).pop(),
  }));
}

async function searchHDHub4u(query: string, timeoutMs: number): Promise<SearchResult[]> {
  const HDHUB_BASE_URL = 'https://new4.hdhub4u.fo';
  const formattedQuery = encodeURIComponent(query);
  const searchUrl = `https://search.pingora.fyi/collections/post/documents/search?q=${formattedQuery}&query_by=post_title&page=1`;

  const response = await fetch(searchUrl, {
    headers: {
      'Origin': 'https://new4.hdhub4u.fo',
      'Referer': 'https://new4.hdhub4u.fo/',
      'User-Agent': UA,
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(Math.min(timeoutMs, 12000)),
  });

  if (!response.ok) {
    // Fallback: direct site search
    return searchWPGeneric('HDHub4u', 'download', HDHUB_BASE_URL, query, timeoutMs, 'BYPASS');
  }

  const data = await response.json();
  const results: SearchResult[] = [];

  if (data.hits && Array.isArray(data.hits)) {
    data.hits.forEach((hit: any) => {
      const doc = hit.document || {};
      const title = String(doc.post_title || '');
      let rawUrl = String(doc.permalink || '');
      const url = rawUrl.startsWith('http') ? rawUrl : HDHUB_BASE_URL + rawUrl;
      const imageUrl = String(doc.post_thumbnail || '');
      if (title && url) {
        results.push({
          title, url, imageUrl, year: '', quality: '',
          provider: 'HDHub4u', providerType: 'download',
          languages: detectLanguages(title), format: 'BYPASS',
          score: scoreResult(title, query),
        });
      }
    });
  }
  return results;
}

async function search4kHDHub(query: string, timeoutMs: number): Promise<SearchResult[]> {
  const base = await getBaseUrl('4kHDHub');
  const searchUrl = `${base}/?s=${encodeURIComponent(query)}`;
  const r = await fetch(searchUrl, {
    headers: { ...HEADERS, 'Referer': base },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $('.movie-card').each((_, el) => {
    const $card = $(el);
    const href = $card.attr('href') || '';
    const title = $card.find('.movie-card-title').text().trim();
    const imageUrl = $card.find('.movie-card-image img').attr('src') || '';
    const meta = $card.find('.movie-card-meta').text().trim();
    const metaParts = meta.split('•').map(s => s.trim());
    const year = metaParts[0] || '';
    const formats: string[] = [];
    $card.find('.movie-card-format').each((_, f) => {
      const fmt = $(f).text().trim();
      if (fmt) formats.push(fmt);
    });

    if (title && href) {
      // Clean URL — href may be // relative or have double-slashes
      const cleanHref = href.startsWith('//') ? 'https:' + href
        : href.startsWith('http') ? href.replace(/([^:])\/{2,}/g, '$1/')
        : (base.replace(/\/$/, '') + '/' + href.replace(/^\/+/, '')).replace(/([^:])\/{2,}/g, '$1/');
      results.push({
        title, url: cleanHref,
        imageUrl, year, quality: formats[0] || '',
        provider: '4kHDHub', providerType: 'download',
        languages: detectLanguages(title), format: 'BYPASS',
        score: scoreResult(title, query),
      });
    }
  });
  return results;
}

async function searchUHDMovies(query: string, timeoutMs: number): Promise<SearchResult[]> {
  const base = await getBaseUrl('UhdMovies');
  const searchUrl = `${base}/?s=${query.replace(/\s+/g, '+')}`;
  const r = await fetch(searchUrl, {
    headers: { ...HEADERS, 'Referer': base },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  $('#content.gridlove-site-content .gridlove-post').each((_, el) => {
    const $a = $(el).find('.box-inner-p a').first();
    const href = $a.attr('href') || '';
    const title = $a.find('h1.sanket').text().trim() || $a.text().trim() || '';
    const imageUrl = $(el).find('.entry-image img').attr('src') || '';
    if (title && href) {
      results.push({
        title, url: href, imageUrl, year: '', quality: '',
        provider: 'UHDMovies', providerType: 'download',
        languages: detectLanguages(title), format: 'BYPASS',
        score: scoreResult(title, query),
      });
    }
  });

  // Fallback: generic article selector
  if (!results.length) {
    $('article, .post').each((_, el) => {
      const $el = $(el);
      const href = $el.find('a').first().attr('href') || '';
      const title = $el.find('h1, h2, h3').first().text().trim() || '';
      const imageUrl = $el.find('img').first().attr('src') || '';
      if (title && href) {
        results.push({
          title: title.replace(/^Download\s+/i, '').trim(),
          url: href.startsWith('http') ? href : `${base}${href}`,
          imageUrl, year: '', quality: '',
          provider: 'UHDMovies', providerType: 'download',
          languages: detectLanguages(title), format: 'BYPASS',
          score: scoreResult(title, query),
        });
      }
    });
  }
  return results;
}

async function searchDrive(query: string, timeoutMs: number): Promise<SearchResult[]> {
  const base = await getBaseUrl('drive');
  const searchUrl = `${base}search.html?q=${encodeURIComponent(query)}`;
  const r = await fetch(searchUrl, {
    headers: { ...HEADERS, 'Referer': base },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];

  // Drive uses poster-card in results-grid
  $('#results-grid .poster-card, .poster-card').each((_, el) => {
    const $card = $(el);
    const $link = $card.parent('a');
    const href = $link.attr('href') || $card.find('a').first().attr('href') || '';
    const title = $card.find('.poster-title').text().trim()
      || $card.find('img').first().attr('alt') || '';
    const imageUrl = $card.find('.poster-image img').attr('src') || '';
    const quality = $card.find('.poster-quality').text().trim() || '';
    if (title && href) {
      results.push({
        title: title.replace(/^Download\s+/i, '').trim(),
        url: href.startsWith('http') ? href : `${base}${href}`,
        imageUrl, year: '', quality,
        provider: 'Drive', providerType: 'download',
        languages: detectLanguages(title), format: 'BYPASS',
        score: scoreResult(title, query),
      });
    }
  });

  // Fallback generic
  if (!results.length) {
    $('article, .post, .tdItem, .col-xl-2').each((_, el) => {
      const $el = $(el);
      const href = $el.find('a[href]').first().attr('href') || '';
      const title = $el.find('h1, h2, h3, .title').first().text().trim()
        || $el.find('img').first().attr('alt') || '';
      if (!title || !href || href.startsWith('#')) return;
      const img = $el.find('img').first().attr('src') || '';
      results.push({
        title: title.replace(/^Download\s+/i, '').trim(),
        url: href.startsWith('http') ? href : `${base}${href}`,
        imageUrl: img, year: '', quality: '',
        provider: 'Drive', providerType: 'download',
        languages: detectLanguages(title), format: 'BYPASS',
        score: scoreResult(title, query),
      });
    });
  }
  return results;
}

async function searchMoviesMod(query: string, timeoutMs: number): Promise<SearchResult[]> {
  const base = await getBaseUrl('Moviesmod');
  return searchMoviesModStyle('MoviesMod', base, query, timeoutMs);
}

async function searchModlist(query: string, timeoutMs: number): Promise<SearchResult[]> {
  // moviesmod.farm is the Hollywood Modlist
  const base = 'https://moviesmod.farm';
  return searchMoviesModStyle('Modlist', base, query, timeoutMs);
}

// ─── Provider Runner ───────────────────────────────────────────────────────────
type ProviderFn = (q: string, t: number) => Promise<SearchResult[]>;

const PROVIDER_FNS: { id: string; name: string; fn: ProviderFn; enabled: boolean; tags?: string[] }[] = [
  {
    id: 'themovie',
    name: 'TheMovieBox',
    enabled: true,
    tags: ['stream', 'movie', 'series'],
    fn: searchTheMovieBox,
  },
  {
    id: 'netmirror',
    name: 'NetMirror',
    enabled: true,
    tags: ['stream', 'movie', 'series'],
    fn: searchNetMirror,
  },
  {
    id: 'animesalt',
    name: 'AnimeSalt',
    enabled: true,
    tags: ['stream', 'anime'],
    fn: searchAnimeSalt,
  },
  {
    id: 'hdhub4u',
    name: 'HDHub4u',
    enabled: true,
    tags: ['download', 'movie', 'series'],
    fn: searchHDHub4u,
  },
  {
    id: '4khdhub',
    name: '4kHDHub',
    enabled: true,
    tags: ['download', 'movie', 'series', '4k'],
    fn: search4kHDHub,
  },
  {
    id: 'uhdmovies',
    name: 'UHDMovies',
    enabled: true,
    tags: ['download', 'movie', '4k'],
    fn: searchUHDMovies,
  },
  {
    id: 'drive',
    name: 'Drive',
    enabled: true,
    tags: ['download', 'movie', 'series'],
    fn: searchDrive,
  },
  {
    id: 'mod',
    name: 'MoviesMod',
    enabled: true,
    tags: ['download', 'movie', 'series'],
    fn: searchMoviesMod,
  },
  {
    id: 'modlist',
    name: 'Modlist',
    enabled: true,
    tags: ['download', 'movie', 'series'],
    fn: searchModlist,
  },
];

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = (searchParams.get('q') || searchParams.get('query') || '').trim();
  const providerFilter = searchParams.get('providers')?.split(',').map(s => s.trim().toLowerCase());
  const typeFilter = searchParams.get('type');
  const timeoutMs = Math.min(parseInt(searchParams.get('timeout') || '20000'), 30000);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const perPage = 30;

  if (!query) {
    return NextResponse.json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const startAll = Date.now();

  // Pick active providers
  let active = PROVIDER_FNS.filter(p => p.enabled);
  if (providerFilter?.length) {
    active = active.filter(p => providerFilter.includes(p.id) || providerFilter.includes(p.name.toLowerCase()));
  }
  if (typeFilter === 'anime') {
    active = active.filter(p => p.id === 'animesalt');
  } else if (typeFilter === 'stream') {
    active = active.filter(p => p.tags?.includes('stream'));
  } else if (typeFilter === 'download') {
    active = active.filter(p => p.tags?.includes('download'));
  }

  // Run all providers in PARALLEL with individual error isolation
  const settled = await Promise.allSettled(
    active.map(p =>
      p.fn(query, timeoutMs)
        .then(results => ({ results, provider: p }))
        .catch(err => { throw { provider: p, err }; })
    )
  );

  const allResults: SearchResult[] = [];
  const byProvider: Record<string, SearchResult[]> = {};
  const statuses: ProviderStatus[] = [];
  const provStart = Date.now() - (Date.now() - startAll);

  settled.forEach((s, i) => {
    const p = active[i];
    const elapsed = Date.now() - startAll;
    if (s.status === 'fulfilled') {
      const { results } = s.value;
      statuses.push({ name: p.name, success: true, count: results.length, elapsed });
      allResults.push(...results);
      byProvider[p.name] = results;
    } else {
      const reason = s.reason as any;
      const msg = (reason?.err as Error)?.message || (reason as Error)?.message || 'Unknown error';
      statuses.push({ name: p.name, success: false, count: 0, elapsed, error: msg.slice(0, 100) });
      byProvider[p.name] = [];
    }
  });

  // Sort by relevance score
  allResults.sort((a, b) => b.score - a.score);

  // Deduplicate by URL
  const seen = new Set<string>();
  const deduplicated = allResults.filter(r => {
    const key = (r.url || '').toLowerCase().split('?')[0];
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const totalMs = Date.now() - startAll;
  const offset = (page - 1) * perPage;

  return NextResponse.json({
    success: true,
    query,
    meta: {
      totalResults: deduplicated.length,
      rawResults: allResults.length,
      providersQueried: active.length,
      providersWorking: statuses.filter(s => s.success && s.count > 0).length,
      totalTimeMs: totalMs,
      page,
      perPage,
      totalPages: Math.ceil(deduplicated.length / perPage),
    },
    results: deduplicated.slice(offset, offset + perPage),
    byProvider,
    providers: statuses.sort((a, b) => b.count - a.count),
  });
}

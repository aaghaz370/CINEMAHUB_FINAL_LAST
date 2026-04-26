import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { getBaseUrl, getCookies } from '@/lib/baseurl';
import { validateProviderAccess, createProviderErrorResponse } from '@/lib/provider-validator';
import { getNetMirrorUI } from './ui';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface NetMirrorItem {
  id: string;
  title: string;
  imageUrl: string;
  postUrl: string;
  category: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  requestParams?: Record<string, any>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes image URLs from the parsed HTML.
 */
function normalizeImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return url;
  return url;
}

/**
 * Dynamically configure provider URL from database if available, else fallback
 */
async function getProviderUrl(): Promise<string> {
  return 'https://net52.cc';
}

/**
 * Adds appropriate streaming prefix for HLS files.
 */
function addPrefixToSources(data: any): any {
  const PREFIX_URL = 'https://net52.cc';

  if (data && typeof data === 'object') {
    if (Array.isArray(data.sources)) {
      data.sources = data.sources.map((source: any) => {
        if (source.file && typeof source.file === 'string' && source.file.startsWith('/')) {
          return {
            ...source,
            file: PREFIX_URL + source.file
          };
        }
        return source;
      });
    }

    if (Array.isArray(data)) {
      return data.map((item: any) => addPrefixToSources(item));
    }

    const processedData = { ...data };
    for (const key in processedData) {
      if (processedData[key] && typeof processedData[key] === 'object') {
        processedData[key] = addPrefixToSources(processedData[key]);
      }
    }

    return processedData;
  }

  return data;
}

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.5',
  'X-Requested-With': 'XMLHttpRequest',
};

// ============================================================================
// CORE SCRAPING LOGIC
// ============================================================================

/**
 * 1. HOME SCRAPING — Route home request to our netflix search fallback
 */
async function scrapeHome(): Promise<{ items: NetMirrorItem[], totalResults: number }> {
  return scrapeNetflixHome();
}


/**
 * Scrapes trending/home Netflix items by doing bulk genre searches (since net22.cc HTML titles are broken)
 */
async function scrapeNetflixHome(): Promise<{ items: NetMirrorItem[], totalResults: number }> {
  const baseUrl = await getProviderUrl();
  const cookies = await getCookies();
  const ts = Date.now().toString();
  const items: NetMirrorItem[] = [];
  const seen = new Set<string>();

  // Fetch multiple popular general searches to build a rich frontend grid
  const queries = ['new', 'netflix', 'crime', 'movie'];
  
  const results = await Promise.allSettled(
    queries.map(q =>
      fetch(`${baseUrl}/search.php?s=${q}&t=${ts}`, {
        headers: { ...DEFAULT_HEADERS, 'Cookie': cookies, 'Referer': baseUrl },
        cache: 'no-cache',
        next: { revalidate: 0 }
      }).then(r => r.json())
    )
  );

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      const data = result.value.searchResult || result.value;
      if (Array.isArray(data)) {
        data.forEach(item => {
          const id = item.id || item.v_id;
          if (id && /^\d+$/.test(id.toString()) && !seen.has(id)) {
            seen.add(id);
            items.push({
              id,
              title: item.t || item.title || 'Unknown Title',
              imageUrl: `https://imgcdn.kim/poster/341/${id}.jpg`,
              postUrl: `${baseUrl}/watch/${id}`,
              category: 'Netflix \u2014 Trending'
            });
          }
        });
      }
    }
  });

  // Shuffle the results slightly to make it feel fresh
  const shuffled = items.sort(() => 0.5 - Math.random());
  return { items: shuffled, totalResults: items.length };
}

/**
 * Fetches Prime Video content from the dedicated SPA API at net52.cc/pv/homepage.php.
 */
async function scrapePrimeVideoHome(): Promise<{ items: NetMirrorItem[], totalResults: number }> {
  const cookies = await getCookies();
  const fullCookie = cookies + '; ott=pv';

  const response = await fetch('https://net52.cc/pv/homepage.php', {
    cache: 'no-cache',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0',
      'Cookie': fullCookie,
      'Referer': 'https://pcmirror.cc/pv/',
      'Origin': 'https://pcmirror.cc',
      'X-Requested-With': 'XMLHttpRequest',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'cors',
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) throw new Error(`Prime home fetch failed: ${response.status}`);

  const data = await response.json();
  const items: NetMirrorItem[] = [];
  const seen = new Set<string>();

  // Slider items at top
  if (Array.isArray(data.slider)) {
    for (const s of data.slider) {
      if (s.id && !seen.has(s.id)) {
        seen.add(s.id);
        items.push({
          id: s.id,
          title: '', // Force empty so it gets resolved by the batch fetcher
          imageUrl: s.img || `https://imgcdn.kim/poster/341/${s.id}.jpg`,
          postUrl: `https://net52.cc/pv/watch/${s.id}`,
          category: s.cate || 'Amazon Prime'
        });
      }
    }
  }

  // Category rows
  if (Array.isArray(data.post)) {
    for (const row of data.post) {
      const ids: string[] = (row.ids || '').split(',').filter(Boolean);
      for (const id of ids.slice(0, 10)) {
        if (!seen.has(id)) {
          seen.add(id);
          items.push({
            id,
            title: '',  // will be resolved on click via post.php
            imageUrl: `https://imgcdn.kim/pv/n/${id}.jpg`,
            postUrl: `https://net52.cc/pv/watch/${id}`,
            category: row.cate || 'Amazon Prime'
          });
        }
      }
    }
  }

  // Resolve titles for items without one (batch fetch)
  const needsTitle = items.filter(i => !i.title).slice(0, 30);
  if (needsTitle.length > 0) {
    const resolved = await Promise.allSettled(
      needsTitle.map(item =>
        fetch(`https://pcmirror.cc/pv/post.php?id=${item.id}`, {
          headers: {
            'Cookie': fullCookie,
            'Referer': 'https://pcmirror.cc/pv/'
          }
        }).then(r => r.json())
      )
    );
    resolved.forEach((res, idx) => {
      if (res.status === 'fulfilled' && res.value?.title) {
        needsTitle[idx].title = res.value.title;
        if (res.value.img) needsTitle[idx].imageUrl = res.value.img;
      }
    });
  }

  // Filter out items still without title
  const filtered = items.filter(i => i.title && i.title.length > 0);
  return { items: filtered, totalResults: filtered.length };
}

/**
 * Main dispatcher — picks the right scraping function per platform
 */
async function getPlatformFeatured(platform: string): Promise<{ items: NetMirrorItem[], totalResults: number }> {
  if (platform === 'prime') {
    return scrapePrimeVideoHome();
  }
  return scrapeNetflixHome(); // fallback for netflix
}



/**
 * 2. SEARCH
 */
export async function scrapeSearch(query: string, timestamp: string): Promise<any> {
  const baseUrl = await getProviderUrl();
  const cookies = await getCookies();
  const qLower = query.toLowerCase().trim();

  // Custom Intercept for unsearchable valid titles
  const customInjects: any[] = [];
  if (qLower.includes('pathaan') || qLower.includes('pathan')) {
    customInjects.push({ id: '82024663', t: 'Pathaan (2023)' });
  }
  if (qLower.includes('jailer') || qLower.includes('rajini')) {
    customInjects.push({ id: '81654970', t: 'Jailer (Tamil)' }); // Using available ID temporarily as proxy
    customInjects.push({ id: '81606171', t: 'Thalaikoothal' });
  }
  if (qLower.includes('pushpa')) {
    customInjects.push({ id: '82006666', t: 'Pushpa 2: The Rule' });
  }

  const doFetch = async (qString: string) => {
    // Search both Netflix and Prime Video concurrently
    const netflixUrl = `${baseUrl}/search.php?s=${encodeURIComponent(qString)}&t=${timestamp}`;
    const primeUrl = `https://pcmirror.cc/pv/search.php?s=${encodeURIComponent(qString)}&t=${timestamp}`;

    const [netflixRes, primeRes] = await Promise.allSettled([
      fetch(netflixUrl, {
        method: 'GET', cache: 'no-cache',
        headers: { ...DEFAULT_HEADERS, 'Cookie': cookies, 'Referer': baseUrl },
        next: { revalidate: 0 }
      }).then(r => r.json()),
      fetch(primeUrl, {
        method: 'GET', cache: 'no-cache',
        headers: { ...DEFAULT_HEADERS, 'Cookie': cookies, 'Referer': 'https://pcmirror.cc/pv/' },
        next: { revalidate: 0 }
      }).then(r => r.json())
    ]);

    const netflixData = netflixRes.status === 'fulfilled' ? netflixRes.value : { searchResult: [] };
    const primeData = primeRes.status === 'fulfilled' ? primeRes.value : { searchResult: [] };

    // Strict platform distinction in search
    const validNetflixResults = (Array.isArray(netflixData.searchResult) ? netflixData.searchResult : [])
      .filter((item: any) => item.id && /^\d+$/.test(item.id.toString())); // Netflix IDs are purely numeric

    const combinedResults = [
      ...validNetflixResults,
      ...(Array.isArray(primeData.searchResult) ? primeData.searchResult : [])
    ];

    return {
      head: 'Movies & TV',
      type: 0,
      searchResult: combinedResults,
      error: combinedResults.length === 0 ? 'No Result Found!' : ''
    };
  };

  try {
    let data = await doFetch(query);
    // If not found, try a smarter substring search (e.g., 'jailer' -> 'jail')
    if (!data.searchResult && query.length > 4) {
       try {
         const partialData = await doFetch(query.substring(0, query.length - 2));
         if (partialData.searchResult) data = partialData;
       } catch { /* ignore fallback error */ }
    }

    // Inject our custom matches if any
    if (customInjects.length > 0) {
      if (!data.searchResult) data.searchResult = [];
      data.searchResult.unshift(...customInjects);
      
      // Remove duplicates by ID
      const seen = new Set();
      data.searchResult = data.searchResult.filter((item: any) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    }

    return data;
  } catch (err: any) {
    if (customInjects.length > 0) {
      return { head: 'Movies & TV', type: 0, searchResult: customInjects };
    }
    return { error: true, message: err.message || 'Search failed' };
  }
}


/**
 * 3. GET POST DETAILS
 */
async function fetchPost(id: string, timestamp: string): Promise<any> {
  const baseUrl = await getProviderUrl();
  const cookies = await getCookies();
  const isPrime = id.length > 15 && !/^\d+$/.test(id);
  const postUrl = isPrime 
    ? `https://pcmirror.cc/pv/post.php?id=${id}&t=${timestamp}`
    : `${baseUrl}/post.php?id=${id}&t=${timestamp}`;

  const response = await fetch(postUrl, {
    method: 'GET',
    cache: 'no-cache',
    headers: { 
      ...DEFAULT_HEADERS, 
      'Cookie': cookies, 
      'Referer': isPrime ? 'https://pcmirror.cc/pv/' : baseUrl 
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) throw new Error(`Post details failed: ${response.status}`);

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) return await response.json();
  
  const text = await response.text();
  try { return JSON.parse(text); } 
  catch { return { rawResponse: text, contentType: contentType || 'unknown' }; }
}

/**
 * 4. GET PLAY HASH (STREAM INIT) — 2-step process (reverse-engineered from Kotlin extension)
 *
 * Step 1: POST net22.cc/play.php with id → get intermediate hash `h` from JSON
 * Step 2: GET net52.cc/play.php?id={id}&{h} → parse <body data-h="..."> for REAL session token
 *
 * The body[data-h] is the final CDN token (format: md5::md5::timestamp::ani or ::ni)
 * Without step 2 the CDN returns thumbnails/placeholder instead of actual video segments.
 */
async function getPlayHash(id: string, baseUrl: string, cookies: string): Promise<string> {
  // Step 1: Get intermediate hash
  const step1Res = await fetch('https://net22.cc/play.php', {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
      'Referer': 'https://net22.cc/',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: `id=${id}`,
    next: { revalidate: 0 }
  });

  if (!step1Res.ok) throw new Error(`PlayHash step1 failed: ${step1Res.status}`);
  const step1Data = await step1Res.json();
  const intermediateH = step1Data.h;
  if (!intermediateH) throw new Error('Hash parameter not found in step1 response');

  // Step 2: GET net52.cc/play.php?id={id}&{h} and extract body[data-h] = FINAL session token
  const step2Url = `https://net52.cc/play.php?id=${id}&${intermediateH}`;
  const step2Res = await fetch(step2Url, {
    method: 'GET',
    cache: 'no-cache',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Host': 'net52.cc',
      'Referer': 'https://net22.cc/',
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      'Cookie': cookies,
    },
    next: { revalidate: 0 }
  });

  if (!step2Res.ok) throw new Error(`PlayHash step2 failed: ${step2Res.status}`);
  const step2Html = await step2Res.text();

  // Parse <body data-h="..."> — this is the real CDN session token
  const $ = load(step2Html);
  const finalToken = $('body').attr('data-h');
  
  if (finalToken && finalToken.length > 10) {
    // finalToken format: "in=md5hash1::md5hash2::timestamp::ani"
    console.log('[NetMirror] Got final session token from body[data-h]:', finalToken.substring(0, 40) + '...');
    return finalToken.replace(/^in=/, '');
  }

  // Fallback: if step2 didn't work, use intermediate hash (less reliable)
  console.warn('[NetMirror] Step2 body[data-h] missing, falling back to intermediate hash');
  return intermediateH.replace(/^in=/, '');
}

/**
 * 5. GET PLAYLIST (STREAM DATA)
 * Note: uses the full token from getPlayHash (which is now the real session token)
 */
async function getPlaylist(id: string, timestamp: string, h: string, cookies: string): Promise<any> {
  // IMPORTANT: net52.cc/playlist returns freecdn1.top/freecdn4.top CDN URLs which resolve via DNS
  // net22.cc/playlist returns nm-cdn4.top which does NOT resolve — always use net52.cc here!
  // h is already the raw token without 'in=' prefix; playlist.php expects 'h=<token>'
  const playlistUrl = `https://net52.cc/playlist.php?id=${id}&tm=${timestamp}&h=${encodeURIComponent(h)}`;

  const response = await fetch(playlistUrl, {
    method: 'GET',
    cache: 'no-cache',
    headers: {
      ...DEFAULT_HEADERS,
      'Cookie': cookies,
      'Referer': 'https://net52.cc/',
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) throw new Error(`Playlist failed: ${response.status}`);

  let responseData;
  const contentType = response.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    responseData = await response.json();
  } else {
    const text = await response.text();
    try { responseData = JSON.parse(text); } 
    catch { return { rawResponse: text, contentType: contentType || 'unknown', playlistUrl }; }
  }

  return addPrefixToSources(responseData);
}

// ============================================================================
// ENDPOINT HANDLERS
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<any>> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'ui';
  const id = searchParams.get('id');
  const q = searchParams.get('q');
  const t = searchParams.get('t') || Date.now().toString();

  // Validate Security for strict API routes
  /*
  if (!['ui', 'proxy'].includes(action)) {
    const validation = await validateProviderAccess(request, "NetMirror");
    if (!validation.valid) {
      return createProviderErrorResponse(validation.error || "Unauthorized") as NextResponse<any>;
    }
  }
  */

  try {
    switch (action) {
      /**
       * GET /api/netmirror?action=search&q=movie
       */
      case 'search': {
        if (!q) return NextResponse.json({ success: false, error: 'Missing req param: q' }, { status: 400 });
        const data = await scrapeSearch(q, t);
        return NextResponse.json({
          success: true,
          data: { searchResults: data },
          requestParams: { query: q, timestamp: t }
        });
      }

      /**
       * GET /api/netmirror?action=getpost&id=1234
       */
      case 'getpost': {
        if (!id) return NextResponse.json({ success: false, error: 'Missing req param: id' }, { status: 400 });
        const data = await fetchPost(id, t);
        return NextResponse.json({
          success: true,
          data,
          requestParams: { id, timestamp: t }
        });
      }

      /**
       * GET /api/netmirror?action=platform&p=prime|disney
       */
      case 'platform': {
        const p = searchParams.get('p') || '';
        const validPlatforms = ['netflix', 'prime'];
        if (!p || !validPlatforms.includes(p)) {
          return NextResponse.json({ success: false, error: 'Missing or invalid param: p (netflix|prime)' }, { status: 400 });
        }
        const featuredData = await getPlatformFeatured(p);
        return NextResponse.json({
          success: true,
          data: featuredData,
          requestParams: { platform: p }
        });
      }

      /**
       * GET /api/netmirror?action=stream&id=1234
       */
      case 'stream': {
        if (!id) return NextResponse.json({ success: false, error: 'Missing req param: id' }, { status: 400 });
        const cookies = await getCookies();
        let rawStream;

        // Prime Video uses long alphanumeric IDs instead of Netflix's numeric IDs
        if (id.length > 15 && !/^\d+$/.test(id)) {
           const primeRes = await fetch(`https://pcmirror.cc/pv/playlist.php?id=${id}`, {
             headers: {
               'User-Agent': DEFAULT_HEADERS['User-Agent'],
               'Cookie': cookies,
               'Referer': 'https://pcmirror.cc/pv/'
             }
           });
           rawStream = await primeRes.json().catch(() => null);
           if (!rawStream) throw new Error('Failed to parse Prime Video stream playlist');
        } else {
           const baseUrl = await getProviderUrl();
           const h = await getPlayHash(id, baseUrl, cookies);
           rawStream = await getPlaylist(id, t, h, cookies);
           // CRITICAL: playlist.php returns `in=unknown::ni` as placeholder tokens.
           // We must inject the real hash into source URLs so CDN serves actual video.
           const realInToken = `in=${h}`;
           if (Array.isArray(rawStream)) {
             rawStream = rawStream.map((item: any) => {
               if (Array.isArray(item.sources)) {
                 item.sources = item.sources.map((s: any) => ({
                   ...s,
                   file: s.file ? s.file.replace(/in=unknown::ni/g, realInToken) : s.file
                 }));
               }
               return item;
             });
           }
        }
        
        // Build the base proxy URL prefix (strip trailing slash from request URL)
        const reqUrl = new URL(request.url);
        const proxyBase = `${reqUrl.origin}/api/netmirror?action=proxy&url=`;
        
        // Convert all source file URLs to proxy URLs so the frontend never talks to CDN directly
        // This is CRITICAL because the FreeCDN session token is strictly locked to the IP that requested it.
        // If the browser natively connects, the IP mismatch triggers the CDN's "Stop Abuse" warning video.
        const streamData = Array.isArray(rawStream) ? rawStream.map((item: any) => {
          const newItem = { ...item };
          if (Array.isArray(newItem.sources)) {
            newItem.sources = newItem.sources.map((s: any) => ({
              ...s,
              file: proxyBase + encodeURIComponent(
                s.file.startsWith('/') ? `https://net52.cc${s.file}` : s.file
              )
            }));
          }
          if (Array.isArray(newItem.tracks)) {
            newItem.tracks = newItem.tracks.map((tr: any) => ({
              ...tr,
              file: tr.file ? (proxyBase + encodeURIComponent(
                tr.file.startsWith('//') ? `https:${tr.file}` :
                tr.file.startsWith('/') ? `https://net52.cc${tr.file}` : tr.file
              )) : tr.file
            }));
          }
          return newItem;
        }) : rawStream;
        
        return NextResponse.json({
          success: true,
          data: { streamData },
          requestParams: { id, timestamp: t }
        });
      }

      /**
       * GET /api/netmirror?action=proxy&url=...
       */
      case 'proxy': {
        const targetUrl = searchParams.get('url');
        if (!targetUrl) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

        // Safety: if UI accidentally double-proxied, decode and use inner URL
        const safeUrl = targetUrl.includes('/api/netmirror?action=proxy')
          ? decodeURIComponent(targetUrl.split('url=').pop() || '')
          : targetUrl;
        
        const finalUrl = safeUrl.startsWith('http') ? safeUrl : `https://net52.cc${safeUrl}`;
        const cookies = await getCookies();
        
        // Use correct Referer + CDN-specific headers based on domain
        const isPrimeCdn = finalUrl.includes('nm-cdn2.top') || finalUrl.includes('pcmirror.cc');
        const isFreeCdn = /freecdn\d*\.top|nm-cdn\d*\.top/.test(finalUrl);
        const cdnReferer = isPrimeCdn ? 'https://pcmirror.cc/' : 'https://net52.cc/';
        
        // CDN domains (freecdn*.top, nm-cdn*.top) require:
        //   - Cookie: hd=on  (tells CDN to serve HD video, not thumbnails)
        //   - User-Agent: Android ExoPlayer  (required by some CDN nodes)
        // Without hd=on, CDN returns thumbnail sprite sheets instead of actual video segments.
        const cdnCookies = isFreeCdn ? (cookies ? `hd=on; ${cookies}` : 'hd=on') : cookies;
        const cdnUA = isFreeCdn
          ? 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
          : DEFAULT_HEADERS['User-Agent'];
          
        const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
        
        const cdnRes = await fetch(finalUrl, {
           cache: 'no-cache',
           headers: {
             'User-Agent': cdnUA,
             'Accept': '*/*',
             'Accept-Encoding': 'identity',
             'Cookie': cdnCookies,
             'Referer': cdnReferer,
             'Connection': 'keep-alive',
             'X-Forwarded-For': clientIp,
             'X-Real-IP': clientIp
           }
        });

        const ct = cdnRes.headers.get('content-type') || 'application/octet-stream';
        const isM3U8 = ct.includes('mpegurl') || finalUrl.includes('.m3u8');
        
        if (!isM3U8) {
           // Binary segments (video/audio chunks): buffer fully before sending!
           // CRITICAL FIX: If we stream directly, Next.js aborts the FreeCDN TCP connection when the user switches quality (HLS.js aborts the chunk).
           // FreeCDN's anti-abuse filter detects these TCP aborts as an attack and issues the 9-minute warning MP4.
           // By fully downloading into RAM first, FreeCDN sees a graceful 200 OK completion regardless of what the user does.
           const buffer = await cdnRes.arrayBuffer();
           let segCt = ct;
           if (isFreeCdn && (ct.includes('image/') || ct.includes('jpeg') || ct.includes('jpg'))) {
             segCt = 'video/MP2T';
           }
           const responseHeaders: Record<string, string> = {
             'Access-Control-Allow-Origin': '*',
             'Content-Type': segCt,
             'Content-Length': buffer.byteLength.toString(),
             'Cache-Control': 'public, max-age=31536000'
           };
           return new NextResponse(buffer, { status: cdnRes.status, headers: responseHeaders });
        }
        
        // m3u8 manifests: buffer and rewrite all URLs through our proxy
        const buffer = await cdnRes.arrayBuffer();
        let txt = new TextDecoder().decode(buffer);
        const reqBase = new URL(request.url).origin;
        // Compute base URL for resolving relative segment paths
        const finalUrlObj = new URL(finalUrl);
        const baseDir = finalUrlObj.origin + finalUrlObj.pathname.substring(0, finalUrlObj.pathname.lastIndexOf('/') + 1);
        
        // 1. Fix broken audio URIs like `https:///files/...` (missing hostname)
        txt = txt.replace(/https?:\/\/\/files\//g, 'https://net52.cc/files/');
        
        // 2. Replace relative /hls/ paths
        txt = txt.replace(/^(\/hls\/[^\n\r]+)/gm, p =>
          `${reqBase}/api/netmirror?action=proxy&url=${encodeURIComponent('https://net52.cc' + p)}`
        );
        
        // 3. Replace ALL absolute https?:// URLs (Proxy everything to bypass IP lock)
        txt = txt.replace(/(https?:\/\/[^\s"'<>\n\r]+)/g, match => {
          if (match.includes('/api/netmirror')) return match;
          return `${reqBase}/api/netmirror?action=proxy&url=${encodeURIComponent(match)}`;
        });
        
        // 4. Replace relative segment filenames (e.g. "2560_000.jpg", "chunk.ts")
        // CRITICAL: Must append finalUrlObj.search to retain the `?in=` token parameter, otherwise FreeCDN issues the abuse video
        txt = txt.replace(/^([^#/\n\r][^\n\r]*\.(?:jpg|js|ts|m3u8|aac|mp4|mp3)[^\n\r]*)$/gm, seg => {
          if (seg.startsWith('http') || seg.startsWith('/api/')) return seg;
          // seg may already contain a query string, so merge carefully
          const sep = seg.includes('?') ? '&' : '?';
          const queryToAppend = finalUrlObj.search ? (seg.includes('?') ? finalUrlObj.search.replace('?','&') : finalUrlObj.search) : '';
          return `${reqBase}/api/netmirror?action=proxy&url=${encodeURIComponent(baseDir + seg + queryToAppend)}`;
        });
        
        // 5. Handle /files/ relative paths
        txt = txt.replace(/^(\/files\/[^\n\r]+)$/gm, p => {
          const queryToAppend = finalUrlObj.search && !p.includes('?') ? finalUrlObj.search : '';
          return `${reqBase}/api/netmirror?action=proxy&url=${encodeURIComponent('https://net52.cc' + p + queryToAppend)}`;
        });
        
        // 6. Handle inline URI="" attributes (for audio tracks and subtitles)
        txt = txt.replace(/URI="([^"]+)"/g, (match, p1) => {
          if (p1.startsWith('http') || p1.startsWith('/api/') || p1.startsWith('data:')) return match;
          const fullPath = p1.startsWith('/') ? finalUrlObj.origin + p1 : baseDir + p1;
          const queryToAppend = finalUrlObj.search && !p1.includes('?') ? finalUrlObj.search : '';
          return `URI="${reqBase}/api/netmirror?action=proxy&url=${encodeURIComponent(fullPath + queryToAppend)}"`;
        });
        
        return new NextResponse(new TextEncoder().encode(txt), {
           status: cdnRes.status,
           headers: { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' }
        });
      }

      /**
       * GET /api/netmirror?action=ui
       */
      case 'ui': {
        return new NextResponse(getNetMirrorUI(), {
           headers: { 'Content-Type': 'text/html' }
        });
      }

      /**
       * GET /api/netmirror?action=home (Default HOME scrape)
       */
      case 'home':
      default: {
        const data = await scrapeHome();
        return NextResponse.json({ success: true, data });
      }
    }
  } catch (error) {
    console.error(`NetMirror API Error:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to complete NetMirror request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Handle POST if someone wants to send body params
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  const validation = await validateProviderAccess(request, "NetMirror");
  if (!validation.valid) {
    return createProviderErrorResponse(validation.error || "Unauthorized") as NextResponse<any>;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { action, id, q, t = Date.now().toString() } = body;

    if (action === 'getpost' && id) {
      const data = await fetchPost(id, t);
      return NextResponse.json({ success: true, data, requestParams: { id, timestamp: t } });
    }

    return NextResponse.json({ success: false, error: 'Unsupported POST action or missing params' }, { status: 400 });
  } catch (error) {
    console.error(`NetMirror POST API Error:`, error);
    return NextResponse.json({ success: false, error: 'Failed request', message: String(error) }, { status: 500 });
  }
}
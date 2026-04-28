import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/stream
 * 
 * On-demand stream resolver + proxy.
 * Resolves the stream URL from the provider AND proxies the content
 * in a single Vercel function invocation → SAME IP → no 403.
 * 
 * Params:
 *  - provider: themovie | netmirror | hdhub4u | mod | vega | ...
 *  - postUrl:  provider detail page URL
 *  - lang:     Hindi | English | Telugu | Multi | ...
 *  - quality:  4K | 1080p | 720p | 480p | HD
 *  - season, episode (for TV)
 *  - url:      (optional) direct stream URL to proxy without resolution
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cinemahub-api.vercel.app';

// Quality rank for picking best match
const QUALITY_RANK: Record<string, number> = { '4K': 0, '2160p': 0, '1080p': 1, '720p': 2, '480p': 3, '360p': 4, 'HD': 5 };
const LANG_PRIORITY = ['Hindi', 'Telugu', 'Tamil', 'Multi', 'English', 'Original'];

function rankQuality(q: string) { return QUALITY_RANK[q] ?? 9; }

// ── HUBCLOUD / HUBDRIVE BYPASS ──────────────────────────────────────────────
async function resolveHubCloud(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': new URL(pageUrl).origin + '/',
      },
      redirect: 'follow',
    });
    const html = await res.text();

    // Pattern 1: atob("...") encoded URL
    const atobMatch = html.match(/atob\s*\(\s*["']([A-Za-z0-9+/=]+)["']\s*\)/);
    if (atobMatch) {
      try {
        const decoded = Buffer.from(atobMatch[1], 'base64').toString('utf-8');
        if (decoded.startsWith('http')) return decoded;
      } catch {}
    }

    // Pattern 2: direct link in onclick or href  
    const linkPatterns = [
      /(?:file|src|url)\s*[:=]\s*["']?(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)["']?/i,
      /href=["'](https?:\/\/[^"']+\.(?:mp4|m3u8|mkv)[^"']*)["']/i,
    ];
    for (const pattern of linkPatterns) {
      const m = html.match(pattern);
      if (m && m[1]) return m[1];
    }

    // Pattern 3: GDFlix/Filepress style — look for encoded links
    const encodedMatch = html.match(/["']([A-Za-z0-9+/=]{100,})["']/);
    if (encodedMatch) {
      try {
        const decoded = Buffer.from(encodedMatch[1], 'base64').toString('utf-8');
        if (decoded.startsWith('http')) return decoded;
      } catch {}
    }

    return null;
  } catch {
    return null;
  }
}

// ── RESOLVE STREAM URL FROM PROVIDER ────────────────────────────────────────
async function resolveStream(
  provider: string,
  postUrl: string,
  lang: string,
  quality: string,
  season?: string,
  episode?: string,
): Promise<{ url: string; format: string; referer?: string } | null> {
  
  const backendFetch = async (path: string) => {
    const res = await fetch(`${API_BASE}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    return res.json();
  };

  // ── TheMovieBox ──
  if (provider === 'themovie') {
    let detailPath = `/api/themovie?action=details&url=${encodeURIComponent(postUrl)}`;
    if (season) detailPath += `&season=${season}`;
    if (episode) detailPath += `&episode=${episode}`;
    
    const json = await backendFetch(detailPath);
    if (!json) return null;

    const byLang: any[] = json?.watchOnline?.byLanguage || [];
    const streams: any[] = json?.watchOnline?.streams || [];

    // Try byLanguage first
    let best: any = null;
    for (const group of byLang) {
      const groupLang = (group.lang || '').toLowerCase();
      const wantLang = lang.toLowerCase();
      if (!groupLang.includes(wantLang) && !wantLang.includes(groupLang)) continue;
      for (const s of group.streams || []) {
        if (!s.url) continue;
        if (!best || rankQuality(s.quality || '') < rankQuality(best.quality || '')) {
          best = s;
        }
      }
    }

    // Fallback to top-level streams
    if (!best && streams.length > 0) {
      best = streams.find((s: any) => s.url) || streams[0];
    }

    if (best?.url) {
      return {
        url: best.url,
        format: best.url.includes('.m3u8') ? 'm3u8' : 'mp4',
        referer: 'https://themoviebox.org/',
      };
    }
    return null;
  }

  // ── NetMirror ──
  if (provider === 'netmirror') {
    const id = postUrl; // netmirror uses id not postUrl
    const json = await backendFetch(`/api/netmirror?action=stream&id=${encodeURIComponent(id)}&t=${Date.now()}`);
    if (!json) return null;

    const streamData: any[] = json?.data?.streamData || [];
    for (const group of streamData) {
      for (const s of group.sources || []) {
        if (s.file) {
          return {
            url: s.file,
            format: s.file.includes('.m3u8') ? 'm3u8' : 'mp4',
            referer: 'https://netmirror.app/',
          };
        }
      }
    }
    return null;
  }

  // ── HDHub4u / Mod / Vega / Modlist / Desiremovies / KMMovies ──
  const downloadProviders = ['hdhub4u', 'mod', 'vega', 'modlist_moviesmod', 'modlist_moviesleech', 'kmmovies', 'desiremovies', 'movies4u', '4khdhub', 'uhdmovies'];
  if (downloadProviders.includes(provider)) {
    const pathMap: Record<string, string> = {
      hdhub4u: '/api/hdhub4u',
      mod: '/api/mod',
      vega: '/api/vega',
      modlist_moviesmod: '/api/modlist/moviesmod',
      modlist_moviesleech: '/api/modlist/moviesleech',
      kmmovies: '/api/kmmovies',
      desiremovies: '/api/desiremovies',
      movies4u: '/api/movies4u',
      '4khdhub': '/api/4khdhub',
      uhdmovies: '/api/uhdmovies',
    };
    const basePath = pathMap[provider];
    if (!basePath) return null;

    const json = await backendFetch(`${basePath}?action=details&url=${encodeURIComponent(postUrl)}`);
    if (!json) return null;

    const downloadLinks: any[] = json?.data?.downloadLinks || json?.data?.links || json?.downloadLinks || [];

    let bestBypass: string | null = null;
    
    for (const group of downloadLinks) {
      const groupLang = (group.title || group.label || '').toLowerCase();
      const wantLang = lang.toLowerCase();
      const langMatch = groupLang.includes(wantLang) || wantLang === 'multi' || groupLang.includes('multi');
      if (!langMatch) continue;

      const inner = group.links || (group.url ? [group] : []);
      for (const lnk of inner) {
        const file = lnk.url || lnk.file;
        if (!file) continue;

        const isStreamable = /\.mp4|\.m3u8|\.mkv/i.test(file);
        if (isStreamable) {
          return { url: file, format: file.includes('.m3u8') ? 'm3u8' : 'mp4' };
        }

        // Bypass link — try to resolve it
        const isBypass = /hubcloud|hubdrive|gdflix|filepress|pixeldrain|sharerr/i.test(file);
        if (isBypass && !bestBypass) bestBypass = file;
      }
    }

    // Try bypass resolution
    if (bestBypass) {
      const direct = await resolveHubCloud(bestBypass);
      if (direct) return { url: direct, format: direct.includes('.m3u8') ? 'm3u8' : 'mp4' };
    }
    return null;
  }

  return null;
}

// ── PROXY THE STREAM ─────────────────────────────────────────────────────────
async function proxyStream(
  request: NextRequest,
  streamUrl: string,
  format: string,
  referer?: string,
): Promise<NextResponse> {
  const fetchHeaders: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
  };
  if (referer) {
    (fetchHeaders as any)['Referer'] = referer;
    (fetchHeaders as any)['Origin'] = new URL(referer).origin;
  }
  const range = request.headers.get('range');
  if (range) (fetchHeaders as any)['Range'] = range;

  const upstream = await fetch(streamUrl, {
    headers: fetchHeaders,
    redirect: 'follow',
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream ${upstream.status} for ${streamUrl}` },
      { status: upstream.status }
    );
  }

  const ct = upstream.headers.get('content-type') || '';
  const isM3U8 = ct.includes('mpegurl') || streamUrl.includes('.m3u8');

  if (isM3U8) {
    const text = await upstream.text();
    const base = streamUrl.split('?')[0].split('/').slice(0, -1).join('/');
    
    const rewritten = text.replace(/^(?!#)(.+\S.*)$/gm, (line) => {
      const trimmed = line.trim();
      const absUrl = trimmed.startsWith('http') ? trimmed : `${base}/${trimmed}`;
      const ref = referer ? `&req_referer=${encodeURIComponent(referer)}` : '';
      return `/api/stream?url=${encodeURIComponent(absUrl)}${ref}`;
    }).replace(/URI="([^"]+)"/g, (_, uri) => {
      const absUrl = uri.startsWith('http') ? uri : `${base}/${uri}`;
      const ref = referer ? `&req_referer=${encodeURIComponent(referer)}` : '';
      return `URI="/api/stream?url=${encodeURIComponent(absUrl)}${ref}"`;
    });

    return new NextResponse(rewritten, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Binary stream (mp4 / ts chunks)
  const resHeaders = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
  });
  const cl = upstream.headers.get('content-length');
  if (cl) resHeaders.set('Content-Length', cl);
  const cr = upstream.headers.get('content-range');
  if (cr) resHeaders.set('Content-Range', cr);
  const ar = upstream.headers.get('accept-ranges');
  if (ar) resHeaders.set('Accept-Ranges', ar);

  return new NextResponse(upstream.body, { status: upstream.status, headers: resHeaders });
}

// ── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  // Mode 1: Direct proxy (for m3u8 chunk URLs rewritten by this same handler)
  const directUrl = searchParams.get('url');
  if (directUrl) {
    const referer = searchParams.get('req_referer') || undefined;
    return proxyStream(request, directUrl, directUrl.includes('.m3u8') ? 'm3u8' : 'mp4', referer);
  }

  // Mode 2: Resolve + proxy
  const provider = searchParams.get('provider');
  const postUrl = searchParams.get('postUrl');
  const lang = searchParams.get('lang') || 'Multi';
  const quality = searchParams.get('quality') || '1080p';
  const season = searchParams.get('season') || undefined;
  const episode = searchParams.get('episode') || undefined;

  if (!provider || !postUrl) {
    return NextResponse.json({ error: 'Missing provider or postUrl' }, { status: 400 });
  }

  const resolved = await resolveStream(provider, postUrl, lang, quality, season, episode);

  if (!resolved) {
    return NextResponse.json({ error: 'No stream found', provider, lang, quality }, { status: 404 });
  }

  return proxyStream(request, resolved.url, resolved.format, resolved.referer);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}

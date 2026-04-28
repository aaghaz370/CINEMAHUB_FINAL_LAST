import { NextRequest, NextResponse } from 'next/server';

// ── TheMovieBox Constants ─────────────────────────────────────────────────────
const TMB_BASE = 'https://themoviebox.org';
const TMB_API = `${TMB_BASE}/wefeed-h5api-bff`;
const TMB_COOKIE = 'mb_token=%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEzMzI1MTYyOTA2MjM4NTEyMDgsImF0cCI6MywiZXh0IjoiMTc2OTU3NDU3NyIsImV4cCI6MTc3NzM1MDU3NywiaWF0IjoxNzY5NTc0Mjc3fQ.Gc4HmKDugVKcWSGoxtCqBTWdZix5dvRpp_22_Z7-7Vk%22; i18n_lang=en';
const TMB_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36',
  'Accept': 'application/json, text/html, */*',
  'X-Source': 'h5',
  'X-Client-Info': '{"timezone":"Asia/Calcutta"}',
  'Cookie': TMB_COOKIE,
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cinemahub-api.vercel.app';
const LANG_DETECT: [RegExp, string][] = [
  [/hindi/i, 'Hindi'], [/telugu/i, 'Telugu'], [/tamil/i, 'Tamil'],
  [/malayalam/i, 'Malayalam'], [/kannada/i, 'Kannada'], [/english/i, 'English'],
  [/multi|dual/i, 'Multi'], [/bengali/i, 'Bengali'],
];
function detectLang(text: string): string {
  for (const [re, lang] of LANG_DETECT) if (re.test(text)) return lang;
  return 'Original';
}
function qualityRank(q: string) {
  const m: Record<string, number> = { '4K': 0, '2160p': 0, '1080p': 1, '720p': 2, '480p': 3, '360p': 4, 'HD': 5 };
  return m[q] ?? 9;
}

// ── Parse TheMovieBox NUXT data (dubs only — fast) ───────────────────────────
async function getTMBDubs(pageUrl: string): Promise<{ subjectId: string; detailPath: string; lang: string }[]> {
  const res = await fetch(pageUrl, { headers: { ...TMB_HEADERS, Accept: 'text/html' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const html = await res.text();
  const m = html.match(/<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return [];
  try {
    const raw: unknown[] = JSON.parse(m[1]);
    // Find subject with dubs
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      if (typeof item !== 'object' || !item || Array.isArray(item)) continue;
      const obj = item as Record<string, unknown>;
      if (!('dubs' in obj)) continue;
      const dubsPtr = obj.dubs;
      if (typeof dubsPtr !== 'number') continue;
      const dubsArr = raw[dubsPtr as number];
      if (!Array.isArray(dubsArr)) continue;
      const result: { subjectId: string; detailPath: string; lang: string }[] = [];
      for (const dubPtr of dubsArr) {
        if (typeof dubPtr !== 'number') continue;
        const dub = raw[dubPtr];
        if (typeof dub !== 'object' || !dub || Array.isArray(dub)) continue;
        const d = dub as Record<string, unknown>;
        const sidPtr = d.subjectId; const dpPtr = d.detailPath; const namePtr = d.lanName ?? d.name;
        const sid = typeof sidPtr === 'number' ? raw[sidPtr] : sidPtr;
        const dp = typeof dpPtr === 'number' ? raw[dpPtr] : dpPtr;
        const name = typeof namePtr === 'number' ? raw[namePtr] : namePtr;
        if (typeof sid === 'string' && typeof dp === 'string' && sid) {
          result.push({ subjectId: sid, detailPath: dp, lang: String(name || '') || 'Original' });
        }
      }
      if (result.length) return result;
    }
  } catch {}
  return [];
}

// ── TheMovieBox: get stream for language from play API ───────────────────────
async function streamFromTMB(postUrl: string, lang: string, quality: string, req: NextRequest): Promise<NextResponse | null> {
  let parsedUrl: URL;
  try { parsedUrl = new URL(postUrl); } catch { return null; }
  
  const subjectId = parsedUrl.searchParams.get('id');
  const slugPart = parsedUrl.pathname.split('/').filter(Boolean).pop()?.split('?')[0] || '';
  if (!subjectId) return null;

  const isTV = parsedUrl.searchParams.get('type')?.includes('tv');
  const se = isTV ? 1 : 0;
  const ep = isTV ? 1 : 0;

  // Get dubs to find the right language subjectId
  const dubs = await getTMBDubs(postUrl);
  
  // Build list: default + all dubs
  const candidates: { subjectId: string; detailPath: string; lang: string }[] = [
    { subjectId, detailPath: slugPart, lang: 'Original' },
    ...dubs,
  ];

  // Find best candidate for requested language
  const wantLower = lang.toLowerCase();
  let chosen = candidates.find(c => c.lang.toLowerCase().includes(wantLower) || wantLower.includes(c.lang.toLowerCase()))
    || candidates.find(c => c.lang === 'Original')
    || candidates[0];
  if (!chosen) return null;

  // Call play API DIRECTLY from this function (same IP that will proxy)
  const playUrl = `${TMB_API}/subject/play?subjectId=${chosen.subjectId}&se=${se}&ep=${ep}&detailPath=${chosen.detailPath}`;
  const referer = `${TMB_BASE}/movies/${chosen.detailPath}?id=${chosen.subjectId}&type=${isTV ? '/tv/detail' : '/movie/detail'}`;
  
  const playRes = await fetch(playUrl, {
    headers: { ...TMB_HEADERS, Referer: referer },
    signal: AbortSignal.timeout(15000),
  });
  if (!playRes.ok) return null;
  
  const playData = await playRes.json();
  if (playData.code !== 0 || !playData.data?.streams?.length) return null;

  // Pick best quality
  const streams = (playData.data.streams as any[]).filter(s => s.url);
  streams.sort((a, b) => {
    const qa = a.resolutions >= 2160 ? '4K' : a.resolutions >= 1080 ? '1080p' : a.resolutions >= 720 ? '720p' : '480p';
    const qb = b.resolutions >= 2160 ? '4K' : b.resolutions >= 1080 ? '1080p' : b.resolutions >= 720 ? '720p' : '480p';
    return qualityRank(qa) - qualityRank(qb);
  });
  
  // Pick closest quality
  const wantQ = quality;
  let bestStream = streams.find(s => {
    const sq = s.resolutions >= 2160 ? '4K' : s.resolutions >= 1080 ? '1080p' : s.resolutions >= 720 ? '720p' : '480p';
    return sq === wantQ;
  }) || streams[0];
  
  if (!bestStream?.url) return null;

  return proxyContent(req, bestStream.url, bestStream.url.includes('.m3u8') ? 'm3u8' : 'mp4', TMB_BASE + '/');
}

// ── NetMirror ─────────────────────────────────────────────────────────────────
async function streamFromNetmirror(id: string, req: NextRequest): Promise<NextResponse | null> {
  const res = await fetch(`${API_BASE}/api/netmirror?action=stream&id=${encodeURIComponent(id)}&t=${Date.now()}`, {
    cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  for (const group of json?.data?.streamData || []) {
    for (const s of group.sources || []) {
      if (s.file) return proxyContent(req, s.file, s.file.includes('.m3u8') ? 'm3u8' : 'mp4', 'https://netmirror.app/');
    }
  }
  return null;
}

// ── HubCloud/HubDrive bypass ──────────────────────────────────────────────────
async function resolveBypass(bypassUrl: string): Promise<string | null> {
  try {
    const res = await fetch(bypassUrl, {
      headers: { 'User-Agent': TMB_HEADERS['User-Agent'], 'Referer': new URL(bypassUrl).origin + '/' },
      redirect: 'follow', signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    // atob decode
    const atobM = html.match(/atob\s*\(\s*["']([A-Za-z0-9+/=]{40,})["']\s*\)/);
    if (atobM) { try { const d = Buffer.from(atobM[1], 'base64').toString(); if (d.startsWith('http')) return d; } catch {} }
    // direct mp4/m3u8 link
    const directM = html.match(/["'](https?:\/\/[^"'\s]+\.(?:mp4|m3u8|mkv)[^"'\s]*)["']/i);
    if (directM) return directM[1];
    // eval/window.__x pattern
    const evalM = html.match(/(?:file|src)\s*[:=]\s*["'](https?:\/\/[^"'\s]+)["']/i);
    if (evalM && /mp4|m3u8|stream|cdn|video/i.test(evalM[1])) return evalM[1];
  } catch {}
  return null;
}

// ── Download providers (HDHub4u, Mod, Vega, etc.) ────────────────────────────
async function streamFromDownload(provider: string, postUrl: string, lang: string, req: NextRequest): Promise<NextResponse | null> {
  const pathMap: Record<string, string> = {
    hdhub4u: '/api/hdhub4u', mod: '/api/mod', vega: '/api/vega',
    modlist_moviesmod: '/api/modlist/moviesmod', modlist_moviesleech: '/api/modlist/moviesleech',
    kmmovies: '/api/kmmovies', desiremovies: '/api/desiremovies', movies4u: '/api/movies4u',
    '4khdhub': '/api/4khdhub', uhdmovies: '/api/uhdmovies',
  };
  const basePath = pathMap[provider];
  if (!basePath) return null;

  const res = await fetch(`${API_BASE}${basePath}?action=details&url=${encodeURIComponent(postUrl)}`, {
    cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const downloadLinks: any[] = json?.data?.downloadLinks || json?.data?.links || json?.downloadLinks || [];

  const wantLower = lang.toLowerCase();
  let bestBypass: string | null = null;

  for (const group of downloadLinks) {
    const groupText = (group.title || group.label || '').toLowerCase();
    const langOk = groupText.includes(wantLower) || wantLower === 'multi' || groupText.includes('multi') || groupText.includes('dual');
    if (!langOk) continue;
    const inner = group.links || (group.url ? [group] : []);
    for (const lnk of inner) {
      const file = lnk.url || lnk.file;
      if (!file) continue;
      if (/\.mp4|\.m3u8/i.test(file)) return proxyContent(req, file, file.includes('.m3u8') ? 'm3u8' : 'mp4');
      if (/hubcloud|hubdrive|gdflix|filepress|pixeldrain/i.test(file) && !bestBypass) bestBypass = file;
    }
  }

  if (bestBypass) {
    const direct = await resolveBypass(bestBypass);
    if (direct) return proxyContent(req, direct, direct.includes('.m3u8') ? 'm3u8' : 'mp4');
  }
  return null;
}

// ── Proxy content ─────────────────────────────────────────────────────────────
async function proxyContent(req: NextRequest, url: string, format: string, referer?: string): Promise<NextResponse> {
  const fetchHeaders: Record<string, string> = {
    'User-Agent': TMB_HEADERS['User-Agent'],
    'Accept': '*/*',
  };
  if (referer) { fetchHeaders['Referer'] = referer; fetchHeaders['Origin'] = new URL(referer).origin; }
  const range = req.headers.get('range');
  if (range) fetchHeaders['Range'] = range;

  const upstream = await fetch(url, { headers: fetchHeaders, redirect: 'follow', cache: 'no-store' });
  if (!upstream.ok) return NextResponse.json({ error: `CDN ${upstream.status}` }, { status: upstream.status });

  const ct = upstream.headers.get('content-type') || '';
  const isM3U8 = ct.includes('mpegurl') || url.includes('.m3u8');

  if (isM3U8) {
    const text = await upstream.text();
    const base = url.split('?')[0].split('/').slice(0, -1).join('/');
    const ref = referer ? `&req_referer=${encodeURIComponent(referer)}` : '';
    const rewritten = text
      .replace(/^(?!#)(.+\S.*)$/gm, line => {
        const abs = line.trim().startsWith('http') ? line.trim() : `${base}/${line.trim()}`;
        return `/api/stream?url=${encodeURIComponent(abs)}${ref}`;
      })
      .replace(/URI="([^"]+)"/g, (_, uri) => {
        const abs = uri.startsWith('http') ? uri : `${base}/${uri}`;
        return `URI="/api/stream?url=${encodeURIComponent(abs)}${ref}"`;
      });
    return new NextResponse(rewritten, {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const h = new Headers({ 'Access-Control-Allow-Origin': '*', 'Content-Type': ct || 'video/mp4' });
  const cl = upstream.headers.get('content-length'); if (cl) h.set('Content-Length', cl);
  const cr = upstream.headers.get('content-range'); if (cr) h.set('Content-Range', cr);
  const ar = upstream.headers.get('accept-ranges'); if (ar) h.set('Accept-Ranges', ar);
  return new NextResponse(upstream.body, { status: upstream.status, headers: h });
}

// ── Main ──────────────────────────────────────────────────────────────────────
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Mode 1: direct proxy (for m3u8 chunk/key URLs)
  const directUrl = searchParams.get('url');
  if (directUrl) {
    const referer = searchParams.get('req_referer') || undefined;
    return proxyContent(req, directUrl, directUrl.includes('.m3u8') ? 'm3u8' : 'mp4', referer);
  }

  // Mode 2: resolve + proxy
  const provider = searchParams.get('provider') || '';
  const postUrl = searchParams.get('postUrl') || '';
  const lang = searchParams.get('lang') || 'Multi';
  const quality = searchParams.get('quality') || '1080p';

  if (!provider || !postUrl) return NextResponse.json({ error: 'Missing provider/postUrl' }, { status: 400 });

  let result: NextResponse | null = null;

  if (provider === 'themovie') result = await streamFromTMB(postUrl, lang, quality, req);
  else if (provider === 'netmirror') result = await streamFromNetmirror(postUrl, req);
  else result = await streamFromDownload(provider, postUrl, lang, req);

  return result || NextResponse.json({ error: `No stream: ${provider} ${lang} ${quality}` }, { status: 404 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': 'Range,Content-Type' },
  });
}

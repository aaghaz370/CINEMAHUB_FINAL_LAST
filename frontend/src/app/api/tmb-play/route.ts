import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cinemahub-api.vercel.app';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

function mapQuality(resolutions: number | string | undefined): string {
  const n = parseInt(String(resolutions || '0'));
  if (n >= 2160) return '4K';
  if (n >= 1080) return '1080p';
  if (n >= 720) return '720p';
  if (n >= 480) return '480p';
  if (n >= 360) return '360p';
  return String(resolutions || 'HD') + (String(resolutions || '').endsWith('p') ? '' : 'p');
}

function parseStreams(watchOnline: any): { quality: string; url: string; format: 'mp4' | 'm3u8' }[] {
  if (!watchOnline) return [];
  const results: { quality: string; url: string; format: 'mp4' | 'm3u8' }[] = [];

  // TMB play API puts streams in .streams (mp4), .hls (m3u8), or .list (legacy)
  const sources = [
    ...(watchOnline.streams || []),
    ...(watchOnline.list || []),
    ...(watchOnline.hls || []),
    ...(watchOnline.dash || []),
  ];

  for (const s of sources) {
    const url = s.url || s.file;
    if (!url) continue;
    const isHls = url.includes('.m3u8') || s.format === 'HLS' || s.format === 'hls';
    results.push({
      url,
      quality: mapQuality(s.resolutions ?? s.resolution ?? s.quality),
      format: isHls ? 'm3u8' : 'mp4',
    });
  }

  // Sort best quality first
  const ORDER: Record<string, number> = { '4K': 0, '1080p': 1, '720p': 2, '480p': 3, '360p': 4 };
  return results.sort((a, b) => (ORDER[a.quality] ?? 9) - (ORDER[b.quality] ?? 9));
}

/**
 * GET /api/tmb-play?url=<TMB detail page URL>
 * Fetches fresh IP-signed streams from TheMovieBox via the backend.
 * Also returns dubs (language alternatives) for the language selector.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ success: false, error: 'url required' }, { status: 400 });
  }

  try {
    // Call backend's TMB detail+play endpoint (this calls the TMB play API, signed for backend IP)
    const res = await fetch(
      `${API_BASE}/api/themovie/det?url=${encodeURIComponent(url)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(30000) }
    );

    if (!res.ok) {
      return NextResponse.json({ success: false, error: `Backend returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();

    if (!data.success) {
      return NextResponse.json({ success: false, error: data.error || 'TMB fetch failed' }, { status: 500 });
    }

    const meta = data.meta || {};
    const watchOnline = data.watchOnline || {};

    // Parse dubs (other language versions) — each has its own subjectId + detailPath
    const dubs: { name: string; code: string; subjectId: string; detailPath: string; detailUrl: string }[] =
      (meta.dubs || []).map((d: any) => ({
        name: String(d.name || d.lanName || ''),
        code: String(d.code || d.lanCode || ''),
        subjectId: String(d.subjectId || ''),
        detailPath: String(d.detailPath || ''),
        detailUrl: `https://themoviebox.org/movies/${d.detailPath}?id=${d.subjectId}&type=/movie/detail`,
      })).filter((d: any) => d.subjectId && d.detailPath);

    // Parse streams for this specific language
    const streams = parseStreams(watchOnline);

    return NextResponse.json({
      success: true,
      subjectId: watchOnline.subjectId || meta.subjectId,
      detailPath: meta.detailPath,
      title: meta.title,
      streams,     // [{quality, url, format}] for current language
      dubs,        // other available languages
    }, { headers: CORS });
  } catch (err) {
    console.error('[tmb-play]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

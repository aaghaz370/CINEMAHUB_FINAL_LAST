import { NextRequest, NextResponse } from 'next/server';
import { resolveAllLinks, ProviderResult } from '@/lib/aggregator';

export const maxDuration = 60;

/**
 * POST /api/aggregator/links
 * Body: { sources: ProviderResult[] }
 *
 * OR
 *
 * GET /api/aggregator/links?id=<tmdbId>&type=movie|tv
 * (will call details internally and return just links)
 *
 * Returns all direct mp4/m3u8/bypass links grouped by language+quality.
 */
export async function POST(request: NextRequest) {
  try {
    const body    = await request.json();
    const sources: ProviderResult[] = body.sources || [];

    if (!sources.length) {
      return NextResponse.json({ success: false, error: '"sources" array is required' }, { status: 400 });
    }

    const baseUrl = new URL(request.url).origin;
    const links   = await resolveAllLinks(sources, baseUrl);

    // Group by language → quality → links
    const grouped: Record<string, Record<string, { url: string; format: string; server?: string; provider: string; sourceTitle: string }[]>> = {};
    for (const lnk of links) {
      if (!grouped[lnk.language]) grouped[lnk.language] = {};
      if (!grouped[lnk.language][lnk.quality]) grouped[lnk.language][lnk.quality] = [];
      grouped[lnk.language][lnk.quality].push({
        url: lnk.url,
        format: lnk.format,
        server: lnk.server,
        provider: lnk.provider,
        sourceTitle: lnk.sourceTitle,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalLinks: links.length,
        flat: links,
        grouped,
      }
    });
  } catch (error) {
    console.error('[aggregator/links]', error);
    return NextResponse.json({
      success: false,
      error: 'Link resolution failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tmdbId  = searchParams.get('id')?.replace(/[{}]/g, '').trim();
  const typeRaw = (searchParams.get('type') || 'movie').toLowerCase();
  const type    = (typeRaw.includes('tv') || typeRaw.includes('series')) ? 'tv' : 'movie';
  const season  = searchParams.get('season') || '';
  const episode = searchParams.get('episode') || '';
  const lang    = searchParams.get('lang') || ''; // optional filter
  const quality = searchParams.get('q')   || ''; // optional filter

  if (!tmdbId) {
    return NextResponse.json({ success: false, error: '"id" (TMDB ID) is required' }, { status: 400 });
  }

  try {
    const baseUrl = new URL(request.url).origin;

    // Fetch details (which includes pre-resolved links)
    let detailsUrl = `${baseUrl}/api/aggregator/details?id=${tmdbId}&type=${type}`;
    if (season) detailsUrl += `&season=${season}`;
    if (episode) detailsUrl += `&episode=${episode}`;
    
    const detailsRes = await fetch(detailsUrl, {
      cache: 'no-store',
    });
    const detailsJson = await detailsRes.json();

    if (!detailsJson.success) {
      return NextResponse.json(detailsJson, { status: 404 });
    }

    let links = detailsJson.data?.links || [];

    // Optional filters
    if (lang)    links = links.filter((l: any) => l.language.toLowerCase() === lang.toLowerCase());
    if (quality) links = links.filter((l: any) => l.quality.toLowerCase() === quality.toLowerCase());

    // Group by language
    const grouped: Record<string, Record<string, any[]>> = {};
    for (const lnk of links) {
      if (!grouped[lnk.language]) grouped[lnk.language] = {};
      if (!grouped[lnk.language][lnk.quality]) grouped[lnk.language][lnk.quality] = [];
      grouped[lnk.language][lnk.quality].push(lnk);
    }

    return NextResponse.json({
      success: true,
      data: {
        tmdbId,
        type,
        title: detailsJson.data?.title,
        totalLinks: links.length,
        flat: links,
        grouped,
      }
    });
  } catch (error) {
    console.error('[aggregator/links GET]', error);
    return NextResponse.json({
      success: false,
      error: 'Link fetch failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

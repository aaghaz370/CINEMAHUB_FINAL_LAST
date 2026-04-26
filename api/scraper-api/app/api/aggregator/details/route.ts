import { NextRequest, NextResponse } from 'next/server';
import { getDetailsByTMDB } from '@/lib/aggregator';

export const maxDuration = 90;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id     = searchParams.get('id')?.replace(/[{}]/g, '').trim();
  const typeRaw = (searchParams.get('type') || 'movie').toLowerCase();
  const type   = (typeRaw.includes('tv') || typeRaw.includes('series')) ? 'tv' : 'movie';
  const season = searchParams.get('season') || undefined;
  const episode = searchParams.get('episode') || undefined;

  if (!id) {
    return NextResponse.json({ success: false, error: '"id" (TMDB ID) is required' }, { status: 400 });
  }

  try {
    const baseUrl = new URL(request.url).origin;
    const data    = await getDetailsByTMDB(id, type, baseUrl, season, episode);

    if (!data) {
      return NextResponse.json({ success: false, error: 'Media not found on TMDB' }, { status: 404 });
    }

    // Summary of links by language
    const linkSummary: Record<string, { qualities: string[]; count: number }> = {};
    for (const lnk of data.links || []) {
      if (!linkSummary[lnk.language]) linkSummary[lnk.language] = { qualities: [], count: 0 };
      linkSummary[lnk.language].count++;
      if (!linkSummary[lnk.language].qualities.includes(lnk.quality)) {
        linkSummary[lnk.language].qualities.push(lnk.quality);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        linkSummary,
        totalLinks: (data.links || []).length,
        totalSources: data.sources.length,
      }
    });
  } catch (error) {
    console.error('[aggregator/details]', error);
    return NextResponse.json({
      success: false,
      error: 'Details fetch failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

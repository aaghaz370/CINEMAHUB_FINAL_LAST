import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cinemahub-api.vercel.app';
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB = 'https://api.themoviedb.org/3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'movie';
  const season = searchParams.get('season') || '';
  const episode = searchParams.get('episode') || '';

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  // 1. Fetch TMDB metadata (fast, always works)
  let tmdbData: any = null;
  if (TMDB_KEY) {
    try {
      const tmdbRes = await fetch(
        `${TMDB}/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=credits,videos`,
        { next: { revalidate: 86400 } }
      );
      if (tmdbRes.ok) tmdbData = await tmdbRes.json();
    } catch {}
  }

  // 2. Fetch aggregated links from backend (streaming sources) — with 30s timeout
  let links: any[] = [];
  let sources: any[] = [];
  let linkSummary: any = {};
  let totalSources = 0;

  try {
    let url = `${API_BASE}/api/aggregator/details?id=${id}&type=${type}`;
    if (season) url += `&season=${season}`;
    if (episode) url += `&episode=${episode}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 28000);
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        links = json.data.links || [];
        sources = json.data.sources || [];
        linkSummary = json.data.linkSummary || {};
        totalSources = json.data.totalSources || 0;
      }
    }
  } catch {}

  // Merge: use TMDB as ground truth for metadata, aggregator for links
  const result = {
    success: true,
    source: tmdbData ? 'tmdb+aggregator' : 'aggregator_only',
    data: {
      tmdbId: id,
      type,
      title: tmdbData?.title || tmdbData?.name || '',
      originalTitle: tmdbData?.original_title || tmdbData?.original_name || '',
      year: (tmdbData?.release_date || tmdbData?.first_air_date || '').substring(0, 4),
      overview: tmdbData?.overview || '',
      poster: tmdbData?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null,
      backdrop: tmdbData?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : null,
      vote_average: tmdbData?.vote_average || 0,
      vote_count: tmdbData?.vote_count || 0,
      genres: tmdbData?.genres?.map((g: any) => g.name) || [],
      runtime: tmdbData?.runtime || null,
      status: tmdbData?.status || '',
      cast: tmdbData?.credits?.cast?.slice(0, 12).map((c: any) => ({
        name: c.name,
        character: c.character,
        profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
      })) || [],
      trailer: tmdbData?.videos?.results?.find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      )?.key || null,
      // TV specific
      seasons: type === 'tv' ? tmdbData?.seasons?.filter((s: any) => s.season_number > 0) : null,
      // Streaming data
      links,
      sources,
      linkSummary,
      totalSources,
      totalLinks: links.length,
    }
  };

  return NextResponse.json(result);
}

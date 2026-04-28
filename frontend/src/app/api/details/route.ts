import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cinemahub-api.vercel.app';
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB = 'https://api.themoviedb.org/3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'movie';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Run TMDB metadata + backend aggregator in parallel
  const [tmdbRes, aggRes] = await Promise.allSettled([
    TMDB_KEY
      ? fetch(`${TMDB}/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=credits,videos`, { next: { revalidate: 86400 } })
      : Promise.reject('no key'),
    fetch(`${API_BASE}/api/aggregator/details?id=${id}&type=${type}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(55000),
    }),
  ]);

  // Parse TMDB
  let tmdb: any = null;
  if (tmdbRes.status === 'fulfilled' && tmdbRes.value.ok) {
    tmdb = await tmdbRes.value.json();
  }

  // Parse aggregator
  let aggData: any = null;
  if (aggRes.status === 'fulfilled' && aggRes.value.ok) {
    const aggJson = await aggRes.value.json();
    aggData = aggJson?.data || null;
  }

  const links: any[] = aggData?.links || [];
  const linkSummary: any = aggData?.linkSummary || {};

  // Available languages from linkSummary (real data from all providers)
  const availableLanguages = Object.keys(linkSummary).length > 0
    ? Object.keys(linkSummary)
    : links.length > 0
      ? [...new Set(links.map((l: any) => l.language))]
      : ['Multi'];

  return NextResponse.json({
    success: true,
    data: {
      tmdbId: id, type,
      title: tmdb?.title || tmdb?.name || aggData?.title || '',
      originalTitle: tmdb?.original_title || tmdb?.original_name || '',
      year: (tmdb?.release_date || tmdb?.first_air_date || '').substring(0, 4),
      overview: tmdb?.overview || aggData?.overview || '',
      poster: tmdb?.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}`
        : aggData?.poster || null,
      backdrop: tmdb?.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${tmdb.backdrop_path}`
        : aggData?.backdrop || null,
      vote_average: tmdb?.vote_average || 0,
      vote_count: tmdb?.vote_count || 0,
      genres: tmdb?.genres?.map((g: any) => g.name) || [],
      runtime: tmdb?.runtime || null,
      status: tmdb?.status || '',
      cast: tmdb?.credits?.cast?.slice(0, 12).map((c: any) => ({
        name: c.name, character: c.character,
        profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      })) || [],
      trailer: tmdb?.videos?.results?.find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      )?.key || null,
      seasons: type === 'tv' ? tmdb?.seasons?.filter((s: any) => s.season_number > 0) : null,
      // Streaming data from aggregator (fully resolved)
      links,
      linkSummary,
      availableLanguages,
      totalSources: aggData?.totalSources || 0,
      totalLinks: links.length,
    },
  });
}

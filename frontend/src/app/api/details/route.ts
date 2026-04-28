import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://cinemahub-api.vercel.app';
const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB = 'https://api.themoviedb.org/3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'movie';

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // 1. TMDB metadata (fast)
  let tmdbData: any = null;
  if (TMDB_KEY) {
    try {
      const r = await fetch(
        `${TMDB}/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=credits,videos`,
        { next: { revalidate: 86400 } }
      );
      if (r.ok) tmdbData = await r.json();
    } catch {}
  }

  // 2. Get SOURCES (not resolved links!) from aggregator — much faster
  //    We only need postUrls + provider, link resolution happens on-demand in /api/stream
  let sources: any[] = [];
  let linkSummary: any = {};
  try {
    const title = tmdbData?.title || tmdbData?.name || '';
    const year = (tmdbData?.release_date || tmdbData?.first_air_date || '').substring(0, 4);

    // Search all providers in parallel for this title
    const queries = [title, `${title} ${year}`].filter(Boolean);
    const providerPaths: Record<string, string> = {
      themovie: `/api/themovie?action=search&q=`,
      netmirror: `/api/netmirror?action=search&q=`,
      hdhub4u: `/api/hdhub4u/search?q=`,
      mod: `/api/mod?action=search&q=`,
      vega: `/api/vega?action=search&q=`,
      '4khdhub': `/api/4khdhub?action=search&q=`,
      kmmovies: `/api/kmmovies?action=search&q=`,
      desiremovies: `/api/desiremovies?action=search&q=`,
    };

    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    const fetches = Object.entries(providerPaths).map(async ([provider, path]) => {
      try {
        const q = encodeURIComponent(queries[0]);
        const res = await fetch(`${API_BASE}${path}${q}`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) return [];
        const json = await res.json();

        // Extract results array
        const results: any[] =
          json?.data?.results || json?.data?.searchResults?.searchResult ||
          json?.data?.items || json?.movies || json?.data || json?.results || [];

        return results
          .filter((item: any) => {
            const t = (item.title || item.t || item.name || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            return t.includes(cleanTitle.substring(0, 6)) || cleanTitle.includes(t.substring(0, 6));
          })
          .slice(0, 2)
          .map((item: any) => ({
            provider,
            id: item.id || item.v_id || item.post_id || '',
            title: item.title || item.t || item.name || '',
            postUrl: item.url || item.permalink || item.postUrl || item.watchUrl || '',
            language: item.language || 'Multi',
            year: item.year || year,
          }));
      } catch {
        return [];
      }
    });

    const allSources = (await Promise.all(fetches)).flat();
    
    // Deduplicate by provider (keep first match per provider)
    const seen = new Set<string>();
    sources = allSources.filter(s => {
      if (!s.postUrl) return false;
      if (seen.has(s.provider)) return false;
      seen.add(s.provider);
      return true;
    });

    // Build summary for UI display
    sources.forEach(s => {
      if (!linkSummary[s.provider]) linkSummary[s.provider] = { title: s.title, postUrl: s.postUrl };
    });

  } catch {}

  return NextResponse.json({
    success: true,
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
        profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      })) || [],
      trailer: tmdbData?.videos?.results?.find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      )?.key || null,
      seasons: type === 'tv' ? tmdbData?.seasons?.filter((s: any) => s.season_number > 0) : null,
      // Sources for on-demand stream resolution (NOT pre-resolved)
      sources,
      totalSources: sources.length,
    },
  });
}

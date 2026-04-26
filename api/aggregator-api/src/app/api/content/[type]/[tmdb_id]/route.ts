import { NextResponse } from 'next/server';
import { getSourcesByTmdbId } from '@/services/aggregator';
import { getTMDBDetails } from '@/services/tmdb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tmdb_id: string; type: string }> }
) {
  const { tmdb_id, type } = await params;
  const id = parseInt(tmdb_id);
  
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid TMDB ID' }, { status: 400 });
  }
  if (type !== 'movie' && type !== 'tv') {
    return NextResponse.json({ error: 'Type must be "movie" or "tv"' }, { status: 400 });
  }

  try {
    // Fetch TMDB details & MongoDB sources in parallel
    const [tmdbDetails, dbContent] = await Promise.all([
      getTMDBDetails(id, type as 'movie' | 'tv'),
      getSourcesByTmdbId(id),
    ]);

    if (!tmdbDetails) {
      return NextResponse.json({ error: 'Content not found on TMDB' }, { status: 404 });
    }

    // Merge sources from MongoDB (scraped before) with fresh TMDB data
    const sources = dbContent?.sources || [];

    return NextResponse.json({
      success: true,
      tmdb_id: id,
      type,
      // Full TMDB details
      title: tmdbDetails.title || tmdbDetails.name,
      original_title: tmdbDetails.original_title || tmdbDetails.original_name,
      overview: tmdbDetails.overview,
      poster: tmdbDetails.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbDetails.poster_path}` : null,
      backdrop: tmdbDetails.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbDetails.backdrop_path}` : null,
      release_date: tmdbDetails.release_date || tmdbDetails.first_air_date,
      vote_average: tmdbDetails.vote_average,
      vote_count: tmdbDetails.vote_count,
      runtime: tmdbDetails.runtime,
      genres: tmdbDetails.genres?.map((g: any) => g.name) || [],
      seasons: tmdbDetails.number_of_seasons,
      episodes: tmdbDetails.number_of_episodes,
      status: tmdbDetails.status,
      imdb_id: tmdbDetails.imdb_id || tmdbDetails.external_ids?.imdb_id,
      cast: tmdbDetails.credits?.cast?.slice(0, 10).map((c: any) => ({
        name: c.name,
        character: c.character,
        profile: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      })) || [],
      videos: tmdbDetails.videos?.results?.filter((v: any) => v.type === 'Trailer').slice(0, 3) || [],
      similar: tmdbDetails.similar?.results?.slice(0, 12).map((s: any) => ({
        tmdb_id: s.id,
        title: s.title || s.name,
        poster: s.poster_path ? `https://image.tmdb.org/t/p/w185${s.poster_path}` : null,
        vote_average: s.vote_average,
      })) || [],
      // Available streaming sources from all scraped providers
      sources: sources.map((s: any) => ({
        provider: s.provider,
        providerId: s.providerId,
        url: s.url,
        type: s.type,
      })),
      source_count: sources.length,
    });
  } catch (error: any) {
    console.error('Details error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

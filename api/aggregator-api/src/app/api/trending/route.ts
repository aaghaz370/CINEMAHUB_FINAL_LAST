import { NextResponse } from 'next/server';
import { fetchTMDBTrending } from '@/services/tmdb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = (searchParams.get('type') || 'all') as 'all' | 'movie' | 'tv';
  const page = parseInt(searchParams.get('page') || '1');

  try {
    const results = await fetchTMDBTrending(type, page);

    return NextResponse.json({
      success: true,
      type,
      page,
      results: results.map((r: any) => ({
        tmdb_id: r.id,
        title: r.title || r.name,
        type: r.media_type || (r.title ? 'movie' : 'tv'),
        poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
        backdrop: r.backdrop_path ? `https://image.tmdb.org/t/p/w780${r.backdrop_path}` : null,
        release_date: r.release_date || r.first_air_date,
        vote_average: r.vote_average,
        overview: r.overview,
        popularity: r.popularity,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { unifiedSearch } from '@/services/aggregator';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query parameter "q" must be at least 2 chars' }, { status: 400 });
  }

  try {
    const results = await unifiedSearch(query.trim());

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      results: results.map(r => ({
        tmdb_id: r.tmdb_id,
        title: r.tmdb.title,
        type: r.tmdb.type,
        overview: r.tmdb.overview,
        poster: r.tmdb.poster_path ? `https://image.tmdb.org/t/p/w342${r.tmdb.poster_path}` : null,
        backdrop: r.tmdb.backdrop_path ? `https://image.tmdb.org/t/p/w1280${r.tmdb.backdrop_path}` : null,
        release_date: r.tmdb.release_date,
        vote_average: r.tmdb.vote_average,
        genres: r.tmdb.genres,
        source_count: r.sources.length,
        providers: r.sources.map(s => s.provider),
      })),
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

function mapTmdb(m: any, type?: string): any {
  const mediaType = type || m.media_type || 'movie';
  return {
    tmdb_id: m.id,
    title: m.title || m.name,
    type: mediaType,
    overview: m.overview || '',
    vote_average: m.vote_average || 0,
    release_date: m.release_date || m.first_air_date || '',
    poster: m.poster_path ? `${IMG}/w500${m.poster_path}` : null,
    backdrop: m.backdrop_path ? `${IMG}/w1280${m.backdrop_path}` : null,
  };
}

async function tmdbFetch(path: string) {
  if (!TMDB_KEY) return [];
  try {
    const res = await fetch(`${TMDB}${path}&api_key=${TMDB_KEY}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export async function GET() {
  if (!TMDB_KEY) {
    return NextResponse.json(
      { success: false, error: 'TMDB_API_KEY not configured' },
      { status: 500 }
    );
  }

  // Fetch all categories in parallel from TMDB
  const [
    trending,
    popularMovies,
    topMovies,
    upcoming,
    popularTv,
    topTv,
    actionMovies,
    romanceMovies,
  ] = await Promise.all([
    tmdbFetch('/trending/all/week?'),
    tmdbFetch('/movie/popular?'),
    tmdbFetch('/movie/top_rated?'),
    tmdbFetch('/movie/upcoming?'),
    tmdbFetch('/tv/popular?'),
    tmdbFetch('/tv/top_rated?'),
    tmdbFetch('/discover/movie?with_genres=28&sort_by=popularity.desc&'),
    tmdbFetch('/discover/movie?with_genres=10749&sort_by=popularity.desc&'),
  ]);

  const sections = [
    {
      title: '🔥 Trending Now',
      items: trending.slice(0, 20).map((m: any) => mapTmdb(m)),
    },
    {
      title: '🎬 Popular Movies',
      items: popularMovies.slice(0, 15).map((m: any) => mapTmdb(m, 'movie')),
    },
    {
      title: '⭐ Top Rated Movies',
      items: topMovies.slice(0, 15).map((m: any) => mapTmdb(m, 'movie')),
    },
    {
      title: '📺 Popular Series',
      items: popularTv.slice(0, 15).map((m: any) => mapTmdb(m, 'tv')),
    },
    {
      title: '🏆 Top 10 Series',
      items: topTv.slice(0, 10).map((m: any) => mapTmdb(m, 'tv')),
    },
    {
      title: '🚀 Coming Soon',
      items: upcoming.slice(0, 15).map((m: any) => mapTmdb(m, 'movie')),
    },
    {
      title: '💥 Action & Adventure',
      items: actionMovies.slice(0, 15).map((m: any) => mapTmdb(m, 'movie')),
    },
    {
      title: '💕 Romance',
      items: romanceMovies.slice(0, 15).map((m: any) => mapTmdb(m, 'movie')),
    },
  ].filter((s) => s.items.length > 0);

  // Hero items = trending items WITH backdrops
  const heroItems = trending
    .filter((m: any) => m.backdrop_path)
    .slice(0, 5)
    .map((m: any) => mapTmdb(m));

  return NextResponse.json({
    success: true,
    source: 'tmdb',
    data: {
      totalSections: sections.length,
      sections,
      trending: heroItems,
    },
  });
}

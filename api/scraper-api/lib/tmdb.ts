const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export interface TMDBMedia {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  media_type: 'movie' | 'tv';
  original_title?: string;
  original_name?: string;
}

export interface TMDBFullDetails extends TMDBMedia {
  genres: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  budget?: number;
  credits?: {
    cast: { name: string; character: string; profile_path: string }[];
  };
}

export async function searchTMDB(query: string, type: 'movie' | 'tv' | 'multi' = 'multi', retries = 3): Promise<TMDBMedia[]> {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'dummy') {
    console.warn("TMDB_API_KEY is not set or is 'dummy'");
    return [];
  }

  for (let i = 0; i < retries; i++) {
    try {
      const url = `${TMDB_BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`TMDB API HTTP error: ${response.status}`);
      }
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      if (i === retries - 1) {
        console.error(`Error searching TMDB after ${retries} retries:`, error);
        return [];
      }
      await new Promise(res => setTimeout(res, 1000 * (i + 1))); // Exponential backoff
    }
  }
  return [];
}

export async function getTMDBDetails(id: number | string, type: 'movie' | 'tv', retries = 3): Promise<TMDBFullDetails | null> {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'dummy') return null;

  for (let i = 0; i < retries; i++) {
    try {
      const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`TMDB Details HTTP error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) {
        console.error(`Error fetching TMDB ${type} details after ${retries} retries:`, error);
        return null;
      }
      await new Promise(res => setTimeout(res, 1000 * (i + 1))); // Exponential backoff
    }
  }
  return null;
}

export async function findTMDBId(title: string, year?: string, type: 'movie' | 'tv' = 'movie'): Promise<TMDBMedia | null> {
  const results = await searchTMDB(title, type);
  
  if (results.length === 0) return null;

  // Attempt to find the best match by comparing title and year
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const bestMatch = results.find(item => {
    const itemTitle = (item.title || item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const itemYear = (item.release_date || item.first_air_date || '').substring(0, 4);
    
    const titleMatches = itemTitle === normalizedTitle || normalizedTitle.includes(itemTitle) || itemTitle.includes(normalizedTitle);
    const yearMatches = year ? itemYear === year : true;
    
    return titleMatches && yearMatches;
  });

  return bestMatch || results[0];
}

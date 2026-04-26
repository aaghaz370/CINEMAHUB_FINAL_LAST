import axios from 'axios';

const TMDB_BASE = 'https://api.tmdb.org/3';
const API_KEY = process.env.TMDB_API_KEY!;

export interface TMDBMatch {
  tmdb_id: number;
  imdb_id?: string;
  type: 'movie' | 'tv';
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genres: string[];
  popularity: number;
}

// Normalize title for comparison (trim, lowercase, remove special chars)
function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance for fuzzy title matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Similarity score 0-1 between two titles
function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1.0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshtein(na, nb) / maxLen;
}

// Year proximity score (0 or 1 based on ±1 year threshold)
function yearScore(providerYear: string | undefined, tmdbDate: string | undefined): number {
  if (!providerYear || !tmdbDate) return 0.5; // unknown = neutral
  const pYear = parseInt(providerYear);
  const tYear = parseInt(tmdbDate.substring(0, 4));
  if (isNaN(pYear) || isNaN(tYear)) return 0.5;
  const diff = Math.abs(pYear - tYear);
  if (diff === 0) return 1.0;
  if (diff === 1) return 0.7;
  return 0.0;
}

// Main TMDB resolver: returns best TMDB match for a given provider result
export async function resolveTMDBMatch(
  title: string,
  year?: string,
  type?: 'movie' | 'tv' | 'anime'
): Promise<TMDBMatch | null> {
  try {
    // Clean up title: Remove brackets like [Hindi], (Reloaded Version), CamRip, 1080p, etc.
    const cleanTitle = title
       .replace(/\[.*?\]|\(.*?\)/g, '') // remove anything in [] or ()
       .replace(/\b(1080p|720p|4k|2160p|cam|camrip|hdrip|hd|dvdrip|webrip|web-dl|dual|hindi|dubbed|telugu|tamil|malayalam|kannada|multi|org|original|bluray|rip|full|movie|series)\b/gi, '') // remove common keywords
       .replace(/[:\-]/g, ' ') // remove special chars that might break search
       .replace(/\s+/g, ' ')
       .trim();

    const searchType = type === 'movie' ? 'movie' : 'tv';
    
    const params: Record<string, string | number> = {
      api_key: API_KEY,
      query: cleanTitle || title,
      include_adult: 'false',
      language: 'en-US',
    };
    // Don't pass year to API to be more flexible, we'll score the year ourselves
    // if (year) params.year = year;

    const res = await axios.get(`${TMDB_BASE}/search/${searchType}`, { params, timeout: 6000 });
    const candidates = res.data.results || [];

    if (candidates.length === 0) {
      // If TV found nothing, try movie (and vice versa)
      const fallbackType = searchType === 'movie' ? 'tv' : 'movie';
      const res2 = await axios.get(`${TMDB_BASE}/search/${fallbackType}`, { params, timeout: 6000 });
      candidates.push(...(res2.data.results || []));
    }

    if (candidates.length === 0) return null;

    // Score each candidate and pick best
    let best: any = null;
    let bestScore = 0;

    for (const c of candidates.slice(0, 5)) {
      const tmdbTitle = c.title || c.name || '';
      const tmdbOrig = c.original_title || c.original_name || '';
      const tmdbDate = c.release_date || c.first_air_date || '';

      const titleScore = Math.max(
        titleSimilarity(title, tmdbTitle),
        titleSimilarity(title, tmdbOrig)
      );
      const yScore = yearScore(year, tmdbDate);

      // Weighted: title similarity 70%, year 30%
      const totalScore = titleScore * 0.7 + yScore * 0.3;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        best = c;
      }
    }

    // Threshold: reject if similarity too low (< 0.45)
    if (bestScore < 0.45 || !best) return null;

    // Get details for genres + imdb_id
    const isMovie = !!(best.title); // TV entries have 'name', movies have 'title'
    const detailType = isMovie ? 'movie' : 'tv';
    
    let genres: string[] = [];
    let imdb_id: string | undefined;

    try {
      const det = await axios.get(`${TMDB_BASE}/${detailType}/${best.id}`, {
        params: { api_key: API_KEY, append_to_response: 'external_ids' },
        timeout: 5000,
      });
      genres = det.data.genres?.map((g: any) => g.name) || [];
      imdb_id = det.data.imdb_id || det.data.external_ids?.imdb_id;
    } catch { /* genres/imdb optional */ }

    return {
      tmdb_id: best.id,
      imdb_id,
      type: detailType,
      title: best.title || best.name,
      original_title: best.original_title || best.original_name || '',
      overview: best.overview || '',
      poster_path: best.poster_path,
      backdrop_path: best.backdrop_path,
      release_date: best.release_date || best.first_air_date || '',
      vote_average: best.vote_average || 0,
      vote_count: best.vote_count || 0,
      genres,
      popularity: best.popularity || 0,
    };
  } catch (err) {
    console.error(`TMDB resolve error for "${title}":`, err);
    return null;
  }
}

// Fetch trending from TMDB directly (for homepage)
export async function fetchTMDBTrending(type: 'all' | 'movie' | 'tv' = 'all', page = 1) {
  try {
    const res = await axios.get(`${TMDB_BASE}/trending/${type}/week`, {
      params: { api_key: API_KEY, page, language: 'en-US' },
      timeout: 8000,
    });
    return res.data.results || [];
  } catch (err: any) { 
    console.error("fetchTMDBTrending Error:", err.response?.data || err.message);
    return []; 
  }
}

// Get full TMDB details
export async function getTMDBDetails(tmdb_id: number, type: 'movie' | 'tv') {
  try {
    const res = await axios.get(`${TMDB_BASE}/${type}/${tmdb_id}`, {
      params: {
        api_key: API_KEY,
        append_to_response: 'credits,videos,external_ids,similar',
        language: 'en-US',
      },
      timeout: 8000,
    });
    return res.data;
  } catch { return null; }
}

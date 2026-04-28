import { getDb, closeAllDbs } from '../lib/mongodb';
import { config } from 'dotenv';
import axios from 'axios';

config({ path: '.env.local' });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error("TMDB_API_KEY is not set.");
  process.exit(1);
}

const api = axios.create({
  baseURL: TMDB_BASE_URL,
  params: { api_key: TMDB_API_KEY }
});

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchDetails(id: number, type: 'movie' | 'tv') {
  try {
    const { data } = await api.get(`/${type}/${id}`, {
      params: { append_to_response: 'credits,videos,external_ids' }
    });
    return data;
  } catch (error: any) {
    console.error(`Failed to fetch details for ${type} ${id}:`, error.message);
    return null;
  }
}

function processMediaData(data: any, type: 'movie' | 'tv') {
  // Extract top 10 cast
  const cast = data.credits?.cast?.slice(0, 10).map((c: any) => ({
    name: c.name,
    character: c.character,
    profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null
  })) || [];

  // Extract director
  const directors = data.credits?.crew
    ?.filter((c: any) => c.job === 'Director')
    .map((c: any) => c.name) || [];

  // Extract trailers
  const videos = data.videos?.results
    ?.filter((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
    .map((v: any) => v.key) || [];

  return {
    tmdb_id: data.id,
    imdb_id: data.external_ids?.imdb_id || null,
    type,
    title: data.title || data.name,
    original_title: data.original_title || data.original_name,
    overview: data.overview,
    release_date: data.release_date || data.first_air_date,
    runtime: data.runtime || (data.episode_run_time && data.episode_run_time[0]) || null,
    genres: data.genres?.map((g: any) => g.name) || [],
    vote_average: data.vote_average,
    vote_count: data.vote_count,
    poster_path: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
    backdrop_path: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
    status: data.status,
    cast,
    directors,
    videos,
    // TV Specific
    seasons: type === 'tv' ? data.seasons?.map((s: any) => ({
      season_number: s.season_number,
      episode_count: s.episode_count,
      name: s.name,
      poster_path: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null
    })) : null,
    // Prepared for streaming links insertion later
    streams: {},
    updated_at: new Date()
  };
}

async function scrapeList(endpoint: string, type: 'movie' | 'tv', maxPages = 5) {
  console.log(`Starting to scrape ${endpoint} (up to ${maxPages} pages)...`);
  let totalProcessed = 0;

  for (let page = 1; page <= maxPages; page++) {
    console.log(`Fetching page ${page} of ${endpoint}...`);
    try {
      const { data } = await api.get(endpoint, { params: { page } });
      const items = data.results;

      // Process in chunks to respect rate limits
      for (let i = 0; i < items.length; i += 5) {
        const chunk = items.slice(i, i + 5);
        await Promise.all(chunk.map(async (item: any) => {
          const details = await fetchDetails(item.id, type);
          if (!details) return;

          const processed = processMediaData(details, type);
          
          try {
            // Hash-based routing to multi-DB architecture
            const db = await getDb(processed.tmdb_id);
            const collection = db.collection('media');
            
            await collection.updateOne(
              { tmdb_id: processed.tmdb_id, type: processed.type },
              { $set: processed },
              { upsert: true }
            );
            totalProcessed++;
          } catch (dbErr: any) {
            console.error(`DB Error for ${processed.title}:`, dbErr.message);
          }
        }));
        await delay(150); // Be nice to TMDB (40 req/sec limit)
      }
    } catch (error: any) {
      console.error(`Error fetching page ${page}:`, error.message);
    }
  }
  console.log(`✅ Finished ${endpoint}. Total saved: ${totalProcessed}`);
}

async function main() {
  console.log("🚀 Starting TMDB Seeder...");
  
  // Create index for fast lookups (doing it on DB 1 for now, production should map over all DBs)
  try {
    const db = await getDb(1);
    await db.collection('media').createIndex({ tmdb_id: 1, type: 1 }, { unique: true });
    await db.collection('media').createIndex({ title: "text" }); // Text search
  } catch(e) {}

  // Scrape Movies
  await scrapeList('/movie/popular', 'movie', 10); // 10 pages = 200 movies
  await scrapeList('/movie/top_rated', 'movie', 10); 
  
  // Scrape TV Shows
  await scrapeList('/tv/popular', 'tv', 10);
  await scrapeList('/tv/top_rated', 'tv', 10);

  console.log("🎉 Seeding completed!");
  await closeAllDbs();
  process.exit(0);
}

main().catch(console.error);

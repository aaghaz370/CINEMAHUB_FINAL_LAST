import { searchAllProviders, ProviderResult } from './providers';
import { resolveTMDBMatch, TMDBMatch } from './tmdb';
import connectToDatabase from '@/lib/mongodb';
import Content from '@/models/Content';

export interface AggregatedResult {
  tmdb_id: number;
  tmdb: TMDBMatch;
  sources: { provider: string; providerId: string; url: string; }[];
}

// ──────────────────────────────────────────────────────────
// UNIFIED SEARCH: Fetch all providers → Resolve to TMDB → Deduplicate
// ──────────────────────────────────────────────────────────
export async function unifiedSearch(query: string): Promise<AggregatedResult[]> {
  const scraperBase = process.env.SCRAPER_API_BASE || 'http://localhost:9090';

  // 1. Fetch from all providers in parallel
  const providerResults: ProviderResult[] = await searchAllProviders(query, scraperBase);

  if (providerResults.length === 0) return [];

  // 2. Deduplicate provider results by title+year before TMDB lookup
  const uniqueProviders = deduplicateByTitle(providerResults);

  // 3. Resolve each unique result to a TMDB ID
  // We batch-resolve with a concurrency limit of 5 to avoid TMDB rate limits
  const BATCH = 5;
  const tmdbMap = new Map<number, AggregatedResult>();

  for (let i = 0; i < uniqueProviders.length; i += BATCH) {
    const batch = uniqueProviders.slice(i, i + BATCH);

    const resolved = await Promise.allSettled(
      batch.map(async (pr) => {
        const tmdb = await resolveTMDBMatch(pr.title, pr.year, pr.type);
        return { pr, tmdb };
      })
    );

    for (const r of resolved) {
      if (r.status !== 'fulfilled' || !r.value.tmdb) continue;
      const { pr, tmdb } = r.value;

      const existing = tmdbMap.get(tmdb.tmdb_id);
      if (existing) {
        // Already have this TMDB ID → just add the new source
        const alreadyHasProvider = existing.sources.some(s => s.providerId === pr.providerId);
        if (!alreadyHasProvider) {
          existing.sources.push({ provider: pr.provider, providerId: pr.providerId, url: pr.url });
        }
      } else {
        // New TMDB match → create entry
        tmdbMap.set(tmdb.tmdb_id, {
          tmdb_id: tmdb.tmdb_id,
          tmdb,
          sources: [{ provider: pr.provider, providerId: pr.providerId, url: pr.url }],
        });
      }
    }
  }

  // 4. Sort results by TMDB popularity descending
  const results = Array.from(tmdbMap.values()).sort(
    (a, b) => (b.tmdb.popularity || 0) - (a.tmdb.popularity || 0)
  );

  // 5. Persist/update in MongoDB in background (fire-and-forget)
  persistResultsToMongo(results).catch(() => {});

  return results;
}

// ──────────────────────────────────────────────────────────
// DEDUPLICATE provider results by normalized title
// Keep all provider URLs for the same title (one per provider)
// ──────────────────────────────────────────────────────────
function deduplicateByTitle(results: ProviderResult[]): ProviderResult[] {
  const seen = new Map<string, ProviderResult>();

  for (const r of results) {
    const key = normalizeKey(r.title, r.year);
    if (!seen.has(key)) {
      seen.set(key, r);
    }
  }

  return Array.from(seen.values());
}

function normalizeKey(title: string, year?: string): string {
  if (!title) return `empty_${year || ''}`;
  
  // Advanced cleaning for deduplication key
  const t = title.toLowerCase()
    .replace(/\[.*?\]|\(.*?\)/g, '') // remove [HINDI], (2021), etc.
    .replace(/\b(1080p|720p|4k|2160p|hdtv|cam|hindi|dubbed|multi|dual|org|fan|sub|dub|rip|web|dl)\b/gi, '')
    .replace(/[^a-z0-9]/g, '') // remove all special chars
    .trim();
    
  const y = year || '';
  return `${t}_${y}`;
}

// ──────────────────────────────────────────────────────────
// PERSIST to MongoDB (async background task)
// ──────────────────────────────────────────────────────────
async function persistResultsToMongo(results: AggregatedResult[]): Promise<void> {
  try {
    await connectToDatabase();

    for (const r of results) {
      await Content.findOneAndUpdate(
        { tmdb_id: r.tmdb_id },
        {
          $set: {
            tmdb_id: r.tmdb_id,
            imdb_id: r.tmdb.imdb_id,
            type: r.tmdb.type,
            title: r.tmdb.title,
            overview: r.tmdb.overview,
            poster_path: r.tmdb.poster_path,
            backdrop_path: r.tmdb.backdrop_path,
            genres: r.tmdb.genres,
            release_date: r.tmdb.release_date,
            last_scraped: new Date(),
          },
          $addToSet: {
            sources: { $each: r.sources.map(s => ({ ...s, type: 'stream' })) }
          }
        },
        { upsert: true, new: true }
      );
    }
  } catch (e) {
    console.error('MongoDB persist error:', e);
  }
}

// ──────────────────────────────────────────────────────────
// GET SOURCES by TMDB ID (for detail/stream page)
// ──────────────────────────────────────────────────────────
export async function getSourcesByTmdbId(tmdb_id: number) {
  try {
    await connectToDatabase();
    return await Content.findOne({ tmdb_id });
  } catch { return null; }
}

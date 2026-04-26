import { getSourcesByTmdbId } from './aggregator';

export interface StreamSource {
  quality: string; // '4K', '1080p', '720p', '480p', 'Auto', 'Unknown'
  language: string; // 'Hindi', 'English', 'Dual Audio', 'Multi', etc.
  url: string; // The direct stream URL (.mp4, .m3u8, etc)
  provider: string; // Name of the provider
  isDirect: boolean;
  type: 'video/mp4' | 'application/x-mpegURL' | 'embed';
}

export interface GroupedStream {
  language: string;
  qualities: {
    quality: string;
    primary: StreamSource;
    backups: StreamSource[];
  }[];
}

// Helper to extract Quality from any string
function extractQuality(text: string): string {
  const t = text.toUpperCase();
  if (t.includes('2160P') || t.includes('4K')) return '4K';
  if (t.includes('1080P') || t.includes('FHD')) return '1080p';
  if (t.includes('720P') || t.includes('HD')) return '720p';
  if (t.includes('480P') || t.includes('SD')) return '480p';
  if (t.includes('360P')) return '360p';
  return 'Auto'; // Default for HLS or unknown
}

// Helper to extract Language from any string
function extractLanguage(text: string): string {
  const t = text.toUpperCase();
  if (t.includes('DUAL AUDIO') || t.includes('DUAL')) return 'Dual Audio';
  if (t.includes('MULTI')) return 'Multi Audio';
  if (t.includes('HIN') || t.includes('HINDI')) return 'Hindi';
  if (t.includes('TEL') || t.includes('TELUGU')) return 'Telugu';
  if (t.includes('TAM') || t.includes('TAMIL')) return 'Tamil';
  if (t.includes('JAP') || t.includes('JAPANESE') || t.includes('SUB')) return 'Japanese (Sub)';
  if (t.includes('ENG') || t.includes('ENGLISH')) return 'English';
  return 'Unknown';
}

export async function fetchAllStreamsForTmdb(tmdb_id: number): Promise<GroupedStream[]> {
  const content = await getSourcesByTmdbId(tmdb_id);
  if (!content || !content.sources || content.sources.length === 0) {
    return [];
  }

  const scraperBase = process.env.SCRAPER_API_BASE || 'http://localhost:9090';
  const allStreams: StreamSource[] = [];

  // Fetch streams from all providers in parallel
  const fetches = content.sources.map(async (source: any) => {
    try {
      if (source.providerId === 'netmirror') {
        // Extract NetMirror ID from URL
        const idMatch = source.url.match(/id=([a-zA-Z0-9]+)/);
        const id = idMatch ? idMatch[1] : source.url.split('/').pop();
        
        if (!id) return;

        const res = await fetch(`${scraperBase}/api/netmirror/stream?id=${id}`, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return;
        const data = await res.json();

        if (data.success && data.data?.streamData) {
          // Flatten sources
          const iterateSources = (obj: any) => {
            if (Array.isArray(obj)) {
              obj.forEach((item: any) => {
                if (item.file) {
                  allStreams.push({
                    quality: item.label || extractQuality(item.label || ''),
                    language: extractLanguage(source.title || ''),
                    url: item.file,
                    provider: 'NetMirror',
                    isDirect: true,
                    type: item.file.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
                  });
                } else {
                   iterateSources(item);
                }
              });
            } else if (typeof obj === 'object') {
              for (const key in obj) {
                if (key === 'sources') iterateSources(obj[key]);
                else if (typeof obj[key] === 'object') iterateSources(obj[key]);
              }
            }
          };
          iterateSources(data.data.streamData);
        }
      } else if (source.providerId === 'themovie') {
         // MovieBox (themovie) extraction
         const res = await fetch(`${scraperBase}/api/themovie/stream?url=${encodeURIComponent(source.url)}`, { signal: AbortSignal.timeout(10000) });
         if (!res.ok) return;
         const data = await res.json();
         if (data.success && data.data && data.data.data && data.data.data.playList) {
             const playList = data.data.data.playList;
             // extract from their JSON structure
             playList.forEach((playItem: any) => {
                 if (playItem.url || playItem.playUrl) {
                    allStreams.push({
                      quality: playItem.quality || playItem.resolution || extractQuality(playItem.quality || ''),
                      language: extractLanguage(source.title || ''),
                      url: playItem.url || playItem.playUrl,
                      provider: 'MovieBox',
                      isDirect: true,
                      type: (playItem.url || playItem.playUrl).includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
                    });
                 }
             });
             
             // Check if data.data.data.list has streams
             if (data.data.data.list && Array.isArray(data.data.data.list)) {
                data.data.data.list.forEach((item: any) => {
                    if (item.path) {
                       allStreams.push({
                          quality: item.quality || extractQuality(item.quality || ''),
                          language: extractLanguage(source.title || ''),
                          url: item.path,
                          provider: 'MovieBox',
                          isDirect: true,
                          type: item.path.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
                        });
                    }
                });
             }
         }
      } else if (source.providerId === 'animesalt') {
         const res = await fetch(`${scraperBase}/api/animesalt/stream?url=${encodeURIComponent(source.url)}`, { signal: AbortSignal.timeout(10000) });
         if (!res.ok) return;
         const data = await res.json();
         if (data.stream) {
             allStreams.push({
                 quality: 'Auto',
                 language: extractLanguage(source.title || 'Japanese (Sub)'),
                 url: data.stream,
                 provider: 'AnimeSalt',
                 isDirect: true,
                 type: data.stream.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4',
             });
         }
      }
    } catch (e) {
      console.warn(`Failed to fetch stream for ${source.providerId}:`, e);
    }
  });

  await Promise.allSettled(fetches);

  // Group and Deduplicate Strategy
  // 1. Group by Language
  // 2. Group by Quality
  // 3. Keep 1 primary, rest as backups

  const grouped = new Map<string, Map<string, StreamSource[]>>();

  for (const stream of allStreams) {
    if (!grouped.has(stream.language)) grouped.set(stream.language, new Map());
    const langMap = grouped.get(stream.language)!;

    const q = stream.quality === 'Auto' && allStreams.length > 5 ? '720p' : stream.quality; // normalize
    if (!langMap.has(q)) langMap.set(q, []);
    
    // Deduplicate exact same URL
    if (!langMap.get(q)!.find(s => s.url === stream.url)) {
       langMap.get(q)!.push(stream);
    }
  }

  // Convert to formatted array
  const result: GroupedStream[] = [];
  
  for (const [lang, qMap] of Array.from(grouped.entries())) {
    const qualities: GroupedStream['qualities'] = [];
    
    for (const [q, streams] of Array.from(qMap.entries())) {
      // Sort streams: direct mp4 first, then m3u8, then embed
      streams.sort((a, b) => {
         if (a.isDirect && !b.isDirect) return -1;
         if (!a.isDirect && b.isDirect) return 1;
         return 0;
      });

      qualities.push({
        quality: q,
        primary: streams[0],          // The fastest/best link will be primary
        backups: streams.slice(1)     // The rest are stored as Server 2, Server 3, etc.
      });
    }

    // Sort qualities descending (4K -> 1080p -> 720p -> 480p)
    qualities.sort((a, b) => {
      const rank = (qual: string) => {
        if (qual === '4K') return 4;
        if (qual === '1080p') return 3;
        if (qual === '720p') return 2;
        if (qual === '480p') return 1;
        return 0;
      };
      return rank(b.quality) - rank(a.quality);
    });

    result.push({
      language: lang,
      qualities
    });
  }

  return result;
}

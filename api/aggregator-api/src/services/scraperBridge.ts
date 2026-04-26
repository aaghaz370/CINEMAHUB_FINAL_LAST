import axios from 'axios';

const SCRAPER_API_BASE = process.env.SCRAPER_API_BASE || 'http://localhost:9090/api';

export interface ProviderResult {
  title: string;
  link: string;
  type: 'movie' | 'series' | 'anime';
  image?: string;
  provider: string;
}

export const scraperBridge = {
  async searchAcrossAll(query: string): Promise<ProviderResult[]> {
    const providers = ['animesalt', 'netmirror', 'themoviebox']; // We can add more
    const results: ProviderResult[] = [];

    // Parallel search
    const searches = providers.map(async (p) => {
      try {
        const response = await axios.get(`${SCRAPER_API_BASE}/${p}/search`, {
          params: { query }
        });
        const items = response.data.results || response.data.movies || [];
        return items.map((item: any) => ({
          title: item.title || item.name || item.t,
          link: item.link || item.url || item.href,
          type: item.type || (p === 'animesalt' ? 'anime' : 'movie'),
          image: item.image || item.poster || item.img,
          provider: p
        }));
      } catch (error) {
        console.error(`Scraper Search Error (${p}):`, error);
        return [];
      }
    });

    const nestedResults = await Promise.all(searches);
    return nestedResults.flat();
  },

  async getStreams(provider: string, url: string): Promise<any> {
    try {
      const response = await axios.get(`${SCRAPER_API_BASE}/${provider}/stream`, {
        params: { url }
      });
      return response.data.data || response.data;
    } catch (error) {
      console.error(`Scraper Stream Error (${provider}):`, error);
      return null;
    }
  }
};

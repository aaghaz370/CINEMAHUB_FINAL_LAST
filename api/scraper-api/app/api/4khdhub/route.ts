import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// Fix common URL issues: double-slashes after domain, protocol-relative URLs
function cleanUrl(raw: string, baseUrl: string): string {
  if (!raw) return '';
  if (raw.startsWith('//')) return 'https:' + raw;        // protocol-relative
  if (raw.startsWith('http')) return raw.replace(/([^:])\/{2,}/g, '$1/'); // remove double-slashes
  // relative path — join with base, then clean
  const joined = baseUrl.replace(/\/$/, '') + '/' + raw.replace(/^\/+/, '');
  return joined.replace(/([^:])\/{2,}/g, '$1/');
}

interface Movie {
  title: string;
  url: string;
  imageUrl: string;
  year: string;
  season?: string;
  formats: string[];
}

// ─── Home ─────────────────────────────────────────────────────────────────────
async function fetchHome(baseUrl: string, page: string) {
  const fetchUrl = page === "1" ? baseUrl : `${baseUrl}/page/${page}/`;
  const response = await fetch(fetchUrl, {
    headers: { "User-Agent": UA, "Accept": "text/html" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const movies: Movie[] = [];

  $('.movie-card').each((_, element) => {
    const $card = $(element);
    const url = $card.attr('href') || '';
    const title = $card.find('.movie-card-title').text().trim();
    const imageUrl = $card.find('.movie-card-image img').attr('src') || '';
    const meta = $card.find('.movie-card-meta').text().trim();
    const metaParts = meta.split('•').map(s => s.trim());
    const year = metaParts[0] || '';
    const season = metaParts[1] || undefined;
    const formats: string[] = [];
    $card.find('.movie-card-format').each((_, formatEl) => {
      const format = $(formatEl).text().trim();
      if (format) formats.push(format);
    });
    if (title && url) {
      movies.push({ title, url: cleanUrl(url, baseUrl), imageUrl, year, season, formats });
    }
  });

  return { success: true, data: movies, pagination: { currentPage: page }, baseUrl };
}

// ─── Search ───────────────────────────────────────────────────────────────────
async function fetchSearch(baseUrl: string, query: string) {
  const fetchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;
  const response = await fetch(fetchUrl, {
    headers: { "User-Agent": UA, "Accept": "text/html", "Referer": baseUrl },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const results: Movie[] = [];

  $('.movie-card').each((_, element) => {
    const $card = $(element);
    const url = $card.attr('href') || '';
    const title = $card.find('.movie-card-title').text().trim();
    const imageUrl = $card.find('.movie-card-image img').attr('src') || '';
    const meta = $card.find('.movie-card-meta').text().trim();
    const metaParts = meta.split('•').map(s => s.trim());
    const year = metaParts[0] || '';
    const season = metaParts[1] || undefined;
    const formats: string[] = [];
    $card.find('.movie-card-format').each((_, formatEl) => {
      const format = $(formatEl).text().trim();
      if (format) formats.push(format);
    });
    if (title && url) {
      results.push({ title, url: cleanUrl(url, baseUrl), imageUrl, year, season, formats });
    }
  });

  return { success: true, data: { results, query, totalResults: results.length } };
}

// ─── Details ─────────────────────────────────────────────────────────────────
async function fetchDetails(rawUrl: string) {
  // Clean the URL before fetching (remove double-slashes, etc.)
  const url = rawUrl.replace(/([^:])\/{2,}/g, '$1/');
  const response = await fetch(url, {
    headers: { "User-Agent": UA, "Accept": "text/html", "Referer": new URL(url).origin },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $('.page-title').text().trim() || $('h1').first().text().trim()
    || $('meta[property="og:title"]').attr('content') || '';
  const posterUrl = $('.poster-image img').attr('src') || $('meta[property="og:image"]').attr('content') || '';
  const synopsis = $('.content-section p').first().text().trim()
    || $('meta[name="description"]').attr('content') || '';

  const categories: string[] = [];
  $('.badge-outline a, .category a').each((_, el) => {
    const c = $(el).text().trim();
    if (c) categories.push(c);
  });

  // Detect languages from title/page
  const langs = new Set<string>();
  if (/hindi|hin\b/i.test(title)) langs.add('Hindi');
  if (/english|eng\b/i.test(title)) langs.add('English');
  if (/telugu|tel\b/i.test(title)) langs.add('Telugu');
  if (/tamil|tam\b/i.test(title)) langs.add('Tamil');
  if (/dual.?audio|multi/i.test(title)) { langs.add('Hindi'); langs.add('English'); }
  if (!langs.size) langs.add('Unknown');

  interface DownloadItem {
    title: string;
    fileTitle: string;
    size: string;
    languages: string;
    quality: string;
    badges: string[];
    links: { server: string; url: string }[];
  }

  const downloadLinks: DownloadItem[] = [];
  $('.download-item').each((_, el) => {
    const $item = $(el);
    const header = $item.find('.download-header');
    const titleText = header.find('.flex-1').contents().first().text().trim();
    const size = header.find('.badge').first().text().trim();
    const languages = header.find('.badge').eq(1).text().trim();
    const quality = header.find('.badge').eq(2).text().trim();
    const fileTitle = $item.find('.file-title').text().trim();
    const badges: string[] = [];
    $item.find('.flex.flex-wrap .badge').each((_, b) => { badges.push($(b).text().trim()); });
    const links: { server: string; url: string }[] = [];
    $item.find('.grid.grid-cols-2 a, a.download-link, a[href]').each((_, linkEl) => {
      const server = $(linkEl).find('span').first().text().trim().replace('Download ', '') || $(linkEl).text().trim();
      const href = $(linkEl).attr('href') || '';
      if (href && href.startsWith('http') && server) {
        links.push({ server, url: href });
      }
    });
    if (links.length) {
      downloadLinks.push({ title: titleText, fileTitle, size, languages: languages || [...langs].join(', '), quality, badges, links });
    }
  });

  // Fallback: parse h3/h4 download blocks like hdhub4u style
  if (!downloadLinks.length) {
    const DOWNLOAD_HOSTS = ['hubcloud','hubdrive','vcloud','gdflix','drivemax','mdrive','pixeldrain','filepress','buzzheavier','gofile'];
    let curTitle = 'Download';
    let curLinks: {server: string; url: string}[] = [];
    const groups: DownloadItem[] = [];

    $('h2, h3, h4, a').each((_, el) => {
      const tag = $(el).prop('tagName')?.toLowerCase();
      if (['h2','h3','h4'].includes(tag||'')) {
        if (curLinks.length) groups.push({ title: curTitle, fileTitle: '', size: '', languages: [...langs].join(','), quality: 'HD', badges: [], links: curLinks });
        curTitle = $(el).text().trim();
        curLinks = [];
      } else if (tag === 'a') {
        const href = $(el).attr('href') || '';
        if (!href.startsWith('http')) return;
        if (DOWNLOAD_HOSTS.some(h => href.includes(h))) {
          curLinks.push({ server: $(el).text().trim() || curTitle, url: href });
        }
      }
    });
    if (curLinks.length) groups.push({ title: curTitle, fileTitle: '', size: '', languages: [...langs].join(','), quality: 'HD', badges: [], links: curLinks });
    downloadLinks.push(...groups);
  }

  return {
    success: true,
    data: { title, posterUrl, categories, synopsis, languages: [...langs], downloadLinks },
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'home';
    const page = searchParams.get("page") || "1";
    const q = searchParams.get('q') || searchParams.get('query') || '';
    const url = searchParams.get('url') || '';

    const baseUrl = await getBaseUrl("4kHDHub");

    if (action === 'search' || q) {
      if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
      return NextResponse.json(await fetchSearch(baseUrl, q));
    }
    if (action === 'details' || url) {
      if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
      return NextResponse.json(await fetchDetails(url));
    }
    return NextResponse.json(await fetchHome(baseUrl, page));

  } catch (error) {
    console.error("Error in 4kHDHub API:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

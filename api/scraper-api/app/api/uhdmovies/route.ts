import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchHome(baseUrl: string, page: string) {
  const fetchUrl = page !== "1" ? `${baseUrl}/page/${page}` : baseUrl;
  const response = await fetch(fetchUrl, {
    headers: { "User-Agent": UA, "Accept": "text/html" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const movies: { id: string; title: string; url: string; imageUrl: string }[] = [];

  $('#content.gridlove-site-content .gridlove-post').each((_, element) => {
    const $article = $(element);
    const $link = $article.find('.box-inner-p a').first();
    const url = $link.attr('href') || '';
    const title = $link.find('h1.sanket').text().trim() || $link.text().trim() || '';
    const imageUrl = $article.find('.entry-image img').attr('src') || '';
    const id = url.split('/').filter(Boolean).pop() || '';
    if (title && url) movies.push({ id, title, url, imageUrl });
  });

  return { success: true, data: { movies, page: parseInt(page), totalItems: movies.length } };
}

async function fetchSearch(baseUrl: string, query: string, page = '1') {
  const searchUrl = `${baseUrl}/page/${page}/?s=${query.replace(/\s+/g, '+')}`;
  const response = await fetch(searchUrl, {
    headers: { "User-Agent": UA, "Accept": "text/html", "Referer": baseUrl },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const results: { id: string; title: string; url: string; imageUrl: string }[] = [];

  $('#content.gridlove-site-content .gridlove-post').each((_, element) => {
    const $article = $(element);
    const $link = $article.find('.box-inner-p a').first();
    const url = $link.attr('href') || '';
    const title = $link.find('h1.sanket').text().trim() || $link.text().trim() || '';
    const imageUrl = $article.find('.entry-image img').attr('src') || '';
    const id = url.split('/').filter(Boolean).pop() || '';
    if (title && url) results.push({ id, title, url, imageUrl });
  });

  // Fallback: generic article selector
  if (!results.length) {
    $('article, .post').each((_, el) => {
      const $el = $(el);
      const href = $el.find('a').first().attr('href') || '';
      const title = $el.find('h1, h2, h3').first().text().trim() || '';
      const imageUrl = $el.find('img').first().attr('src') || '';
      const id = href.split('/').filter(Boolean).pop() || '';
      if (title && href) results.push({ id, title: title.replace(/^Download\s+/i, '').trim(), url: href, imageUrl });
    });
  }

  return { success: true, data: { searchResults: results, query, page: parseInt(page), totalItems: results.length } };
}

async function fetchDetails(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, "Accept": "text/html" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);

  const title = $('h1.entry-title').text().trim() || $('h1').first().text().trim()
    || $('meta[property="og:title"]').attr('content') || '';
  const imageUrl = $('.entry-image img').first().attr('src')
    || $('meta[property="og:image"]').attr('content') || '';
  const description = $('meta[name="description"]').attr('content')
    || $('.entry-content p').first().text().trim() || '';

  const langs = new Set<string>();
  if (/hindi|hin\b/i.test(title)) langs.add('Hindi');
  if (/english|eng\b/i.test(title)) langs.add('English');
  if (/telugu|tel\b/i.test(title)) langs.add('Telugu');
  if (/tamil|tam\b/i.test(title)) langs.add('Tamil');
  if (/dual.?audio|multi/i.test(title)) { langs.add('Hindi'); langs.add('English'); }
  if (!langs.size) langs.add('Unknown');

  interface DLLink { quality: string; url: string; type?: string; size?: string; fileName?: string; }
  interface Episode { episode: string; links: DLLink[]; }

  const downloadLinks: DLLink[] = [];
  const episodes: Episode[] = [];
  let currentEpisode: string | null = null;
  let currentEpisodeLinks: DLLink[] = [];
  let currentFileName = '';
  let currentFileSize = '';

  $('.entry-content p').each((_, element) => {
    const $p = $(element);
    const pText = $p.text().trim();

    if (pText.match(/episode\s+\d+|ep\s*\d+|e\d+/i) && !pText.match(/\[.*GB\]/i)) {
      if (currentEpisode && currentEpisodeLinks.length > 0) {
        episodes.push({ episode: currentEpisode, links: [...currentEpisodeLinks] });
      }
      currentEpisode = pText; currentEpisodeLinks = []; currentFileName = ''; currentFileSize = '';
      return;
    }

    const fileMatch = pText.match(/^([^\[]+)\s*\[([^\]]+)\]/);
    if (fileMatch) { currentFileName = fileMatch[1].trim(); currentFileSize = fileMatch[2].trim(); }

    $p.find('a').each((_, linkElem) => {
      const $link = $(linkElem);
      const linkUrl = $link.attr('href') || '';
      const linkText = $link.text().trim();
      if (!linkUrl || linkUrl.startsWith('#') || linkUrl.startsWith('javascript:')) return;

      // Accept G-Drive OR any bypass host
      const HOSTS = ['drive.google', 'drive.usercontent', 'hubdrive', 'hubcloud', 'gdflix', 'drivemax', 'vcloud', 'mdrive', 'pixeldrain', 'filepress', 'buzzeheavier', 'gofile'];
      const isHost = HOSTS.some(h => linkUrl.includes(h));
      const isDownload = linkText.match(/download|g-drive|google\s*drive/i) || isHost;
      if (!isDownload) return;

      let quality = 'Unknown', type = 'Direct';
      if (currentFileName) {
        if (currentFileName.match(/4k|2160p/i)) quality = '4K';
        else if (currentFileName.match(/1080p/i)) quality = '1080p';
        else if (currentFileName.match(/720p/i)) quality = '720p';
        else if (currentFileName.match(/480p/i)) quality = '480p';
        if (currentFileName.match(/hevc|h\.265|x265/i)) type = 'HEVC';
        else if (currentFileName.match(/x264|h\.264/i)) type = 'x264';
        if (currentFileName.match(/web-dl|webdl/i)) type += ' WEB-DL';
        else if (currentFileName.match(/bluray/i)) type += ' BluRay';
      }

      const dl: DLLink = { quality, url: linkUrl, type, size: currentFileSize, fileName: currentFileName };
      if (currentEpisode) currentEpisodeLinks.push(dl);
      else downloadLinks.push(dl);
    });
  });

  if (currentEpisode && currentEpisodeLinks.length > 0) {
    episodes.push({ episode: currentEpisode, links: currentEpisodeLinks });
  }

  // Fallback: direct link extraction from h2/h3 headings
  if (!downloadLinks.length && !episodes.length) {
    const DOWNLOAD_HOSTS = ['hubdrive','hubcloud','gdflix','drivemax','vcloud','mdrive','pixeldrain','drive.google','drive.usercontent','gofile'];
    let curQ = 'HD';
    let curLinks: DLLink[] = [];

    $('h2, h3, h4, a').each((_, el) => {
      const tag = $(el).prop('tagName')?.toLowerCase();
      if (['h2','h3','h4'].includes(tag||'')) {
        if (curLinks.length) downloadLinks.push(...curLinks);
        const text = $(el).text().trim();
        const qM = text.match(/4K|2160p|1080p|720p|480p/i);
        curQ = qM ? qM[0].toUpperCase() : 'HD';
        curLinks = [];
      } else if (tag === 'a') {
        const href = $(el).attr('href') || '';
        if (!href.startsWith('http')) return;
        if (DOWNLOAD_HOSTS.some(h => href.includes(h))) {
          curLinks.push({ quality: curQ, url: href, type: 'BYPASS', size: '' });
        }
      }
    });
    if (curLinks.length) downloadLinks.push(...curLinks);
  }

  return { success: true, data: { title, imageUrl, description, languages: [...langs], downloadLinks, episodes, originalUrl: url } };
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'home';
    const page = searchParams.get("page") || "1";
    const q = searchParams.get('q') || searchParams.get('s') || '';
    const url = searchParams.get('url') || '';

    const baseUrl = await getBaseUrl("UhdMovies");

    if (action === 'search' || q) {
      if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
      return NextResponse.json(await fetchSearch(baseUrl, q, page));
    }
    if (action === 'details' || url) {
      if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
      return NextResponse.json(await fetchDetails(url));
    }
    return NextResponse.json(await fetchHome(baseUrl, page));

  } catch (error) {
    console.error("Error in UhdMovies API:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

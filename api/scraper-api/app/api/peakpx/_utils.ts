export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
];

// Fallback exact cookie from User
const FALLBACK_COOKIE = "SNVvW3iRvZAzshzeuBcnEpnJL6q_CAbqDqy.er8qDU4-1774770706-1.2.1.1-QkIbhtt.v8JlGsZVK7WMoPw2wvWNLicFZWjXFM5S1bvqjwWDLQ_5eTvqhbON_mnQ_I6Eox2qehSw7rFh7C_yLLUrKd4NIBamPpZqyIbawU8EG7wqKkjDulolfz.6CbtaqVdIrItsSZ3LH9xY3fyv0GABXWQ27TsAXjDEy0NBGH2zY_7IA6KpFIuMMEXT1nqlfBR5nrGJNQ5jdzI2E36Qo9x3hESwIRARGCwsNilnRu58bxnLyTd6JGBoApOcJZc_";

export async function fetchPeakPX(targetUrl: string): Promise<string> {
  const scraperApiKey = process.env.SCRAPERAPI_KEY;

  if (scraperApiKey) {
    // 100% Stable ScraperAPI Bypass (Permanent Solution)
    const proxyUrl = `http://api.scraperapi.com?api_key=${scraperApiKey.trim()}&url=${encodeURIComponent(targetUrl)}&keep_headers=true`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("ScraperAPI request failed: " + res.status);
    const text = await res.text();
    if (text.includes("cf-browser-verification") || text.includes("Just a moment")) {
      throw new Error("ScraperAPI got caught by Cloudflare. Check your ScraperAPI plan.");
    }
    return text;
  }

  // Fallback for Local execution with cookie:
  // Using exact cookie & User-Agent to match the user's browser TLS fingerprint temporarily
  const cfClearance = process.env.PEAKPX_CF_CLEARANCE || FALLBACK_COOKIE;
  const ua = process.env.PEAKPX_USER_AGENT || USER_AGENTS[0];
  
  const headers: any = { 
    "User-Agent": ua,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Upgrade-Insecure-Requests": "1"
  };
  
  if (cfClearance) headers["Cookie"] = `cf_clearance=${cfClearance.replace('cf_clearance=','')}`;

  const res = await fetch(targetUrl, { headers });
  const text = await res.text();
  
  if (text.includes("Just a moment") || text.includes("cf-browser-verification") || text.includes("Checking if the site connection is secure")) {
    throw new Error("Cloudflare Blocked (Status 403). Cookie Expired or IP Mismatch! For permanent stable scraping, you MUST use SCRAPERAPI_KEY.");
  }
  
  return text;
}

export interface WallpaperItem {
  id: string;
  slug: string;
  title: string;
  pageUrl: string;
  thumbnailUrl: string;
  imageUrl: string;
  downloadUrl: string;
  width?: number;
  height?: number;
  resolution?: string;
  tags?: string[];
}

export function parseWallpaperGrid(html: string): WallpaperItem[] {
  const items: WallpaperItem[] = [];
  const seen = new Set<string>();

  function addItem(href: string, thumbnailUrl: string, title: string, width?: number, height?: number) {
    if (!thumbnailUrl && !href) return;
    const slugMatch = href.match(/\/en\/(?:hd-wallpaper(?:-desktop)?-)?(.+?)(?:\?|#|$)/i) || href.match(/\/([^/]+)(?:\?|#|$)/);
    let slug = slugMatch ? slugMatch[1] : href.replace(/\//g, "-").replace(/^-/, "");
    if (slug.includes("/")) slug = slug.split("/").pop() || slug;

    if (seen.has(slug)) return;
    seen.add(slug);

    const imageUrl = thumbnailUrl
      ? thumbnailUrl.replace(/-thumbnail(\.\w+)$/, "$1").replace(/\/thumbnail\//g, "/full/").replace(/\?.*$/, "")
      : "";

    const pageUrl = href.startsWith("http") ? href : `https://www.peakpx.com${href}`;

    items.push({
      id: Buffer.from(imageUrl).toString('base64').substring(0, 15) + Math.random(),
      slug,
      title: title || slug.replace(/-/g, " "),
      pageUrl,
      thumbnailUrl,
      imageUrl: imageUrl || thumbnailUrl,
      downloadUrl: imageUrl || thumbnailUrl,
      ...(width && { width }),
      ...(height && { height }),
      ...(width && height ? { resolution: `${width}x${height}` } : {}),
    });
  }

  // Advanced parsing from actual DOM of peakpx!
  const figures = html.match(/<figure[\s\S]*?<\/figure>/gi) || [];
  for (const fig of figures) {
    const hrefMatch = fig.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const imgMatch = fig.match(/data-src=["']([^"']+)["']/i) || fig.match(/<img[^>]+src=["']([^"']+)["']/i);
    const altMatch = fig.match(/alt=["']([^"']*)["']/i);
    const wMatch = fig.match(/\bwidth=["'](\d+)["']/i);
    const hMatch = fig.match(/\bheight=["'](\d+)["']/i);
    addItem(hrefMatch[1], imgMatch ? imgMatch[1] : "", altMatch ? altMatch[1].replace(/ wallpaper$/i, "").trim() : "", wMatch ? parseInt(wMatch[1]) : undefined, hMatch ? parseInt(hMatch[1]) : undefined);
  }

  if (items.length === 0) {
    const lis = html.match(/<li[\s\S]*?<\/li>/gi) || [];
    for (const li of lis) {
      const hrefMatch = li.match(/href=["'](\/en\/[^"']+)["']/i);
      const imgMatch = li.match(/(?:data-src|src)=["'](https?:\/\/w\d+\.peakpx\.com[^"']+)["']/i);
      if (!hrefMatch || !imgMatch) continue;
      const altMatch = li.match(/alt=["']([^"']*)["']/i);
      addItem(hrefMatch[1], imgMatch[1], altMatch ? altMatch[1].replace(/ wallpaper$/i, "").trim() : "");
    }
  }

  return items;
}

export function parsePagination(html: string, currentPage: number): { totalPages: number; hasNextPage: boolean } {
  const pageNums: number[] = [currentPage];
  const pageQueryRegex = /[?&]page=(\d+)/gi;
  const pagePathRegex = /\/page\/(\d+)/gi;
  let m;
  while ((m = pageQueryRegex.exec(html)) !== null) pageNums.push(parseInt(m[1]));
  while ((m = pagePathRegex.exec(html)) !== null) pageNums.push(parseInt(m[1]));
  const maxPage = Math.max(...pageNums);
  const hasNextPage = html.includes('rel="next"') || html.includes('class="next"') || html.includes("next-page") || maxPage > currentPage;
  return { totalPages: maxPage, hasNextPage };
}

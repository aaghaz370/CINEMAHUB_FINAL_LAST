import { NextRequest, NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Universal redirect follower — follows HTTP redirects and JS window.location redirects
 * to find the real download URL behind shortener/bypass pages.
 * 
 * GET /api/extractors/redirect?url=<encoded-url>
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');
  if (!url) return NextResponse.json({ success: false, error: 'url param required' }, { status: 400 });

  try {
    // Step 1: Follow HTTP redirects
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,*/*',
        'Referer': new URL(url).origin,
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    const finalUrl = res.url || url;

    // If it landed on a direct file, return immediately
    if (/\.(mkv|mp4|avi|zip|rar|mp3|m3u8)(\?|$)/i.test(finalUrl)) {
      return NextResponse.json({ success: true, finalUrl, directUrl: finalUrl });
    }

    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) {
      // Binary response = direct CDN link
      return NextResponse.json({ success: true, finalUrl, directUrl: finalUrl });
    }

    const html = await res.text();

    // Step 2: Look for JS redirect patterns
    const jsPatterns = [
      /window\.location\.replace\(['"]([^'"]+)['"]\)/i,
      /window\.location\.href\s*=\s*['"]([^'"]+)['"]/i,
      /window\.location\s*=\s*['"]([^'"]+)['"]/i,
      /location\.assign\(['"]([^'"]+)['"]\)/i,
      /setTimeout\([^,]+,\s*\d+\);\s*window\.location\.href\s*=\s*['"]([^'"]+)['"]/i,
    ];
    for (const rx of jsPatterns) {
      const m = rx.exec(html);
      if (m?.[1]?.startsWith('http')) {
        return NextResponse.json({ success: true, finalUrl: m[1], directUrl: m[1] });
      }
    }

    // Step 3: Look for "Download Here" / "Direct Link" anchor tags
    const linkPatterns = [
      /href=["']([^"']*hubcloud[^"']+)["']/i,
      /href=["']([^"']*hubdrive[^"']+)["']/i,
      /href=["']([^"']*vcloud[^"']+)["']/i,
      /href=["']([^"']*pixeldrain[^"']+)["']/i,
      /href=["']([^"']*gofile\.io\/[^"']+)["']/i,
      /href=["']([^"']*buzzheavier[^"']+)["']/i,
    ];
    for (const rx of linkPatterns) {
      const m = rx.exec(html);
      if (m?.[1]) return NextResponse.json({ success: true, finalUrl: m[1], directUrl: m[1] });
    }

    // Return the final URL after redirects even if we couldn't parse a link
    return NextResponse.json({ success: true, finalUrl, directUrl: finalUrl, note: 'Landing page URL returned' });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Redirect follow failed' }, { status: 500 });
  }
}

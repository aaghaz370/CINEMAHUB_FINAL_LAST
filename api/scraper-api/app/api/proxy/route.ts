import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const referer = req.nextUrl.searchParams.get("req_referer") || "https://themoviebox.org/";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const fetchHeaders: any = {
      'Referer': referer,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
    };
    if (req.headers.has('range')) {
       fetchHeaders['Range'] = req.headers.get('range');
    }

    const response = await fetch(url, {
      headers: fetchHeaders
    });

    if (!response.ok) {
      return NextResponse.json({ error: `upstream status ${response.status}`, url }, { status: 500 });
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('mpegurl') || url.toLowerCase().includes('.m3u8')) {
        let text = await response.text();
        const baseUrlList = url.split('?')[0].split('/');
        baseUrlList.pop();
        const baseUrl = baseUrlList.join('/');
        
        text = text.replace(/^(?!#)(.+)$/gm, (match, p1) => {
            if (!p1.trim()) return match;
            const absoluteUrl = p1.startsWith('http') ? p1 : (p1.startsWith('/') ? new URL(p1, url).toString() : `${baseUrl}/${p1}`);
            return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}&req_referer=${encodeURIComponent(referer)}`;
        });

        text = text.replace(/URI=["']([^"']+)["']/g, (match, p1) => {
            const absoluteUrl = p1.startsWith('http') ? p1 : (p1.startsWith('/') ? new URL(p1, url).toString() : `${baseUrl}/${p1}`);
            return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}&req_referer=${encodeURIComponent(referer)}"`;
        });

        const headers = new Headers();
        headers.set('Content-Type', 'application/vnd.apple.mpegurl');
        return new NextResponse(text, { status: response.status, headers });
    }

    const headers = new Headers();
    if (response.headers.has('content-type')) headers.set('Content-Type', response.headers.get('content-type')!);
    if (response.headers.has('content-length')) headers.set('Content-Length', response.headers.get('content-length')!);
    if (response.headers.has('accept-ranges')) headers.set('Accept-Ranges', response.headers.get('accept-ranges')!);
    if (response.headers.has('content-range')) headers.set('Content-Range', response.headers.get('content-range')!);

    return new NextResponse(response.body, { status: response.status, headers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to proxy" }, { status: 500 });
  }
}

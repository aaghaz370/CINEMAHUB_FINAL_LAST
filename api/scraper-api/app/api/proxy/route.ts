import { NextRequest, NextResponse } from "next/server";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const referer = req.nextUrl.searchParams.get("req_referer") || "https://themoviebox.org/";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const fetchHeaders: any = {
      'Referer': referer,
      'Origin': (() => { try { return new URL(referer).origin; } catch { return 'https://themoviebox.org'; } })(),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };
    if (req.headers.has('range')) {
       fetchHeaders['Range'] = req.headers.get('range');
    }

    const response = await fetch(url, { headers: fetchHeaders, redirect: 'follow' });

    if (!response.ok) {
      return NextResponse.json({ error: `upstream status ${response.status}`, url }, { status: response.status, headers: CORS });
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

        text = text.replace(/URI=['"]([^'"]+)['"]/g, (match, p1) => {
            const absoluteUrl = p1.startsWith('http') ? p1 : (p1.startsWith('/') ? new URL(p1, url).toString() : `${baseUrl}/${p1}`);
            return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}&req_referer=${encodeURIComponent(referer)}"`;
        });

        const headers = new Headers({ ...CORS, 'Content-Type': 'application/vnd.apple.mpegurl' });
        return new NextResponse(text, { status: response.status, headers });
    }

    const headers = new Headers(CORS);
    if (response.headers.has('content-type')) headers.set('Content-Type', response.headers.get('content-type')!);
    if (response.headers.has('content-length')) headers.set('Content-Length', response.headers.get('content-length')!);
    if (response.headers.has('accept-ranges')) headers.set('Accept-Ranges', response.headers.get('accept-ranges')!);
    if (response.headers.has('content-range')) headers.set('Content-Range', response.headers.get('content-range')!);

    return new NextResponse(response.body, { status: response.status, headers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to proxy" }, { status: 500, headers: CORS });
  }
}

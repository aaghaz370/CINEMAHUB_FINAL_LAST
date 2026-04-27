import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // max allowed for streaming

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return new NextResponse('Missing URL', { status: 400 });
  }

  try {
    const headers = new Headers();
    // Some providers require a specific referer or User-Agent
    const isMod = url.includes('mod') || url.includes('hubcloud') || url.includes('flix');
    const isTheMovie = url.includes('themovie') || url.includes('netmirror');
    
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    headers.set('Accept', '*/*');
    
    // Add origin/referer based on the URL
    if (url.includes('themoviebox')) {
      headers.set('Referer', 'https://themoviebox.org/');
      headers.set('Origin', 'https://themoviebox.org');
    } else if (url.includes('netmirror')) {
      headers.set('Referer', 'https://netmirror.app/');
    }

    // Forward range requests if any (essential for video seeking)
    const range = request.headers.get('range');
    if (range) {
      headers.set('range', range);
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
      // Disable cache for streaming
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Proxy failed for ${url} with status ${response.status}`);
      return new NextResponse(`Error proxying: ${response.status}`, { status: response.status });
    }

    // If it's an m3u8 playlist, we need to rewrite the relative URLs to absolute URLs
    // and ideally route them back through our proxy
    const contentType = response.headers.get('Content-Type') || '';
    const isM3U8 = contentType.includes('mpegurl') || contentType.includes('m3u8');

    if (isM3U8) {
      const text = await response.text();
      const baseUrl = new URL(url);
      const lines = text.split('\n');
      
      const rewrittenLines = lines.map(line => {
        const trimmed = line.trim();
        // Skip empty lines or comments (except URI tags which might have URLs)
        if (!trimmed || (trimmed.startsWith('#') && !trimmed.includes('URI='))) {
          return line;
        }

        // Handle URI="relative/path.key" inside tags
        if (trimmed.startsWith('#') && trimmed.includes('URI=')) {
          return line.replace(/URI="(.*?)"/g, (match, uri) => {
            if (uri.startsWith('http://') || uri.startsWith('https://')) {
              return `URI="/api/proxy?url=${encodeURIComponent(uri)}"`;
            }
            const absoluteUrl = new URL(uri, baseUrl.href).href;
            return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
          });
        }

        // Handle actual TS/M3U8 URLs
        if (!trimmed.startsWith('#')) {
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return `/api/proxy?url=${encodeURIComponent(trimmed)}`;
          }
          const absoluteUrl = new URL(trimmed, baseUrl.href).href;
          return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
        }
        
        return line;
      });

      const rewrittenM3U8 = rewrittenLines.join('\n');
      
      // Update proxy headers
      const proxyHeaders = new Headers(response.headers);
      proxyHeaders.delete('Access-Control-Allow-Origin');
      proxyHeaders.delete('Access-Control-Allow-Credentials');
      proxyHeaders.delete('Content-Security-Policy');
      proxyHeaders.delete('X-Frame-Options');
      proxyHeaders.set('Access-Control-Allow-Origin', '*');
      proxyHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      if (contentType) proxyHeaders.set('Content-Type', contentType);
      proxyHeaders.set('Content-Length', rewrittenM3U8.length.toString());

      return new NextResponse(rewrittenM3U8, {
        status: response.status,
        statusText: response.statusText,
        headers: proxyHeaders,
      });
    }

    // For standard media files (.mp4, .ts), stream directly
    const proxyHeaders = new Headers(response.headers);
    proxyHeaders.delete('Access-Control-Allow-Origin');
    proxyHeaders.delete('Access-Control-Allow-Credentials');
    proxyHeaders.delete('Content-Security-Policy');
    proxyHeaders.delete('X-Frame-Options');

    proxyHeaders.set('Access-Control-Allow-Origin', '*');
    proxyHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    
    if (contentType) proxyHeaders.set('Content-Type', contentType);

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: proxyHeaders,
    });
  } catch (error: any) {
    console.error('Video proxy error:', error);
    return new NextResponse('Proxy error: ' + error.message, { status: 500 });
  }
}

// Support OPTIONS for preflight requests
export async function OPTIONS() {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Range');
  return new NextResponse(null, { status: 204, headers });
}

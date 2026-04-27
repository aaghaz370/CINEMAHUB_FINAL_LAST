import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: [
    '10.65.223.189',
    '192.168.1.4',
    '192.168.1.1',
  ],
  async rewrites() {
    // In production there's no local aggregator — skip entirely
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    // In dev: proxy to local aggregator BUT exclude our own Next.js API routes
    // Regex: match /api/* EXCEPT /api/home, /api/trending, /api/search
    return [
      {
        source: '/api/:path((?!home|trending|search|media).*)',
        destination: 'http://127.0.0.1:9091/api/:path*',
      }
    ];
  }
};

export default nextConfig;

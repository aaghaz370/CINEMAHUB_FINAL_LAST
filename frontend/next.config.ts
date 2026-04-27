import type { NextConfig } from "next";

// Internal API routes handled by Next.js itself (not proxied)
const INTERNAL_API_PATHS = ['/api/home', '/api/trending', '/api/search'];

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: [
    '10.65.223.189',
    '192.168.1.4',
    '192.168.1.1',
  ],
  async rewrites() {
    // Only proxy to local aggregator during development
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:9091/api/:path*',
        // In dev we still need to skip our own Next.js API routes
      }
    ];
  }
};

export default nextConfig;

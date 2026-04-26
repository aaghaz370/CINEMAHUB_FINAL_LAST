import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Allow mobile devices on local network to access dev server
  allowedDevOrigins: [
    '10.65.223.189',
    '192.168.1.4',
    '192.168.1.1',
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:9091/api/:path*' // Proxy to Aggregator API
      }
    ];
  }
};

export default nextConfig;

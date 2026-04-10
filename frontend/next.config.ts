import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Costa Rican supermarkets
      { hostname: 'epa.cr' },
      { hostname: 'www.epa.cr' },
      { hostname: 'novex.cr' },
      { hostname: 'www.novex.cr' },
      { hostname: 'ellagar.cr' },
      { hostname: 'www.ellagar.cr' },
      { hostname: 'colono.cr' },
      { hostname: 'www.colono.cr' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env['NEXT_PUBLIC_API_URL']}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

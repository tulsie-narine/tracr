import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    domains: [], // Add external image domains if needed in future
  },
  logging: {
    fetches: {
      fullUrl: true, // Better debugging in production
    },
  },
  // Uncomment for Docker deployment (not needed for Vercel)
  // output: 'standalone',
  
  // Experimental features (Next.js 15+)
  experimental: {
    // typedRoutes: true, // Enable type-safe routing if desired
  },
};

export default nextConfig;

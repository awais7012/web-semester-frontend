import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // Local development (path-based and subdomain mode)
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "**.funroad.local" },
      { protocol: "http", hostname: "funroad.local" },
      // Production
      { protocol: "https", hostname: "**.funroad.com" },
      { protocol: "https", hostname: "funroad.com" },
      // Render backend (product image uploads)
      { protocol: "https", hostname: "**.onrender.com" },
      // Cloudinary (production image uploads)
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Vercel Blob Storage (used for media uploads)
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;

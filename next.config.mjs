import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Keep @/ imports resolving from the repository root on all build hosts.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': projectRoot,
    };
    return config;
  },
  images: {
    // Supabase Storage public URLs are optimized by next/image.
    // Other hosts (pasted image URLs) are rendered unoptimized by <ProductImage>, so they still work.
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  poweredByHeader: false,
};

export default nextConfig;

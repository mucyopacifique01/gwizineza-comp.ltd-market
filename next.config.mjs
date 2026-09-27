/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Supabase Storage public URLs are optimized by next/image.
    // Other hosts (pasted image URLs) are rendered unoptimized by <ProductImage>, so they still work.
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  poweredByHeader: false,
};

export default nextConfig;

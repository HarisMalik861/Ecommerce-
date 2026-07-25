/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Default is 10MB; dataset CSV uploads need up to 100MB.
    proxyClientMaxBodySize: "100mb",
  },
}

export default nextConfig

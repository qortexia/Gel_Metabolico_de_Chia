/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const hub = process.env.HUB_URL;
    return hub ? [{ source: '/api/e/:path*', destination: `${hub}/api/:path*` }] : [];
  },
};

module.exports = nextConfig;

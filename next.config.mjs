/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/n8n/:path*',
        destination: 'https://appn8n-n8n.lx6zon.easypanel.host/webhook/:path*',
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/n8n/:path*',
        destination: 'https://n8n.easypanel.host/webhook/:path*',
      },
    ];
  },
};

export default nextConfig;

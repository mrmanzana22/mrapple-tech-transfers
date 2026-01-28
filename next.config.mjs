/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Solo GET endpoints que aún no tienen API route
      // Los POST (tech-transferir, tech-cambiar-estado, tech-transferir-reparacion)
      // ahora tienen API routes con validación de ownership
      {
        source: '/api/n8n/tech-telefonos',
        destination: 'https://appn8n-n8n.lx6zon.easypanel.host/webhook/tech-telefonos',
      },
      {
        source: '/api/n8n/tech-reparaciones',
        destination: 'https://appn8n-n8n.lx6zon.easypanel.host/webhook/tech-reparaciones',
      },
    ];
  },
};

export default nextConfig;

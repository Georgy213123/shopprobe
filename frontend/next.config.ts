import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  // Адрес API читается при сборке: rewrites попадают в манифест маршрутов.
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: `${process.env.API_URL ?? 'http://localhost:8201'}/api/:path*`,
    },
  ],
};

export default config;

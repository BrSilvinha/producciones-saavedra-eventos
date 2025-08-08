/** @type {import('next').NextConfig} */
const nextConfig = {
  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/api',
    NEXT_PUBLIC_APP_NAME: 'Producciones Saavedra',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  },
  
  // Configuración de imágenes
  images: {
    domains: [
      'localhost', 
      'cloudinary.com',
      '*.ngrok-free.app',
      '237af844b109.ngrok-free.app',
      '192.168.1.52',
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Headers optimizados para desarrollo
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization, Accept, Origin, ngrok-skip-browser-warning',
          },
        ],
      },
    ]
  },
  
  // Configuración de webpack
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
  
  // Configuración permisiva para desarrollo
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // SIN rewrites para evitar problemas
  async rewrites() {
    return []
  },
  
  // Configuración experimental
  experimental: {
    serverComponentsExternalPackages: [],
  },
  
  output: 'standalone',
  compress: true,
  swcMinify: true,
}

module.exports = nextConfig
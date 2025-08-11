/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ CRÍTICO: Output standalone para Railway
  output: 'standalone',
  
  // Variables de entorno públicas
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    NEXT_PUBLIC_APP_NAME: 'Producciones Saavedra',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  },
  
  // Configuración de imágenes
  images: {
    domains: ['localhost', 'cloudinary.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Headers básicos
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ]
  },
  
  // Configuración estable para producción
  typescript: {
    ignoreBuildErrors: false,
  },
  
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Configuración de compilación
  swcMinify: true,
  reactStrictMode: true,
  
  // Configuración de páginas
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Configuración de redirects
  async redirects() {
    return []
  },
  
  // Configuración de rewrites
  async rewrites() {
    return []
  },
}

module.exports = nextConfig
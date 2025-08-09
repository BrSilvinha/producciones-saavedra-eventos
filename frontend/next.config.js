/** @type {import('next').NextConfig} */
const nextConfig = {
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
  
  // ✅ ELIMINAMOS experimental para evitar conflictos
  // experimental: {
  //   serverComponentsExternalPackages: [],
  // },
  
  // Configuración estable para desarrollo
  typescript: {
    ignoreBuildErrors: false, // Cambiado a false para mejor debugging
  },
  
  eslint: {
    ignoreDuringBuilds: false, // Cambiado a false para mejor debugging
  },
  
  // Configuración de compilación ESTABLE
  swcMinify: true,
  reactStrictMode: true, // Activado para mejor debugging
  
  // Configuración de páginas
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // ✅ SIN configuración de webpack personalizada que cause conflictos
  // webpack: (config, { dev, isServer }) => {
  //   return config
  // },
  
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
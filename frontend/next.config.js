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
  
  // Configuración de webpack optimizada
  webpack: (config, { dev, isServer }) => {
    // Optimizaciones para desarrollo
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      }
      
      // Configuración de chunks más estable
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
          },
        },
      }
    }
    
    return config
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
  
  // Configuración experimental actualizada
  experimental: {
    // Características estables
    serverComponentsExternalPackages: [],
  },
  
  // Configuración de desarrollo más permisiva
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Configuración de compilación
  swcMinify: true,
  reactStrictMode: false, // Temporalmente para evitar errores
  
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
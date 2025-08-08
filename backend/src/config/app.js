require('dotenv').config();

const config = {
  // Configuración del servidor
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost'
  },

  // Configuración de la base de datos
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'eventos_saavedra',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
    dialect: 'postgres',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },

  // Configuración JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'producciones_saavedra_jwt_secret_key_2024_muy_seguro',
    expiresIn: '30d'
  },

  // Configuración CORS
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },

  // Límites de la aplicación
  limits: {
    maxEventsPerQuery: 100,
    maxTicketsPerGeneration: 100,
    maxTicketsPerType: 10000,
    maxUploadSize: '10mb',
    maxEventsActive: 50
  },

  // Configuración QR
  qr: {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    width: 256,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  },

  // Configuración de paginación por defecto
  pagination: {
    defaultLimit: 50,
    maxLimit: 100
  },

  // URLs y paths
  paths: {
    uploads: process.env.UPLOADS_PATH || './uploads',
    logs: process.env.LOGS_PATH || './logs'
  },

  // Configuración de empresa
  company: {
    name: 'Producciones Saavedra',
    timezone: 'America/Lima',
    currency: 'PEN',
    locale: 'es-PE'
  },

  // Configuración de seguridad
  security: {
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutTime: 15 * 60 * 1000, // 15 minutos
    passwordMinLength: 8
  }
};

// Validar configuración requerida
const requiredConfig = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

const missingConfig = requiredConfig.filter(key => !process.env[key]);

if (missingConfig.length > 0 && process.env.NODE_ENV === 'production') {
  console.error('❌ Configuración faltante:', missingConfig.join(', '));
  process.exit(1);
}

module.exports = config;
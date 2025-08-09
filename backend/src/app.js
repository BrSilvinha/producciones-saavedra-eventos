const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Importar rutas
const eventRoutes = require('./routes/eventRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const ticketTypeRoutes = require('./routes/ticketTypeRoutes');
const qrRoutes = require('./routes/qrRoutes');

// Crear aplicación Express
const app = express();

// Configurar proxy trust
app.set('trust proxy', true);

// Helmet básico para desarrollo
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false
}));

// CORS LIMPIO Y PERMISIVO PARA DESARROLLO
app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 CORS Request from origin:', origin);
    
    // Permitir requests sin origin (Postman, apps móviles, etc.)
    if (!origin) {
      console.log('✅ CORS: Sin origin - permitido');
      return callback(null, true);
    }
    
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ];
    
    // En desarrollo, ser muy permisivo
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 CORS: Modo desarrollo - permitiendo', origin);
      return callback(null, true);
    }
    
    // Verificar origen exacto
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origin permitido -', origin);
      return callback(null, true);
    }
    
    console.log('❌ CORS: Origin bloqueado -', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'User-Agent',
    'Cache-Control',
    'X-Client-Info'
    // ✅ SIN ngrok-skip-browser-warning
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Date',
    'Server',
    'X-Powered-By'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Headers CORS adicionales limpios
app.use((req, res, next) => {
  const origin = req.get('Origin');
  
  // Permitir todos los orígenes en desarrollo
  if (process.env.NODE_ENV === 'development') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else if (origin) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Client-Info, Cache-Control');
  res.header('Access-Control-Max-Age', '86400');
  
  // Log limpio para debug
  if (process.env.NODE_ENV === 'development') {
    console.log(`🌐 ${req.method} ${req.path} - Origin: ${origin || 'none'} - IP: ${req.ip}`);
  }
  
  // Responder a OPTIONS
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request respondido para', origin);
    return res.status(200).end();
  }
  
  next();
});

// Middleware básico
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas de salud LIMPIAS
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Sistema de Gestión de Eventos - Producciones Saavedra',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    cors: 'enabled',
    environment: process.env.NODE_ENV || 'development',
    network: {
      host: req.get('host'),
      origin: req.get('origin'),
      userAgent: req.get('user-agent'),
      clientIP: req.ip,
      forwarded: req.get('x-forwarded-for')
    }
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando correctamente',
    clientIP: req.ip,
    origin: req.get('origin'),
    timestamp: new Date().toISOString(),
    cors: 'working'
  });
});

// Configurar rutas de la API
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/ticket-types', ticketTypeRoutes);
app.use('/api/qr', qrRoutes);

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error en la aplicación:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// Ruta catch-all
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`,
    availableRoutes: [
      'GET /api/health',
      'GET /api/test',
      'GET /api/events',
      'POST /api/events',
      'POST /api/tickets/generate',
      'POST /api/qr/validate'
    ]
  });
});

module.exports = app;
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

// Configurar proxy trust para obtener IPs reales
app.set('trust proxy', true);

// HELMET MUY PERMISIVO PARA DESARROLLO
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false
}));

// CORS ESPECÍFICO PARA TU IP - SOLUCIÓN AL ERROR
app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 CORS Request from origin:', origin);
    
    // Permitir requests sin origin (apps móviles, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: No origin - permitido');
      return callback(null, true);
    }
    
    // Lista específica de orígenes permitidos - INCLUYE TU IP
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.1.52:3000',    // TU IP ESPECÍFICA
      'http://192.168.1.1:3000',     // Router común
      'http://192.168.0.1:3000',     // Router común alternativo
      'http://10.0.0.1:3000',        // Red local alternativa
      'https://b20e100fb88b.ngrok-free.app',
      'https://f6b9099e2000.ngrok-free.app'
    ];
    
    // Patrones adicionales para redes locales
    const allowedPatterns = [
      /^http:\/\/192\.168\.\d+\.\d+:3000$/,     // Cualquier 192.168.x.x:3000
      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,      // Cualquier 10.x.x.x:3000
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:3000$/, // 172.16-31.x.x:3000
      /^https:\/\/.*\.ngrok-free\.app$/,         // Cualquier ngrok
      /^https:\/\/.*\.ngrok\.io$/                // Ngrok legacy
    ];
    
    // Verificar origen exacto
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origin exacto permitido -', origin);
      return callback(null, true);
    }
    
    // Verificar patrones
    const isPatternAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    if (isPatternAllowed) {
      console.log('✅ CORS: Pattern permitido -', origin);
      return callback(null, true);
    }
    
    // En desarrollo, permitir TODO
    if (process.env.NODE_ENV === 'development') {
      console.log('🔓 CORS: Modo desarrollo - permitiendo', origin);
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
    'ngrok-skip-browser-warning',
    'X-Requested-With',
    'Accept',
    'Origin',
    'User-Agent',
    'DNT',
    'Cache-Control',
    'X-Mx-ReqToken',
    'Keep-Alive',
    'If-Modified-Since',
    'X-Client-Info'
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

// Middleware adicional para headers CORS manuales
app.use((req, res, next) => {
  const origin = req.get('Origin');
  
  // Agregar headers CORS manualmente para asegurar compatibilidad
  if (origin) {
    // Lista de orígenes específicos permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.1.52:3000',
      'http://192.168.1.1:3000',
      'http://192.168.0.1:3000',
      'http://10.0.0.1:3000'
    ];
    
    if (allowedOrigins.includes(origin) || 
        origin.includes('ngrok') || 
        /^http:\/\/192\.168\.\d+\.\d+:3000$/.test(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      console.log('🔧 CORS Manual: Set origin to', origin);
    }
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning, X-Requested-With, Accept, Origin, X-Client-Info');
  res.header('Access-Control-Max-Age', '86400');
  
  // Log para debug
  if (process.env.NODE_ENV === 'development') {
    console.log(`🌐 ${req.method} ${req.path} - Origin: ${origin || 'none'} - IP: ${req.ip}`);
  }
  
  // Responder inmediatamente a OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request respondido para', origin);
    return res.status(200).end();
  }
  
  next();
});

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas de salud con headers específicos
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Sistema de Gestión de Eventos - Producciones Saavedra',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    cors: 'enabled',
    ngrok: 'compatible',
    network: {
      host: req.get('host'),
      origin: req.get('origin'),
      userAgent: req.get('user-agent'),
      ngrokHeader: req.get('ngrok-skip-browser-warning'),
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
    cors: 'working',
    headers: {
      origin: req.get('origin'),
      userAgent: req.get('user-agent'),
      ngrokBypass: req.get('ngrok-skip-browser-warning')
    }
  });
});

// Ruta específica para test de CORS
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS está funcionando correctamente',
    origin: req.get('origin'),
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    allowedOrigins: [
      'http://localhost:3000',
      'http://192.168.1.52:3000',
      'ngrok domains'
    ]
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

// Ruta catch-all para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`,
    availableRoutes: [
      'GET /api/health',
      'GET /api/test',
      'GET /api/cors-test',
      'GET /api/events',
      'POST /api/events',
      'GET /api/events/:id',
      'POST /api/tickets/generate',
      'POST /api/qr/validate'
    ]
  });
});

module.exports = app;
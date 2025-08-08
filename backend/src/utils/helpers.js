const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

/**
 * Generar un token JWT para un ticket
 */
const generateTicketToken = (ticketData) => {
  const payload = {
    ticketId: ticketData.id,
    eventId: ticketData.eventId,
    ticketTypeId: ticketData.ticketTypeId,
    eventName: ticketData.eventName,
    ticketTypeName: ticketData.ticketTypeName,
    price: ticketData.price,
    generatedAt: new Date().toISOString()
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '30d' // Los tokens expiran en 30 días
  });
};

/**
 * Verificar un token JWT de ticket
 */
const verifyTicketToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};

/**
 * Generar código QR a partir de un token
 */
const generateQRCode = async (token, options = {}) => {
  const defaultOptions = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 256,
    ...options
  };
  
  try {
    return await QRCode.toDataURL(token, defaultOptions);
  } catch (error) {
    throw new Error('Error al generar código QR');
  }
};

/**
 * Formatear fecha para mostrar
 */
const formatDate = (date, includeTime = true) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Lima'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return new Date(date).toLocaleDateString('es-PE', options);
};

/**
 * Validar UUID
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Sanitizar string para evitar inyecciones
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remover < y >
    .substring(0, 1000); // Limitar longitud
};

/**
 * Generar mensaje de resultado de escaneo
 */
const generateScanMessage = (scanResult, ticketType, eventName) => {
  const isVip = ticketType?.toLowerCase().includes('vip');
  
  switch (scanResult) {
    case 'valid':
      return isVip 
        ? `✅ ENTRADA VIP VÁLIDA - ${eventName}`
        : `✅ ENTRADA GENERAL VÁLIDA - ${eventName}`;
        
    case 'used':
      return isVip 
        ? `❌ ENTRADA VIP YA UTILIZADA - ${eventName}`
        : `❌ ENTRADA GENERAL YA UTILIZADA - ${eventName}`;
        
    case 'invalid':
      return '❌ CÓDIGO QR INVÁLIDO O FALSIFICADO';
      
    case 'wrong_event':
      return '🚫 QR NO VÁLIDO PARA ESTE EVENTO';
      
    default:
      return '❌ ERROR EN LA VALIDACIÓN';
  }
};

/**
 * Calcular estadísticas de tickets
 */
const calculateTicketStats = (tickets) => {
  const stats = {
    total: tickets.length,
    generated: 0,
    scanned: 0,
    expired: 0
  };
  
  tickets.forEach(ticket => {
    switch (ticket.status) {
      case 'generated':
        stats.generated++;
        break;
      case 'scanned':
        stats.scanned++;
        break;
      case 'expired':
        stats.expired++;
        break;
    }
  });
  
  return stats;
};

/**
 * Validar estado de evento
 */
const isValidEventStatus = (status) => {
  return ['draft', 'active', 'finished'].includes(status);
};

/**
 * Validar estado de ticket
 */
const isValidTicketStatus = (status) => {
  return ['generated', 'scanned', 'expired'].includes(status);
};

/**
 * Validar resultado de escaneo
 */
const isValidScanResult = (result) => {
  return ['valid', 'used', 'invalid', 'wrong_event'].includes(result);
};

/**
 * Formatear precio en soles peruanos
 */
const formatPrice = (price) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN'
  }).format(price);
};

/**
 * Generar respuesta estándar de API
 */
const createApiResponse = (success, message, data = null, errors = null, pagination = null) => {
  const response = {
    success,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  if (errors) {
    response.errors = errors;
  }
  
  if (pagination) {
    response.pagination = pagination;
  }
  
  response.timestamp = new Date().toISOString();
  
  return response;
};

/**
 * Calcular paginación
 */
const calculatePagination = (total, limit, offset) => {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    limit: parseInt(limit),
    offset: parseInt(offset),
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

/**
 * Validar email básico
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generar código de referencia único para ticket
 */
const generateTicketReference = () => {
  const prefix = 'PS'; // Producciones Saavedra
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  return `${prefix}-${timestamp}-${random}`;
};

module.exports = {
  generateTicketToken,
  verifyTicketToken,
  generateQRCode,
  formatDate,
  isValidUUID,
  sanitizeString,
  generateScanMessage,
  calculateTicketStats,
  isValidEventStatus,
  isValidTicketStatus,
  isValidScanResult,
  formatPrice,
  createApiResponse,
  calculatePagination,
  isValidEmail,
  generateTicketReference
};
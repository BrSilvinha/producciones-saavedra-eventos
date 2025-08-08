// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = [];
  
  // Validación manual sin express-validator para evitar dependencias adicionales
  if (req.validationErrors && req.validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: req.validationErrors
    });
  }
  next();
};

// Validaciones para eventos
const validateEvent = (req, res, next) => {
  const errors = [];
  const { name, date, description, location, status } = req.body;
  
  // Validar nombre
  if (!name || typeof name !== 'string') {
    errors.push({ field: 'name', message: 'El nombre del evento es obligatorio' });
  } else if (name.length < 2 || name.length > 255) {
    errors.push({ field: 'name', message: 'El nombre debe tener entre 2 y 255 caracteres' });
  }
  
  // Validar fecha
  if (!date) {
    errors.push({ field: 'date', message: 'La fecha del evento es obligatoria' });
  } else {
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      errors.push({ field: 'date', message: 'La fecha debe tener un formato válido' });
    } else if (eventDate < new Date()) {
      errors.push({ field: 'date', message: 'La fecha del evento no puede ser en el pasado' });
    }
  }
  
  // Validar descripción (opcional)
  if (description && description.length > 2000) {
    errors.push({ field: 'description', message: 'La descripción no puede exceder 2000 caracteres' });
  }
  
  // Validar ubicación (opcional)
  if (location && location.length > 255) {
    errors.push({ field: 'location', message: 'La ubicación no puede exceder 255 caracteres' });
  }
  
  // Validar estado (opcional)
  if (status && !['draft', 'active', 'finished'].includes(status)) {
    errors.push({ field: 'status', message: 'El estado debe ser draft, active o finished' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }
  
  next();
};

// Validaciones para tipos de tickets
const validateTicketType = (req, res, next) => {
  const errors = [];
  const { eventId, name, price, quantity } = req.body;
  
  // Validar eventId
  if (!eventId || typeof eventId !== 'string') {
    errors.push({ field: 'eventId', message: 'El eventId es obligatorio' });
  }
  
  // Validar nombre
  if (!name || typeof name !== 'string') {
    errors.push({ field: 'name', message: 'El nombre del tipo de ticket es obligatorio' });
  } else if (name.length < 2 || name.length > 100) {
    errors.push({ field: 'name', message: 'El nombre debe tener entre 2 y 100 caracteres' });
  }
  
  // Validar precio (opcional)
  if (price !== undefined && (isNaN(price) || price < 0)) {
    errors.push({ field: 'price', message: 'El precio debe ser un número positivo' });
  }
  
  // Validar cantidad
  if (!quantity || isNaN(quantity) || quantity < 1 || quantity > 10000) {
    errors.push({ field: 'quantity', message: 'La cantidad debe ser un número entero entre 1 y 10000' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }
  
  next();
};

// Validaciones para generación de tickets
const validateTicketGeneration = (req, res, next) => {
  const errors = [];
  const { eventId, ticketTypeId, quantity } = req.body;
  
  // Validar eventId
  if (!eventId || typeof eventId !== 'string') {
    errors.push({ field: 'eventId', message: 'El eventId es obligatorio' });
  }
  
  // Validar ticketTypeId
  if (!ticketTypeId || typeof ticketTypeId !== 'string') {
    errors.push({ field: 'ticketTypeId', message: 'El ticketTypeId es obligatorio' });
  }
  
  // Validar cantidad (opcional, por defecto 1)
  const ticketQuantity = quantity || 1;
  if (isNaN(ticketQuantity) || ticketQuantity < 1 || ticketQuantity > 100) {
    errors.push({ field: 'quantity', message: 'La cantidad debe ser un número entero entre 1 y 100' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }
  
  next();
};

// Validaciones para validación de QR
const validateQRValidation = (req, res, next) => {
  const errors = [];
  const { qrToken, eventId } = req.body;
  
  // Validar qrToken
  if (!qrToken || typeof qrToken !== 'string') {
    errors.push({ field: 'qrToken', message: 'El token QR es obligatorio' });
  }
  
  // Validar eventId
  if (!eventId || typeof eventId !== 'string') {
    errors.push({ field: 'eventId', message: 'El eventId es obligatorio' });
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }
  
  next();
};

// Validaciones para parámetros UUID
const validateUUIDParam = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!value || !uuidRegex.test(value)) {
      return res.status(400).json({
        success: false,
        message: `El parámetro ${paramName} debe ser un UUID válido`,
        errors: [{ field: paramName, message: 'UUID inválido' }]
      });
    }
    
    next();
  };
};

// Validaciones para parámetros de paginación
const validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;
  
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro limit debe ser un número entre 1 y 100'
    });
  }
  
  if (offset && (isNaN(offset) || parseInt(offset) < 0)) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro offset debe ser un número positivo'
    });
  }
  
  next();
};

module.exports = {
  handleValidationErrors,
  validateEvent,
  validateTicketType,
  validateTicketGeneration,
  validateQRValidation,
  validateUUIDParam,
  validatePagination
};
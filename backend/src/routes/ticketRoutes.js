const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { Event, TicketType, Ticket, ScanLog } = require('../models');

// Configuración QR MÁS GRANDE
const QR_CONFIG = {
  errorCorrectionLevel: 'M',
  type: 'image/png',
  quality: 0.95,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  width: 512, // ✅ MÁS GRANDE - antes era 256
  scale: 8    // ✅ ESCALA MAYOR para mejor definición
};

// POST /api/tickets/generate - Generar tickets para un evento
router.post('/generate', async (req, res) => {
  try {
    const { eventId, ticketTypeId, quantity = 1 } = req.body;
    
    if (!eventId || !ticketTypeId) {
      return res.status(400).json({
        success: false,
        message: 'eventId y ticketTypeId son obligatorios'
      });
    }
    
    if (quantity < 1 || quantity > 100) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser entre 1 y 100 tickets'
      });
    }
    
    // Verificar que el evento y tipo de ticket existan
    const [event, ticketType] = await Promise.all([
      Event.findByPk(eventId),
      TicketType.findByPk(ticketTypeId)
    ]);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    if (!ticketType) {
      return res.status(404).json({
        success: false,
        message: 'Tipo de ticket no encontrado'
      });
    }
    
    // Verificar que el tipo de ticket pertenece al evento
    if (ticketType.event_id !== eventId) {
      return res.status(400).json({
        success: false,
        message: 'El tipo de ticket no pertenece a este evento'
      });
    }
    
    // Verificar disponibilidad
    if (ticketType.available < quantity) {
      return res.status(400).json({
        success: false,
        message: `Solo hay ${ticketType.available} tickets disponibles de tipo ${ticketType.name}`
      });
    }
    
    // No generar tickets para eventos terminados
    if (event.status === 'finished') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden generar tickets para un evento terminado'
      });
    }
    
    // Generar tickets
    const tickets = [];
    const qrCodes = [];
    
    for (let i = 0; i < quantity; i++) {
      // Crear JWT token único
      const ticketId = uuidv4();
      const jwtPayload = {
        ticketId,
        eventId,
        ticketTypeId,
        eventName: event.name,
        ticketTypeName: ticketType.name,
        price: ticketType.price,
        generatedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      const qrToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
        expiresIn: '30d' // Los tickets expiran en 30 días
      });
      
      // Crear ticket en la base de datos
      const ticket = await Ticket.create({
        id: ticketId,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        qr_token: qrToken,
        status: 'generated'
      });
      
      // Generar código QR MÁS GRANDE
      console.log('🎯 Generando QR con configuración:', QR_CONFIG);
      const qrCodeDataURL = await QRCode.toDataURL(qrToken, QR_CONFIG);
      
      tickets.push(ticket);
      qrCodes.push({
        ticketId: ticket.id,
        qrCode: qrCodeDataURL,
        token: qrToken,
        ticketType: ticketType.name,
        metadata: {
          width: QR_CONFIG.width,
          scale: QR_CONFIG.scale,
          margin: QR_CONFIG.margin
        }
      });
      
      // Reducir disponibilidad
      await ticketType.decrement('available', { by: 1 });
    }
    
    res.status(201).json({
      success: true,
      data: {
        tickets,
        qrCodes,
        event: {
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location
        },
        ticketType: {
          id: ticketType.id,
          name: ticketType.name,
          price: ticketType.price
        },
        qrConfig: QR_CONFIG // Incluir configuración para debug
      },
      message: `${quantity} ticket(s) generado(s) exitosamente con QR de ${QR_CONFIG.width}px`
    });
  } catch (error) {
    console.error('Error al generar tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar los tickets',
      error: error.message
    });
  }
});

// GET /api/tickets/event/:eventId - Obtener tickets por evento
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, limit = 50, offset = 0, ticketTypeId } = req.query;
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    let whereClause = { event_id: eventId };
    
    if (status && ['generated', 'scanned', 'expired'].includes(status)) {
      whereClause.status = status;
    }
    
    if (ticketTypeId) {
      whereClause.ticket_type_id = ticketTypeId;
    }
    
    const tickets = await Ticket.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: TicketType,
          as: 'ticketType',
          attributes: ['id', 'name', 'price']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: tickets.rows,
      pagination: {
        total: tickets.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(tickets.count / limit)
      },
      message: `Se encontraron ${tickets.count} tickets`
    });
  } catch (error) {
    console.error('Error al obtener tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los tickets',
      error: error.message
    });
  }
});

// GET /api/tickets/:id - Obtener un ticket específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'name', 'date', 'location', 'status']
        },
        {
          model: TicketType,
          as: 'ticketType',
          attributes: ['id', 'name', 'price']
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Error al obtener ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el ticket',
      error: error.message
    });
  }
});

// GET /api/tickets/:id/qr - Obtener código QR de un ticket MÁS GRANDE
router.get('/:id/qr', async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: Event,
          as: 'event',
          attributes: ['name', 'date', 'location']
        },
        {
          model: TicketType,
          as: 'ticketType',
          attributes: ['name', 'price']
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }
    
    // Generar código QR actualizado con configuración GRANDE
    const qrCodeDataURL = await QRCode.toDataURL(ticket.qr_token, QR_CONFIG);
    
    res.json({
      success: true,
      data: {
        ticket,
        qrCode: qrCodeDataURL,
        qrConfig: QR_CONFIG
      }
    });
  } catch (error) {
    console.error('Error al obtener QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el código QR',
      error: error.message
    });
  }
});

// POST /api/tickets/bulk-generate - Generación masiva de tickets MÁS GRANDES
router.post('/bulk-generate', async (req, res) => {
  try {
    const { eventId, ticketRequests } = req.body;
    // ticketRequests: [{ ticketTypeId, quantity }]
    
    if (!eventId || !Array.isArray(ticketRequests) || ticketRequests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'eventId y ticketRequests son obligatorios'
      });
    }
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    if (event.status === 'finished') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden generar tickets para un evento terminado'
      });
    }
    
    // Verificar todos los tipos de tickets y disponibilidad
    const ticketTypes = await TicketType.findAll({
      where: {
        event_id: eventId,
        id: ticketRequests.map(req => req.ticketTypeId)
      }
    });
    
    // Validar solicitudes
    for (const request of ticketRequests) {
      const ticketType = ticketTypes.find(tt => tt.id === request.ticketTypeId);
      if (!ticketType) {
        return res.status(400).json({
          success: false,
          message: `Tipo de ticket ${request.ticketTypeId} no encontrado`
        });
      }
      
      if (ticketType.available < request.quantity) {
        return res.status(400).json({
          success: false,
          message: `No hay suficientes tickets disponibles de tipo ${ticketType.name}`
        });
      }
    }
    
    // Generar todos los tickets
    const allTickets = [];
    const allQrCodes = [];
    
    for (const request of ticketRequests) {
      const ticketType = ticketTypes.find(tt => tt.id === request.ticketTypeId);
      
      for (let i = 0; i < request.quantity; i++) {
        const ticketId = uuidv4();
        const jwtPayload = {
          ticketId,
          eventId,
          ticketTypeId: request.ticketTypeId,
          eventName: event.name,
          ticketTypeName: ticketType.name,
          price: ticketType.price,
          generatedAt: new Date().toISOString(),
          version: '1.0'
        };
        
        const qrToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
          expiresIn: '30d'
        });
        
        const ticket = await Ticket.create({
          id: ticketId,
          event_id: eventId,
          ticket_type_id: request.ticketTypeId,
          qr_token: qrToken,
          status: 'generated'
        });
        
        // Generar QR MÁS GRANDE
        const qrCodeDataURL = await QRCode.toDataURL(qrToken, QR_CONFIG);
        
        allTickets.push(ticket);
        allQrCodes.push({
          ticketId: ticket.id,
          ticketType: ticketType.name,
          qrCode: qrCodeDataURL,
          token: qrToken,
          metadata: {
            width: QR_CONFIG.width,
            scale: QR_CONFIG.scale
          }
        });
      }
      
      // Reducir disponibilidad
      await ticketType.decrement('available', { by: request.quantity });
    }
    
    res.status(201).json({
      success: true,
      data: {
        tickets: allTickets,
        qrCodes: allQrCodes,
        event: {
          id: event.id,
          name: event.name,
          date: event.date,
          location: event.location
        },
        summary: ticketRequests.map(req => {
          const ticketType = ticketTypes.find(tt => tt.id === req.ticketTypeId);
          return {
            ticketType: ticketType.name,
            quantity: req.quantity,
            price: ticketType.price,
            total: ticketType.price * req.quantity
          };
        }),
        qrConfig: QR_CONFIG
      },
      message: `${allTickets.length} tickets generados exitosamente con QR de ${QR_CONFIG.width}px`
    });
  } catch (error) {
    console.error('Error en generación masiva:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la generación masiva de tickets',
      error: error.message
    });
  }
});

// PUT /api/tickets/:id/expire - Expirar un ticket
router.put('/:id/expire', async (req, res) => {
  try {
    const { id } = req.params;
    
    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket no encontrado'
      });
    }
    
    if (ticket.status === 'scanned') {
      return res.status(400).json({
        success: false,
        message: 'No se puede expirar un ticket ya escaneado'
      });
    }
    
    if (ticket.status === 'expired') {
      return res.status(400).json({
        success: false,
        message: 'Este ticket ya está expirado'
      });
    }
    
    await ticket.update({ status: 'expired' });
    
    // Incrementar disponibilidad en el tipo de ticket
    const ticketType = await TicketType.findByPk(ticket.ticket_type_id);
    await ticketType.increment('available', { by: 1 });
    
    res.json({
      success: true,
      data: ticket,
      message: 'Ticket expirado exitosamente'
    });
  } catch (error) {
    console.error('Error al expirar ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al expirar el ticket',
      error: error.message
    });
  }
});

// GET /api/tickets/stats/:eventId - Estadísticas de tickets por evento
router.get('/stats/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Estadísticas generales
    const [generalStats, ticketTypeStats] = await Promise.all([
      Ticket.findAll({
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        where: { event_id: eventId },
        group: ['status'],
        raw: true
      }),
      
      // Estadísticas por tipo de ticket
      TicketType.findAll({
        where: { event_id: eventId },
        attributes: [
          'id',
          'name',
          'price',
          'quantity',
          'available',
          [require('sequelize').literal('(quantity - available)'), 'sold']
        ],
        include: [
          {
            model: Ticket,
            as: 'tickets',
            attributes: [
              'status',
              [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            group: ['status'],
            required: false
          }
        ]
      })
    ]);
    
    res.json({
      success: true,
      data: {
        general: generalStats,
        byTicketType: ticketTypeStats,
        qrConfig: QR_CONFIG
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

module.exports = router;
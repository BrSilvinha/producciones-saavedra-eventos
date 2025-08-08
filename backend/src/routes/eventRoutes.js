const express = require('express');
const router = express.Router();
const { Event, TicketType, Ticket, ScanLog } = require('../models');
const { Op } = require('sequelize');
const { 
  validateEvent, 
  validateUUIDParam, 
  validatePagination 
} = require('../middleware/validation');
const { 
  createApiResponse, 
  calculatePagination,
  sanitizeString 
} = require('../utils/helpers');

// GET /api/events - Listar todos los eventos
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0, search } = req.query;
    
    let whereClause = {};
    
    // Filtro por estado
    if (status && ['draft', 'active', 'finished'].includes(status)) {
      whereClause.status = status;
    }
    
    // Filtro de búsqueda
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const events = await Event.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: TicketType,
          as: 'ticketTypes',
          attributes: ['id', 'name', 'price', 'quantity', 'available']
        }
      ],
      order: [['date', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Calcular estadísticas por evento
    const eventsWithStats = await Promise.all(
      events.rows.map(async (event) => {
        const eventJson = event.toJSON();
        
        // Obtener estadísticas de tickets
        const ticketStats = await Ticket.findAll({
          attributes: [
            'status',
            [require('sequelize').fn('COUNT', '*'), 'count']
          ],
          where: { event_id: event.id },
          group: ['status'],
          raw: true
        });
        
        eventJson.ticketStats = ticketStats;
        eventJson.totalTickets = ticketStats.reduce((sum, stat) => sum + parseInt(stat.count), 0);
        
        return eventJson;
      })
    );
    
    res.json({
      success: true,
      data: eventsWithStats,
      pagination: {
        total: events.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(events.count / limit)
      },
      message: `Se encontraron ${events.count} eventos`
    });
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los eventos',
      error: error.message
    });
  }
});

// GET /api/events/active - Obtener eventos activos
router.get('/active', async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { status: 'active' },
      include: [
        {
          model: TicketType,
          as: 'ticketTypes',
          attributes: ['id', 'name', 'quantity', 'available']
        }
      ],
      order: [['date', 'ASC']]
    });
    
    res.json({
      success: true,
      data: events,
      message: `Se encontraron ${events.length} eventos activos`
    });
  } catch (error) {
    console.error('Error al obtener eventos activos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los eventos activos',
      error: error.message
    });
  }
});

// POST /api/events - Crear un nuevo evento
router.post('/', validateEvent, async (req, res) => {
  try {
    const { name, description, date, location, ticketTypes = [] } = req.body;
    
    if (!name || !date) {
      return res.status(400).json({
        success: false,
        message: 'El nombre y la fecha del evento son obligatorios'
      });
    }
    
    const eventDate = new Date(date);
    if (eventDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La fecha del evento no puede ser en el pasado'
      });
    }
    
    // Crear evento
    const event = await Event.create({
      name,
      description,
      date: eventDate,
      location,
      status: 'draft'
    });
    
    // Crear tipos de tickets si se proporcionaron
    if (ticketTypes.length > 0) {
      const ticketTypesToCreate = ticketTypes.map(tt => ({
        event_id: event.id,
        name: tt.name,
        price: tt.price || 0,
        quantity: tt.quantity,
        available: tt.quantity
      }));
      
      await TicketType.bulkCreate(ticketTypesToCreate);
    }
    
    // Obtener el evento completo con tipos de tickets
    const completeEvent = await Event.findByPk(event.id, {
      include: [
        {
          model: TicketType,
          as: 'ticketTypes'
        }
      ]
    });
    
    res.status(201).json({
      success: true,
      data: completeEvent,
      message: 'Evento creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el evento',
      error: error.message
    });
  }
});

// GET /api/events/:id - Obtener un evento específico
router.get('/:id', validateUUIDParam('id'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findByPk(id, {
      include: [
        {
          model: TicketType,
          as: 'ticketTypes',
          include: [
            {
              model: Ticket,
              as: 'tickets',
              attributes: ['id', 'status', 'created_at'],
              limit: 5,
              order: [['created_at', 'DESC']]
            }
          ]
        }
      ]
    });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Obtener estadísticas detalladas
    const stats = await Promise.all([
      // Estadísticas de tickets
      Ticket.findAll({
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        where: { event_id: id },
        group: ['status'],
        raw: true
      }),
      
      // Estadísticas de escaneos
      ScanLog.findAll({
        attributes: [
          'scan_result',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        where: { event_id: id },
        group: ['scan_result'],
        raw: true
      })
    ]);
    
    const eventJson = event.toJSON();
    eventJson.ticketStats = stats[0];
    eventJson.scanStats = stats[1];
    
    res.json({
      success: true,
      data: eventJson
    });
  } catch (error) {
    console.error('Error al obtener evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el evento',
      error: error.message
    });
  }
});

// PUT /api/events/:id - Actualizar un evento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, date, location, status } = req.body;
    
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Validaciones
    if (date) {
      const eventDate = new Date(date);
      if (eventDate < new Date() && event.status === 'draft') {
        return res.status(400).json({
          success: false,
          message: 'La fecha del evento no puede ser en el pasado'
        });
      }
    }
    
    // No permitir cambios si el evento ya terminó
    if (event.status === 'finished') {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar un evento que ya ha terminado'
      });
    }
    
    await event.update({
      name: name || event.name,
      description: description !== undefined ? description : event.description,
      date: date ? new Date(date) : event.date,
      location: location !== undefined ? location : event.location,
      status: status || event.status
    });
    
    res.json({
      success: true,
      data: event,
      message: 'Evento actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el evento',
      error: error.message
    });
  }
});

// DELETE /api/events/:id - Eliminar un evento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findByPk(id, {
      include: [
        {
          model: Ticket,
          as: 'tickets',
          where: { status: 'scanned' },
          required: false
        }
      ]
    });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // No permitir eliminar si hay tickets escaneados
    if (event.tickets && event.tickets.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar un evento que tiene tickets escaneados'
      });
    }
    
    await event.destroy();
    
    res.json({
      success: true,
      message: 'Evento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el evento',
      error: error.message
    });
  }
});

// GET /api/events/:id/dashboard - Dashboard de estadísticas del evento
router.get('/:id/dashboard', async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await Event.findByPk(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Obtener todas las estadísticas
    const [
      ticketTypes,
      ticketStats,
      scanStats,
      recentScans,
      scansByHour
    ] = await Promise.all([
      // Tipos de tickets con conteos
      TicketType.findAll({
        where: { event_id: id },
        include: [
          {
            model: Ticket,
            as: 'tickets',
            attributes: ['status'],
            required: false
          }
        ]
      }),
      
      // Estadísticas generales de tickets
      Ticket.findAll({
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        where: { event_id: id },
        group: ['status'],
        raw: true
      }),
      
      // Estadísticas de escaneos
      ScanLog.findAll({
        attributes: [
          'scan_result',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        where: { event_id: id },
        group: ['scan_result'],
        raw: true
      }),
      
      // Escaneos recientes
      ScanLog.findAll({
        where: { event_id: id },
        include: [
          {
            model: Ticket,
            as: 'ticket',
            include: [
              {
                model: TicketType,
                as: 'ticketType',
                attributes: ['name']
              }
            ]
          }
        ],
        order: [['timestamp', 'DESC']],
        limit: 10
      }),
      
      // Escaneos por hora (últimas 24 horas)
      ScanLog.findAll({
        attributes: [
          [require('sequelize').fn('DATE_TRUNC', 'hour', require('sequelize').col('timestamp')), 'hour'],
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        where: {
          event_id: id,
          timestamp: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        group: [require('sequelize').fn('DATE_TRUNC', 'hour', require('sequelize').col('timestamp'))],
        order: [[require('sequelize').fn('DATE_TRUNC', 'hour', require('sequelize').col('timestamp')), 'ASC']],
        raw: true
      })
    ]);
    
    res.json({
      success: true,
      data: {
        event,
        ticketTypes,
        stats: {
          tickets: ticketStats,
          scans: scanStats,
          scansByHour
        },
        recentActivity: recentScans
      }
    });
  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el dashboard del evento',
      error: error.message
    });
  }
});

module.exports = router;
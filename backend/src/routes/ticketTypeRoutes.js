const express = require('express');
const router = express.Router();
const { Event, TicketType } = require('../models');

// GET /api/ticket-types/event/:eventId - Obtener tipos de ticket por evento
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    const ticketTypes = await TicketType.findAll({
      where: { event_id: eventId },
      order: [['created_at', 'ASC']]
    });
    
    res.json({
      success: true,
      data: ticketTypes,
      message: `Se encontraron ${ticketTypes.length} tipos de tickets`
    });
  } catch (error) {
    console.error('Error al obtener tipos de tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los tipos de tickets',
      error: error.message
    });
  }
});

// POST /api/ticket-types - Crear un nuevo tipo de ticket
router.post('/', async (req, res) => {
  try {
    const { eventId, name, price, quantity } = req.body;
    
    if (!eventId || !name || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'eventId, name y quantity son obligatorios'
      });
    }
    
    // Verificar que el evento existe
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Verificar que el tipo de ticket no existe ya para este evento
    const existingType = await TicketType.findOne({
      where: {
        event_id: eventId,
        name: name
      }
    });
    
    if (existingType) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un tipo de ticket llamado "${name}" para este evento`
      });
    }
    
    const ticketType = await TicketType.create({
      event_id: eventId,
      name,
      price: price || 0,
      quantity,
      available: quantity
    });
    
    res.status(201).json({
      success: true,
      data: ticketType,
      message: 'Tipo de ticket creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear tipo de ticket:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el tipo de ticket',
      error: error.message
    });
  }
});

module.exports = router;
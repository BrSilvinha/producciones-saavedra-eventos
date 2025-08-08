const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Event, Ticket, TicketType, ScanLog } = require('../models');

// POST /api/qr/validate - Validar un código QR
router.post('/validate', async (req, res) => {
  try {
    const { qrToken, eventId, scannerInfo = {} } = req.body;
    
    if (!qrToken || !eventId) {
      // Log del intento inválido
      await ScanLog.createLog({
        eventId,
        scanResult: 'invalid',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        scannerUser: scannerInfo.user || 'Desconocido',
        deviceInfo: scannerInfo.device
      });
      
      return res.status(400).json({
        success: false,
        message: 'Token QR y eventId son obligatorios',
        scanResult: 'invalid',
        displayMessage: '❌ CÓDIGO QR INVÁLIDO O FALSIFICADO'
      });
    }
    
    // Verificar que el evento existe y está activo
    const event = await Event.findByPk(eventId);
    if (!event) {
      await ScanLog.createLog({
        eventId,
        scanResult: 'invalid',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        scannerUser: scannerInfo.user || 'Desconocido'
      });
      
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado',
        scanResult: 'invalid',
        displayMessage: '❌ EVENTO NO ENCONTRADO'
      });
    }
    
    let decodedToken;
    let ticket;
    
    try {
      // Verificar y decodificar el JWT
      decodedToken = jwt.verify(qrToken, process.env.JWT_SECRET);
      
      // Buscar el ticket en la base de datos
      ticket = await Ticket.findByPk(decodedToken.ticketId, {
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
        await ScanLog.createLog({
          eventId,
          scanResult: 'invalid',
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          scannerUser: scannerInfo.user || 'Desconocido'
        });
        
        return res.status(404).json({
          success: false,
          message: 'Ticket no encontrado',
          scanResult: 'invalid',
          displayMessage: '❌ CÓDIGO QR INVÁLIDO O FALSIFICADO'
        });
      }
      
    } catch (jwtError) {
      await ScanLog.createLog({
        eventId,
        scanResult: 'invalid',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        scannerUser: scannerInfo.user || 'Desconocido'
      });
      
      return res.status(400).json({
        success: false,
        message: 'Token QR inválido o expirado',
        scanResult: 'invalid',
        displayMessage: '❌ CÓDIGO QR INVÁLIDO O FALSIFICADO',
        error: jwtError.message
      });
    }
    
    // Verificar que el ticket pertenece al evento correcto
    if (ticket.event_id !== eventId) {
      await ScanLog.createLog({
        ticketId: ticket.id,
        eventId,
        scanResult: 'wrong_event',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        scannerUser: scannerInfo.user || 'Desconocido'
      });
      
      return res.status(400).json({
        success: false,
        message: 'Este ticket no pertenece a este evento',
        scanResult: 'wrong_event',
        displayMessage: '🚫 QR NO VÁLIDO PARA ESTE EVENTO',
        ticketInfo: {
          ticketEvent: ticket.event.name,
          currentEvent: event.name
        }
      });
    }
    
    // Verificar si el ticket ya fue usado
    if (ticket.status === 'scanned') {
      await ScanLog.createLog({
        ticketId: ticket.id,
        eventId,
        scanResult: 'used',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        scannerUser: scannerInfo.user || 'Desconocido'
      });
      
      const ticketTypeName = ticket.ticketType.name.toLowerCase();
      const isVip = ticketTypeName.includes('vip');
      
      return res.status(409).json({
        success: false,
        message: 'Este ticket ya fue escaneado',
        scanResult: 'used',
        displayMessage: isVip 
          ? `❌ ENTRADA VIP YA UTILIZADA - ${event.name}`
          : `❌ ENTRADA GENERAL YA UTILIZADA - ${event.name}`,
        ticketInfo: {
          scannedAt: ticket.scanned_at,
          scannedBy: ticket.scanned_by,
          ticketType: ticket.ticketType.name
        }
      });
    }
    
    // Verificar si el ticket está expirado
    if (ticket.status === 'expired') {
      await ScanLog.createLog({
        ticketId: ticket.id,
        eventId,
        scanResult: 'invalid',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        scannerUser: scannerInfo.user || 'Desconocido'
      });
      
      return res.status(400).json({
        success: false,
        message: 'Este ticket ha expirado',
        scanResult: 'invalid',
        displayMessage: '❌ ENTRADA EXPIRADA',
        ticketInfo: {
          ticketType: ticket.ticketType.name,
          event: event.name
        }
      });
    }
    
    // ¡TICKET VÁLIDO! Marcar como escaneado
    await ticket.update({
      status: 'scanned',
      scanned_at: new Date(),
      scanned_by: scannerInfo.user || 'Sistema'
    });
    
    // Registrar escaneo exitoso
    await ScanLog.createLog({
      ticketId: ticket.id,
      eventId,
      scanResult: 'valid',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      scannerUser: scannerInfo.user || 'Desconocido',
      deviceInfo: scannerInfo.device
    });
    
    // Determinar el mensaje de éxito
    const ticketTypeName = ticket.ticketType.name.toLowerCase();
    const isVip = ticketTypeName.includes('vip');
    
    const successMessage = isVip 
      ? `✅ ENTRADA VIP VÁLIDA - ${event.name}`
      : `✅ ENTRADA GENERAL VÁLIDA - ${event.name}`;
    
    res.json({
      success: true,
      message: 'Ticket válido y registrado',
      scanResult: 'valid',
      displayMessage: successMessage,
      ticketInfo: {
        id: ticket.id,
        event: {
          name: event.name,
          date: event.date,
          location: event.location
        },
        ticketType: {
          name: ticket.ticketType.name,
          price: ticket.ticketType.price
        },
        scannedAt: ticket.scanned_at,
        scannedBy: ticket.scanned_by
      }
    });
    
  } catch (error) {
    console.error('Error en validación de QR:', error);
    
    // Log del error
    try {
      await ScanLog.createLog({
        eventId: req.body.eventId,
        scanResult: 'invalid',
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        scannerUser: req.body.scannerInfo?.user || 'Desconocido'
      });
    } catch (logError) {
      console.error('Error al registrar log:', logError);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      scanResult: 'invalid',
      displayMessage: '❌ ERROR DEL SISTEMA',
      error: error.message
    });
  }
});

// POST /api/qr/simulate - Simular escaneo para pruebas
router.post('/simulate', async (req, res) => {
  try {
    const { eventId, ticketTypeId, scenario = 'valid' } = req.body;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'eventId es obligatorio'
      });
    }
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    let response;
    
    switch (scenario) {
      case 'valid':
        // Buscar un ticket válido del evento
        let ticket = await Ticket.findOne({
          where: {
            event_id: eventId,
            status: 'generated',
            ...(ticketTypeId && { ticket_type_id: ticketTypeId })
          },
          include: [
            {
              model: TicketType,
              as: 'ticketType'
            }
          ]
        });
        
        if (!ticket) {
          return res.status(404).json({
            success: false,
            message: 'No hay tickets válidos disponibles para simular'
          });
        }
        
        const ticketTypeName = ticket.ticketType.name.toLowerCase();
        const isVip = ticketTypeName.includes('vip');
        
        response = {
          success: true,
          scanResult: 'valid',
          displayMessage: isVip 
            ? `✅ ENTRADA VIP VÁLIDA - ${event.name}`
            : `✅ ENTRADA GENERAL VÁLIDA - ${event.name}`,
          simulation: true
        };
        break;
        
      case 'used':
        response = {
          success: false,
          scanResult: 'used',
          displayMessage: `❌ ENTRADA YA UTILIZADA - ${event.name}`,
          simulation: true
        };
        break;
        
      case 'invalid':
        response = {
          success: false,
          scanResult: 'invalid',
          displayMessage: '❌ CÓDIGO QR INVÁLIDO O FALSIFICADO',
          simulation: true
        };
        break;
        
      case 'wrong_event':
        response = {
          success: false,
          scanResult: 'wrong_event',
          displayMessage: '🚫 QR NO VÁLIDO PARA ESTE EVENTO',
          simulation: true
        };
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Escenario no válido. Use: valid, used, invalid, wrong_event'
        });
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Error en simulación:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la simulación',
      error: error.message
    });
  }
});

// GET /api/qr/logs/:eventId - Obtener logs de escaneo por evento
router.get('/logs/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 50, offset = 0, result, startDate, endDate } = req.query;
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    let whereClause = { event_id: eventId };
    
    if (result && ['valid', 'used', 'invalid', 'wrong_event'].includes(result)) {
      whereClause.scan_result = result;
    }
    
    if (startDate && endDate) {
      whereClause.timestamp = {
        [require('sequelize').Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    const logs = await ScanLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Ticket,
          as: 'ticket',
          include: [
            {
              model: TicketType,
              as: 'ticketType',
              attributes: ['name', 'price']
            }
          ],
          required: false
        }
      ],
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: logs.rows,
      pagination: {
        total: logs.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(logs.count / limit)
      }
    });
    
  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los logs de escaneo',
      error: error.message
    });
  }
});

// GET /api/qr/stats/:eventId - Estadísticas de escaneo por evento
router.get('/stats/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { period = '24h' } = req.query;
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }
    
    // Calcular fecha de inicio según el período
    let startDate;
    switch (period) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
    
    const [generalStats, timeSeriesStats] = await Promise.all([
      // Estadísticas generales por resultado
      ScanLog.findAll({
        attributes: [
          'scan_result',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        where: {
          event_id: eventId,
          timestamp: {
            [require('sequelize').Op.gte]: startDate
          }
        },
        group: ['scan_result'],
        raw: true
      }),
      
      // Serie temporal de escaneos
      ScanLog.findAll({
        attributes: [
          [require('sequelize').fn('DATE_TRUNC', 'hour', require('sequelize').col('timestamp')), 'hour'],
          'scan_result',
          [require('sequelize').fn('COUNT', '*'), 'count']
        ],
        where: {
          event_id: eventId,
          timestamp: {
            [require('sequelize').Op.gte]: startDate
          }
        },
        group: [
          require('sequelize').fn('DATE_TRUNC', 'hour', require('sequelize').col('timestamp')),
          'scan_result'
        ],
        order: [[require('sequelize').fn('DATE_TRUNC', 'hour', require('sequelize').col('timestamp')), 'ASC']],
        raw: true
      })
    ]);
    
    res.json({
      success: true,
      data: {
        period,
        general: generalStats,
        timeSeries: timeSeriesStats
      }
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas de QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de escaneo',
      error: error.message
    });
  }
});

// GET /api/qr/test - Ruta de prueba
router.get('/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'QR Routes funcionando correctamente',
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        'POST /api/qr/validate - Validar código QR',
        'POST /api/qr/simulate - Simular escaneo',
        'GET /api/qr/logs/:eventId - Obtener logs',
        'GET /api/qr/stats/:eventId - Estadísticas'
      ]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor',
      error: error.message
    });
  }
});

module.exports = router;
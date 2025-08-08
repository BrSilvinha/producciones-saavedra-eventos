module.exports = (sequelize, DataTypes) => {
  const ScanLog = sequelize.define('ScanLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: true, // Puede ser null si es un QR inválido
      references: {
        model: 'tickets',
        key: 'id'
      }
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id'
      }
    },
    scan_result: {
      type: DataTypes.ENUM('valid', 'used', 'invalid', 'wrong_event'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['valid', 'used', 'invalid', 'wrong_event']],
          msg: 'El resultado debe ser valid, used, invalid o wrong_event'
        }
      }
    },
    scanner_info: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'scan_logs',
    timestamps: false, // Usamos nuestro propio timestamp
    underscored: true,
    indexes: [
      {
        fields: ['event_id'],
        name: 'idx_scan_log_event_id'
      },
      {
        fields: ['ticket_id'],
        name: 'idx_scan_log_ticket_id'
      },
      {
        fields: ['scan_result'],
        name: 'idx_scan_log_result'
      },
      {
        fields: ['timestamp'],
        name: 'idx_scan_log_timestamp'
      },
      {
        fields: ['event_id', 'timestamp'],
        name: 'idx_scan_log_event_timestamp'
      }
    ]
  });

  // Definir asociaciones
  ScanLog.associate = function(models) {
    // Un log pertenece a un ticket (puede ser null)
    ScanLog.belongsTo(models.Ticket, {
      foreignKey: 'ticket_id',
      as: 'ticket'
    });
    
    // Un log pertenece a un evento
    ScanLog.belongsTo(models.Event, {
      foreignKey: 'event_id',
      as: 'event'
    });
  };

  // Métodos de instancia
  ScanLog.prototype.isValidScan = function() {
    return this.scan_result === 'valid';
  };

  ScanLog.prototype.isUsedTicket = function() {
    return this.scan_result === 'used';
  };

  ScanLog.prototype.isInvalidTicket = function() {
    return this.scan_result === 'invalid';
  };

  ScanLog.prototype.isWrongEvent = function() {
    return this.scan_result === 'wrong_event';
  };

  // Métodos estáticos
  ScanLog.createLog = function(data) {
    return this.create({
      ticket_id: data.ticketId || null,
      event_id: data.eventId,
      scan_result: data.scanResult,
      scanner_info: {
        user_agent: data.userAgent || null,
        ip_address: data.ipAddress || null,
        scanner_user: data.scannerUser || null,
        device_info: data.deviceInfo || null,
        location: data.location || null
      },
      timestamp: new Date()
    });
  };

  ScanLog.getEventStats = function(eventId, startDate = null, endDate = null) {
    const where = { event_id: eventId };
    
    if (startDate && endDate) {
      where.timestamp = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }
    
    return this.findAll({
      attributes: [
        'scan_result',
        [sequelize.fn('COUNT', '*'), 'count'],
        [sequelize.fn('DATE', sequelize.col('timestamp')), 'date']
      ],
      where,
      group: ['scan_result', sequelize.fn('DATE', sequelize.col('timestamp'))],
      order: [['timestamp', 'DESC']],
      raw: true
    });
  };

  ScanLog.getRecentScans = function(eventId, limit = 50) {
    return this.findAll({
      where: { event_id: eventId },
      include: [
        {
          model: sequelize.models.Ticket,
          as: 'ticket',
          include: [{
            model: sequelize.models.TicketType,
            as: 'ticketType'
          }]
        }
      ],
      order: [['timestamp', 'DESC']],
      limit
    });
  };

  ScanLog.getScansByResult = function(eventId, scanResult) {
    return this.findAll({
      where: { 
        event_id: eventId,
        scan_result: scanResult
      },
      include: [
        {
          model: sequelize.models.Ticket,
          as: 'ticket',
          include: [{
            model: sequelize.models.TicketType,
            as: 'ticketType'
          }]
        }
      ],
      order: [['timestamp', 'DESC']]
    });
  };

  return ScanLog;
};
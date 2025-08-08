module.exports = (sequelize, DataTypes) => {
  const Ticket = sequelize.define('Ticket', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'events',
        key: 'id'
      }
    },
    ticket_type_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'ticket_types',
        key: 'id'
      }
    },
    qr_token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('generated', 'scanned', 'expired'),
      defaultValue: 'generated',
      allowNull: false,
      validate: {
        isIn: {
          args: [['generated', 'scanned', 'expired']],
          msg: 'El estado debe ser generated, scanned o expired'
        }
      }
    },
    scanned_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    scanned_by: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [0, 255],
          msg: 'El campo scanned_by no puede exceder 255 caracteres'
        }
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'tickets',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['qr_token'],
        name: 'unique_qr_token'
      },
      {
        fields: ['event_id'],
        name: 'idx_ticket_event_id'
      },
      {
        fields: ['ticket_type_id'],
        name: 'idx_ticket_type_id'
      },
      {
        fields: ['status'],
        name: 'idx_ticket_status'
      }
    ],
    hooks: {
      beforeValidate: (ticket) => {
        // Si se marca como scanned, debe tener scanned_at
        if (ticket.status === 'scanned' && !ticket.scanned_at) {
          ticket.scanned_at = new Date();
        }
        
        // Si no está scanned, limpiar campos relacionados
        if (ticket.status !== 'scanned') {
          ticket.scanned_at = null;
          ticket.scanned_by = null;
        }
      }
    }
  });

  // Definir asociaciones
  Ticket.associate = function(models) {
    // Un ticket pertenece a un evento
    Ticket.belongsTo(models.Event, {
      foreignKey: 'event_id',
      as: 'event'
    });
    
    // Un ticket pertenece a un tipo de ticket
    Ticket.belongsTo(models.TicketType, {
      foreignKey: 'ticket_type_id',
      as: 'ticketType'
    });
    
    // Un ticket puede tener muchos logs de escaneo
    Ticket.hasMany(models.ScanLog, {
      foreignKey: 'ticket_id',
      as: 'scanLogs',
      onDelete: 'CASCADE'
    });
  };

  // Métodos de instancia
  Ticket.prototype.isScanned = function() {
    return this.status === 'scanned';
  };

  Ticket.prototype.isExpired = function() {
    return this.status === 'expired';
  };

  Ticket.prototype.isValid = function() {
    return this.status === 'generated';
  };

  Ticket.prototype.markAsScanned = function(scannedBy = 'Sistema') {
    if (this.status === 'scanned') {
      throw new Error('Este ticket ya fue escaneado');
    }
    
    if (this.status === 'expired') {
      throw new Error('Este ticket ha expirado');
    }
    
    this.status = 'scanned';
    this.scanned_at = new Date();
    this.scanned_by = scannedBy;
    
    return this.save();
  };

  Ticket.prototype.markAsExpired = function() {
    if (this.status === 'scanned') {
      throw new Error('No se puede expirar un ticket ya escaneado');
    }
    
    this.status = 'expired';
    return this.save();
  };

  // Métodos estáticos
  Ticket.getValidTickets = function(eventId) {
    return this.findAll({
      where: { 
        event_id: eventId,
        status: 'generated'
      },
      include: [{
        model: sequelize.models.TicketType,
        as: 'ticketType'
      }]
    });
  };

  Ticket.getScannedTickets = function(eventId) {
    return this.findAll({
      where: { 
        event_id: eventId,
        status: 'scanned'
      },
      order: [['scanned_at', 'DESC']]
    });
  };

  Ticket.getTicketStats = function(eventId) {
    return this.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', '*'), 'count']
      ],
      where: { event_id: eventId },
      group: ['status'],
      raw: true
    });
  };

  return Ticket;
};
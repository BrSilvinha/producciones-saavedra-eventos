module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El nombre del evento es obligatorio'
        },
        len: {
          args: [2, 255],
          msg: 'El nombre debe tener entre 2 y 255 caracteres'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notNull: {
          msg: 'La fecha del evento es obligatoria'
        },
        isDate: {
          msg: 'Debe ser una fecha válida'
        }
      }
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [0, 255],
          msg: 'La ubicación no puede exceder 255 caracteres'
        }
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'finished'),
      defaultValue: 'draft',
      allowNull: false,
      validate: {
        isIn: {
          args: [['draft', 'active', 'finished']],
          msg: 'El estado debe ser draft, active o finished'
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
    tableName: 'events',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeValidate: (event) => {
        // Validar que la fecha no sea en el pasado para eventos nuevos
        if (event.isNewRecord && new Date(event.date) < new Date()) {
          throw new Error('La fecha del evento no puede ser en el pasado');
        }
      }
    }
  });

  // Definir asociaciones
  Event.associate = function(models) {
    // Un evento tiene muchos tipos de tickets
    Event.hasMany(models.TicketType, {
      foreignKey: 'event_id',
      as: 'ticketTypes',
      onDelete: 'CASCADE'
    });
    
    // Un evento tiene muchos tickets
    Event.hasMany(models.Ticket, {
      foreignKey: 'event_id',
      as: 'tickets',
      onDelete: 'CASCADE'
    });
    
    // Un evento tiene muchos logs de escaneo
    Event.hasMany(models.ScanLog, {
      foreignKey: 'event_id',
      as: 'scanLogs',
      onDelete: 'CASCADE'
    });
  };

  // Métodos de instancia
  Event.prototype.isActive = function() {
    return this.status === 'active';
  };

  Event.prototype.isFinished = function() {
    return this.status === 'finished';
  };

  Event.prototype.canGenerateTickets = function() {
    return this.status === 'draft' || this.status === 'active';
  };

  // Métodos estáticos
  Event.getActiveEvents = function() {
    return this.findAll({
      where: { status: 'active' },
      order: [['date', 'ASC']]
    });
  };

  return Event;
};
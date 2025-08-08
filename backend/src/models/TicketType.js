module.exports = (sequelize, DataTypes) => {
  const TicketType = sequelize.define('TicketType', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El nombre del tipo de ticket es obligatorio'
        },
        len: {
          args: [2, 100],
          msg: 'El nombre debe tener entre 2 y 100 caracteres'
        }
      }
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: {
          args: [0],
          msg: 'El precio no puede ser negativo'
        },
        isDecimal: {
          msg: 'El precio debe ser un número decimal válido'
        }
      }
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'La cantidad debe ser al menos 1'
        },
        max: {
          args: [10000],
          msg: 'La cantidad no puede exceder 10,000'
        }
      }
    },
    available: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [0],
          msg: 'La cantidad disponible no puede ser negativa'
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
    tableName: 'ticket_types',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['event_id', 'name'],
        name: 'unique_ticket_type_per_event'
      }
    ],
    hooks: {
      beforeValidate: (ticketType) => {
        // Asegurar que available no sea mayor que quantity
        if (ticketType.available > ticketType.quantity) {
          ticketType.available = ticketType.quantity;
        }
      },
      beforeCreate: (ticketType) => {
        // Al crear, available debe ser igual a quantity
        ticketType.available = ticketType.quantity;
      }
    }
  });

  // Definir asociaciones
  TicketType.associate = function(models) {
    // Un tipo de ticket pertenece a un evento
    TicketType.belongsTo(models.Event, {
      foreignKey: 'event_id',
      as: 'event'
    });
    
    // Un tipo de ticket tiene muchos tickets
    TicketType.hasMany(models.Ticket, {
      foreignKey: 'ticket_type_id',
      as: 'tickets',
      onDelete: 'CASCADE'
    });
  };

  // Métodos de instancia
  TicketType.prototype.hasAvailableTickets = function() {
    return this.available > 0;
  };

  TicketType.prototype.getSoldCount = function() {
    return this.quantity - this.available;
  };

  TicketType.prototype.reserveTicket = function() {
    if (this.available > 0) {
      this.available -= 1;
      return this.save();
    } else {
      throw new Error('No hay tickets disponibles para este tipo');
    }
  };

  TicketType.prototype.releaseTicket = function() {
    if (this.available < this.quantity) {
      this.available += 1;
      return this.save();
    }
  };

  return TicketType;
};
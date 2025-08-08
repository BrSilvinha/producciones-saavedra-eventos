'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ticket_types', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'events',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      available: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Crear índices
    await queryInterface.addIndex('ticket_types', ['event_id'], {
      name: 'idx_ticket_types_event_id'
    });
    
    // Crear índice único compuesto
    await queryInterface.addIndex('ticket_types', ['event_id', 'name'], {
      unique: true,
      name: 'unique_ticket_type_per_event'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ticket_types');
  }
};
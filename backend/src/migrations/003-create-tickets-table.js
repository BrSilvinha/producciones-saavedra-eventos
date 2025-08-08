'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets', {
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
      ticket_type_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'ticket_types',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      qr_token: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('generated', 'scanned', 'expired'),
        defaultValue: 'generated',
        allowNull: false
      },
      scanned_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      scanned_by: {
        type: Sequelize.STRING,
        allowNull: true
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
    await queryInterface.addIndex('tickets', ['qr_token'], {
      unique: true,
      name: 'unique_qr_token'
    });
    
    await queryInterface.addIndex('tickets', ['event_id'], {
      name: 'idx_ticket_event_id'
    });
    
    await queryInterface.addIndex('tickets', ['ticket_type_id'], {
      name: 'idx_ticket_type_id'
    });
    
    await queryInterface.addIndex('tickets', ['status'], {
      name: 'idx_ticket_status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tickets');
  }
};
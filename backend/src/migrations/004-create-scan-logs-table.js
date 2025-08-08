'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('scan_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      ticket_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'tickets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      scan_result: {
        type: Sequelize.ENUM('valid', 'used', 'invalid', 'wrong_event'),
        allowNull: false
      },
      scanner_info: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Crear índices
    await queryInterface.addIndex('scan_logs', ['event_id'], {
      name: 'idx_scan_log_event_id'
    });
    
    await queryInterface.addIndex('scan_logs', ['ticket_id'], {
      name: 'idx_scan_log_ticket_id'
    });
    
    await queryInterface.addIndex('scan_logs', ['scan_result'], {
      name: 'idx_scan_log_result'
    });
    
    await queryInterface.addIndex('scan_logs', ['timestamp'], {
      name: 'idx_scan_log_timestamp'
    });
    
    await queryInterface.addIndex('scan_logs', ['event_id', 'timestamp'], {
      name: 'idx_scan_log_event_timestamp'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('scan_logs');
  }
};
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const config = require('../config/database.js')[process.env.NODE_ENV || 'development'];

const db = {};

let sequelize;

try {
  // ✅ MANEJO ROBUSTO DE DATABASE_URL
  if (config.use_env_variable) {
    const databaseUrl = process.env[config.use_env_variable];
    
    if (!databaseUrl) {
      console.warn('⚠️  DATABASE_URL no está configurada. El servidor funcionará sin base de datos.');
      console.warn('💡 Para configurar la base de datos en Railway:');
      console.warn('   1. Ve al Dashboard de Railway');
      console.warn('   2. En Variables > Add New Variable');
      console.warn('   3. Agrega: DATABASE_URL=postgresql://usuario:password@host:puerto/database');
      
      // Crear un objeto mock para evitar errores
      sequelize = {
        authenticate: () => Promise.reject(new Error('Database not configured')),
        sync: () => Promise.resolve(),
        close: () => Promise.resolve(),
        models: {},
        Sequelize: Sequelize
      };
    } else {
      sequelize = new Sequelize(databaseUrl, config);
    }
  } else {
    // Verificar que todas las configuraciones estén presentes
    if (!config.database || !config.username || !config.password) {
      console.warn('⚠️  Configuración de base de datos incompleta. El servidor funcionará sin base de datos.');
      
      sequelize = {
        authenticate: () => Promise.reject(new Error('Database not configured')),
        sync: () => Promise.resolve(),
        close: () => Promise.resolve(),
        models: {},
        Sequelize: Sequelize
      };
    } else {
      sequelize = new Sequelize(config.database, config.username, config.password, config);
    }
  }

  // ✅ CARGAR MODELOS SOLO SI SEQUELIZE ESTÁ DISPONIBLE
  if (sequelize && typeof sequelize.authenticate === 'function') {
    // Leer todos los archivos del directorio actual
    fs
      .readdirSync(__dirname)
      .filter(file => {
        return (
          file.indexOf('.') !== 0 &&
          file !== path.basename(__filename) &&
          file.slice(-3) === '.js' &&
          file.indexOf('.test.js') === -1
        );
      })
      .forEach(file => {
        try {
          const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
          db[model.name] = model;
        } catch (error) {
          console.warn(`⚠️  Error cargando modelo ${file}:`, error.message);
        }
      });

    // Establecer asociaciones
    Object.keys(db).forEach(modelName => {
      if (db[modelName].associate) {
        try {
          db[modelName].associate(db);
        } catch (error) {
          console.warn(`⚠️  Error estableciendo asociaciones para ${modelName}:`, error.message);
        }
      }
    });
  } else {
    console.warn('⚠️  Modelos no cargados debido a la ausencia de configuración de base de datos');
  }

} catch (error) {
  console.error('❌ Error inicializando base de datos:', error.message);
  
  // Crear un objeto mock para que la aplicación funcione
  sequelize = {
    authenticate: () => Promise.reject(new Error('Database connection failed')),
    sync: () => Promise.resolve(),
    close: () => Promise.resolve(),
    models: {},
    Sequelize: Sequelize
  };
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
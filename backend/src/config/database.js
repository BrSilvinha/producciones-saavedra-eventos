require('dotenv').config();

// ✅ CONFIGURACIÓN ROBUSTA DE BASE DE DATOS
const config = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_NAME || 'eventos_saavedra',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
    database: (process.env.DB_NAME || 'eventos_saavedra') + '_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  
  production: {
    // ✅ VERIFICAR SI DATABASE_URL EXISTE
    ...(process.env.DATABASE_URL ? {
      use_env_variable: 'DATABASE_URL'
    } : {
      // Fallback para configuración manual en producción
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432
    }),
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.DATABASE_URL ? {
        require: true,
        rejectUnauthorized: false
      } : false
    }
  }
};

// ✅ VALIDACIÓN Y LOGGING
const currentEnv = process.env.NODE_ENV || 'development';
const currentConfig = config[currentEnv];

if (currentEnv === 'production') {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  ====================================');
    console.warn('⚠️  DATABASE_URL no está configurada!');
    console.warn('⚠️  ====================================');
    console.warn('💡 Para configurar en Railway:');
    console.warn('   1. Ve al Dashboard de Railway');
    console.warn('   2. Selecciona tu proyecto');
    console.warn('   3. Ve a Variables > Add New Variable');
    console.warn('   4. Nombre: DATABASE_URL');
    console.warn('   5. Valor: postgresql://usuario:password@host:puerto/database');
    console.warn('⚠️  El servidor funcionará sin base de datos hasta que configures esto.');
    console.warn('⚠️  ====================================');
  } else {
    console.log('✅ DATABASE_URL configurada para producción');
  }
} else {
  console.log(`🔧 Configuración de DB para entorno: ${currentEnv}`);
  if (currentConfig.username && currentConfig.host) {
    console.log(`🔗 DB: ${currentConfig.username}@${currentConfig.host}:${currentConfig.port}/${currentConfig.database}`);
  }
}

module.exports = config;
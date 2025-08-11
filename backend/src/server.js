const app = require('./app');

const PORT = process.env.PORT || 5000;

// ✅ FUNCIÓN DE INICIO OPTIMIZADA PARA RAILWAY
const startServer = async () => {
  try {
    console.log('🚀 ======================================');
    console.log('🎉 SISTEMA DE GESTIÓN DE EVENTOS');
    console.log('🏢 Producciones Saavedra');
    console.log('🚀 ======================================');
    
    // ✅ INICIAR SERVIDOR INMEDIATAMENTE (sin esperar DB)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`📱 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Health Check: http://localhost:${PORT}/health`);
      console.log('✅ ¡Servidor listo para recibir requests!');
    });

    // ✅ CONFIGURAR DB EN PARALELO (no bloquea el inicio)
    setTimeout(async () => {
      try {
        const { sequelize } = require('./models');
        
        // Verificar si sequelize está configurado correctamente
        if (!sequelize || typeof sequelize.authenticate !== 'function') {
          console.warn('⚠️  Base de datos no configurada - funcionando en modo sin DB');
          console.warn('💡 Para habilitar la base de datos:');
          console.warn('   1. Configura DATABASE_URL en Railway');
          console.warn('   2. Formato: postgresql://usuario:password@host:puerto/database');
          return;
        }
        
        console.log('🔗 Intentando conectar a la base de datos...');
        
        await sequelize.authenticate();
        console.log('✅ Conexión a la base de datos establecida');
        
        // Solo sincronizar en desarrollo
        if (process.env.NODE_ENV === 'development') {
          await sequelize.sync({ alter: true });
          console.log('✅ Modelos sincronizados con la base de datos');
        }
      } catch (dbError) {
        console.warn('⚠️  Base de datos no disponible:', dbError.message);
        console.warn('⚠️  El servidor funcionará en modo degradado (sin base de datos)');
        console.warn('💡 Para conectar la base de datos en Railway:');
        console.warn('   1. Ve al Dashboard de Railway');
        console.warn('   2. En Variables, agrega: DATABASE_URL');
        console.warn('   3. Valor: postgresql://usuario:password@host:puerto/database');
      }
    }, 100); // Iniciar conexión DB después de 100ms

    // ✅ MANEJO GRACEFUL DE CIERRE
    const gracefulShutdown = async (signal) => {
      console.log(`🔄 Recibida señal ${signal}, cerrando servidor...`);
      server.close(async () => {
        try {
          const { sequelize } = require('./models');
          await sequelize.close();
          console.log('✅ Conexión a la base de datos cerrada');
        } catch (err) {
          console.warn('⚠️  Error cerrando DB:', err.message);
        }
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
      
      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        console.log('⚠️  Forzando cierre del servidor');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // ✅ MANEJO DE ERRORES NO CAPTURADOS
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection:', reason);
      // No salir del proceso, solo logear
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      // Salir solo en errores críticos
      if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Error crítico al iniciar servidor:', error.message);
    
    // Si es error de puerto, intentar puerto alternativo
    if (error.code === 'EADDRINUSE') {
      console.log('🔄 Puerto ocupado, intentando puerto alternativo...');
      const alternatePort = parseInt(PORT) + 1;
      app.listen(alternatePort, '0.0.0.0', () => {
        console.log(`📱 Servidor iniciado en puerto alternativo: ${alternatePort}`);
      });
    } else {
      process.exit(1);
    }
  }
};

// ✅ INICIAR SERVIDOR
startServer();
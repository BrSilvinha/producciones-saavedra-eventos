const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Probar la conexión a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida correctamente');
    
    // Sincronizar modelos (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos');
    }
    
    // Iniciar servidor (0.0.0.0 para que ngrok funcione)
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 ======================================');
      console.log('🎉 SISTEMA DE GESTIÓN DE EVENTOS');
      console.log('🏢 Producciones Saavedra');
      console.log('🚀 ======================================');
      console.log(`📱 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`🌐 URL Local: http://localhost:${PORT}`);
      console.log(`🔧 Entorno: ${process.env.NODE_ENV}`);
      console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
      console.log('🚀 ======================================');
      console.log('🌍 NGROK DETECTADO:');
      console.log('   Backend disponible en: http://localhost:5000/api');
      console.log('   API Health: http://localhost:5000/api/api/health');
      console.log('🚀 ======================================');
      
      // Mostrar rutas disponibles
      console.log('📋 Rutas disponibles:');
      console.log('   GET  /api/health              - Estado del servidor');
      console.log('   GET  /api/test                - Test de conexión');
      console.log('   POST /api/events              - Crear evento');
      console.log('   GET  /api/events              - Listar eventos');
      console.log('   GET  /api/events/:id          - Obtener evento');
      console.log('   PUT  /api/events/:id          - Actualizar evento');
      console.log('   POST /api/tickets/generate    - Generar tickets');
      console.log('   GET  /api/tickets/event/:id   - Tickets por evento');
      console.log('   POST /api/qr/validate         - Validar código QR');
      console.log('   POST /api/qr/simulate         - Simular escaneo');
      console.log('🚀 ======================================');
      
      // Detectar IP local para frontend
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      const localIPs = [];
      
      Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(iface => {
          if (iface.family === 'IPv4' && !iface.internal) {
            localIPs.push(iface.address);
          }
        });
      });
      
      if (localIPs.length > 0) {
        console.log('📱 Para el frontend, usa estas IPs:');
        localIPs.forEach(ip => {
          console.log(`   Frontend en: http://${ip}:3000`);
        });
        console.log('🚀 ======================================');
      }
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    console.error('💡 Verifica que PostgreSQL esté ejecutándose');
    console.error('💡 Verifica las credenciales en el archivo .env');
    process.exit(1);
  }
};

// Manejar cierre graceful del servidor
process.on('SIGTERM', async () => {
  console.log('🔄 Cerrando servidor...');
  await sequelize.close();
  console.log('✅ Conexión a la base de datos cerrada');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Cerrando servidor...');
  await sequelize.close();
  console.log('✅ Conexión a la base de datos cerrada');
  process.exit(0);
});

// Manejar errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar el servidor
startServer();
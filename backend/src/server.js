const app = require('./app');
const config = require('./config/env');
const { initDb } = require('./db/postgres');
const { initMongo } = require('./db/mongodb');
const { seedDatabase } = require('./db/seed');

function startListening(initialPort) {
  let port = initialPort;

  const server = app.listen(port, () => {
    console.log(`=======================================================`);
    console.log(`🚑 ResQLink API Server running at: http://localhost:${port}`);
    console.log(`🏥 Environment: Production Ready Prototype Mode`);
    console.log(`=======================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is currently in use. Automatically switching to port ${port + 1}...`);
      startListening(port + 1);
    } else {
      console.error('❌ Server startup error:', err);
      process.exit(1);
    }
  });
}

async function startServer() {
  try {
    console.log('🚀 Initializing ResQLink Emergency Network Backend...');

    // Initialize Database Connections
    await initDb();
    await initMongo();

    // Auto-seed demo environment if empty
    await seedDatabase();

    const PORT = parseInt(config.port || '5000', 10);
    startListening(PORT);
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;

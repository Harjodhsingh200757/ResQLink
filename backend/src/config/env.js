const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

module.exports = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/resqlink',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/resqlink',
  jwtSecret: process.env.JWT_SECRET || 'resqlink_default_jwt_secret_key_2026',
  llmApiKey: process.env.LLM_API_KEY || 'mock_llm_key',
  llmModel: process.env.LLM_MODEL || 'gpt-4o-mini',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '3000', 10),
  averageAmbulanceSpeedKmh: parseFloat(process.env.AVERAGE_AMBULANCE_SPEED_KMH || '40')
};

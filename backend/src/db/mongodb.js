const mongoose = require('mongoose');
const config = require('../config/env');

let isConnected = false;
const inMemoryMongoStore = {
  ai_request_analyses: [],
  system_events: []
};

async function initMongo() {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 2000
    });
    isConnected = true;
    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.warn('⚠️ MongoDB connection unavailable. Operating in resilient document mode:', err.message);
    isConnected = false;
  }
}

function isMongoConnected() {
  return isConnected;
}

module.exports = {
  initMongo,
  isMongoConnected,
  inMemoryMongoStore
};

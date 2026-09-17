const mongoose = require('mongoose');

const systemEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  actorId: { type: Number },
  role: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SystemEvent', systemEventSchema);

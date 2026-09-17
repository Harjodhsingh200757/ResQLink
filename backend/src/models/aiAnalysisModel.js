const mongoose = require('mongoose');

const aiAnalysisSchema = new mongoose.Schema({
  requestId: { type: Number, required: true },
  patientId: { type: Number, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['cardiac_respiratory', 'trauma_accident', 'stroke_neurological', 'pediatric_maternal', 'general_medical_emergency', 'non_emergency'],
    default: 'general_medical_emergency'
  },
  urgencyFlag: { 
    type: String, 
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: 'HIGH'
  },
  reportedSymptoms: [{ type: String }],
  summary: { type: String, required: true },
  dispatcherAttention: { type: Boolean, default: true },
  disclaimer: { 
    type: String, 
    default: 'AI-generated information. Not a medical diagnosis. For dispatcher review only.' 
  },
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AiAnalysis', aiAnalysisSchema);

const AiAnalysis = require('../models/aiAnalysisModel');
const { isMongoConnected, inMemoryMongoStore } = require('../db/mongodb');
const { createRateLimiter } = require('../utils/closureHelpers');

// Closure instance limiting AI calls per IP / user to 15 per minute
const aiRateLimiter = createRateLimiter(15, 60000);

/**
 * System Prompt instructing LLM to strictly extract logistics metadata without diagnosing.
 */
const AI_SYSTEM_PROMPT = `
You are ResQLink Emergency AI Assistant.
YOUR SOLE ROLE is to assist human dispatchers by extracting non-diagnostic logistical information from free-text emergency descriptions.

STRICT MANDATES:
1. DO NOT diagnose medical conditions.
2. DO NOT recommend or prescribe medication or medical procedures.
3. DO NOT invent symptoms or facts not present in the input.
4. Extract only facts explicitly present in the patient's text.
5. Output valid JSON matching the specified schema.

CATEGORIES ALLOWED:
- cardiac_respiratory
- trauma_accident
- stroke_neurological
- pediatric_maternal
- general_medical_emergency
- non_emergency

URGENCY FLAGS ALLOWED:
- CRITICAL
- HIGH
- MEDIUM
- LOW
`;

/**
 * Fallback heuristic extractor used when LLM API is offline or unreachable.
 */
function fallbackRuleAnalysis(description) {
  const lower = (description || '').toLowerCase();
  let category = 'general_medical_emergency';
  let urgencyFlag = 'HIGH';
  const reportedSymptoms = [];

  if (lower.includes('chest pain') || lower.includes('heart attack') || lower.includes('collapse') || lower.includes('breathing')) {
    category = 'cardiac_respiratory';
    urgencyFlag = 'CRITICAL';
    if (lower.includes('chest pain')) reportedSymptoms.push('chest pain');
    if (lower.includes('breathing')) reportedSymptoms.push('difficulty breathing');
    if (lower.includes('collapse')) reportedSymptoms.push('sudden collapse');
  } else if (lower.includes('accident') || lower.includes('blood') || lower.includes('fracture') || lower.includes('fall')) {
    category = 'trauma_accident';
    urgencyFlag = 'HIGH';
    if (lower.includes('blood')) reportedSymptoms.push('bleeding');
    if (lower.includes('accident')) reportedSymptoms.push('physical trauma');
  } else if (lower.includes('numbness') || lower.includes('slurred') || lower.includes('seizure')) {
    category = 'stroke_neurological';
    urgencyFlag = 'CRITICAL';
    reportedSymptoms.push('neurological signs');
  } else {
    reportedSymptoms.push('reported emergency symptoms');
  }

  return {
    category,
    urgencyFlag,
    reportedSymptoms,
    summary: `Patient reported: "${description.substring(0, 150)}${description.length > 150 ? '...' : ''}"`,
    dispatcherAttention: urgencyFlag === 'CRITICAL' || urgencyFlag === 'HIGH',
    disclaimer: 'AI-generated information. Not a medical diagnosis. For dispatcher review only.'
  };
}

async function analyzeEmergencyDescription(requestId, patientId, description, userIp = '127.0.0.1') {
  // 1. Rate Limiting Check: STOP execution and return HTTP 429 if limit exceeded
  const rateLimitStatus = aiRateLimiter(userIp);
  if (!rateLimitStatus.allowed) {
    const err = new Error('Rate limit exceeded for AI description analysis. Please try again later.');
    err.statusCode = 429;
    err.code = 'TOO_MANY_REQUESTS';
    throw err;
  }

  let result = null;

  try {
    // Standard structured analysis (Rule-based analysis engine prepared for LLM API integration)
    result = fallbackRuleAnalysis(description);

    let isPersistedToMongo = false;

    // Save to MongoDB if connected; do NOT claim persistence if MongoDB is disconnected
    if (isMongoConnected()) {
      const doc = await AiAnalysis.create({
        requestId,
        patientId,
        description,
        ...result
      });
      result.id = doc._id.toString();
      isPersistedToMongo = true;
    } else {
      const mockId = 'ai_' + Date.now();
      const doc = { id: mockId, requestId, patientId, description, ...result, generatedAt: new Date() };
      inMemoryMongoStore.ai_request_analyses.push(doc);
      result.id = mockId;
      isPersistedToMongo = false;
      console.info(`[AI Service] MongoDB unavailable. Analysis cached in memory without claiming MongoDB DB persistence.`);
    }

    return {
      success: true,
      analysis: result,
      persistedInMongo: isPersistedToMongo
    };
  } catch (err) {
    if (err.statusCode === 429) throw err;

    console.error('❌ AI Analysis Service Error:', err.message);
    // Graceful degradation - Core emergency request creation in PostgreSQL is NEVER lost or blocked!
    const safeFallback = fallbackRuleAnalysis(description);
    return {
      success: false,
      fallback: true,
      analysis: safeFallback,
      error: 'AI analysis service temporary outage; request created normally.'
    };
  }
}

module.exports = {
  analyzeEmergencyDescription,
  fallbackRuleAnalysis,
  AI_SYSTEM_PROMPT
};

const crypto = require('crypto');
const ambulanceService = require('../services/ambulanceService');
const aiService = require('../services/aiService');
const db = require('../db/postgres');
const { validateCoordinate } = require('../middleware/validatorMiddleware');

async function getNearbyAmbulances(req, res, next) {
  try {
    const lat = req.query.lat || req.query.latitude || 30.9009;
    const lon = req.query.lon || req.query.longitude || 75.8573;
    const radius = req.query.radius ? parseFloat(req.query.radius) : 50;

    const coordErr = validateCoordinate(lat, lon);
    if (coordErr) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: coordErr }
      });
    }

    const list = await ambulanceService.findNearbyAvailableAmbulances(lat, lon, radius);

    return res.status(200).json({
      success: true,
      data: { ambulances: list }
    });
  } catch (err) {
    next(err);
  }
}

async function createEmergencyRequest(req, res, next) {
  try {
    // Support both authenticated patients and unauthenticated emergency dispatchers
    const patientId = req.user ? req.user.id : null;
    const trackingToken = crypto.randomBytes(16).toString('hex');
    const { pickup_latitude, pickup_longitude, description, selected_ambulance_id } = req.body;

    const coordErr = validateCoordinate(pickup_latitude, pickup_longitude);
    if (coordErr) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: coordErr }
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DESCRIPTION', message: 'Emergency description is required.' }
      });
    }

    // 1. Create emergency request record in PostgreSQL
    const reqRes = await db.query(
      `INSERT INTO emergency_requests 
       (patient_id, pickup_latitude, pickup_longitude, description, request_status, assigned_ambulance_id, tracking_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [patientId, parseFloat(pickup_latitude), parseFloat(pickup_longitude), description.trim(), 'PENDING', selected_ambulance_id || null, trackingToken]
    );

    const emergencyReq = reqRes.rows[0];

    // 2. Perform AI Structured Analysis (Safely with graceful fallback)
    const aiResult = await aiService.analyzeEmergencyDescription(
      emergencyReq.id,
      patientId || 0,
      description,
      req.ip
    );

    // 3. Update emergency_requests table with AI analysis ID if available
    if (aiResult.analysis && aiResult.analysis.id) {
      await db.query(
        `UPDATE emergency_requests SET ai_analysis_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [aiResult.analysis.id.slice(0, 24), emergencyReq.id]
      );
      emergencyReq.ai_analysis_id = aiResult.analysis.id;
    }

    return res.status(201).json({
      success: true,
      data: {
        request: emergencyReq,
        aiAnalysis: aiResult.analysis
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getMyEmergencyRequests(req, res, next) {
  try {
    const patientId = req.user.id;

    // Direct SQL JOIN to assemble rich request details
    const result = await db.query(
      `SELECT r.*, 
              a.vehicle_number, a.ambulance_type, a.latitude as amb_lat, a.longitude as amb_lon, a.status as amb_status,
              d.phone as driver_phone, u.name as driver_name,
              t.id as trip_id, t.status as trip_status, t.started_at, t.arrived_at, t.patient_picked_up_at, t.completed_at
       FROM emergency_requests r
       LEFT JOIN ambulances a ON r.assigned_ambulance_id = a.id
       LEFT JOIN driver_profiles d ON a.driver_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       LEFT JOIN trips t ON t.request_id = r.id
       WHERE r.patient_id = $1
       ORDER BY r.created_at DESC`,
      [patientId]
    );

    return res.status(200).json({
      success: true,
      data: { requests: result.rows || [] }
    });
  } catch (err) {
    next(err);
  }
}

async function getEmergencyRequestById(req, res, next) {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid request ID.' } });
    }

    // FIX: Included LEFT JOIN trips t ON t.request_id = r.id to resolve 'missing FROM-clause entry for table t'
    const result = await db.query(
      `SELECT r.*, 
              a.vehicle_number, a.ambulance_type, a.latitude as amb_lat, a.longitude as amb_lon, a.status as amb_status,
              d.phone as driver_phone, u.name as driver_name,
              t.id as trip_id, t.status as trip_status
       FROM emergency_requests r
       LEFT JOIN ambulances a ON r.assigned_ambulance_id = a.id
       LEFT JOIN driver_profiles d ON a.driver_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       LEFT JOIN trips t ON t.request_id = r.id
       WHERE r.id = $1`,
      [requestId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Emergency request not found.' }
      });
    }

    const item = result.rows[0];

    // Access authorization check
    const clientToken = req.query.token || req.headers['x-tracking-token'];
    const isTokenMatch = item.tracking_token && clientToken && item.tracking_token === clientToken;

    let isAuthorized = false;
    if (req.user) {
      if (req.user.role === 'ADMIN' || req.user.role === 'DRIVER') {
        isAuthorized = true;
      } else if (req.user.role === 'PATIENT' && item.patient_id === req.user.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && !isTokenMatch) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to view this emergency request.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: { request: item }
    });
  } catch (err) {
    next(err);
  }
}

async function cancelEmergencyRequest(req, res, next) {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid request ID.' } });
    }

    const reqRes = await db.query('SELECT * FROM emergency_requests WHERE id = $1', [requestId]);
    if (!reqRes.rows || reqRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Emergency request not found.' }
      });
    }

    const item = reqRes.rows[0];

    const clientToken = req.query.token || req.headers['x-tracking-token'];
    const isTokenMatch = item.tracking_token && clientToken && item.tracking_token === clientToken;

    let isAuthorized = false;
    if (req.user) {
      if (req.user.role === 'ADMIN') {
        isAuthorized = true;
      } else if (req.user.role === 'PATIENT' && item.patient_id === req.user.id) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && !isTokenMatch) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized to cancel this request.' }
      });
    }

    await db.query(
      `UPDATE emergency_requests SET request_status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [requestId]
    );

    // If ambulance was assigned, reset its status to AVAILABLE
    if (item.assigned_ambulance_id) {
      await db.query(
        `UPDATE ambulances SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [item.assigned_ambulance_id]
      );
    }

    return res.status(200).json({
      success: true,
      data: { message: 'Emergency request cancelled successfully.' }
    });
  } catch (err) {
    next(err);
  }
}

async function autoAssignEmergencyRequest(req, res, next) {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid request ID.' } });
    }

    const { calculateHaversineDistance } = require('../utils/haversine');

    const reqRes = await db.query('SELECT * FROM emergency_requests WHERE id = $1', [requestId]);
    if (!reqRes.rows || reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Emergency request not found.' } });
    }

    const emergencyReq = reqRes.rows[0];

    if (emergencyReq.request_status !== 'PENDING') {
      return res.status(200).json({
        success: true,
        data: { request: emergencyReq, assigned: false, message: 'Request is no longer pending.' }
      });
    }

    // Query AVAILABLE ambulances excluding those that declined this request
    const availableRes = await db.query(
      `SELECT a.id, a.vehicle_number, a.ambulance_type, a.latitude, a.longitude, a.status
       FROM ambulances a
       WHERE a.status = 'AVAILABLE'
         AND a.id NOT IN (
           SELECT ambulance_id FROM dispatch_attempts WHERE request_id = $1 AND status = 'DECLINED'
         )`,
      [requestId]
    );

    const available = availableRes.rows || [];

    if (available.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          request: emergencyReq,
          assigned: false,
          message: 'No eligible available ambulances found at this moment.'
        }
      });
    }

    // Compute Haversine distance and sort ascending
    const patientLat = parseFloat(emergencyReq.pickup_latitude);
    const patientLon = parseFloat(emergencyReq.pickup_longitude);

    let candidateList = available.map(amb => {
      const ambLat = parseFloat(amb.latitude);
      const ambLon = parseFloat(amb.longitude);
      const distanceKm = calculateHaversineDistance(patientLat, patientLon, ambLat, ambLon);
      return { ...amb, distanceKm };
    });

    candidateList.sort((a, b) => a.distanceKm - b.distanceKm);
    const bestAmbulance = candidateList[0];

    // Assign nearest eligible ambulance
    await db.query(
      `UPDATE emergency_requests 
       SET assigned_ambulance_id = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [bestAmbulance.id, requestId]
    );

    const updatedReqRes = await db.query('SELECT * FROM emergency_requests WHERE id = $1', [requestId]);

    return res.status(200).json({
      success: true,
      data: {
        request: updatedReqRes.rows[0],
        assignedAmbulance: bestAmbulance,
        assigned: true
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNearbyAmbulances,
  createEmergencyRequest,
  getMyEmergencyRequests,
  getEmergencyRequestById,
  cancelEmergencyRequest,
  autoAssignEmergencyRequest
};

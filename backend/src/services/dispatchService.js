const db = require('../db/postgres');

/**
 * Valid legal transitions for Ambulance/Driver status state machine
 */
const AMBULANCE_STATE_TRANSITIONS = {
  OFF_DUTY: ['AVAILABLE'],
  AVAILABLE: ['BUSY', 'OFF_DUTY'],
  BUSY: ['EN_ROUTE', 'AVAILABLE'],
  EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['ON_TRIP', 'CANCELLED'],
  ON_TRIP: ['AVAILABLE', 'CANCELLED']
};

/**
 * Valid legal transitions for Emergency Request state machine
 */
const REQUEST_STATE_TRANSITIONS = {
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: []
};

/**
 * Valid legal transitions for Trip state machine
 */
const TRIP_STATE_TRANSITIONS = {
  ASSIGNED: ['EN_ROUTE', 'CANCELLED'],
  EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['PATIENT_PICKED_UP', 'CANCELLED'],
  PATIENT_PICKED_UP: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

function validateStatusTransition(currentStatus, targetStatus, type = 'AMBULANCE') {
  let allowed = [];
  if (type === 'AMBULANCE') allowed = AMBULANCE_STATE_TRANSITIONS[currentStatus] || [];
  else if (type === 'REQUEST') allowed = REQUEST_STATE_TRANSITIONS[currentStatus] || [];
  else if (type === 'TRIP') allowed = TRIP_STATE_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(targetStatus)) {
    const error = new Error(`Invalid ${type.toLowerCase()} status transition from '${currentStatus}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`);
    error.statusCode = 400;
    error.code = 'INVALID_STATUS_TRANSITION';
    throw error;
  }
  return true;
}

/**
 * Transaction-safe acceptance of an emergency request by a driver.
 * Guarantees no double-assignment race conditions using FOR UPDATE locks (returns 409 Conflict if already taken).
 */
async function acceptEmergencyRequest(requestId, driverId, ambulanceId) {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Verify Request exists and is PENDING
    const reqRes = await client.query(
      `SELECT id, request_status FROM emergency_requests WHERE id = $1 FOR UPDATE`,
      [requestId]
    );

    if (!reqRes.rows || reqRes.rows.length === 0) {
      const err = new Error('Emergency request not found.');
      err.statusCode = 404;
      err.code = 'REQUEST_NOT_FOUND';
      throw err;
    }

    const currentReq = reqRes.rows[0];
    if (currentReq.request_status !== 'PENDING') {
      const err = new Error('This emergency request has already been assigned or processed by another responder.');
      err.statusCode = 409;
      err.code = 'AMBULANCE_ALREADY_ASSIGNED';
      throw err;
    }

    // 2. Verify Ambulance is AVAILABLE and has no active trip
    const ambRes = await client.query(
      `SELECT id, status FROM ambulances WHERE id = $1 FOR UPDATE`,
      [ambulanceId]
    );

    if (!ambRes.rows || ambRes.rows.length === 0) {
      const err = new Error('Ambulance record not found.');
      err.statusCode = 404;
      err.code = 'AMBULANCE_NOT_FOUND';
      throw err;
    }

    const currentAmb = ambRes.rows[0];
    if (currentAmb.status !== 'AVAILABLE' && currentAmb.status !== 'BUSY') {
      const err = new Error('Your ambulance is currently not available for new dispatches.');
      err.statusCode = 409;
      err.code = 'AMBULANCE_UNAVAILABLE';
      throw err;
    }

    // Check partial unique index constraint on active trips
    const activeTripCheck = await client.query(
      `SELECT id FROM trips WHERE ambulance_id = $1 AND status IN ('ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'PATIENT_PICKED_UP') FOR UPDATE`,
      [ambulanceId]
    );

    if (activeTripCheck.rows && activeTripCheck.rows.length > 0) {
      const err = new Error('Your ambulance already has an active emergency trip in progress.');
      err.statusCode = 409;
      err.code = 'AMBULANCE_ALREADY_ON_TRIP';
      throw err;
    }

    // 3. Atomically update emergency_requests table
    await client.query(
      `UPDATE emergency_requests 
       SET request_status = 'ACCEPTED', assigned_ambulance_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [ambulanceId, requestId]
    );

    // 4. Atomically update ambulances status to EN_ROUTE
    await client.query(
      `UPDATE ambulances 
       SET status = 'EN_ROUTE', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [ambulanceId]
    );

    // 5. Update driver availability status
    await client.query(
      `UPDATE driver_profiles 
       SET availability_status = 'EN_ROUTE', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [driverId]
    );

    // 6. Create Trip record with explicit positional parameters
    const tripRes = await client.query(
      `INSERT INTO trips (request_id, ambulance_id, status)
       VALUES ($1, $2, $3)
       RETURNING id, status, started_at`,
      [requestId, ambulanceId, 'EN_ROUTE']
    );

    await client.query('COMMIT');

    return {
      success: true,
      requestId,
      ambulanceId,
      trip: tripRes.rows[0]
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    if (client.release) client.release();
  }
}

module.exports = {
  validateStatusTransition,
  acceptEmergencyRequest,
  AMBULANCE_STATE_TRANSITIONS,
  REQUEST_STATE_TRANSITIONS,
  TRIP_STATE_TRANSITIONS
};

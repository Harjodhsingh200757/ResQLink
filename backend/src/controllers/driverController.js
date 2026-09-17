const db = require('../db/postgres');
const ambulanceService = require('../services/ambulanceService');
const dispatchService = require('../services/dispatchService');
const { validateCoordinate } = require('../middleware/validatorMiddleware');
const { inMemoryMongoStore } = require('../db/mongodb');

async function getDriverAndAmbulance(userId) {
  const driverRes = await db.query('SELECT * FROM driver_profiles WHERE user_id = $1', [userId]);
  if (!driverRes.rows || driverRes.rows.length === 0) {
    const err = new Error('User does not possess an active driver profile.');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  const driver = driverRes.rows[0];

  const ambRes = await db.query('SELECT * FROM ambulances WHERE driver_id = $1', [driver.id]);
  if (!ambRes.rows || ambRes.rows.length === 0) {
    const err = new Error('No registered ambulance vehicle found for this driver profile.');
    err.statusCode = 404;
    err.code = 'NO_AMBULANCE';
    throw err;
  }
  const ambulance = ambRes.rows[0];

  return { driver, ambulance };
}

async function startDuty(req, res, next) {
  try {
    const { driver, ambulance } = await getDriverAndAmbulance(req.user.id);

    await db.query(
      `UPDATE driver_profiles 
       SET is_on_duty = $1, availability_status = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [true, 'AVAILABLE', driver.id]
    );

    await db.query(
      `UPDATE ambulances 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      ['AVAILABLE', ambulance.id]
    );

    return res.status(200).json({
      success: true,
      data: { message: 'On-duty status activated. Ambulance is now AVAILABLE for dispatches.', ambulanceId: ambulance.id }
    });
  } catch (err) {
    next(err);
  }
}

async function endDuty(req, res, next) {
  try {
    const { driver, ambulance } = await getDriverAndAmbulance(req.user.id);

    await db.query(
      `UPDATE driver_profiles 
       SET is_on_duty = $1, availability_status = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [false, 'OFF_DUTY', driver.id]
    );

    await db.query(
      `UPDATE ambulances 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      ['OFF_DUTY', ambulance.id]
    );

    return res.status(200).json({
      success: true,
      data: { message: 'Off-duty status activated.', ambulanceId: ambulance.id }
    });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_STATUS', message: 'Status value is required.' } });
    }

    const { driver, ambulance } = await getDriverAndAmbulance(req.user.id);

    // Validate legal state transition
    dispatchService.validateStatusTransition(ambulance.status, status, 'AMBULANCE');

    await db.query(
      `UPDATE ambulances 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`, 
      [status, ambulance.id]
    );

    await db.query(
      `UPDATE driver_profiles 
       SET availability_status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`, 
      [status, driver.id]
    );

    return res.status(200).json({
      success: true,
      data: { status, ambulanceId: ambulance.id }
    });
  } catch (err) {
    next(err);
  }
}

async function updateLocation(req, res, next) {
  try {
    const { latitude, longitude, ambulanceId: customAmbId } = req.body;

    const { ambulance } = await getDriverAndAmbulance(req.user.id);

    // SECURITY CHECK: Reject client attempts to modify another driver's ambulance location
    if (customAmbId && Number(customAmbId) !== Number(ambulance.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: "You are not authorized to update another driver's ambulance location." }
      });
    }

    const coordErr = validateCoordinate(latitude, longitude);
    if (coordErr) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: coordErr }
      });
    }

    const result = await ambulanceService.updateAmbulanceLocation(ambulance.id, latitude, longitude);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function getIncomingRequests(req, res, next) {
  try {
    const { driver, ambulance } = await getDriverAndAmbulance(req.user.id);

    // OFF DUTY DRIVERS MUST NOT RECEIVE ANY INCOMING EMERGENCY REQUESTS
    if (!driver.is_on_duty || ambulance.status === 'OFF_DUTY') {
      return res.status(200).json({
        success: true,
        data: { requests: [] }
      });
    }

    const result = await db.query(
      `SELECT r.*, u.name as patient_name
       FROM emergency_requests r
       LEFT JOIN users u ON r.patient_id = u.id
       WHERE r.request_status = 'PENDING'
         AND (r.assigned_ambulance_id IS NULL OR r.assigned_ambulance_id = $1)
         AND r.id NOT IN (
           SELECT request_id FROM dispatch_attempts WHERE ambulance_id = $1 AND status = 'DECLINED'
         )
       ORDER BY r.created_at DESC`,
      [ambulance.id]
    );

    return res.status(200).json({
      success: true,
      data: { requests: result.rows || [] }
    });
  } catch (err) {
    next(err);
  }
}

async function acceptRequest(req, res, next) {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid request ID provided.' } });
    }

    const { driver, ambulance } = await getDriverAndAmbulance(req.user.id);

    if (!driver.is_on_duty || ambulance.status === 'OFF_DUTY') {
      return res.status(403).json({
        success: false,
        error: { code: 'DRIVER_OFF_DUTY', message: 'You must be ON DUTY to accept emergency requests.' }
      });
    }

    const result = await dispatchService.acceptEmergencyRequest(requestId, driver.id, ambulance.id);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId) || requestId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid request ID provided.' } });
    }

    const { driver, ambulance } = await getDriverAndAmbulance(req.user.id);

    if (!driver.is_on_duty || ambulance.status === 'OFF_DUTY') {
      return res.status(403).json({
        success: false,
        error: { code: 'DRIVER_OFF_DUTY', message: 'You must be ON DUTY to decline emergency requests.' }
      });
    }

    const reqRes = await db.query('SELECT * FROM emergency_requests WHERE id = $1', [requestId]);
    if (!reqRes.rows || reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Emergency request not found.' } });
    }

    const emergencyReq = reqRes.rows[0];

    // 1. Log DECLINED attempt in dispatch_attempts
    await db.query(
      `INSERT INTO dispatch_attempts (request_id, ambulance_id, driver_id, status, responded_at)
       VALUES ($1, $2, $3, 'DECLINED', CURRENT_TIMESTAMP)`,
      [requestId, ambulance.id, driver.id]
    );

    // 2. Unassign this ambulance if assigned, keeping request PENDING for auto-search or other drivers
    if (emergencyReq.assigned_ambulance_id === ambulance.id) {
      await db.query(
        `UPDATE emergency_requests 
         SET assigned_ambulance_id = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [null, requestId]
      );
    }

    inMemoryMongoStore.system_events.push({
      eventType: 'REQUEST_REJECTED',
      actorId: driver.id,
      role: 'DRIVER',
      payload: { requestId, ambulanceId: ambulance.id },
      timestamp: new Date()
    });

    return res.status(200).json({
      success: true,
      data: {
        message: 'Emergency request declined by driver.',
        requestId,
        requestStatus: 'PENDING',
        unassignedAmbulanceId: ambulance.id
      }
    });
  } catch (err) {
    next(err);
  }
}

async function startTrip(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId) || tripId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid trip ID.' } });
    }

    const { ambulance } = await getDriverAndAmbulance(req.user.id);

    const tripRes = await db.query('SELECT * FROM trips WHERE id = $1', [tripId]);
    if (!tripRes.rows || tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found.' } });
    }

    const trip = tripRes.rows[0];

    if (Number(trip.ambulance_id) !== Number(ambulance.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to operate this trip.' }
      });
    }

    dispatchService.validateStatusTransition(trip.status, 'EN_ROUTE', 'TRIP');

    await db.query(
      `UPDATE trips SET status = $1, started_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['EN_ROUTE', tripId]
    );

    await db.query(
      `UPDATE ambulances SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['EN_ROUTE', ambulance.id]
    );

    return res.status(200).json({
      success: true,
      data: { tripId, status: 'EN_ROUTE' }
    });
  } catch (err) {
    next(err);
  }
}

async function markArrived(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId) || tripId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid trip ID.' } });
    }

    const { ambulance } = await getDriverAndAmbulance(req.user.id);

    const tripRes = await db.query('SELECT * FROM trips WHERE id = $1', [tripId]);
    if (!tripRes.rows || tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found.' } });
    }

    const trip = tripRes.rows[0];

    if (Number(trip.ambulance_id) !== Number(ambulance.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to operate this trip.' }
      });
    }

    dispatchService.validateStatusTransition(trip.status, 'ARRIVED', 'TRIP');

    await db.query(
      `UPDATE trips SET status = $1, arrived_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['ARRIVED', tripId]
    );

    await db.query(
      `UPDATE ambulances SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['ARRIVED', ambulance.id]
    );

    return res.status(200).json({
      success: true,
      data: { tripId, status: 'ARRIVED', arrivedAt: new Date() }
    });
  } catch (err) {
    next(err);
  }
}

async function markPatientPickedUp(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId) || tripId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid trip ID.' } });
    }

    const { ambulance } = await getDriverAndAmbulance(req.user.id);

    const tripRes = await db.query('SELECT * FROM trips WHERE id = $1', [tripId]);
    if (!tripRes.rows || tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found.' } });
    }

    const trip = tripRes.rows[0];

    if (Number(trip.ambulance_id) !== Number(ambulance.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to operate this trip.' }
      });
    }

    dispatchService.validateStatusTransition(trip.status, 'PATIENT_PICKED_UP', 'TRIP');

    await db.query(
      `UPDATE trips SET status = $1, patient_picked_up_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['PATIENT_PICKED_UP', tripId]
    );

    await db.query(
      `UPDATE ambulances SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['ON_TRIP', ambulance.id]
    );

    return res.status(200).json({
      success: true,
      data: { tripId, status: 'PATIENT_PICKED_UP', pickedUpAt: new Date() }
    });
  } catch (err) {
    next(err);
  }
}

async function completeTrip(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId) || tripId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid trip ID.' } });
    }

    const { ambulance } = await getDriverAndAmbulance(req.user.id);

    const tripRes = await db.query('SELECT * FROM trips WHERE id = $1', [tripId]);
    if (!tripRes.rows || tripRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found.' } });
    }

    const trip = tripRes.rows[0];

    if (Number(trip.ambulance_id) !== Number(ambulance.id)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not authorized to operate this trip.' }
      });
    }

    dispatchService.validateStatusTransition(trip.status, 'COMPLETED', 'TRIP');

    // 1. Mark Trip COMPLETED
    await db.query(
      `UPDATE trips SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['COMPLETED', tripId]
    );

    // 2. Mark Emergency Request COMPLETED
    await db.query(
      `UPDATE emergency_requests SET request_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['COMPLETED', trip.request_id]
    );

    // 3. Mark Ambulance AVAILABLE again
    await db.query(
      `UPDATE ambulances SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['AVAILABLE', ambulance.id]
    );

    return res.status(200).json({
      success: true,
      data: { tripId, status: 'COMPLETED', completedAt: new Date() }
    });
  } catch (err) {
    next(err);
  }
}

async function getDriverTrips(req, res, next) {
  try {
    const { driver } = await getDriverAndAmbulance(req.user.id);

    const result = await db.query(
      `SELECT t.*, 
              r.pickup_latitude, r.pickup_longitude, r.description, r.request_status, r.created_at as request_created_at,
              a.vehicle_number, a.ambulance_type
       FROM trips t
       JOIN ambulances a ON t.ambulance_id = a.id
       JOIN emergency_requests r ON t.request_id = r.id
       WHERE a.driver_id = $1
       ORDER BY t.started_at DESC`,
      [driver.id]
    );

    return res.status(200).json({
      success: true,
      data: { trips: result.rows || [] }
    });
  } catch (err) {
    next(err);
  }
}

async function getDriverTripById(req, res, next) {
  try {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId) || tripId <= 0) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'Invalid trip ID.' } });
    }

    const { driver } = await getDriverAndAmbulance(req.user.id);

    const result = await db.query(
      `SELECT t.*, 
              r.pickup_latitude, r.pickup_longitude, r.description, r.request_status, r.created_at as request_created_at,
              a.vehicle_number, a.ambulance_type
       FROM trips t
       JOIN ambulances a ON t.ambulance_id = a.id
       JOIN emergency_requests r ON t.request_id = r.id
       WHERE t.id = $1 AND a.driver_id = $2`,
      [tripId, driver.id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found.' } });
    }

    return res.status(200).json({
      success: true,
      data: { trip: result.rows[0] }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startDuty,
  endDuty,
  updateStatus,
  updateLocation,
  getIncomingRequests,
  acceptRequest,
  rejectRequest,
  startTrip,
  markArrived,
  markPatientPickedUp,
  completeTrip,
  getDriverTrips,
  getDriverTripById
};

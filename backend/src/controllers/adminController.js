const db = require('../db/postgres');
const { inMemoryMongoStore } = require('../db/mongodb');

async function getAmbulances(req, res, next) {
  try {
    const result = await db.query(
      `SELECT a.*, d.phone as driver_phone, d.is_on_duty, u.name as driver_name
       FROM ambulances a
       LEFT JOIN driver_profiles d ON a.driver_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       ORDER BY a.id ASC`
    );

    return res.status(200).json({
      success: true,
      data: { ambulances: result.rows || [] }
    });
  } catch (err) {
    next(err);
  }
}

async function getRequests(req, res, next) {
  try {
    const result = await db.query(
      `SELECT r.*, u.name as patient_name, u.email as patient_email,
              a.vehicle_number, a.status as ambulance_status
       FROM emergency_requests r
       LEFT JOIN users u ON r.patient_id = u.id
       LEFT JOIN ambulances a ON r.assigned_ambulance_id = a.id
       ORDER BY r.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      data: { requests: result.rows || [] }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * SQL JOIN Demonstration across 5 relational tables:
 * Trip JOIN Ambulance JOIN DriverProfile JOIN User (Driver) JOIN EmergencyRequest JOIN User (Patient)
 */
async function getTrips(req, res, next) {
  try {
    const result = await db.query(
      `SELECT t.id as trip_id, t.status as trip_status, t.started_at, t.arrived_at, t.patient_picked_up_at, t.completed_at,
              a.vehicle_number, a.ambulance_type,
              d.license_number, d.phone as driver_phone,
              du.name as driver_name,
              pu.name as patient_name, pu.email as patient_email,
              r.description as emergency_description, r.pickup_latitude, r.pickup_longitude
       FROM trips t
       INNER JOIN ambulances a ON t.ambulance_id = a.id
       LEFT JOIN driver_profiles d ON a.driver_id = d.id
       LEFT JOIN users du ON d.user_id = du.id
       INNER JOIN emergency_requests r ON t.request_id = r.id
       INNER JOIN users pu ON r.patient_id = pu.id
       ORDER BY t.started_at DESC`
    );

    return res.status(200).json({
      success: true,
      data: { trips: result.rows || [] }
    });
  } catch (err) {
    next(err);
  }
}

async function getStatistics(req, res, next) {
  try {
    const ambRes = await db.query('SELECT status, COUNT(*) as count FROM ambulances GROUP BY status');
    const reqRes = await db.query('SELECT request_status, COUNT(*) as count FROM emergency_requests GROUP BY request_status');
    const tripRes = await db.query('SELECT status, COUNT(*) as count FROM trips GROUP BY status');

    const ambCounts = { AVAILABLE: 0, BUSY: 0, EN_ROUTE: 0, ARRIVED: 0, ON_TRIP: 0, OFF_DUTY: 0 };
    (ambRes.rows || []).forEach(row => {
      ambCounts[row.status] = parseInt(row.count, 10);
    });

    const totalAmbulances = Object.values(ambCounts).reduce((a, b) => a + b, 0);

    let totalRequests = 0;
    (reqRes.rows || []).forEach(row => {
      totalRequests += parseInt(row.count, 10);
    });

    let completedTrips = 0;
    (tripRes.rows || []).forEach(row => {
      if (row.status === 'COMPLETED') completedTrips += parseInt(row.count, 10);
    });

    return res.status(200).json({
      success: true,
      data: {
        statistics: {
          totalAmbulances,
          available: ambCounts.AVAILABLE,
          busy: ambCounts.BUSY,
          enRoute: ambCounts.EN_ROUTE,
          onTrip: ambCounts.ON_TRIP,
          offDuty: ambCounts.OFF_DUTY,
          totalRequests,
          completedTrips
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getLocations(req, res, next) {
  try {
    const result = await db.query(
      `SELECT a.id, a.vehicle_number, a.status, a.latitude, a.longitude, a.last_location_update
       FROM ambulances a`
    );

    return res.status(200).json({
      success: true,
      data: { locations: result.rows || [] }
    });
  } catch (err) {
    next(err);
  }
}

async function getEvents(req, res, next) {
  try {
    const events = inMemoryMongoStore.system_events || [];
    return res.status(200).json({
      success: true,
      data: { events }
    });
  } catch (err) {
    next(err);
  }
}

async function updateAmbulanceStatus(req, res, next) {
  try {
    const ambulanceId = parseInt(req.params.id, 10);
    const { status } = req.body;

    await db.query('UPDATE ambulances SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, ambulanceId]);

    return res.status(200).json({
      success: true,
      data: { message: `Ambulance #${ambulanceId} status updated to ${status}.` }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAmbulances,
  getRequests,
  getTrips,
  getStatistics,
  getLocations,
  getEvents,
  updateAmbulanceStatus
};

const db = require('../db/postgres');
const { calculateHaversineDistance } = require('../utils/haversine');
const config = require('../config/env');

async function findNearbyAvailableAmbulances(lat, lon, maxRadiusKm = 50) {
  const patientLat = parseFloat(lat);
  const patientLon = parseFloat(lon);

  if (isNaN(patientLat) || isNaN(patientLon)) {
    throw new Error('Invalid latitude or longitude provided.');
  }

  // Query database for all AVAILABLE ambulances
  const result = await db.query(
    `SELECT a.id, a.vehicle_number, a.ambulance_type, a.latitude, a.longitude, 
            a.status, a.last_location_update, d.phone as driver_phone, u.name as driver_name
     FROM ambulances a
     LEFT JOIN driver_profiles d ON a.driver_id = d.id
     LEFT JOIN users u ON d.user_id = u.id
     WHERE a.status = 'AVAILABLE'`
  );

  const available = result.rows || [];

  const list = available.map(amb => {
    const ambLat = parseFloat(amb.latitude);
    const ambLon = parseFloat(amb.longitude);
    const distanceKm = calculateHaversineDistance(patientLat, patientLon, ambLat, ambLon);
    const etaMinutes = calculateETA(distanceKm);

    return {
      id: amb.id,
      vehicleNumber: amb.vehicle_number,
      ambulanceType: amb.ambulance_type,
      latitude: ambLat,
      longitude: ambLon,
      status: amb.status,
      driverName: amb.driver_name || 'Assigned Driver',
      driverPhone: amb.driver_phone || '+91 98765 43210',
      lastUpdated: amb.last_location_update,
      distanceKm,
      estimatedMinutes: etaMinutes
    };
  });

  // Filter within radius and sort ascending by distance
  return list
    .filter(item => item.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function calculateETA(distanceKm) {
  const speed = config.averageAmbulanceSpeedKmh || 40; // km/h
  const timeHours = distanceKm / speed;
  const minutes = Math.ceil(timeHours * 60);
  return Math.max(minutes, 1); // At least 1 minute
}

async function updateAmbulanceLocation(ambulanceId, latitude, longitude) {
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error('Invalid coordinates for location update.');
  }

  // 1. Update current location in ambulances table
  await db.query(
    `UPDATE ambulances 
     SET latitude = $1, longitude = $2, last_location_update = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [lat, lon, ambulanceId]
  );

  // 2. Append entry into location history
  await db.query(
    `INSERT INTO ambulance_location_history (ambulance_id, latitude, longitude, recorded_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
    [ambulanceId, lat, lon]
  );

  return { success: true, ambulanceId, latitude: lat, longitude: lon, recordedAt: new Date() };
}

module.exports = {
  findNearbyAvailableAmbulances,
  calculateETA,
  updateAmbulanceLocation
};

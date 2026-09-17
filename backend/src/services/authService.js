const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/postgres');
const config = require('../config/env');

async function registerUser({ name, email, password, role = 'PATIENT', licenseNumber, phone, vehicleNumber }) {
  const normalizedEmail = email.trim().toLowerCase();

  // SECURITY FIX: Public registration MUST NOT allow creation of ADMIN accounts!
  const safeRole = (role === 'DRIVER') ? 'DRIVER' : 'PATIENT';

  let normalizedVehicleNumber = null;
  if (safeRole === 'DRIVER') {
    const ph = (phone && typeof phone === 'string') ? phone.trim() : '';
    const rawVehicle = (vehicleNumber && typeof vehicleNumber === 'string') ? vehicleNumber.trim() : '';

    if (!ph || ph.length < 7) {
      const err = new Error('A valid phone number is required for driver registration.');
      err.statusCode = 400;
      err.code = 'INVALID_PHONE';
      throw err;
    }

    if (!rawVehicle || rawVehicle.length < 3) {
      const err = new Error('A valid ambulance vehicle number is required for driver registration.');
      err.statusCode = 400;
      err.code = 'INVALID_VEHICLE_NUMBER';
      throw err;
    }

    normalizedVehicleNumber = rawVehicle.toUpperCase();

    // Check unique vehicle_number
    const existingVehicle = await db.query(
      'SELECT id FROM ambulances WHERE UPPER(vehicle_number) = $1',
      [normalizedVehicleNumber]
    );
    if (existingVehicle.rows && existingVehicle.rows.length > 0) {
      const err = new Error('An ambulance with this vehicle number is already registered.');
      err.statusCode = 409;
      err.code = 'VEHICLE_NUMBER_EXISTS';
      throw err;
    }
  }

  // Check if user already exists
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows && existing.rows.length > 0) {
    const err = new Error('An account with this email address already exists.');
    err.statusCode = 409;
    err.code = 'EMAIL_EXISTS';
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Insert User
  const userRes = await db.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, normalizedEmail, passwordHash, safeRole]
  );

  const user = userRes.rows[0];

  // If registering as DRIVER, create driver profile & ambulance entry using positional parameters
  if (safeRole === 'DRIVER') {
    const lic = (licenseNumber && licenseNumber.trim()) ? licenseNumber.trim() : `LIC-${Date.now().toString().slice(-6)}`;
    const ph = phone.trim();

    const driverRes = await db.query(
      `INSERT INTO driver_profiles (user_id, license_number, phone, is_on_duty, availability_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [user.id, lic, ph, false, 'OFF_DUTY']
    );
    const driverProfileId = driverRes.rows[0].id;

    // Create ambulance record for driver (default OFF_DUTY until driver clicks START DUTY)
    await db.query(
      `INSERT INTO ambulances (driver_id, vehicle_number, ambulance_type, latitude, longitude, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [driverProfileId, normalizedVehicleNumber, 'ADVANCED', 30.9009, 75.8573, 'OFF_DUTY']
    );
  }

  const token = generateToken(user);
  return { user, token };
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  if (!result.rows || result.rows.length === 0) {
    const err = new Error('Invalid email address or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid email address or password.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const token = generateToken(user);
  delete user.password_hash;

  return { user, token };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

module.exports = {
  registerUser,
  loginUser,
  generateToken
};

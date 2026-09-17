const authService = require('../services/authService');
const db = require('../db/postgres');

async function register(req, res, next) {
  try {
    const { name, email, password, role, licenseNumber, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Name, email, and password are required.' }
      });
    }

    const { user, token } = await authService.registerUser({
      name, email, password, role, licenseNumber, phone
    });

    return res.status(201).json({
      success: true,
      data: { user, token }
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and password are required.' }
      });
    }

    const { user, token } = await authService.loginUser({ email, password });

    return res.status(200).json({
      success: true,
      data: { user, token }
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  return res.status(200).json({
    success: true,
    data: { message: 'Logged out successfully.' }
  });
}

async function getMe(req, res, next) {
  try {
    const userRes = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!userRes.rows || userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User profile not found.' }
      });
    }

    const user = userRes.rows[0];

    // If driver, fetch driver profile details
    if (user.role === 'DRIVER') {
      const driverRes = await db.query(
        `SELECT d.*, a.id as ambulance_id, a.vehicle_number, a.status as ambulance_status, a.latitude, a.longitude 
         FROM driver_profiles d
         LEFT JOIN ambulances a ON a.driver_id = d.id
         WHERE d.user_id = $1`,
        [user.id]
      );
      if (driverRes.rows && driverRes.rows.length > 0) {
        const dp = driverRes.rows[0];
        user.driverProfile = {
          ...dp,
          ambulance: dp.ambulance_id ? {
            id: dp.ambulance_id,
            vehicle_number: dp.vehicle_number,
            status: dp.ambulance_status,
            latitude: dp.latitude,
            longitude: dp.longitude
          } : null
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe
};

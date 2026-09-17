/**
 * Request Validation Middleware for ResQLink API
 */

function validateCoordinate(lat, lon) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    return 'Latitude must be a valid number between -90 and 90.';
  }
  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    return 'Longitude must be a valid number between -180 and 180.';
  }
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email address is required.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return 'Invalid email address format.';
  return null;
}

function validateRegistrationInput(req, res, next) {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_NAME', message: 'Name must be a non-empty string.' }
    });
  }

  const emailErr = validateEmail(email);
  if (emailErr) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_EMAIL', message: emailErr }
    });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters long.' }
    });
  }

  next();
}

function validateCoordinatesInput(req, res, next) {
  const lat = req.body.latitude !== undefined ? req.body.latitude : (req.body.pickup_latitude !== undefined ? req.body.pickup_latitude : req.query.lat);
  const lon = req.body.longitude !== undefined ? req.body.longitude : (req.body.pickup_longitude !== undefined ? req.body.pickup_longitude : req.query.lon);

  if (lat !== undefined || lon !== undefined) {
    const err = validateCoordinate(lat, lon);
    if (err) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: err }
      });
    }
  }

  next();
}

function validateEmergencyRequestInput(req, res, next) {
  const { pickup_latitude, pickup_longitude, description } = req.body;

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
      error: { code: 'INVALID_DESCRIPTION', message: 'Emergency description text is required.' }
    });
  }

  next();
}

module.exports = {
  validateCoordinate,
  validateEmail,
  validateRegistrationInput,
  validateCoordinatesInput,
  validateEmergencyRequestInput
};

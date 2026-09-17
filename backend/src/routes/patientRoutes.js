const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authMiddleware = require('../middleware/authMiddleware');
const { optionalAuthMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateEmergencyRequestInput, validateCoordinatesInput } = require('../middleware/validatorMiddleware');

// Public or Patient accessible endpoint for searching nearby ambulances
router.get(
  '/ambulances/nearby', 
  optionalAuthMiddleware,
  validateCoordinatesInput,
  patientController.getNearbyAmbulances
);

// Emergency request creation: Authenticated PATIENT or ADMIN
router.post(
  '/emergency-requests', 
  authMiddleware, 
  roleMiddleware(['PATIENT', 'ADMIN']),
  validateEmergencyRequestInput,
  patientController.createEmergencyRequest
);

// Authenticated patients only: Get list of user's emergency requests
router.get(
  '/emergency-requests', 
  authMiddleware, 
  roleMiddleware(['PATIENT', 'ADMIN']),
  patientController.getMyEmergencyRequests
);

// Emergency request details: Authenticated user (PATIENT, DRIVER, or ADMIN)
router.get(
  '/emergency-requests/:id', 
  authMiddleware, 
  roleMiddleware(['PATIENT', 'DRIVER', 'ADMIN']),
  patientController.getEmergencyRequestById
);

// Cancel emergency request: Authenticated user (PATIENT or ADMIN)
router.patch(
  '/emergency-requests/:id/cancel', 
  authMiddleware, 
  roleMiddleware(['PATIENT', 'ADMIN']),
  patientController.cancelEmergencyRequest
);

// Auto-assign nearest available eligible ambulance to request
router.post(
  '/emergency-requests/:id/auto-assign',
  authMiddleware,
  roleMiddleware(['PATIENT', 'ADMIN']),
  patientController.autoAssignEmergencyRequest
);

module.exports = router;

const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validateCoordinatesInput } = require('../middleware/validatorMiddleware');

// All driver endpoints require authentication AND DRIVER role authorization
router.use(authMiddleware, roleMiddleware(['DRIVER']));

// Duty lifecycle
router.post('/duty/start', driverController.startDuty);
router.post('/duty/end', driverController.endDuty);

// Status and GPS updates
router.patch('/status', driverController.updateStatus);
router.post('/location', validateCoordinatesInput, driverController.updateLocation);

// Dispatch requests management
router.get('/requests', driverController.getIncomingRequests);
router.post('/requests/:id/accept', driverController.acceptRequest);
router.post('/requests/:id/reject', driverController.rejectRequest);
router.post('/requests/:id/decline', driverController.rejectRequest);

// Trip workflow execution & queries
router.get('/trips', driverController.getDriverTrips);
router.get('/trips/:id', driverController.getDriverTripById);
router.post('/trips/:id/start', driverController.startTrip);
router.post('/trips/:id/arrived', driverController.markArrived);
router.post('/trips/:id/patient-picked-up', driverController.markPatientPickedUp);
router.post('/trips/:id/complete', driverController.completeTrip);

module.exports = router;

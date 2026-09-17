const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Protect all admin endpoints with Admin role authorization
router.use(authMiddleware, roleMiddleware(['ADMIN']));

router.get('/ambulances', adminController.getAmbulances);
router.get('/requests', adminController.getRequests);
router.get('/trips', adminController.getTrips);
router.get('/statistics', adminController.getStatistics);
router.get('/locations', adminController.getLocations);
router.get('/events', adminController.getEvents);
router.patch('/ambulances/:id/status', adminController.updateAmbulanceStatus);

module.exports = router;

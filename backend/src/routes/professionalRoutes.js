const express = require('express');
const professionalController = require('../controllers/professionalController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', protect, professionalController.getDashboard);
router.put('/appointment/:id/confirm', protect, professionalController.confirmAppointment);
router.put('/appointment/:id/cancel', protect, professionalController.cancelAppointment);
router.post('/appointment/:id/message', protect, professionalController.addAppointmentMessage);
router.post('/prescription', protect, professionalController.issuePrescription);
router.get('/sos', protect, professionalController.getActiveSOS);
router.post('/sos/:id/accept', protect, professionalController.acceptSOS);

const reportController = require('../controllers/reportController');
router.get('/report', protect, reportController.getProfessionalReport);

module.exports = router;

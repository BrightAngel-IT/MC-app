const express = require('express');
const patientController = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/profile', protect, patientController.getProfile);

// Search endpoints
router.get('/doctors', protect, patientController.getVerifiedDoctors);
router.get('/nurses', protect, patientController.getVerifiedNurses);
router.get('/labtechs', protect, patientController.getVerifiedLabTechs);
router.get('/lab-techs', protect, patientController.getVerifiedLabTechs);
router.get('/paramedics', protect, patientController.getVerifiedParamedics);
router.get('/caregivers', protect, patientController.getVerifiedCaregivers);

// Dashboard
router.get('/dashboard', protect, patientController.getDashboard);

// Appointments
router.post('/appointment', protect, patientController.bookAppointment);
router.get('/appointments', protect, patientController.getAppointments);
router.post('/appointment/:id/message', protect, patientController.addAppointmentMessage);
router.put('/appointment/:id/reschedule', protect, patientController.rescheduleAppointment);
router.put('/appointment/:id/cancel', protect, patientController.cancelAppointment);

// Emergency
router.post('/sos', protect, patientController.triggerSOS);

// Pharmacy & Prescriptions
router.get('/prescriptions', protect, patientController.getPrescriptions);
router.get('/pharmacies', protect, patientController.getPharmacists);
router.get('/pharmacists', protect, patientController.getPharmacists);
router.get('/pharmacists/:id/products', protect, patientController.getPharmacistProducts);
router.get('/products', protect, patientController.getProducts);
router.post('/prescription/send', protect, patientController.createOrder);
router.put('/prescription/:id/cancel', protect, patientController.cancelOrder);
router.post('/prescription/:id/message', protect, patientController.replyToOrder);
router.put('/prescription/:id/status', protect, patientController.updatePrescriptionStatus);

const reportController = require('../controllers/reportController');
router.get('/report', protect, reportController.getPatientReport);

router.delete('/appointment/:id', protect, patientController.deleteAppointment);

module.exports = router;

const express = require('express');
const router = express.Router();
const {getPending,approveUser,rejectUser,undoRejectUser,getRejected,deleteUser,getAllUsers,getStats} = require('../controllers/adminController');
const {protect} = require('../middleware/authMiddleware');

router.get('/pending',protect,getPending);
router.put('/approve/:userId',protect,approveUser);
router.put('/reject/:userId',protect,rejectUser);
router.put('/undo-reject/:userId',protect,undoRejectUser);
router.get('/rejected',protect,getRejected);
router.delete('/user/:userId',protect,deleteUser);
router.get('/users',protect,getAllUsers);
router.get('/stats',protect,getStats);

const reportController = require('../controllers/reportController');
router.get('/report', protect, reportController.getAdminReport);

module.exports = router;
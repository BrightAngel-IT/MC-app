const express = require('express');
const router = express.Router();
const {getPending,approveUser,rejectUser,undoRejectUser,getRejected,deleteUser,getAllUsers,getStats,getSettings,updateSetting} = require('../controllers/adminController');
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

router.get('/settings', protect, getSettings);
router.put('/settings', protect, updateSetting);

// Safe migration trigger for cPanel environments without SSH terminal
const { exec } = require('child_process');
router.get('/deploy-migrate', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'brightangel_deploy_2026') {
    return res.status(403).json({ message: 'Unauthorized. Secret key invalid.' });
  }
  exec('npx prisma db push && npx prisma generate', (error, stdout, stderr) => {
    if (error) {
      console.error('Migration error:', error);
      return res.status(500).json({ success: false, error: error.message, stderr });
    }
    return res.status(200).json({ success: true, message: 'Prisma DB push and client generation succeeded!', stdout });
  });
});

module.exports = router;
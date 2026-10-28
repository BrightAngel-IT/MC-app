const express = require('express');
const router = express.Router();
const {getPending,approveUser,rejectUser,undoRejectUser,getRejected,deleteUser,getAllUsers,getStats,getSettings,updateSetting,getAllAppointments} = require('../controllers/adminController');
const {protect} = require('../middleware/authMiddleware');

router.get('/pending',protect,getPending);
router.put('/approve/:userId',protect,approveUser);
router.put('/reject/:userId',protect,rejectUser);
router.put('/undo-reject/:userId',protect,undoRejectUser);
router.get('/rejected',protect,getRejected);
router.delete('/user/:userId',protect,deleteUser);
router.get('/users',protect,getAllUsers);
router.get('/stats',protect,getStats);
router.get('/appointments',protect,getAllAppointments);

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

const fs = require('fs');
const path = require('path');
router.get('/deploy-fix-uploads', async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'brightangel_deploy_2026') {
    return res.status(403).json({ message: 'Unauthorized. Secret key invalid.' });
  }

  try {
    const baseUploads = path.join(__dirname, '../../public/uploads');
    const subfolders = ['licenses', 'ids', 'products', 'elder-homes', 'elder-home-posts', 'professionals', 'bills'];
    const results = {};

    if (!fs.existsSync(baseUploads)) {
      fs.mkdirSync(baseUploads, { recursive: true });
    }

    subfolders.forEach(sub => {
      const p = path.join(baseUploads, sub);
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
      }
      try {
        const files = fs.readdirSync(p);
        results[sub] = { exists: true, count: files.length, sample: files.slice(0, 5) };
      } catch (e) {
        results[sub] = { exists: false, error: e.message };
      }
    });

    // Check if there is an uploads directory in domain root or parent directories
    let domainRoot = '/home/u187279157/domains/mcbackend.crescereluna.com';
    let sharedUploads = path.join(domainRoot, 'public_html/uploads');
    let hbuildsUploads = path.join(domainRoot, 'uploads');
    
    const extraDirs = {
      sharedUploads: { path: sharedUploads, exists: fs.existsSync(sharedUploads) },
      hbuildsUploads: { path: hbuildsUploads, exists: fs.existsSync(hbuildsUploads) }
    };

    if (fs.existsSync(sharedUploads)) {
      try { extraDirs.sharedUploads.files = fs.readdirSync(sharedUploads); } catch (e) {}
    }
    if (fs.existsSync(hbuildsUploads)) {
      try { extraDirs.hbuildsUploads.files = fs.readdirSync(hbuildsUploads); } catch (e) {}
    }

    return res.status(200).json({
      success: true,
      cwd: process.cwd(),
      dirname: __dirname,
      baseUploads,
      results,
      extraDirs
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
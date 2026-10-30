const express = require('express');
const router = express.Router();
const {getPending,approveUser,rejectUser,undoRejectUser,getRejected,deleteUser,getAllUsers,getStats,getSettings,updateSetting,getAllAppointments} = require('../controllers/adminController');
const {getProfessionalWalletByAdmin, getAllFinancialLedger} = require('../controllers/walletController');
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
router.get('/wallet/:professionalId',protect,getProfessionalWalletByAdmin);
router.get('/financial-ledger',protect,getAllFinancialLedger);

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

    // Scan parent directories
    let hbuildsRoot = path.join(process.cwd(), '../../../..'); // /home/u187279157/domains/mcbackend.crescereluna.com
    let hbuildsVersions = path.join(process.cwd(), '../..'); // versions
    
    let domainDirs = [];
    try { domainDirs = fs.readdirSync(hbuildsRoot); } catch(e) {}
    
    let allVersions = [];
    try { allVersions = fs.readdirSync(hbuildsVersions); } catch(e) {}

    // Find any license images across versions and copy them to current baseUploads
    let recoveredFiles = [];
    allVersions.forEach(ver => {
      const verUploads = path.join(hbuildsVersions, ver, 'nodejs/public/uploads');
      if (fs.existsSync(verUploads)) {
        subfolders.forEach(sub => {
          const srcSub = path.join(verUploads, sub);
          const destSub = path.join(baseUploads, sub);
          if (fs.existsSync(srcSub)) {
            const files = fs.readdirSync(srcSub);
            files.forEach(file => {
              const srcFile = path.join(srcSub, file);
              const destFile = path.join(destSub, file);
              if (!fs.existsSync(destFile)) {
                fs.copyFileSync(srcFile, destFile);
                recoveredFiles.push(`${sub}/${file} from ${ver}`);
              }
            });
          }
        });
      }
    });

    return res.status(200).json({
      success: true,
      cwd: process.cwd(),
      dirname: __dirname,
      baseUploads,
      domainDirs,
      versionCount: allVersions.length,
      recoveredFiles,
      results
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/deploy-sync-file', express.raw({ type: '*/*', limit: '10mb' }), async (req, res) => {
  const secret = req.query.secret;
  if (secret !== 'brightangel_deploy_2026') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const folder = req.query.folder; // 'licenses', 'ids', etc.
  const filename = req.query.filename;
  if (!folder || !filename) {
    return res.status(400).json({ message: 'folder and filename required' });
  }
  try {
    const targetDir = path.join(__dirname, '../../public/uploads', folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetFile = path.join(targetDir, filename);
    fs.writeFileSync(targetFile, req.body);
    return res.status(200).json({ success: true, file: targetFile, size: req.body.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
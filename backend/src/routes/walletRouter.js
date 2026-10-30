const express = require('express');
const router = express.Router();
const {
    getMyWallet, 
    findBlockedWallets, 
    blockwallets, 
    unblockWallet,
    initiatePayHereSettlement,
    handlePayHereNotify,
    verifyAndSettleDue
} = require('../controllers/walletController');
const {protect} = require('../middleware/authMiddleware');

router.get('/my-wallet', protect, getMyWallet);
router.get('/blocked-wallets', protect, findBlockedWallets);
router.post('/block-wallets', protect, blockwallets);
router.post('/unblock-wallet', protect, unblockWallet);

// PayHere Payment Routes
router.post('/payhere-initiate', protect, initiatePayHereSettlement);
router.post('/payhere-notify', handlePayHereNotify); // Webhook from PayHere (Public, verified via md5sig)
router.post('/verify-settle', protect, verifyAndSettleDue);

module.exports = router;
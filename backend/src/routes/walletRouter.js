const express = require('express');
const router = express.Router();
const {
    getMyWallet, 
    findBlockedWallets, 
    blockwallets, 
    unblockWallet,
    initiatePayHereSettlement,
    handlePayHereNotify,
    verifyAndSettleDue,
    requestPayout,
    getMyPayoutHistory,
    getAllPayoutRequests,
    processPayoutRequest
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

// Payout / Withdrawal Routes
router.post('/payout-request', protect, requestPayout);
router.get('/my-payouts', protect, getMyPayoutHistory);
router.get('/admin/payouts', protect, getAllPayoutRequests);
router.put('/admin/payout/:requestId', protect, processPayoutRequest);

module.exports = router;

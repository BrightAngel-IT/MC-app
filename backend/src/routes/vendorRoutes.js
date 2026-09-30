const express = require('express');
const router = express.Router();
const {getOrders,updateOrders,addProduct,getProducts,getDashboard} = require('../controllers/vendorController');
const {protect} = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboard);
router.get('/orders',protect,getOrders);
router.put('/orders/:orderId',protect,updateOrders);
router.post('/products',protect,addProduct);
router.get('/products',protect,getProducts);

const reportController = require('../controllers/reportController');
router.get('/report', protect, reportController.getPharmacistReport);

module.exports = router;
const express = require('express');
const router = express.Router();
const {updateProfile, getOrders,updateOrders,addProduct,getProducts,getDashboard,deleteProduct} = require('../controllers/vendorController');
const {protect} = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboard);
router.put('/profile', protect, updateProfile);
router.get('/orders',protect,getOrders);
router.put('/orders/:orderId',protect,updateOrders);
router.post('/products',protect,addProduct);
router.get('/products',protect,getProducts);
router.delete('/products/:id', protect, deleteProduct);

const reportController = require('../controllers/reportController');
router.get('/report', protect, reportController.getPharmacistReport);

module.exports = router;
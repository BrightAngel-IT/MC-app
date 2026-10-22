const express = require('express');
const elderHomeController = require('../controllers/elderHomeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Owner authenticated routes (placed before :id to prevent conflict)
router.get('/my/profile', protect, elderHomeController.getMyProfile);
router.put('/my/profile', protect, elderHomeController.updateMyProfile);
router.post('/my/posts', protect, elderHomeController.createPost);
router.delete('/my/posts/:postId', protect, elderHomeController.deletePost);
router.post('/my/services', protect, elderHomeController.createService);
router.put('/my/services/:serviceId', protect, elderHomeController.updateService);
router.delete('/my/services/:serviceId', protect, elderHomeController.deleteService);

// Public / Patient routes
router.get('/:id', elderHomeController.getElderHomeProfile);
router.get('/:id/posts', elderHomeController.getElderHomePosts);
router.get('/:id/services', elderHomeController.getElderHomeServices);

module.exports = router;

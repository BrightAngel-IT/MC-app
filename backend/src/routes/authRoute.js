const express = require("express");
const {register,login,logOut} = require('../controllers/authController');

const router = express.Router();

router.post("/register", register)
router.post("/login", login)
router.post("/logout", logOut)

const { protect } = require('../middleware/authMiddleware');
const { updatePushToken, getMe } = require('../controllers/authController');
router.put("/push-token", protect, updatePushToken);
router.get("/me", protect, getMe);

module.exports = router;
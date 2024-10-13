const express = require('express');
const router = express.Router();
const { registerAdmin, loginAdmin, updateProfile, getAdminProfile, logoutAdmin , test, passwordReset, otpVerify, passwordUpdate, resendOtp} = require('../controllers/adminControllers');
const upload = require("../config/multer-config");
const {isLoggedIn, isAdmin} = require("../middlewares/checkAuth")

// Register Route
router.post('/register',upload.single("profilePic"), registerAdmin);

// Login Route
router.post('/login', loginAdmin);
router.get('/', test);
router.get('/logout', logoutAdmin);

// Get Admin Profile (Protected)
router.get('/profile',isLoggedIn,  getAdminProfile);

// Update Admin Profile (Protected)
router.put('/updateprofile',  updateProfile);



router.post('/reset-password', passwordReset);

// OTP Verification
router.post('/otp-verify', otpVerify);

// Update Password
router.post('/update-password', passwordUpdate);


// Resend OTP
router.post('/resend-otp', resendOtp);

module.exports = router;

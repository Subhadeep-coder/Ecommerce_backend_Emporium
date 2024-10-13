const express = require('express');
const { registerUser,  loginUser,logoutUser, getUserProfile, updateProfile,test, passwordResetUser, otpVerifyUser, passwordUpdateUser, resendOtpUser} = require('../controllers/userControllers'); // Import the user controller functions
const upload = require("../config/multer-config");
const {isLoggedIn} = require("../middlewares/checkAuth")

const router = express.Router();

// Route for User Registration
router.post('/register',upload.single("profilePic"), registerUser);

// Route for User Login
router.post('/login', loginUser);

// Route for User Logout
router.get('/logout', logoutUser);

// Route to Get User Profile (Protected)
router.get('/profile',isLoggedIn,  getUserProfile);

// Route to Update User Profile (Protected)
router.put('/upadteprofile',  updateProfile);
router.get('/', test);

// Password Reset Request
router.post('/reset-password', passwordResetUser);

// OTP Verification
router.post('/otp-verify', otpVerifyUser);

// Update Password
router.post('/update-password', passwordUpdateUser);

// Resend OTP
router.post('/resend-otp', resendOtpUser);


module.exports = router;

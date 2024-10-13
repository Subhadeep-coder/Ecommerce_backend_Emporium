const express = require('express');
const { registerUser,  loginUser,logoutUser, getUserProfile, updateProfile,test,} = require('../controllers/userControllers'); // Import the user controller functions
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
// router.put('/profile',  updateProfile);
router.get('/', test);

module.exports = router;

const express = require('express');
const router = express.Router();
const { registerAdmin, loginAdmin, updateProfile, getAdminProfile, logoutAdmin , test} = require('../controllers/adminControllers');
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

module.exports = router;

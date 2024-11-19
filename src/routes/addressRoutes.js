const express = require('express');
const { addAddress, updateAddress, getAddresses } = require('../controllers/adressControllers');
const {isLoggedIn} = require('../middlewares/checkAuth');  // Assuming you have authentication middleware

const router = express.Router();

// Route to add a new address
router.post('/add', isLoggedIn, addAddress);

// Route to update an existing address by ID
router.put('/update/:addressId',isLoggedIn, updateAddress);

// Route to get all addresses of the authenticated user
router.get('/', isLoggedIn, getAddresses);

module.exports = router;

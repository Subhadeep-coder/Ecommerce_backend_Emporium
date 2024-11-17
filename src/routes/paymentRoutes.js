const express = require('express');
const { createPayPalOrder, executePayPalPayment, cancelPayPalPayment } = require('../controllers/paymentControllers');
const { isLoggedIn } = require('../middlewares/checkAuth');

const router = express.Router();

// Route to create PayPal order
router.post('/create/paypal', isLoggedIn, createPayPalOrder);

// Route for success callback from PayPal
router.get('/success', isLoggedIn, executePayPalPayment);

// Route for cancel callback from PayPal
router.get('/cancel', cancelPayPalPayment);

module.exports = router;

const express = require('express');
const { createOrder, verifyPayment, getAllPayments, getPaymentById } = require('../controllers/paymentControllers');
const { isLoggedIn } = require('../middlewares/checkAuth');

const router = express.Router();

// Route to create an order
router.post('/create/orderId', isLoggedIn, createOrder);

// Route to verify the payment
router.post('/verify', isLoggedIn, verifyPayment);

// Route to get all payments
router.get('/all', getAllPayments);

// Route to get payment by ID
router.get('/:id', getPaymentById);

module.exports = router;

const express = require('express');
const { 
  markPaymentAsCompleted, 
  createOrder,
  getOrders
} = require('../controllers/cashondeliveryControllers');
const { isLoggedIn } = require('../middlewares/checkAuth');

const router = express.Router();

// Route to complete purchase with Cash on Delivery (COD)
router.post('/order/cod', isLoggedIn, createOrder);

// Route to mark the payment as completed after delivery
router.post('/order/complete-payment', isLoggedIn, markPaymentAsCompleted);

// Route to get all orders for a specific user
router.get('/order/my-orders', isLoggedIn,getOrders);;

module.exports = router;
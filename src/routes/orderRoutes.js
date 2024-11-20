const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { isLoggedIn } = require('../middlewares/checkAuth');

// Route to get orders for a specific user
router.get('/userOrder',isLoggedIn, orderController.getOrders);

// New route for completing purchase
router.post('/complete-purchase',isLoggedIn, orderController.completePurchase);
router.get('/', orderController.test);
router.get('/user-order/:id', isLoggedIn, orderController.getSingleOrder);



module.exports = router;

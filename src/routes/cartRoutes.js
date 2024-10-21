const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartControllers');
const { isLoggedIn } = require('../middlewares/checkAuth');

// Route to add a product to the cart
router.post('/add', isLoggedIn, cartController.addToCart);

// Route to get the cart details for a specific user
router.get('/user', isLoggedIn, cartController.getCart);

// Route to update the quantity of a product in the cart
router.post('/update-quantity', isLoggedIn, cartController.updateQuantity);

// Route to remove a product from the cart
router.delete('/remove/:productId', isLoggedIn, cartController.removeFromCart);

// Route to save a product for later (move from cart to "saved for later")
router.post('/save-for-later/:productId', isLoggedIn, cartController.saveForLater);

// Route to move an item from "saved for later" to the cart
router.post('/move-to-cart/:productId', isLoggedIn, cartController.moveToCart);

// Route to add a product to the lookbook
router.post('/add-lookbook/:productId', isLoggedIn, cartController.addToLookbook);

// Route to remove a product from the lookbook
router.delete('/remove-lookbook/:productId', isLoggedIn, cartController.removeFromLookbook);

// Route to test the cart controller
router.get('/', cartController.test);

module.exports = router;

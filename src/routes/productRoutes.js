const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts, updateProduct, deleteProduct, getSingleProduct, addToWishlist, getWishlist, removeFromWishlist, getSellerProducts, test  } = require('../controllers/productControllers');
const { isAdmin, isSeller, isLoggedIn } = require('../middlewares/checkAuth');
const upload = require("../config/multer-config");

// Product creation, update, and delete routes (only sellers can access)
router.post('/create',upload.single("images"), isLoggedIn, isSeller, createProduct);
router.post('/update/:id', isLoggedIn, isSeller, updateProduct);  // Update product route
router.post('/delete/:id', isLoggedIn, isSeller, deleteProduct);  // Delete product route
router.post('/:id', isLoggedIn, getSingleProduct);  // Get single product route

// Other routes
router.get('/all',  getAllProducts);
  // Fetch all products
router.get('/', test);  // Fetch all products

router.get('/seller-products',isLoggedIn, isSeller,isAdmin, getSellerProducts);  // Fetch products for a specific seller

// Wishlist routes (authenticated users only)
router.post('/wishlist/add', isLoggedIn, addToWishlist);  // Add product to wishlist
router.get('/wishlist', isLoggedIn, getWishlist);  // Fetch all products in wishlist
router.delete('/wishlist/remove/:productId', isLoggedIn, removeFromWishlist);  // Remove product from wishlist

module.exports = router;

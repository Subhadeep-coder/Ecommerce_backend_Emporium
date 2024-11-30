const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getSingleProduct,
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  getSellerProducts,
  likeProduct,
  commentOnProduct,
  shareProduct,
  test,
  getProductsByStore,
  getAllComments
} = require('../controllers/productControllers');
const { isAdmin, isSeller, isLoggedIn, isAdminOrSeller } = require('../middlewares/checkAuth');
const upload = require("../config/multer-config");

// Product routes (only sellers can access)
router.post('/create', upload.array("images"), isLoggedIn, isSeller, createProduct);
router.post('/update/:id', isLoggedIn, isSeller, updateProduct);
router.post('/delete/:id', isLoggedIn, isSeller, deleteProduct);
router.post('/:id', isLoggedIn, getSingleProduct);

// Other routes
router.get('/all', getAllProducts);
router.get('/', test);
router.get('/seller-products', getSellerProducts);

// Wishlist routes (authenticated users only)
router.post('/wishlist/add', isLoggedIn, addToWishlist);
router.get('/wishlist', isLoggedIn, getWishlist);
router.delete('/wishlist/remove/:productId', isLoggedIn, removeFromWishlist);

// Likes, Comments, Shares
router.post('/:id/like', isLoggedIn, likeProduct);  // Like a product
router.post('/:id/comment', isLoggedIn, commentOnProduct);  // Comment on a product
router.post('/:id/share', isLoggedIn, shareProduct);  // Share a product
router.get("/store", getProductsByStore);  // Define the route for fetching products by store
router.route('/product/:id/comments').get(isLoggedIn, getAllComments);

module.exports = router;

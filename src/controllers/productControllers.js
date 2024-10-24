const { productModel, productValidation } = require("../models/productModel");
const { User } = require("../models/userModel");
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");

const test = catchAsyncErrors(async (req, res, next) => {
  res.json({ message: 'products' });
});
const createProduct = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user.isSeller) {
    return next(new ErrorHandler("Only sellers can create products.", 403));
  }

  const { title, description, price, category } = req.body;

  // Check if at least 2 images and at most 5 images are uploaded
  if (!req.files || req.files.length < 2 || req.files.length > 5) {
    return next(new ErrorHandler("You must upload between 2 and 5 images.", 400));
  }

  // Extract image buffers and mimetypes
  const images = req.files.map(file => ({
    data: file.buffer,
    mimetype: file.mimetype
  }));

  // Validate product fields (excluding images here)
  const { error } = productValidation.validate({
    title,
    description,
    price,
    category,
    user: req.user.id,
  });
  
  if (error) return next(new ErrorHandler(error.details[0].message, 400));

  const newProduct = new productModel({
    title,
    images,  // Store the array of image objects
    description,
    price,
    category,
    user: user._id
  });

  await newProduct.save();
  res.status(201).json({ message: "Product created successfully", product: newProduct });
});


const getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const { search, category, minPrice, maxPrice, sortBy } = req.query;
  let query = {};

  // Search functionality
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  // Sorting
  let sort = {};
  if (sortBy === 'price_asc') sort.price = 1;
  else if (sortBy === 'price_desc') sort.price = -1;
  else if (sortBy === 'popularity') sort.views = -1;  // Assuming we have a 'views' field for popularity

  const products = await productModel.find(query).sort(sort);
  res.status(200).json({ products });
});

const getSingleProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await productModel.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));
  
  // Increment views for popularity tracking
  product.views = (product.views || 0) + 1;
  await product.save();

  res.status(200).json({ product });
});

const updateProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await productModel.findById(req.params.id);
  if (!product || product.user.toString() !== req.user.id) {
    return next(new ErrorHandler("Unauthorized or product not found", 403));
  }

  const { title, images, description, price, category } = req.body;
  if (title) product.title = title;
  if (images) product.images = images;
  if (description) product.description = description;
  if (price) product.price = price;
  if (category) product.category = category;

  await product.save();
  res.status(200).json({ message: "Product updated successfully", product });
});

const deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await productModel.findById(req.params.id);
  if (!product || product.user.toString() !== req.user.id) {
    return next(new ErrorHandler("Unauthorized or product not found", 403));
  }
  
  await productModel.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: "Product deleted successfully", product });
});

// Add a product to the wishlist
const addToWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id // Assuming you have the user ID from authentication (e.g., JWT)
  const { productId } = req.body // Get the product ID from the request body

  // Find the product by ID to ensure it exists
  const product = await productModel.findById(productId)
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Find the user and check their wishlist
  const user = await User.findById(userId)

  // Check if the product is already in the wishlist
  if (user.wishlist.includes(productId)) {
    return next(new ErrorHandler("Product is already in the wishlist", 400));
  }

  // Check if the wishlist has reached the limit of 10 products
  if (user.wishlist.length >= 10) {
    return next(new ErrorHandler("You can only add up to 10 products to your wishlist", 400));
  }

  // Add the product to the wishlist
  user.wishlist.push(productId)
  await user.save() // Save the updated user document

  res.status(200).json({ message: "Product added to wishlist successfully" })
});

// Get all products in the user's wishlist
const getWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id // Assuming you have the user ID from authentication (e.g., JWT)

  // Find the user and populate the wishlist with product details
  const user = await User.findById(userId).populate("wishlist")

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    message: "Wishlist retrieved successfully",
    wishlist: user.wishlist, // Return the wishlist products
  })
});

// Remove a product from the wishlist
const removeFromWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id // Assuming you have the user ID from authentication (e.g., JWT)
  const { productId } = req.params // Get the product ID from the request parameters

  // Find the user
  const user = await User.findById(userId)

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Check if the product is in the user's wishlist
  const index = user.wishlist.indexOf(productId)
  if (index === -1) {
    return next(new ErrorHandler("Product not found in wishlist", 400));
  }

  // Remove the product from the wishlist
  user.wishlist.splice(index, 1)
  await user.save() // Save the updated user document

  res.status(200).json({ message: "Product removed from wishlist successfully" })
});

const getSellerProducts = catchAsyncErrors(async (req, res, next) => {
  // Find the seller in the database
  const seller = await User.findById(req.user.id);
  
  // Check if the seller exists and is indeed a seller
  if (!seller) {
    return next(new ErrorHandler("Seller not found", 404));
  }

  // Find products associated with the seller
  const products = await productModel.find({ user: req.user.id });

  // Return the list of products created by the seller
  res.status(200).json({
    products: products,
    message: "Products retrieved successfully",
  });
});

module.exports = {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getSingleProduct,
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  getSellerProducts,
  test
}
const { productModel, productValidation } = require("../models/productModel");
const { User, validateUser } = require("../models/userModel");
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

  if (!user.storeName) {
    return next(new ErrorHandler("Store name is required for sellers.", 400));
  }

  const { title, description, price, category, inventory } = req.body;

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
    inventory,
    user: req.user.id,
  });
  
  if (error) return next(new ErrorHandler(error.details[0].message, 400));

  const newProduct = new productModel({
    title,
    images,  // Store the array of image objects
    description,
    price,
    category,
    inventory,
    user: user._id
  });

  // Add the new product to the user's activity feed
  user.activityFeed.push({
    type: 'new_product',
    user: user._id,
    product: newProduct._id
  });

  await newProduct.save();
  await user.save();
  res.status(201).json({ message: "Product created successfully", product: newProduct });
});

const getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const { search, category, minPrice, maxPrice, sortBy, page = 1, limit = 10 } = req.query;
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

  const products = await productModel.find(query).sort(sort)
    .skip((page - 1) * limit) // Skipping documents for pagination
    .limit(parseInt(limit)); // Limiting the results

  const totalProducts = await productModel.countDocuments(query); // Total count for pagination

  res.status(200).json({
    totalProducts,
    totalPages: Math.ceil(totalProducts / limit),
    currentPage: page,
    products
  });
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

  const { title, images, description, price, category, inventory } = req.body;
  if (title) product.title = title;
  if (images) product.images = images;
  if (description) product.description = description;
  if (price) product.price = price;
  if (category) product.category = category;
  if (inventory) product.inventory = inventory;

  await product.save();
  res.status(200).json({ message: "Product updated successfully", product });
});

// Delete Product
const deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await productModel.findById(req.params.id);
  if (!product || product.user.toString() !== req.user.id) {
    return next(new ErrorHandler("Unauthorized or product not found", 403));
  }

  await product.remove();
  res.status(200).json({ message: "Product deleted successfully" });
});

// Add a product to the wishlist
const addToWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const { productId } = req.body;

  const product = await productModel.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  const user = await User.findById(userId);

  if (user.wishlist.includes(productId)) {
    return next(new ErrorHandler("Product is already in the wishlist", 400));
  }

  if (user.wishlist.length >= 10) {
    return next(new ErrorHandler("You can only add up to 10 products to your wishlist", 400));
  }

  user.wishlist.push(productId);
  await user.save();

  user.activityFeed.push({
    type: 'like',
    user: user._id,
    product: productId
  });

  await user.save();
  res.status(200).json({ message: "Product added to wishlist successfully" });
});

const getWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId).populate("wishlist");

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    message: "Wishlist retrieved successfully",
    wishlist: user.wishlist,
  });
});

const removeFromWishlist = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const { productId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  const index = user.wishlist.indexOf(productId);
  if (index === -1) {
    return next(new ErrorHandler("Product not found in wishlist", 400));
  }

  user.wishlist.splice(index, 1);
  await user.save();

  user.activityFeed.push({
    type: 'remove_wishlist',
    user: user._id,
    product: productId
  });

  await user.save();
  res.status(200).json({ message: "Product removed from wishlist successfully" });
});



const likeProduct = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;
  const userId = req.user.id;

  const product = await productModel.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Check if the product has a valid user associated with it
  const productOwner = await User.findById(product.user);
  if (!productOwner) {
    return next(new ErrorHandler("User associated with this product not found", 404));
  }

  if (product.likes.includes(userId)) {
    return next(new ErrorHandler("You have already liked this product", 400));
  }

  product.likes.push(userId);
  await product.save();

  productOwner.activityFeed.push({
    type: 'like',
    user: userId,
    product: productId
  });

  await productOwner.save();
  res.status(200).json({ message: "Product liked successfully" });
});



const commentOnProduct = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;
  const userId = req.user.id;
  const { comment } = req.body;

  const product = await productModel.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Check if the product has a valid user associated with it
  const productOwner = await User.findById(product.user);
  if (!productOwner) {
    return next(new ErrorHandler("User associated with this product not found", 404));
  }

  product.comments.push({ user: userId, comment });
  await product.save();

  productOwner.activityFeed.push({
    type: 'comment',
    user: userId,
    product: productId
  });

  await productOwner.save();
  res.status(200).json({ message: "Comment added successfully" });
});

const shareProduct = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;
  const userId = req.user.id;
  const { sharedTo } = req.body;

  // Find the product by ID
  const product = await productModel.findById(productId).populate('user'); // Populate the user field
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  // Push the share info to the product shares array
  product.shares.push({ user: userId, sharedTo });
  await product.save();

  // Ensure product.user is populated and activityFeed exists
  if (!product.user.activityFeed) {
    product.user.activityFeed = []; // Initialize if undefined
  }

  // Add the share activity to the user's activity feed
  product.user.activityFeed.push({
    type: 'share',
    user: userId,
    product: productId
  });

  // Save the updated user
  await product.user.save();

  // Send success response
  res.status(200).json({ message: "Product shared successfully" });
});
const getSellerProducts = catchAsyncErrors(async (req, res, next) => {
  const seller = await User.findById(req.user.id);

  if (!seller) {
    return next(new ErrorHandler("Seller not found", 404));
  }

  const products = await productModel.find({ user: req.user.id });
  res.status(200).json({ products });
});
const getProductsByStore = catchAsyncErrors(async (req, res, next) => {
  const { storeName } = req.query;
  console.log(storeName);
  

  // Ensure storeName is provided
  if (!storeName) {
    return next(new ErrorHandler("Store name is required to fetch products", 400));
  }

  // Find the seller by store name
  const seller = await User.findOne({ storeName });

  // If no seller is found, return an error
  if (!seller) {
    return next(new ErrorHandler("Seller not found with the given store name", 404));
  }

  // Fetch products created by the seller
  const products = await productModel.find({ user: seller._id });

  // If no products are found, return an empty array
  if (!products.length) {
    return res.status(200).json({ message: "No products found for this store", products: [] });
  }

  // Return the list of products
  res.status(200).json({ message: "Products fetched successfully", products });
});

module.exports = {
  test,
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  likeProduct,
  commentOnProduct,
  shareProduct,
  getSellerProducts,
  getProductsByStore
  
};

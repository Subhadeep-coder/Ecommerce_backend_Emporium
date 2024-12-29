const { productModel, productValidation } = require("../models/productModel");
const { User, validateUser } = require("../models/userModel");
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const sendNotification = require('../utils/sendNotifications'); // Import the notification helper

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

  const { title, description, price, category, inventory, subcategory } = req.body;

  // Check if image files are between 2 and 5
  if (!req.files || req.files.length < 1 || req.files.length > 5) {
    return next(new ErrorHandler("You must upload between 1 and 5 images.", 400));
  }

  // Convert images for saving in the database
  const images = req.files.map(file => ({
    data: file.buffer,
    mimetype: file.mimetype,
  }));

  // Validate product details
  const { error } = productValidation.validate({
    title,
    description,
    price,
    category,
    subcategory,
    inventory,
    user: req.user.id,
  });

  if (error) return next(new ErrorHandler(error.details[0].message, 400));

  // Create new product
  const newProduct = new productModel({
    title,
    images,
    description,
    price,
    category,
    subcategory,
    inventory,
    user: user._id,
  });

  // Add to seller's activity feed
  user.activityFeed.push({
    type: 'new_product',
    user: user._id,
    product: newProduct._id,
  });

  // Save the product and update the user
  await newProduct.save();
  await user.save();

  // // Emit notifications to all followers
  // const io = req.app.get('socketio'); // Assuming Socket.IO is set up on the app instance
  // const followers = await User.find({ _id: { $in: user.followers } });

  // // Emit new product notification to each follower
  // followers.forEach(follower => {
  //   io.to(follower._id.toString()).emit('new_product', {
  //     message: `A new product titled "${title}" was added by ${user.storeName}`,
  //     productId: newProduct._id,
  //   });
  // });

  res.status(201).json({ message: "Product created successfully", product: newProduct });
});


const getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const { search, category,subcategory, minPrice, maxPrice, sortBy, page = 1, limit = 10 } = req.query;
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

  // SubCategory filter
  if (subcategory) {
    query.subcategory = subcategory;
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

  // Fetch products and populate the seller's store name
  const products = await productModel.find(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .populate('user', 'storeName -_id'); // Populating only storeName and excluding _id

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

  const { title, images, description, price, category, subcategory, inventory } = req.body;
  if (title) product.title = title;
  if (images) product.images = images;
  if (description) product.description = description;
  if (price) product.price = price;
  if (category) product.category = category;
  if (subcategory) product.subcategory = subcategory;
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

  await productModel.findByIdAndDelete(product._id);
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

  const user = await User.findById(userId).populate({
    path: "wishlist",
    populate: {
      path: "user", // Assuming 'user' is the reference to the seller in the product model
      select: "storeName -_id" // Populating only the storeName
    }
  });

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

  // Get the Socket.IO instance from the app
  const io = req.app.get('socketio');

  // Send the notification using the helper function
  await sendNotification(productOwner._id, `${req.user.id} liked your product.`, 'like', userId, productId, io);

  res.status(200).json({
    message: "Product liked successfully",
    likesCount: product.likes.length,
    commentsCount: product.comments.length,
    sharesCount: product.shares.length
  });
});


const commentOnProduct = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;
  const userId = req.user.id;
  const { comment } = req.body;

  const product = await productModel.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

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

  // Get the Socket.IO instance from the app
  const io = req.app.get('socketio');

  // Send the notification using the helper function
  await sendNotification(productOwner._id, `${req.user.id} commented on your product.`, 'comment', userId, productId, io);

  res.status(200).json({
    message: "Comment added successfully",
    likesCount: product.likes.length,
    commentsCount: product.comments.length,
    sharesCount: product.shares.length
  });
});


const getAllComments = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;

  const product = await productModel.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  res.status(200).json({
    success: true,
    comments: product.comments
  });
});


const shareProduct = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;
  const userId = req.user.id;
  const { sharedTo } = req.body;

  const product = await productModel.findById(productId).populate('user');
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  product.shares.push({ user: userId, sharedTo });
  await product.save();

  if (!product.user.activityFeed) {
    product.user.activityFeed = [];
  }

  product.user.activityFeed.push({
    type: 'share',
    user: userId,
    product: productId
  });

  await product.user.save();

  // Get the Socket.IO instance from the app
  const io = req.app.get('socketio');

  // Send the notification using the helper function
  await sendNotification(product.user._id, `${req.user.id} shared your product.`, 'share', userId, productId, io);

  res.status(200).json({
    message: "Product shared successfully",
    likesCount: product.likes.length,
    commentsCount: product.comments.length,
    sharesCount: product.shares.length
  });
});


const getSellerProducts = catchAsyncErrors(async (req, res, next) => {
  const seller = await User.findById(req.user.id);

  if (!seller) {
    return next(new ErrorHandler("Seller not found", 404));
  }

  const products = await productModel.find({ user: req.user.id });
  res.status(200).json({ products });
});


const unlikeProduct = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;
  const userId = req.user.id;

  const product = await productModel.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  const productOwner = await User.findById(product.user);
  if (!productOwner) {
    return next(new ErrorHandler("User associated with this product not found", 404));
  }

  if (!product.likes.includes(userId)) {
    return next(new ErrorHandler("You haven't liked this product yet", 400));
  }

  product.likes = product.likes.filter(id => id.toString() !== userId);
  await product.save();

  productOwner.activityFeed = productOwner.activityFeed.filter(activity => activity.type !== 'like' || activity.user.toString() !== userId);
  await productOwner.save();

  res.status(200).json({
    message: "Product unliked successfully",
    likesCount: product.likes.length,
    commentsCount: product.comments.length,
    sharesCount: product.shares.length
  });
});


const uncommentOnProduct = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;
  const userId = req.user.id;
  const { commentId } = req.body;  // Assuming the comment ID is passed in the request body

  const product = await productModel.findById(productId);
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  const productOwner = await User.findById(product.user);
  if (!productOwner) {
    return next(new ErrorHandler("User associated with this product not found", 404));
  }

  const commentIndex = product.comments.findIndex(c => c._id.toString() === commentId && c.user.toString() === userId);
  if (commentIndex === -1) {
    return next(new ErrorHandler("Comment not found or you are not authorized to delete this comment", 404));
  }

  product.comments.splice(commentIndex, 1);
  await product.save();

  productOwner.activityFeed = productOwner.activityFeed.filter(activity => activity.type !== 'comment' || activity.user.toString() !== userId);
  await productOwner.save();

  res.status(200).json({
    message: "Comment removed successfully",
    likesCount: product.likes.length,
    commentsCount: product.comments.length,
    sharesCount: product.shares.length
  });
});

const unshareProduct = catchAsyncErrors(async (req, res, next) => {
  const productId = req.params.id;
  const userId = req.user.id;

  const product = await productModel.findById(productId).populate('user');
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  const shareIndex = product.shares.findIndex(share => share.user.toString() === userId);
  if (shareIndex === -1) {
    return next(new ErrorHandler("You haven't shared this product", 404));
  }

  product.shares.splice(shareIndex, 1);
  await product.save();

  product.user.activityFeed = product.user.activityFeed.filter(activity => activity.type !== 'share' || activity.user.toString() !== userId);
  await product.user.save();

  res.status(200).json({
    message: "Product unshared successfully",
    likesCount: product.likes.length,
    commentsCount: product.comments.length,
    sharesCount: product.shares.length
  });
});


const getProductsByStore = catchAsyncErrors(async (req, res, next) => {
  const { storeName, page = 1, limit = 10 } = req.query; // Set default values for page and limit

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

  // Parse page and limit as integers
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const skip = (pageNumber - 1) * limitNumber;

  // Fetch total count of products for pagination metadata
  const totalProducts = await productModel.countDocuments({ user: seller._id });

  // Fetch products created by the seller with pagination
  const products = await productModel
    .find({ user: seller._id })
    .skip(skip)
    .limit(limitNumber);

  // If no products are found, return an empty array
  if (!products.length) {
    return res.status(200).json({
      success: true,
      message: "No products found for this store",
      products: [],
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(totalProducts / limitNumber),
        totalItems: totalProducts,
        itemsPerPage: limitNumber,
      },
    });
  }

  // Return the list of products with pagination metadata
  res.status(200).json({
    success: true,
    message: "Products fetched successfully",
    products,
    pagination: {
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / limitNumber),
      totalItems: totalProducts,
      itemsPerPage: limitNumber,
    },
  });
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
  getProductsByStore,
  unlikeProduct,
  uncommentOnProduct,
  unshareProduct,
  getAllComments

};

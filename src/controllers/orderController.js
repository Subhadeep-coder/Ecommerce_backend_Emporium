const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Payment = require("../models/paymentModel");
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const { User } = require("../models/userModel");

// Get all orders for a user
exports.getOrders = catchAsyncErrors(async (req, res, next) => {
  try {
    const userId = req.user.id;

    const orders = await Order.find({ userId }).populate("products.productId");
    if (!orders || orders.length === 0) {
      return res.status(404).send("No orders found");
    }

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
});

// Complete purchase and remove items from cart
exports.completePurchase = catchAsyncErrors(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const orderId = req.body.orderid;

    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.status(404).send("Payment not found");
    }

    if (payment.status === "pending") {
      return res.status(400).send("Payment is still pending");
    }

    // Find the user's cart
    const cart = await Cart.findOne({ userId }).populate("products.productId");

    if (!cart || cart.products.length === 0) {
      return res.status(404).send("No items in cart to purchase");
    }

    // Create an order
    const order = await Order.create({
      userId,
      products: cart.products,
      totalAmount: cart.totalAmount,
    });

    // Clear the user's cart after purchase
    await Cart.findOneAndDelete({ userId });

    res.status(200).json({
      message: "Purchase completed successfully",
      order,
    });
  } catch (error) {
    next(error);
  }
});

// Get a single order for a user
exports.getSingleOrder = catchAsyncErrors(async (req, res, next) => {
  try {
    const userId = req.user.id; // Assuming req.user is populated after authentication
    const orderId = req.params.id; // Fetch order ID from URL params

    // Find the specific order for the user
    const order = await Order.findOne({ _id: orderId, userId }).populate("products.productId");

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    next(error);
  }
});

exports.getOrdersByStore = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;
  const { storeName, page, limit } = req.query;
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

  if (seller._id != userId) {
    return next(new ErrorHandler("You're not seller", 401));
  }

  const skip = (page - 1) * limit;
  const orders = await Order.aggregate([
    {
      $lookup: {
        from: "products",
        localField: "products.productId",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'productDetails.user',
        foreignField: '_id',
        as: 'productDetails.userDetails'
      }
    },
    {
      $match: {
        "productDetails.userDetails.storeName": storeName,
      },
    },
    {
      $group: {
        _id: "$_id",
        userId: { $first: "$userId" },
        products: {
          $push: {
            productId: "$productDetails._id",
            quantity: "$products.quantity",
            _id: "$products._id"
          }
        },
        totalAmount: { $first: "$totalAmount" },
        address: { $first: "$address" },
        location: { $first: "$location" },
        status: { $first: "$status" },
        paymentMethod: { $first: "$paymentMethod" },
        paymentStatus: { $first: "$paymentStatus" },
        deliveryStatus: { $first: "$deliveryStatus" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" }
      }
    },
    {
      $skip: skip ? skip : 0,
    },
    {
      $limit: limit ? limit : 10,
    },
  ]);

  console.log(orders);

  return res.status(200).json({
    orders: orders
  });
})


// Test route for verification
exports.test = (req, res) => {
  res.json({ message: "Order system is working!" });
};

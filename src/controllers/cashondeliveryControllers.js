const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const errorhandler = require("../utils/ErrorHandler");




// Complete purchase for Cash on Delivery (COD) and remove items from cart
exports.createOrder = catchAsyncErrors(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { address, location } = req.body;

    // Check if the user has a cart
    const cart = await Cart.findOne({ userId }).populate("products.productId");

    if (!cart || cart.products.length === 0) {
      return res.status(404).send("No items in cart to purchase");
    }

    // Create an order for Cash on Delivery
    const order = await Order.create({
      userId,
      products: cart.products,
      totalAmount: cart.totalAmount,
      address: address,
      location: location,
      paymentMethod: "COD",  // Specify the payment method as Cash on Delivery
      paymentStatus: "pending", // For COD, the payment status starts as pending
      status: "Order Placed", // Initial order status
      deliveryStatus: "pending", // Delivery will be marked as pending until fulfilled
    });

    // Clear the user's cart after the order is created
    await Cart.findOneAndDelete({ userId });

    res.status(200).json({
      message: "Order created successfully for Cash on Delivery",
      order,
    });
  } catch (error) {
    next(error);
  }
});

// Update order to mark payment as completed after delivery
exports.markPaymentAsCompleted = catchAsyncErrors(async (req, res, next) => {
  try {
    const { orderId } = req.body;

    // Find the order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Check if the order has already been delivered
    if (order.deliveryStatus !== "delivered") {
      return res.status(400).send("Order not delivered yet");
    }

    // Update the payment status to completed
    order.paymentStatus = "completed";
    await order.save();

    res.status(200).json({
      message: "Payment marked as completed",
      order,
    });
  } catch (error) {
    next(error);
  }
});

// Get all orders for a specific user
exports.getOrders = catchAsyncErrors(async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find all orders for the user
    const orders = await Order.find({ userId }).populate("products.productId");

    if (orders.length === 0) {
      return res.status(404).send("No orders found for this user");
    }

    res.status(200).json({
      message: "Orders fetched successfully",
      orders,
    });
  } catch (error) {
    next(error);
  }
});

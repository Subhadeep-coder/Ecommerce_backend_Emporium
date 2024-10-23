const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Payment = require("../models/paymentModel");
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const errorhandler = require("../utils/ErrorHandler");

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

// Update order status (e.g., Processing, Shipped, etc.)
exports.updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  try {
    const { orderId, status, trackingNumber, carrier } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Update the status of the order
    order.status = status;

    // Optionally update the tracking number and carrier if available
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.carrier = carrier;

    await order.save();

    res.status(200).json({
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    next(error);
  }
});

// Track an order's current status
exports.trackOrder = catchAsyncErrors(async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.status(200).json({
      status: order.status,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      orderDetails: order,
    });
  } catch (error) {
    next(error);
  }
});

// Test route for verification
exports.test = (req, res) => {
  res.json({ message: "Order system is working!" });
};

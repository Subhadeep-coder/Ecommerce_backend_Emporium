const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const Payment = require("../models/paymentModel");
// Get all orders for a user
exports.getOrders = async (req, res) => {
  const userId = req.user.id;

  try {
    const orders = await Order.find({ userId }).populate("products.productId");
    if (!orders || orders.length === 0) {
      return res.status(404).send("No orders found");
    }

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Error fetching orders");
  }
};

// Complete purchase and remove items from cart
exports.completePurchase = async (req, res) => {
  const userId = req.user.id;
  const orderId = req.body.orderid;

  try {
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.status(404).send("Payment not found");
    }

    if(payment.status === "pending") {
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
    console.error("Error completing purchase:", error);
    res.status(500).send("Error completing purchase");
  }
};
exports.test = (req,res) => {
res.json({ message : "order" })
}

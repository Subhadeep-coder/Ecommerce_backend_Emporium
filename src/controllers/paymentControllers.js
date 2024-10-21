const Razorpay = require('razorpay');
const Payment = require('../models/paymentModel.js');
const Cart = require("../models/cartModel.js");
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");

// Configure Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
const createOrder = catchAsyncErrors(async (req, res, next) => {
  const userId = req.user.id;

  // Check if there's an existing pending payment for this user
  const existingPayment = await Payment.findOne({ userId, status: 'pending' });
  if (existingPayment) {
    return next(new ErrorHandler('A pending payment already exists. Please complete or cancel it before creating a new one.', 400));
  }

  // Find the user's cart by userId
  const cart = await Cart.findOne({ userId }).populate('products.productId');
  if (!cart || cart.products.length === 0) {
    return next(new ErrorHandler('Cart is empty', 400));
  }

  // Calculate total amount of products in the cart
  let totalAmount = cart.products.reduce((sum, item) => sum + item.productId.price * item.quantity, 0);

  // Convert totalAmount to paise (smallest currency unit for INR)
  const amountInPaise = Math.round(totalAmount * 100);

  // Create Razorpay order
  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt: `order_${Date.now()}`,
    payment_capture: 1,
  };

  const order = await razorpay.orders.create(options);

  // Save the order details in the Payment model
  const newPayment = await Payment.create({
    userId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    status: 'pending',
  });

  res.status(200).json({
    success: true,
    order,
    paymentId: newPayment._id
  });
});

// Verify Payment
const verifyPayment = catchAsyncErrors(async (req, res, next) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');

  const isValid = validatePaymentVerification(
    { "order_id": razorpayOrderId, "payment_id": razorpayPaymentId },
    razorpaySignature,
    secret
  );

  if (!isValid) {
    return next(new ErrorHandler('Invalid signature', 400));
  }

  // Find the payment by orderId
  const payment = await Payment.findOne({ orderId: razorpayOrderId });
  if (!payment) {
    return next(new ErrorHandler('Payment not found', 404));
  }

  // Update payment status to 'completed'
  payment.paymentId = razorpayPaymentId;
  payment.signature = razorpaySignature;
  payment.status = 'completed';
  await payment.save();

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    orderId: razorpayOrderId
  });
});

// Cancel Payment
const cancelPayment = catchAsyncErrors(async (req, res, next) => {
  const { paymentId } = req.params;

  // Find the payment by paymentId
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    return next(new ErrorHandler('Payment not found', 404));
  }

  // Only pending payments can be cancelled
  if (payment.status !== 'pending') {
    return next(new ErrorHandler('Only pending payments can be cancelled', 400));
  }

  // Update payment status to 'cancelled'
  payment.status = 'cancelled';
  await payment.save();

  res.status(200).json({
    success: true,
    message: 'Payment cancelled successfully',
    payment
  });
});

// Get all payments
const getAllPayments = catchAsyncErrors(async (req, res, next) => {
  const payments = await Payment.find();
  res.status(200).json({
    success: true,
    payments
  });
});

// Get payment by ID
const getPaymentById = catchAsyncErrors(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return next(new ErrorHandler('Payment not found', 404));
  }
  res.status(200).json({
    success: true,
    payment
  });
});

module.exports = { createOrder, verifyPayment, getAllPayments, getPaymentById, cancelPayment };

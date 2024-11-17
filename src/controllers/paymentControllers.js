require('dotenv').config()
const Razorpay = require('razorpay');
const Payment = require('../models/paymentModel.js');
const Cart = require("../models/cartModel.js");
const { catchAsyncErrors } = require("../middlewares/catchAsyncError");
const ErrorHandler = require("../utils/ErrorHandler");
const paypal = require('paypal-rest-sdk');

// Configure PayPal
paypal.configure({
  'mode': 'sandbox', // Or 'live'
  'client_id': process.env.PAYPAL_CLIENT_ID,
  'client_secret': process.env.PAYPAL_CLIENT_SECRET,
});

// Create PayPal Order
const createPayPalOrder = async (req, res, next) => {
  try {
    const userId = req.user.id; // Assuming user is authenticated
    const existingPayment = await Payment.findOne({ userId, status: 'pending' });

    if (existingPayment) {
      return res.status(400).json({ message: 'Pending payment already exists. Complete or cancel it before creating a new one.' });
    }

    const cart = await Cart.findOne({ userId }).populate('products.productId');
    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    let totalAmount = cart.products.reduce((sum, item) => sum + item.productId.price * item.quantity, 0);

    const create_payment_json = {
      intent: "sale",
      payer: { payment_method: "paypal" },
      redirect_urls: {
        return_url: "http://localhost:3000/paypal/success",
        cancel_url: "http://localhost:3000/paypal/cancel",
      },
      transactions: [{
        item_list: {
          items: cart.products.map((item) => ({
            name: item.productId.name,
            sku: item.productId.sku || '001',
            price: item.productId.price.toFixed(2),
            currency: 'USD', // Adjust currency accordingly
            quantity: item.quantity
          }))
        },
        amount: {
          currency: 'USD',
          total: totalAmount.toFixed(2),
        },
        description: "Purchase from your cart."
      }]
    };

    paypal.payment.create(create_payment_json, async (error, payment) => {
      if (error) {
        throw error;
      } else {
        const newPayment = await Payment.create({
          userId,
          paymentId: payment.id,
          amount: totalAmount,
          currency: 'USD',
          status: 'pending',
        });

        // Redirect user to PayPal approval URL
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === 'approval_url') {
            return res.redirect(payment.links[i].href);
          }
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// Verify PayPal Payment
const executePayPalPayment = async (req, res, next) => {
  const { paymentId, PayerID } = req.query;

  const execute_payment_json = {
    payer_id: PayerID,
    transactions: [{ amount: { currency: 'USD', total: '25.00' } }] // Use dynamic amount here
  };

  paypal.payment.execute(paymentId, execute_payment_json, async (error, payment) => {
    if (error) {
      return res.status(500).json({ message: 'Payment failed', error });
    } else {
      const paymentRecord = await Payment.findOne({ paymentId });

      if (!paymentRecord) {
        return res.status(404).json({ message: 'Payment record not found' });
      }

      paymentRecord.status = 'completed';
      await paymentRecord.save();

      return res.status(200).json({ success: true, message: 'Payment successful' });
    }
  });
};

// Cancel PayPal Payment
const cancelPayPalPayment = (req, res) => {
  res.status(200).json({ success: true, message: 'Payment cancelled' });
};

module.exports = { createPayPalOrder, executePayPalPayment, cancelPayPalPayment };



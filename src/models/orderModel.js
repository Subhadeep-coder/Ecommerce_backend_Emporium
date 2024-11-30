const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    required: true
  },
  location: {
    type: [Number],
    required: true,
    validate: {
      validator: function (coords) {
        return coords.length === 2;
      },
      message: "Coordinates must contain exactly [longitude, latitude]."
    }
  },
  status: {
    type: String,
    enum: ['Order Placed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'],
    default: 'Order Placed',
  },
  trackingNumber: {
    type: String,
  },
  carrier: {
    type: String,
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'PayPal', 'Stripe'], // Add more methods as necessary
    default: 'COD', // Default is Cash on Delivery (COD)
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending', // Default is 'pending' for COD
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'shipped', 'delivered'],
    default: 'pending', // Default is 'pending'
  },
  deliveryAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'devliveryAgent',
  }
}, { timestamps: true });

const Order = mongoose.model('order', orderSchema);
module.exports = Order;

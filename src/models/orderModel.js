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
}, { timestamps: true });

const Order = mongoose.model('order', orderSchema);
module.exports = Order;

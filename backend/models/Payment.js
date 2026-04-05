const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    txnRef: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    success: {
      type: Boolean,
      default: false,
    },
    cartSnapshot: {
      type: Array,  // Array of { product, name, image, price, quantity }
      default: [],
    },
    shippingAddress: {
      type: Object,  // { fullName, phone, street, city, country, latitude, longitude }
      default: null,
    },
    note: {
      type: String,
      default: '',
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
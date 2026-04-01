const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createPayment, paymentReturn } = require('../controllers/vnpay.controller');

// start a payment (user must be logged in)
router.get('/payment', protect, createPayment);

// VNPay will redirect here after payment
router.get('/return', paymentReturn);

module.exports = router;
const express = require('express');
const router = express.Router();
const { createVnpayPayment, vnpayReturn, vnpayIpn } = require('../controllers/vnpay.controller');
const { protect } = require('../middleware/auth');

// Tạo URL thanh toán VNPay
router.post('/create_payment_url', protect, createVnpayPayment);
// Xử lý return URL từ VNPay
router.get('/vnpay_return', vnpayReturn);
// Xử lý IPN từ VNPay
router.get('/vnpay_ipn', vnpayIpn);

module.exports = router;

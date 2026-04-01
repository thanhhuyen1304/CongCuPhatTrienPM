const asyncHandler = require('express-async-handler');
const vnpayService = require('../services/vnpay.service');
const Cart = require('../models/Cart');
const Payment = require('../models/Payment');

// initiate payment, returns redirect URL in JSON
const createPayment = asyncHandler(async (req, res) => {
  const cart = await Cart.getOrCreateCart(req.user._id);
  const amount = cart.totalPrice;
  const orderInfo = 'Thanh toan don hang BookNest';
  
  // generate payment url and get txnRef
  const { url: paymentUrl, txnRef } = vnpayService.createPaymentUrl(
    req,
    amount,
    orderInfo
  );

  // record transaction so we can clear cart later even if callback has no auth
  if (txnRef) {
    await Payment.create({ user: req.user._id, txnRef, amount });
  }

  res.json({ success: true, url: paymentUrl });
});

// callback from VNPay
const paymentReturn = asyncHandler(async (req, res) => {
  // copy all query parameters except secure hash
  const vnpParams = {};
  Object.keys(req.query).forEach((key) => {
    if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      vnpParams[key] = req.query[key];
    }
  });

  const secureHash = req.query.vnp_SecureHash;
  const responseCode = req.query.vnp_ResponseCode;
  const txnRef = req.query.vnp_TxnRef;
  const amount = req.query.vnp_Amount;

  const calculated = vnpayService.validateSignature(vnpParams, secureHash);
  const isValid = calculated;
  // log hashes for debugging
  console.debug('VNPay callback - received hash:', secureHash);
  // validation function already logs expected if invalid

  // prepare parameters for frontend redirect
  const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const params = new URLSearchParams();
  params.set('txnRef', txnRef || '');
  params.set('amount', amount ? Number(amount) / 100 : 0);

  if (!isValid) {
    params.set('success', 'false');
    params.set('errorCode', 'INVALID_SIGNATURE');
    params.set('message', 'Chữ ký không hợp lệ! Giao dịch có thể bị giả mạo.');
    return res.redirect(`${frontUrl}/payment-result?${params.toString()}`);
  }

  if (responseCode === '00') {
    // payment successful
    try {
      // clear cart by looking up txnRef record
      const record = await Payment.findOne({ txnRef });
      if (record && !record.success) {
        const cart = await Cart.findOne({ user: record.user });
        if (cart) {
          cart.items = [];
          await cart.save();
        }
        record.success = true;
        await record.save();
      }
    } catch (err) {
      // ignore
    }
    params.set('success', 'true');
    params.set('message', 'Thanh toán thành công!');
    return res.redirect(`${frontUrl}/payment-result?${params.toString()}`);
  }

  // failure with known response code
  params.set('success', 'false');
  params.set('errorCode', responseCode);
  params.set('message', `${vnpayService.getErrorMessage(responseCode)}`);
  return res.redirect(`${frontUrl}/payment-result?${params.toString()}`);
});

module.exports = {
  createPayment,
  paymentReturn,
};
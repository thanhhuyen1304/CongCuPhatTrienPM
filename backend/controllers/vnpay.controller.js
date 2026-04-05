const asyncHandler = require('express-async-handler');
const vnpayService = require('../services/vnpay.service');
const Cart = require('../models/Cart');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { emitNewOrderNotification } = require('../socket/socketServer');

// initiate payment — expects POST body: { shippingAddress, note }
const createPayment = asyncHandler(async (req, res) => {
  const { shippingAddress, note } = req.body;

  const cart = await Cart.getOrCreateCart(req.user._id);
  
  // Recalculate subtotal from current product prices (ensure VND)
  const subtotal = cart.items.reduce((sum, item) => {
    const price = item.product?.price || item.price || 0;
    return sum + (price * item.quantity);
  }, 0);

  // Match frontend logic for shipping
  const shippingPrice = subtotal > 500000 || subtotal === 0 ? 0 : 30000;
  const amount = subtotal + shippingPrice;

  const orderInfo = 'Thanh toan don hang BookNest';

  if (!cart.items || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Giỏ hàng trống' });
  }

  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin giao hàng' });
  }

  // generate payment url and get txnRef
  const { url: paymentUrl, txnRef } = vnpayService.createPaymentUrl(
    req,
    amount,
    orderInfo
  );

  // Save cart snapshot + shipping address together with the payment record
  if (txnRef) {
    const cartSnapshot = cart.items.map((item) => ({
      product: item.product?._id || item.product,
      name: item.product?.name || 'Sản phẩm',
      image:
        item.product?.images?.find((img) => img.isMain)?.url ||
        item.product?.images?.[0]?.url ||
        '',
      price: item.product?.price || item.price,
      quantity: item.quantity,
    }));

    await Payment.create({
      user: req.user._id,
      txnRef,
      amount,
      cartSnapshot,
      shippingAddress,
      note: note || '',
    });
  }

  res.json({ success: true, url: paymentUrl });
});

// callback from VNPay
const paymentReturn = asyncHandler(async (req, res) => {
  const secureHash = req.query.vnp_SecureHash;
  const responseCode = req.query.vnp_ResponseCode;
  const txnRef = req.query.vnp_TxnRef;
  const amount = req.query.vnp_Amount;

  // The official vnpay package validates against the full query object
  const isValid = vnpayService.validateSignature(req.query, secureHash);

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
    // payment successful — create Order then clear cart
    try {
      const record = await Payment.findOne({ txnRef });

      if (record && !record.success) {
        // --- Create Order from cart snapshot ---
        if (record.cartSnapshot && record.cartSnapshot.length > 0) {
          const itemsPrice = record.cartSnapshot.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
          );
          const shippingPrice = itemsPrice > 500000 || itemsPrice === 0 ? 0 : 30000;
          const totalPrice = itemsPrice + shippingPrice;

          // Use saved shipping address or fallback
          const shippingAddr = record.shippingAddress || {
            fullName: '',
            phone: '',
            street: 'Cập nhật sau',
            city: 'Cập nhật sau',
            country: 'Vietnam',
          };

          const order = await Order.create({
            user: record.user,
            items: record.cartSnapshot,
            shippingAddress: shippingAddr,
            paymentMethod: 'vnpay',
            paymentStatus: 'paid',
            paymentDetails: {
              transactionId: txnRef,
              paidAt: new Date(),
            },
            itemsPrice,
            shippingPrice,
            taxPrice: 0,
            totalPrice,
            note: record.note || '',
            status: 'confirmed',
            statusHistory: [
              {
                status: 'confirmed',
                note: 'Thanh toán VNPay thành công',
                updatedAt: new Date(),
              },
            ],
          });

          record.orderId = order._id;

          // --- Deduct product stock (same as createOrder COD) ---
          for (const item of record.cartSnapshot) {
            if (item.product) {
              await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity, sold: item.quantity },
              });
            }
          }

          // --- Notify admin/shipper via Socket ---
          try {
            emitNewOrderNotification(order);
          } catch (socketErr) {
            console.error('Socket notification error (non-critical):', socketErr.message);
          }
        }

        // --- Clear cart ---
        const cart = await Cart.findOne({ user: record.user });
        if (cart) {
          cart.items = [];
          await cart.save();
        }

        record.success = true;
        await record.save();
      }
    } catch (err) {
      console.error('VNPay callback order creation error:', err);
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
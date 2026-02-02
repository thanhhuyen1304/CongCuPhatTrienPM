const querystring = require('qs');
const crypto = require('crypto');
const moment = require('moment');
const Order = require('../models/Order');
const Cart = require('../models/Cart');

// Cấu hình VNPay
const vnp_TmnCode = process.env.VNP_TMNCODE;
const vnp_HashSecret = process.env.VNP_HASHSECRET;
const vnp_Url = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const vnp_ReturnUrl = process.env.VNP_RETURNURL;

// Tạo URL thanh toán VNPay
exports.createVnpayPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }
    // Tổng tiền
    const amount = Math.round(cart.totalPrice) * 100; // VNPay dùng đơn vị VND * 100
    const orderId = Date.now();
    const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId.toString(),
      vnp_OrderInfo: `Thanh toan don hang #${orderId}`,
      vnp_OrderType: 'other',
      vnp_Amount: amount,
      vnp_ReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: moment().format('YYYYMMDDHHmmss'),
    };
    vnp_Params = sortObject(vnp_Params);
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnp_Params['vnp_SecureHash'] = signed;
    const paymentUrl = `${vnp_Url}?${querystring.stringify(vnp_Params, { encode: false })}`;
    res.json({ success: true, paymentUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: 'VNPay error', error: err.message });
  }
};


// Xác thực checksum VNPay
function verifyVnpayChecksum(query, secret) {
  const vnp_SecureHash = query.vnp_SecureHash;
  delete query.vnp_SecureHash;
  delete query.vnp_SecureHashType;
  const sorted = sortObject(query);
  const signData = querystring.stringify(sorted, { encode: false });
  const hmac = crypto.createHmac('sha512', secret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  return vnp_SecureHash === signed;
}

// Xử lý return URL từ VNPay
exports.vnpayReturn = async (req, res) => {
  const vnp_Params = { ...req.query };
  const isValid = verifyVnpayChecksum({ ...vnp_Params }, vnp_HashSecret);
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Sai checksum!' });
  }
  // Nếu thanh toán thành công
  if (vnp_Params.vnp_ResponseCode === '00') {
    // Tìm và cập nhật đơn hàng (nếu có lưu orderId ở vnp_TxnRef)
    // Ở đây chỉ demo trả về thành công
    return res.json({ success: true, message: 'Thanh toán thành công!' });
  } else {
    return res.json({ success: false, message: 'Thanh toán thất bại!' });
  }
};

// Xử lý IPN từ VNPay
exports.vnpayIpn = async (req, res) => {
  const vnp_Params = { ...req.query };
  const isValid = verifyVnpayChecksum({ ...vnp_Params }, vnp_HashSecret);
  if (!isValid) {
    return res.json({ RspCode: '97', Message: 'Sai checksum' });
  }
  // Nếu thanh toán thành công
  if (vnp_Params.vnp_ResponseCode === '00') {
    // TODO: Tìm đơn hàng theo vnp_TxnRef và cập nhật trạng thái thanh toán
    // Ví dụ:
    // const order = await Order.findOne({ orderNumber: vnp_Params.vnp_TxnRef });
    // if (order) {
    //   order.paymentStatus = 'paid';
    //   order.paymentDetails = { transactionId: vnp_Params.vnp_TransactionNo, paidAt: new Date() };
    //   await order.save();
    // }
    return res.json({ RspCode: '00', Message: 'Xác nhận thành công' });
  } else {
    return res.json({ RspCode: '00', Message: 'Thanh toán thất bại' });
  }
};

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

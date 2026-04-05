const { VNPay, ProductCode, VnpLocale, dateFormat, ignoreLogger } = require('vnpay');

let vnpayInstance = null;

function getVNPayInstance() {
  if (!vnpayInstance) {
    vnpayInstance = new VNPay({
      tmnCode: (process.env.VNPAY_TMNCODE || '').trim(),
      secureSecret: (process.env.VNPAY_HASHSECRET || '').trim(),
      vnpayHost: 'https://sandbox.vnpayment.vn',
      testMode: true,
      hashAlgorithm: 'SHA512',
      logger: ignoreLogger,
    });
  }
  return vnpayInstance;
}

/**
 * Build a VNPay payment URL using the official vnpay package.
 * Amount is expected in VND (NOT multiplied by 100).
 */
function createPaymentUrl(req, amount, orderInfo, providedTxnRef) {
  const vnpay = getVNPayInstance();
  const returnUrl = (process.env.VNPAY_RETURNURL || '').trim();

  // txnRef must be unique per transaction
  const txnRef = providedTxnRef || String(Date.now()).slice(-8);

  const tomorrow = new Date();
  tomorrow.setMinutes(tomorrow.getMinutes() + 15);

  const paymentUrl = vnpay.buildPaymentUrl({
    vnp_Amount: amount,               // in VND (package multiplies by 100 internally)
    vnp_IpAddr:
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress?.replace(/^::ffff:/, '') ||
      '127.0.0.1',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: returnUrl,
    vnp_Locale: VnpLocale.VN,
    vnp_CreateDate: dateFormat(new Date()),
    vnp_ExpireDate: dateFormat(tomorrow),
  });

  console.log('=== VNPay buildPaymentUrl ===');
  console.log('txnRef    :', txnRef);
  console.log('amount    :', amount);
  console.log('returnUrl :', returnUrl);
  console.log('paymentUrl:', paymentUrl);
  console.log('=============================');

  return { url: paymentUrl, txnRef };
}

/**
 * Validate the vnp_SecureHash returned by VNPay.
 * vnpParams should be req.query (includes vnp_SecureHash).
 */
function validateSignature(vnpParams, secureHash) {
  const vnpay = getVNPayInstance();

  // The vnpay package's verifyReturnUrl expects the full query object
  const fullParams = { ...vnpParams, vnp_SecureHash: secureHash };

  try {
    const result = vnpay.verifyReturnUrl(fullParams);
    console.log('=== VNPay verifyReturnUrl ===');
    console.log('result:', result);
    console.log('=============================');
    return result.isVerified;
  } catch (err) {
    console.error('VNPay verifyReturnUrl error:', err.message);
    return false;
  }
}

/**
 * Human-readable error message for VNPay response codes.
 */
function getErrorMessage(code) {
  const map = {
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (lừa đảo, bất thường).',
    '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.',
    '10': 'Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.',
    '11': 'Đã hết hạn chờ thanh toán. Vui lòng thực hiện lại.',
    '12': 'Thẻ/Tài khoản bị khóa.',
    '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP).',
    '24': 'Khách hàng hủy giao dịch.',
    '51': 'Tài khoản không đủ số dư.',
    '65': 'Vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định.',
    '99': 'Lỗi hệ thống VNPay.',
  };
  return map[code] || `Lỗi không xác định (Mã: ${code})`;
}

module.exports = { createPaymentUrl, validateSignature, getErrorMessage };

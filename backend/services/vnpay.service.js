const crypto = require('crypto');

/**
 * Generate a random numeric string of given length.
 * This replicates the Java getRandomNumber method.
 */
function getRandomNumber(len) {
  let result = '';
  const chars = '0123456789';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Return client IP address (tries X-Forwarded-For first).
 */
function getIpAddress(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // may contain a list, take first
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip;
}

function hmacSHA512(key, data) {
  return crypto.createHmac('sha512', key).update(data).digest('hex');
}

/**
 * Build a VNPay payment URL using sandbox credentials from environment.
 * Amount is expected in VND (will be multiplied by 100 internally).
 */
function createPaymentUrl(req, amount, orderInfo, providedTxnRef) {
  const vnpVersion = '2.1.0';
  const vnpCommand = 'pay';
  const orderType = 'other';

  const vnp_TxnRef = providedTxnRef || getRandomNumber(8);
  const vnp_IpAddr = getIpAddress(req);
  const vnp_TmnCode = process.env.VNPAY_TMNCODE;

  const vnp_Params = {
    vnp_Version: vnpVersion,
    vnp_Command: vnpCommand,
    vnp_TmnCode: vnp_TmnCode,
    vnp_Amount: String(amount * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: vnp_TxnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Locale: 'vn',
    vnp_ReturnUrl: process.env.VNPAY_RETURNURL,
    vnp_IpAddr: vnp_IpAddr,
  };

  // create/expire dates in yyyyMMddHHmmss format
  const formatDate = (d) => {
    const pad = (n) => (n < 10 ? '0' + n : n);
    return (
      d.getFullYear() +
      pad(d.getMonth() + 1) +
      pad(d.getDate()) +
      pad(d.getHours()) +
      pad(d.getMinutes()) +
      pad(d.getSeconds())
    );
  };

  const now = new Date();
  vnp_Params.vnp_CreateDate = formatDate(now);
  const expire = new Date(now.getTime() + 15 * 60 * 1000);
  vnp_Params.vnp_ExpireDate = formatDate(expire);

  // helper that mirrors Java URLEncoder.encode (spaces -> '+')
  const vnpEncode = (str) =>
    encodeURIComponent(str)
      .replace(/%20/g, '+')
      .replace(/%2F/g, '%2F'); // keep slash encoded

  const fieldNames = Object.keys(vnp_Params).sort();
  const hashDataParts = [];
  const queryParts = [];

  fieldNames.forEach((fieldName) => {
    const fieldValue = vnp_Params[fieldName];
    if (fieldValue != null && fieldValue.length > 0) {
      hashDataParts.push(`${fieldName}=${vnpEncode(fieldValue)}`);
      queryParts.push(`${vnpEncode(fieldName)}=${vnpEncode(fieldValue)}`);
    }
  });

  const hashData = hashDataParts.join('&');
  let queryString = queryParts.join('&');
  const vnp_SecureHash = hmacSHA512(
    process.env.VNPAY_HASHSECRET,
    hashData
  );

  // debug log for troubleshooting
  console.debug('VNPay hashData:', hashData);
  console.debug('VNPay secure hash:', vnp_SecureHash);

  queryString += `&vnp_SecureHash=${vnp_SecureHash}`;

  return {
    url: `${process.env.VNPAY_PAYURL}?${queryString}`,
    txnRef: vnp_TxnRef,
  };
}

/**
 * Validate the secure hash returned by VNPay.
 * vnpParams should NOT include vnp_SecureHash or vnp_SecureHashType.
 */
function validateSignature(vnpParams, secureHash) {
  // must use same encoding rules as when generating payment URL
  const vnpEncode = (str) =>
    encodeURIComponent(str)
      .replace(/%20/g, '+')
      .replace(/%2F/g, '%2F');

  const fieldNames = Object.keys(vnpParams).sort();
  const data = fieldNames
    .map((n) => `${n}=${vnpEncode(vnpParams[n])}`)
    .join('&');
  const calculated = hmacSHA512(
    process.env.VNPAY_HASHSECRET,
    data
  );
  console.debug('VNPay validate data:', data);
  console.debug('VNPay calculated hash:', calculated);
  console.debug('VNPay received hash:', secureHash);
  return calculated === secureHash;
}

/**
 * Human readable error message mapping used by controller.
 */
function getErrorMessage(code) {
  return {
    '07':
      'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09':
      'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.',
    '10':
      'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
    '11':
      'Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.',
    '12':
      'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.',
    '13':
      'Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP).',
    '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
    '51':
      'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.',
    '65':
      'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79':
      'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định.',
    '99':
      'Lỗi hệ thống VNPay. Có thể do cấu hình sai TmnCode/HashSecret hoặc thiếu tham số bắt buộc.',
  }[code] || `Lỗi không xác định (Mã: ${code})`;
}

module.exports = {
  createPaymentUrl,
  validateSignature,
  getErrorMessage,
};

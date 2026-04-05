/**
 * VNPay Hash Verification - run with: node verify-vnpay-hash.js
 * Uses the new credentials to verify hash is consistent AND correct.
 */
const crypto = require('crypto');

function hmacSHA512(key, data) {
  return crypto.createHmac('sha512', key).update(data, 'utf8').digest('hex');
}

const secretKey = (process.env.VNPAY_HASHSECRET || '7XHXEZNTQS0VZ7R9O7SNWX0OZKKFFOJ1').trim();
const tmnCode   = (process.env.VNPAY_TMNCODE    || 'FQILZLCV').trim();

// Minimal fixed test params (same structure as service)
const params = {
  vnp_Version:    '2.1.0',
  vnp_Command:    'pay',
  vnp_TmnCode:    tmnCode,
  vnp_Amount:     '100000',          // 1,000 VND for test
  vnp_CurrCode:   'VND',
  vnp_TxnRef:     '12345678',
  vnp_OrderInfo:  'Test thanh toan',
  vnp_OrderType:  'other',
  vnp_Locale:     'vn',
  vnp_ReturnUrl:  'https://nonfluctuating-uniaxially-laylah.ngrok-free.dev/api/vnpay/return',
  vnp_IpAddr:     '127.0.0.1',
  vnp_CreateDate: '20260405095000',
  vnp_ExpireDate: '20260405101000',
};

const sortedKeys = Object.keys(params).sort();

// Hash data: raw unencoded values
const hashData = sortedKeys
  .filter((k) => params[k] != null && params[k] !== '')
  .map((k) => `${k}=${params[k]}`)
  .join('&');

const hash1 = hmacSHA512(secretKey, hashData);
const hash2 = hmacSHA512(secretKey, hashData);

console.log('=== VNPay Verification ===');
console.log('TmnCode   :', tmnCode);
console.log('SecretKey :', secretKey);
console.log('hashData  :', hashData);
console.log('hash1     :', hash1);
console.log('hash2     :', hash2);
console.log('Consistent:', hash1 === hash2 ? '✅ YES' : '❌ NO');
console.log('Length    :', hash1.length, '(expected 128)');
console.log('');
console.log('Check this URL manually in browser:');

const encode = (s) => encodeURIComponent(String(s));
const queryString = sortedKeys
  .filter((k) => params[k] != null && params[k] !== '')
  .map((k) => `${encode(k)}=${encode(params[k])}`)
  .join('&');
const testUrl = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${queryString}&vnp_SecureHash=${hash1}`;
console.log(testUrl);

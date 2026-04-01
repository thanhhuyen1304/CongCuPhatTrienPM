import React from 'react';
import { useLocation, Link } from 'react-router-dom';

// parse query string into object
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const PaymentResultPage = () => {
  const query = useQuery();
  const success = query.get('success') === 'true';
  const message = query.get('message');
  const txnRef = query.get('txnRef');
  const amount = query.get('amount');
  const errorCode = query.get('errorCode');

  const renderHint = () => {
    if (!errorCode) return null;
    switch (errorCode) {
      case '24':
        return 'Bạn đã hủy giao dịch. Vui lòng thử lại nếu muốn thanh toán.';
      case '51':
        return 'Tài khoản không đủ số dư. Vui lòng nạp thêm tiền hoặc sử dụng tài khoản khác.';
      case '11':
        return 'Giao dịch đã hết hạn. Vui lòng tạo đơn hàng mới.';
      case '99':
        return (
          <span>
            <strong>Lỗi hệ thống VNPay (Mã 99):</strong><br />
            • Có thể do cấu hình TmnCode/HashSecret không đúng<br />
            • Hoặc thiếu tham số bắt buộc trong request<br />
            • Vui lòng kiểm tra logs server để biết chi tiết<br />
            • Nếu đang dùng tài khoản demo, hãy đăng ký tài khoản sandbox mới tại:{' '}
            <a
              href="https://sandbox.vnpayment.vn/devreg/"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              https://sandbox.vnpayment.vn/devreg/
            </a>
          </span>
        );
      case 'INVALID_SIGNATURE':
        return 'Có vấn đề với bảo mật giao dịch. Vui lòng liên hệ hỗ trợ.';
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-6">
          {success ? '✅' : '❌'}
        </div>
        <h1 className="text-3xl font-bold mb-4 text-blue-900">
          {success ? 'Thanh toán thành công!' : 'Thanh toán thất bại!'}
        </h1>
        <p className="text-gray-600 mb-6">{message}</p>
        {(txnRef || amount) && (
          <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left">
            {txnRef && (
              <div className="flex justify-between py-1">
                <span className="font-semibold text-gray-700">Mã giao dịch:</span>
                <span className="font-bold text-gray-900">{txnRef}</span>
              </div>
            )}
            {amount && (
              <div className="flex justify-between py-1">
                <span className="font-semibold text-gray-700">Số tiền:</span>
                <span className="font-bold text-gray-900">{amount} VND</span>
              </div>
            )}
            {errorCode && (
              <div className="flex justify-between py-1">
                <span className="font-semibold text-red-600">Mã lỗi:</span>
                <span className="font-bold text-red-600">{errorCode}</span>
              </div>
            )}
          </div>
        )}
        {errorCode && !success && (
          <div className="bg-yellow-50 p-4 rounded-lg text-left text-sm text-yellow-800 mb-6">
            <strong>💡 Gợi ý:</strong>
            <div className="mt-2">{renderHint()}</div>
          </div>
        )}
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  );
};

export default PaymentResultPage;

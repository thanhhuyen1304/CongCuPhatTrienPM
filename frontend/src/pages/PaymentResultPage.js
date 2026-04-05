import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getCart } from '../store/slices/cartSlice';

const PaymentResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const success = searchParams.get('success') === 'true';
  const message = searchParams.get('message') || '';
  const txnRef = searchParams.get('txnRef') || '';
  const amount = searchParams.get('amount') || '0';
  const errorCode = searchParams.get('errorCode') || '';

  useEffect(() => {
    // Refresh cart after successful payment (cart was cleared on backend)
    if (success) {
      dispatch(getCart());
    }
  }, [success, dispatch]);

  const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return '0 ₫';
    return num.toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Icon */}
        <div style={{ ...styles.iconCircle, background: success ? '#dcfce7' : '#fee2e2' }}>
          {success ? (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#22c55e" />
              <path d="M7 12.5l3.5 3.5 6-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#ef4444" />
              <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h1 style={{ ...styles.title, color: success ? '#16a34a' : '#dc2626' }}>
          {success ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
        </h1>
        <p style={styles.message}>{message}</p>

        {/* Details */}
        <div style={styles.details}>
          {txnRef && (
            <div style={styles.row}>
              <span style={styles.label}>Mã giao dịch</span>
              <span style={styles.value}>{txnRef}</span>
            </div>
          )}
          {success && Number(amount) > 0 && (
            <div style={styles.row}>
              <span style={styles.label}>Số tiền</span>
              <span style={{ ...styles.value, color: '#2563eb', fontWeight: '700' }}>
                {formatCurrency(amount)}
              </span>
            </div>
          )}
          {errorCode && (
            <div style={styles.row}>
              <span style={styles.label}>Mã lỗi</span>
              <span style={{ ...styles.value, color: '#dc2626' }}>{errorCode}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {success ? (
            <>
              <Link to="/orders" style={{ ...styles.btn, background: '#2563eb', color: '#fff' }}>
                Xem đơn hàng
              </Link>
              <Link to="/shop" style={{ ...styles.btn, background: '#f3f4f6', color: '#374151' }}>
                Tiếp tục mua sắm
              </Link>
            </>
          ) : (
            <>
              <Link to="/cart" style={{ ...styles.btn, background: '#2563eb', color: '#fff' }}>
                Quay lại giỏ hàng
              </Link>
              <Link to="/" style={{ ...styles.btn, background: '#f3f4f6', color: '#374151' }}>
                Về trang chủ
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
    padding: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '20px',
    padding: '48px 40px',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  iconCircle: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    margin: '0 0 8px',
  },
  message: {
    color: '#6b7280',
    fontSize: '15px',
    margin: '0 0 28px',
  },
  details: {
    background: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    textAlign: 'left',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  label: {
    color: '#6b7280',
    fontSize: '14px',
  },
  value: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
    wordBreak: 'break-all',
    maxWidth: '200px',
    textAlign: 'right',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  btn: {
    display: 'block',
    padding: '14px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '15px',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
};

export default PaymentResultPage;

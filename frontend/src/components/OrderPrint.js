import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { formatVND } from '../utils/currency';

const OrderPrint = ({ order, onComplete }) => {
  const printRef = React.useRef();

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      
      // A4 size: 210mm x 297mm
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Order_${order.orderNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      if (onComplete) onComplete();
    }
  };

  React.useEffect(() => {
    if (order) {
      // Small delay to ensure QR code and images are rendered
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [order]);

  if (!order) return null;

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
      <div 
        ref={printRef}
        style={{
          width: '210mm',
          padding: '20mm',
          backgroundColor: '#ffffff',
          color: '#333333',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #3b82f6', paddingBottom: '10mm', marginBottom: '10mm' }}>
          <div>
            <h1 style={{ fontSize: '28px', color: '#1d4ed8', margin: 0 }}>E-COMMERCE SHOP</h1>
            <p style={{ fontSize: '12px', margin: '5px 0' }}>456 Nguyen Hue St, District 1, Ho Chi Minh City</p>
            <p style={{ fontSize: '12px', margin: '5px 0' }}>Phone: (028) 1234 5678 | Email: contact@eshop.com</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '22px', margin: 0 }}>HÓA ĐƠN BÁN HÀNG</h2>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '5px 0' }}>Số đơn: {order.orderNumber}</p>
            <p style={{ fontSize: '12px', margin: '5px 0' }}>Ngày: {new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
          </div>
        </div>

        {/* Customer & Shipping Info */}
        <div style={{ display: 'flex', marginBottom: '10mm' }}>
          <div style={{ flex: 1, paddingRight: '5mm' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '2mm' }}>Thông tin khách hàng</h3>
            <p style={{ fontSize: '14px', margin: '5px 0' }}><strong>Tên:</strong> {order.shippingAddress?.fullName || (order.user && order.user.name) || 'N/A'}</p>
            <p style={{ fontSize: '14px', margin: '5px 0' }}><strong>SĐT:</strong> {order.shippingAddress?.phone || 'N/A'}</p>
            <p style={{ fontSize: '14px', margin: '5px 0' }}><strong>Địa chỉ:</strong> {order.shippingAddress?.address || 'N/A'}</p>
          </div>
          <div style={{ flex: 1, paddingLeft: '5mm' }}>
            <h3 style={{ fontSize: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '2mm' }}>Phương thức thanh toán</h3>
            <p style={{ fontSize: '14px', margin: '5px 0' }}>{order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Đã thanh toán (VNPAY)'}</p>
            <div style={{ marginTop: '5mm' }}>
              <QRCodeSVG value={`${window.location.origin}/orders/${order._id}`} size={64} />
              <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2mm' }}>Quét mã để tra cứu đơn hàng</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10mm' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ border: '1px solid #e5e7eb', padding: '3mm', textAlign: 'left' }}>Sản phẩm</th>
              <th style={{ border: '1px solid #e5e7eb', padding: '3mm', textAlign: 'center' }}>SL</th>
              <th style={{ border: '1px solid #e5e7eb', padding: '3mm', textAlign: 'right' }}>Đơn giá</th>
              <th style={{ border: '1px solid #e5e7eb', padding: '3mm', textAlign: 'right' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, index) => (
              <tr key={index}>
                <td style={{ border: '1px solid #e5e7eb', padding: '3mm' }}>{item.name}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '3mm', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '3mm', textAlign: 'right' }}>{formatVND(item.price)}</td>
                <td style={{ border: '1px solid #e5e7eb', padding: '3mm', textAlign: 'right' }}>{formatVND(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '80mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2mm 0' }}>
              <span>Tổng tiền hàng:</span>
              <span>{formatVND(order.itemsPrice || (order.totalPrice - (order.shippingPrice || 0)))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2mm 0' }}>
              <span>Phí vận chuyển:</span>
              <span>{formatVND(order.shippingPrice || 0)}</span>
            </div>
            {order.promotion && order.promotion.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2mm 0', color: '#dc2626', fontWeight: 'bold' }}>
                <span>Khuyến mãi ({order.promotion.code}):</span>
                <span>-{formatVND(order.promotion.discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2mm 0', borderTop: '2px solid #3b82f6', marginTop: '2mm', fontWeight: 'bold', fontSize: '18px' }}>
              <span>TỔNG CỘNG:</span>
              <span style={{ color: '#1d4ed8' }}>{formatVND(order.totalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '20mm', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'center', width: '60mm' }}>
            <p style={{ fontSize: '14px' }}>Khách hàng</p>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '15mm' }}>(Ký và ghi rõ họ tên)</p>
          </div>
          <div style={{ textAlign: 'center', width: '60mm' }}>
            <p style={{ fontSize: '14px' }}>Người lập phiếu</p>
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '15mm' }}>(Ký và ghi rõ họ tên)</p>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '15mm', fontSize: '10px', color: '#9ca3af', fontStyle: 'italic' }}>
          Cảm ơn Quý khách đã mua sắm tại E-COMMERCE SHOP! 
          <br /> Chúc Quý khách một ngày tốt lành!
        </div>
      </div>
    </div>
  );
};

export default OrderPrint;

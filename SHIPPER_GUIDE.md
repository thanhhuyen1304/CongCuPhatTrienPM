# Shipper Role Implementation Guide

## Overview
Đã thêm role **Shipper** vào hệ thống e-commerce. Shipper có thể quản lý đơn giao hàng, theo dõi route, và cập nhật trạng thái giao hàng.

## 🎯 Features

### Backend
- ✅ User Model: Thêm `shipperInfo` field
  - `vehicleType`: Loại phương tiện (xe máy, ô tô, v.v.)
  - `licensePlate`: Biển số xe
  - `isVerified`: Xác thực shipper
  - `rating`: Đánh giá (0-5)
  - `totalDeliveries`: Tổng đơn giao hàng

- ✅ Middleware: `shipper` middleware bảo vệ các route
- ✅ API Routes: `/api/shipper/*` endpoints
  - GET `/shipper/dashboard` - Lấy thông tin dashboard
  - GET `/shipper/orders` - Danh sách đơn hàng
  - POST `/shipper/orders/:id/accept` - Nhận đơn hàng
  - PUT `/shipper/orders/:id/status` - Cập nhật trạng thái
  - GET `/shipper/route` - Lấy route giao hàng
  - PUT `/shipper/location` - Cập nhật vị trí real-time
  - GET `/shipper/stats` - Thống kê shipper

### Frontend
- ✅ ShipperRoute Guard: Bảo vệ các route dành cho shipper
- ✅ ShipperLayout: Layout với sidebar navigation
- ✅ Pages:
  - Dashboard: Thống kê và thông tin chung
  - Orders: Danh sách đơn hàng cần giao
  - Route: Theo dõi route giao hàng

- ✅ Redux Slice: `shipperSlice` để quản lý state
- ✅ Service: `shipperService.js` để gọi API

## 📱 Mobile Responsive
Tất cả các component đều:
- Responsive với Tailwind CSS
- Hiển thị tốt trên mobile (< 768px)
- Sidebar ẩn trên mobile, hiện menu toggle
- Touch-friendly buttons

## 🔐 Role-Based Access Control

### Authentication Flow
```
Register/Login → Role = 'user', 'admin', or 'shipper'
↓
ShipperRoute Guard (checks role === 'shipper')
↓
ShipperLayout + Pages (shipper-specific UI)
```

### Middleware
```javascript
// Backend
router.get('/dashboard', protect, shipper, handler);
// protect: Xác thực JWT
// shipper: Kiểm tra role === 'shipper'
```

## 🚀 Usage

### Register as Shipper
Backend sẽ cần form để admin hoặc user tự quảng cáo là shipper. Tạm thời:

```javascript
// Admin tạo shipper account
const user = await User.create({
  name: 'John Shipper',
  email: 'shipper@example.com',
  password: 'password123',
  role: 'shipper',
  shipperInfo: {
    vehicleType: 'Bike',
    licensePlate: '51A-12345',
    isVerified: false
  }
});
```

### Shipper URLs
- **Dashboard**: `/shipper`
- **Orders**: `/shipper/orders`
- **Route**: `/shipper/route`

## 📝 Next Steps (To-Do)

1. **Database Relationships**
   - Thêm `Order.assignedShipper` reference
   - Track shipper history

2. **Real-time Updates**
   - WebSocket cho location updates
   - Real-time order notifications

3. **Payment Integration**
   - Khung thanh toán cho shipper
   - Commission calculation

4. **Admin Panel**
   - Quản lý shipper accounts
   - Phê duyệt shipper verification
   - Thống kê shipper

5. **Map Integration**
   - Google Maps API
   - Route optimization
   - Live tracking

6. **Notifications**
   - SMS/Push notifications
   - Email notifications
   - In-app notifications

7. **Rating & Reviews**
   - Customer ratings for shipper
   - Performance metrics

## 📂 File Structure

```
backend/
├── models/User.js (updated with shipperInfo)
├── middleware/auth.js (added shipper middleware)
├── routes/shipper.routes.js (NEW)
└── server.js (added shipper route)

frontend/
├── components/
│   ├── guards/ShipperRoute.js (NEW)
│   └── layouts/ShipperLayout.js (NEW)
├── pages/shipper/
│   ├── Dashboard.js (NEW)
│   ├── Orders.js (NEW)
│   └── Route.js (NEW)
├── services/shipperService.js (NEW)
├── store/slices/shipperSlice.js (NEW)
├── store/index.js (updated)
└── App.js (updated)
```

## 🛠️ Configuration

### Environment Variables (Backend)
```env
JWT_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
MONGODB_URI=mongodb://localhost:27017/ecommerce
```

### Environment Variables (Frontend)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🧪 Testing

### Test Shipper Login
```bash
POST /api/auth/login
{
  "email": "shipper@example.com",
  "password": "password123"
}
```

### Get Shipper Dashboard
```bash
GET /api/shipper/dashboard
Authorization: Bearer {accessToken}
```

### Get Orders
```bash
GET /api/shipper/orders
Authorization: Bearer {accessToken}
```

## 🔄 Web & Mobile Sync

Cả web và mobile (React Native) sử dụng cùng backend API:
- API endpoints không thay đổi
- Authentication giống nhau (JWT)
- Response format giống nhau
- Real-time updates dùng WebSocket (future)

Khi tạo React Native app cho shipper:
```javascript
// Mobile sẽ dùng shipperService giống web
import shipperService from './services/shipperService';

const orders = await shipperService.getShipperOrders();
```

## ✅ Completed
- [x] User Model with shipperInfo
- [x] Shipper Middleware
- [x] Shipper Routes (Frontend)
- [x] Shipper Pages
- [x] Shipper Layout
- [x] Redux Integration
- [x] API Service
- [x] Responsive Design

## 🐛 Known Issues
- Real-time location tracking (needs WebSocket)
- Map integration (ready for Google Maps)
- Database relationships for orders (needs Order model update)

## 📞 Support
Liên hệ: dev@example.com

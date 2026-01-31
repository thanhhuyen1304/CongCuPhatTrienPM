# Native Mobile App Setup Complete ✅

## 📱 React Native Shipper App - All Set!

Bạn đã có **native React Native app hoàn chỉnh** cho shipper!

---

## 🚀 Để Chạy Ứng Dụng Trên Điện Thoại Thật

### Bước 1: Chuẩn Bị (One-time)

```bash
# 1. Tải Android Studio từ: https://developer.android.com/studio
# 2. Cài đặt Java JDK 11+ (bạn đã có version 25 ✅)

# 3. Tạo Android Virtual Device (AVD):
# - Mở Android Studio
# - Tools → Device Manager → Create Device
# - Chọn: Pixel 4 hoặc tương tự
# - Chọn: API Level 34 (latest)
# - Click "Create" và "Launch"

# 4. Hoặc dùng điện thoại thật:
# - Enable Developer Mode: Settings → About Phone → Tap "Build Number" 7 lần
# - Enable USB Debugging: Settings → Developer Options → USB Debugging ON
# - Connect phone via USB cable
```

### Bước 2: Cấu Hình Backend URL

Edit file: `ShipperMobileApp/src/services/api.js`

Thay đổi dòng:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://10.0.2.2:5000/api';
```

**Thành:**
- Nếu dùng **Emulator**: `http://10.0.2.2:5000/api` (mặc định)
- Nếu dùng **Điện thoại thật**: 
  ```
  Mở Command Prompt → ipconfig → lấy IPv4 Address
  Ví dụ: http://192.168.1.100:5000/api
  ```

### Bước 3: Chạy Ứng Dụng

**Terminal 1** (Metro Bundler):
```bash
cd ShipperMobileApp
npm start
```

**Terminal 2** (Build & Run):
```bash
cd ShipperMobileApp
npm run android
```

⏳ Chờ **3-5 phút** cho lần build đầu tiên.

Sau đó, ứng dụng sẽ **tự động cài đặt & mở trên điện thoại/emulator** 🎉

---

## 📊 Project Structure

```
ShipperMobileApp/
├── src/
│   ├── screens/          # 6 screens (Login, Register, Dashboard, Orders, Route, Splash)
│   ├── navigation/       # Tab navigation
│   ├── services/         # API calls (Auth, Shipper)
│   ├── store/            # Redux state (Auth, Shipper)
│   └── utils/            # Helpers
├── android/              # Native Android code
├── ios/                  # Native iOS code (empty for now)
├── App.tsx               # Main app entry
└── SETUP_GUIDE.md        # Chi tiết setup
```

---

## 🎯 Features Đã Có

✅ **Login/Logout** - JWT authentication  
✅ **Dashboard** - Shipper stats & vehicle info  
✅ **Orders List** - Pending deliveries  
✅ **Accept Orders** - Nhận đơn hàng  
✅ **Route Tracking** - Theo dõi route  
✅ **Redux** - State management  
✅ **API Service** - Kết nối backend  
✅ **Local Storage** - AsyncStorage  
✅ **Icons** - Material Community Icons  
✅ **Responsive UI** - Mobile-first design  

---

## 🔑 Test Credentials

```
Email: shipper@example.com
Password: password123
```

(Hoặc dùng account shipper hiện tại)

---

## ⚡ Commands

```bash
# Khởi động Metro bundler
npm start

# Build & run trên Android
npm run android

# Build & run trên iOS
npm run ios

# Clean build (nếu có lỗi)
npm run android:clean

# Reset tất cả
npm run android:reset
```

---

## 🐛 Nếu Có Lỗi

| Lỗi | Giải Pháp |
|-----|----------|
| "Cannot find emulator" | Mở Android Studio → Launch AVD |
| "Cannot reach API" | Kiểm tra IP trong `api.js` |
| "Metro error" | `npm start -- --reset-cache` |
| "Build fail" | `npm run android:clean` rồi chạy lại |

📚 **Chi tiết**: Xem `ShipperMobileApp/SETUP_GUIDE.md`

---

## 🔄 Sync với Backend

- Cùng API endpoints (`/api/shipper/*`)
- Cùng authentication (JWT)
- Cùng data models
- **Cả web và mobile dùng chung backend!** 🎯

---

## 🎮 Demo App

1. **Màn hình đăng nhập** → Nhập email/password
2. **Dashboard** → Xem thông tin shipper, stats, vehicle
3. **Orders** → Xem danh sách đơn hàng pending, nhấn "Accept"
4. **Route** → Xem route tracking (placeholder cho Google Maps)
5. **Logout** → Quay về login screen

---

## 📱 Làm Thế Nào Cài Lên Điện Thoại Thật?

### Cách 1: Chạy từ CLI (Dễ nhất lần đầu)
1. Cắm điện thoại vào máy tính
2. Enable USB Debugging
3. Chạy: `npm run android`
4. App tự động cài & mở

### Cách 2: Dùng Emulator
1. Mở Android Studio
2. Launch AVD
3. Chạy: `npm run android`

### Cách 3: Build APK để chia sẻ
```bash
cd android
./gradlew assembleRelease
cd ..
# APK sẽ ở: android/app/build/outputs/apk/release/app-release.apk
```

---

## ✅ Next Steps

1. **Test app** trên emulator/device
2. **Thêm Google Maps** cho route tracking
3. **Geolocation** - cập nhật vị trí real-time
4. **Push Notifications** - thông báo đơn hàng mới
5. **Offline Support** - dùng SQLite
6. **Camera** - chụp ảnh chứng minh giao hàng

---

## 📞 Cần Giúp?

✅ Tất cả files đã setup sẵn  
✅ Chỉ cần cắm điện thoại & chạy `npm run android`  
✅ Xem `SETUP_GUIDE.md` nếu gặp vấn đề  

---

**🚀 Sẵn sàng? Mở 2 terminal và chạy:**
```bash
# Terminal 1
cd ShipperMobileApp && npm start

# Terminal 2
cd ShipperMobileApp && npm run android
```

**App sẽ hiện trên điện thoại trong 3-5 phút!** 📱✨

---

Created: Jan 28, 2026  
React Native v0.83 | Node v24 | Java v25

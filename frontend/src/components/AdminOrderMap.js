import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import socketService from '../services/socketService';

// Fix for Leaflet default icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const storeIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/606/606363.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const customerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1275/1275214.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const shipperIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// Component to recenter map when positions change
const RecenterMap = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [positions, map]);
  return null;
};

const AdminOrderMap = ({ order }) => {
  const [shipperPos, setShipperPos] = useState(null);
  
  const storePos = order.storeLocation ? 
    [order.storeLocation.latitude, order.storeLocation.longitude] : 
    [10.7740, 106.7010]; // Default District 1
    
  const customerPos = [
    order.shippingAddress?.latitude || 10.8435, 
    order.shippingAddress?.longitude || 106.7135
  ];

  useEffect(() => {
    // Listen for shipper location updates via socket
    const handleShipperUpdate = (data) => {
      console.log('📡 Nhận tín hiệu vị trí mới:', data);
      const currentOrderId = order._id;
      const orderShipperId = order.shipper?._id || order.shipper;
      
      if (orderShipperId && data.shipperId === orderShipperId.toString()) {
        console.log('✅ Khớp Shipper! Cập nhật tọa độ:', [data.latitude, data.longitude]);
        setShipperPos([data.latitude, data.longitude]);
      }
    };

    socketService.on('shipper_location_updated', handleShipperUpdate);
    
    // Initial position from order if available
    if (order.currentLocation?.latitude) {
      setShipperPos([order.currentLocation.latitude, order.currentLocation.longitude]);
    }

    return () => {
      socketService.off('shipper_location_updated', handleShipperUpdate);
    };
  }, [order]);

  const allPositions = [storePos, customerPos];
  if (shipperPos) allPositions.push(shipperPos);

  const getStatusOverlay = () => {
    if (order.status === 'delivered') return null;
    
    // Check if shipper is present (could be object or ID string)
    const hasShipper = order.shipper && (typeof order.shipper === 'object' ? order.shipper._id : order.shipper);
    
    if (!hasShipper) {
      return (
        <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-yellow-200 flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-yellow-800">Hệ thống đang tìm Shipper...</span>
        </div>
      );
    }
    if (!shipperPos) {
      const shipperName = (typeof order.shipper === 'object' ? order.shipper?.name : 'Shipper') || 'Shipper';
      return (
        <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg border border-blue-200 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
          <span className="text-sm font-medium text-blue-800">{shipperName} đang chuẩn bị lấy hàng</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner relative">
      {getStatusOverlay()}
      
      <MapContainer 
        center={shipperPos || storePos} 
        zoom={13} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Store Marker */}
        <Marker position={storePos} icon={storeIcon}>
          <Popup>
            <div className="font-semibold">Cửa hàng</div>
            <div className="text-xs">{order.storeLocation?.address || '456 Nguyen Hue, D1'}</div>
          </Popup>
        </Marker>

        {/* Customer Marker */}
        <Marker position={customerPos} icon={customerIcon}>
          <Popup>
            <div className="font-semibold">Khách hàng: {order.shippingAddress?.fullName}</div>
            <div className="text-xs">{order.shippingAddress?.address}</div>
          </Popup>
        </Marker>

        {/* Shipper Marker */}
        {shipperPos && (
          <Marker position={shipperPos} icon={shipperIcon}>
            <Popup>
              <div className="font-semibold text-blue-600">Shipper: {order.shipper?.name || 'Đang di chuyển'}</div>
              <div className="text-xs">Cập nhật lúc: {new Date().toLocaleTimeString()}</div>
            </Popup>
          </Marker>
        )}

        {/* Route Line */}
        <Polyline 
          positions={[storePos, customerPos]} 
          color="#94a3b8" 
          dashArray="10, 10" 
          weight={2} 
        />
        
        {shipperPos && (
          <Polyline 
            positions={[shipperPos, storePos]} 
            color="#3b82f6" 
            weight={3} 
          />
        )}

        <RecenterMap positions={allPositions} />
      </MapContainer>
    </div>
  );
};

export default AdminOrderMap;

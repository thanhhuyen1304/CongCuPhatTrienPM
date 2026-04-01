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
      if (order.shipper && (data.shipperId === order.shipper._id || data.shipperId === order.shipper)) {
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

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner">
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

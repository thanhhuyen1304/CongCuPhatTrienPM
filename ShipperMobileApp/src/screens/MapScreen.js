import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from '@react-native-community/geolocation';
import { 
  geocodeAddress, 
  openGoogleMaps, 
  openAppleMaps, 
  makePhoneCall,
  smartNavigate,
  calculateDistance as calculateDistanceMap,
  estimateTravelTime
} from '../services/mapService';
import { formatVND } from '../utils/currency';

const { width, height } = Dimensions.get('window');

const MapScreen = ({ navigation, route }) => {
  const { order } = route.params;
  
  // Debug logging to check order data
  console.log('🗺️ MapScreen - Order data:', JSON.stringify(order, null, 2));
  
  // Handle price formats - ensure VND conversion with better detection
  let totalPrice = order.totalPrice || order.total || 0;
  let deliveryFee = order.deliveryFee || order.shippingFee || order.shippingPrice || 0;
  
  // Convert USD to VND if prices seem to be in USD (less than 10000 suggests USD)
  if (totalPrice > 0 && totalPrice < 10000) {
    console.log('💰 MapScreen - Converting total price from USD to VND:', totalPrice, '→', totalPrice * 24500);
    totalPrice = totalPrice * 24500;
  }
  
  if (deliveryFee > 0 && deliveryFee < 1000) {
    console.log('💰 MapScreen - Converting delivery fee from USD to VND:', deliveryFee, '→', deliveryFee * 24500);
    deliveryFee = deliveryFee * 24500;
  }
  
  // Handle customer phone from multiple sources
  const customerPhone = order.user?.phone || 
                       order.customer?.phone || 
                       order.shippingAddress?.phone || 
                       order.customerPhone ||
                       order.phone ||
                       '0123456789';

  // Handle customer name from multiple sources with correct priority
  const customerName = order.shippingAddress?.fullName || 
                      order.shippingAddress?.name || 
                      order.user?.name || 
                      order.customer?.name || 
                      order.customerName ||
                      'Khách hàng';

  // Prepare order data with fallbacks and accurate price handling
  const orderData = {
    ...order,
    totalPrice: totalPrice,
    deliveryFee: deliveryFee,
    customerName: customerName,
    customerPhone: customerPhone,
    distance: order.distance || '2.5 km',
    estimatedTime: order.estimatedTime || '15 phút',
    deliveryLocation: order.shippingAddress?.address || 
      (order.shippingAddress?.street ? `${order.shippingAddress.street}, ${order.shippingAddress.city || ''}` : order.address) || 
      order.deliveryLocation ||
      'Địa chỉ giao hàng',
    pickupLocation: order.pickupLocation || order.pickupAddress || 'Store ABC, 456 Nguyen Hue St',
  };
  
  console.log('🗺️ MapScreen - Processed order data:', {
    totalPrice: orderData.totalPrice,
    deliveryFee: orderData.deliveryFee,
    customerPhone: orderData.customerPhone,
    deliveryLocation: orderData.deliveryLocation
  });
  
  // Calculate total route distance and estimated time
  const calculateRouteInfo = (coordinates) => {
    if (coordinates.length < 2) return { distance: 0, duration: 0 };
    
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalDistance += calculateDistanceMap(coordinates[i], coordinates[i + 1]);
    }
    
    // Use the standardized travel time estimation from mapService
    const timeString = estimateTravelTime(totalDistance);
    const duration = parseInt(timeString) || Math.round((totalDistance / 22.5) * 60);

    return {
      distance: totalDistance.toFixed(1),
      duration: duration
    };
  };
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState({ distance: null, duration: null });
  const [storeToCustomerInfo, setStoreToCustomerInfo] = useState({ distance: null, duration: null });
  const [watchId, setWatchId] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    initializeMap();
    
    // Start real-time tracking for orders in delivery status
    const deliveryStatuses = ['shipped', 'in_progress', 'in_transit'];
    if (deliveryStatuses.includes(orderData.status)) {
      startLocationTracking();
    }
    
    // Cleanup on unmount
    return () => {
      stopLocationTracking();
    };
  }, []);

  // Start real-time location tracking
  const startLocationTracking = () => {
    console.log('🎯 Starting real-time location tracking...');
    setIsTracking(true);
    
    const watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { latitude, longitude };
        
        console.log('📍 Location updated:', newLocation);
        setCurrentLocation(newLocation);
        
        // Update route with new location
        updateRouteWithNewLocation(newLocation);
      },
      (error) => {
        console.error('Location tracking error:', error);
        // Continue with last known location
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Accept location up to 5 seconds old
        distanceFilter: 10, // Update only when moved 10 meters
      }
    );
    
    setWatchId(watchId);
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (watchId !== null) {
      console.log('🛑 Stopping location tracking...');
      Geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTracking(false);
    }
  };

  // Update route when location changes
  const updateRouteWithNewLocation = (newLocation) => {
    if (pickupCoords || destinationCoords) {
      const route = [];
      route.push(newLocation);
      
      const deliveryStatuses = ['shipped', 'in_progress', 'in_transit', 'picked_up'];
      const isDeliveryPhase = deliveryStatuses.includes(orderData.status);

      if (!isDeliveryPhase && pickupCoords) {
        // Phase 1: Go to Store
        route.push(pickupCoords);
      } else if (destinationCoords) {
        // Phase 2: Go to Customer
        route.push(destinationCoords);
      }
      
      setRouteCoordinates(route);
      
      // Calculate route info
      const info = calculateRouteInfo(route);
      setRouteInfo(info);
      console.log('🗺️ Route updated with new location:', info);
      
      // Send location update to server (for admin tracking)
      sendLocationUpdate(newLocation);
    }
  };

  // Send location update to server
  const sendLocationUpdate = async (location) => {
    try {
      // Only send updates for orders in delivery status
      const deliveryStatuses = ['shipped', 'in_progress', 'in_transit'];
      if (!deliveryStatuses.includes(orderData.status)) {
        return;
      }

      console.log('📡 Sending location update to server:', location);
      
      // TODO: Implement API call to update shipper location
      // await shipperService.updateLocation(orderData._id, location);
      
    } catch (error) {
      console.error('Failed to send location update:', error);
      // Don't show error to user - this is background operation
    }
  };



  const initializeMap = async () => {
    try {
      // Get coordinates for addresses - support both formats
      const deliveryAddress = orderData.deliveryLocation;
      const pickupAddress = orderData.pickupLocation;
      
      console.log('🗺️ MapScreen - Initializing map with addresses:');
      console.log('📍 Delivery address:', deliveryAddress);
      console.log('📍 Pickup address:', pickupAddress);
      console.log('🔍 Order data for debugging:', {
        orderNumber: order.orderNumber,
        status: order.status,
        shippingAddress: order.shippingAddress,
        address: order.address,
        deliveryLocation: order.deliveryLocation
      });
      
      let destCoords;
      if (order.shippingAddress?.latitude && order.shippingAddress?.longitude) {
        destCoords = {
          latitude: Number(order.shippingAddress.latitude),
          longitude: Number(order.shippingAddress.longitude)
        };
        console.log('📍 Using exact coordinates from order shippingAddress:', destCoords);
      } else {
        destCoords = await geocodeAddress(deliveryAddress);
        console.log('📍 Geocoded destination coordinates:', destCoords);
      }
      
      const pickupCoords = await geocodeAddress(pickupAddress);
      
      console.log('📍 Final destination coordinates:', destCoords);
      console.log('📍 Final pickup coordinates:', pickupCoords);
      
      // Validate coordinates are reasonable for Ho Chi Minh City area
      if (destCoords.latitude < 10.5 || destCoords.latitude > 11.0 || 
          destCoords.longitude < 106.0 || destCoords.longitude > 107.0) {
        console.warn('⚠️ Destination coordinates seem outside HCM area:', destCoords);
      }
      
      setDestinationCoords(destCoords);
      setPickupCoords(pickupCoords);
      
      // Calculate Store-to-Customer total metrics
      if (destCoords && pickupCoords) {
        const totalInfo = calculateRouteInfo([pickupCoords, destCoords]);
        setStoreToCustomerInfo(totalInfo);
        console.log('🏁 Store to Customer total metrics:', totalInfo);
      }
      
      // Get current location and create route
      getCurrentLocation(destCoords, pickupCoords);
    } catch (error) {
      console.error('Error initializing map:', error);
      setLoading(false);
    }
  };

  const getCurrentLocation = (destCoords, pickupCoords) => {
    // Get initial location
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { latitude, longitude };
        setCurrentLocation(location);
        
        // Create initial route coordinates based on task phase
        const route = [];
        route.push(location); // Current location
        
        const deliveryStatuses = ['shipped', 'in_progress', 'in_transit', 'picked_up'];
        const isDeliveryPhase = deliveryStatuses.includes(orderData.status);

        if (!isDeliveryPhase && pickupCoords) {
          // Phase 1: Go to Store
          route.push(pickupCoords);
        } else if (destCoords) {
          // Phase 2: Go to Customer
          route.push(destCoords);
        }

        setRouteCoordinates(route);
        
        // Calculate initial route info
        const info = calculateRouteInfo(route);
        setRouteInfo(info);
        
        // Set map region to show current leg
        const allCoords = [...route];
        
        const minLat = Math.min(...allCoords.map(c => c.latitude));
        const maxLat = Math.max(...allCoords.map(c => c.latitude));
        const minLng = Math.min(...allCoords.map(c => c.longitude));
        const maxLng = Math.max(...allCoords.map(c => c.longitude));
        
        setMapRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: (maxLat - minLat) * 1.5 + 0.01,
          longitudeDelta: (maxLng - minLng) * 1.5 + 0.01,
        });

        setLoading(false);
      },
      (error) => {
        console.log('Initial location error:', error);
        // Use pickup location if GPS fails, or default to District 1
        const defaultLocation = pickupCoords || { latitude: 10.7769, longitude: 106.7009 };
        setCurrentLocation(defaultLocation);
        
        // Create route with default location based on task phase
        const route = [defaultLocation];
        
        const deliveryStatuses = ['shipped', 'in_progress', 'in_transit', 'picked_up'];
        const isDeliveryPhase = deliveryStatuses.includes(orderData.status);

        if (!isDeliveryPhase && pickupCoords) {
          route.push(pickupCoords);
        } else if (destCoords) {
          route.push(destCoords);
        }
        
        setRouteCoordinates(route);
        
        const info = calculateRouteInfo(route);
        setRouteInfo(info);
        
        setMapRegion({
          ...defaultLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleCallCustomer = () => {
    const customerName = orderData.user?.name || 
                        orderData.customer?.name || 
                        orderData.shippingAddress?.name || 
                        orderData.shippingAddress?.fullName ||
                        orderData.customerName ||
                        'Khách hàng';
    const customerPhone = orderData.customerPhone;
    
    console.log('📞 Calling customer:', { customerName, customerPhone });
    
    if (!customerPhone || customerPhone === '0123456789') {
      Alert.alert('Lỗi', 'Không có số điện thoại khách hàng');
      return;
    }
    
    Alert.alert(
      'Gọi khách hàng',
      `Gọi cho ${customerName}?\n${customerPhone}`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Gọi', 
          onPress: () => makePhoneCall(customerPhone, customerName)
        }
      ]
    );
  };

  const handleNavigate = async () => {
    // Stage logic: Navigate to Store if not yet picked up
    const isInDelivery = ['shipped', 'in_progress', 'in_transit', 'delivered'].includes(order.status);
    
    let targetCoords = destinationCoords;
    let targetLabel = orderData.deliveryLocation;
    
    if (!isInDelivery && pickupCoords) {
      console.log('🏁 Order not yet picked up, navigating to Store:', orderData.pickupLocation);
      targetCoords = pickupCoords;
      targetLabel = orderData.pickupLocation;
    }

    if (!targetCoords) {
      Alert.alert('Lỗi', 'Không thể xác định địa chỉ điều hướng');
      return;
    }

    const target = {
      latitude: targetCoords.latitude,
      longitude: targetCoords.longitude,
      address: targetLabel
    };

    await smartNavigate(target, targetLabel);
  };

  const handleUpdateStatus = () => {
    const statusOptions = [
      { text: 'Hủy', style: 'cancel' },
    ];

    if (order.status === 'pending') {
      statusOptions.push(
        { text: 'Nhận đơn', onPress: () => updateOrderStatus('accepted') },
        { text: 'Từ chối', onPress: () => updateOrderStatus('rejected') }
      );
    } else if (order.status === 'accepted' || order.status === 'in_progress') {
      statusOptions.push(
        { text: 'Đã lấy hàng', onPress: () => updateOrderStatus('picked_up') },
        { text: 'Đang giao hàng', onPress: () => updateOrderStatus('in_transit') },
        { text: 'Đã giao thành công', onPress: () => updateOrderStatus('delivered') }
      );
    }

    Alert.alert(
      'Cập nhật trạng thái',
      `Đơn hàng: ${order.orderNumber}\nTrạng thái hiện tại: ${getStatusText(order.status)}`,
      statusOptions
    );
  };

  const updateOrderStatus = (newStatus) => {
    Alert.alert(
      'Xác nhận',
      `Cập nhật trạng thái đơn hàng thành "${getStatusText(newStatus)}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xác nhận', 
          onPress: () => {
            // TODO: Call API to update order status
            console.log('Updating order status to:', newStatus);
            Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng!');
          }
        }
      ]
    );
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Chờ xử lý',
      'confirmed': 'Chờ lấy hàng',
      'shipped': 'Đang vận chuyển',
      'in_progress': 'Đang giao',
      'picked_up': 'Đã lấy hàng',
      'in_transit': 'Đang vận chuyển',
      'delivered': 'Đã giao',
      'rejected': 'Đã từ chối',
      'cancelled': 'Đã hủy'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#3b82f6';
      case 'shipped': return '#8b5cf6';
      case 'in_progress': return '#3b82f6';
      case 'in_transit': return '#8b5cf6';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'confirmed': return 'package-variant';
      case 'shipped': return 'truck-fast';
      case 'in_progress': return 'truck-delivery';
      case 'in_transit': return 'truck-fast';
      case 'picked_up': return 'package-variant-closed';
      case 'delivered': return 'check-circle';
      case 'cancelled': return 'close-circle';
      default: return 'package';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Đang tải bản đồ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{order.orderNumber}</Text>
          <Text style={styles.headerSubtitle}>
            {orderData.customerName}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.headerBtn}
          onPress={() => {
            if (currentLocation) {
              setMapRegion({
                ...currentLocation,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
            }
          }}
        >
          <Icon name="crosshairs-gps" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsTraffic={true}
        onUserLocationChange={(event) => {
          const { latitude, longitude } = event.nativeEvent.coordinate;
          if (!currentLocation || 
              Math.abs(currentLocation.latitude - latitude) > 0.0001 || 
              Math.abs(currentLocation.longitude - longitude) > 0.0001) {
            console.log('📍 Map native location update:', { latitude, longitude });
            setCurrentLocation({ latitude, longitude });
          }
        }}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Vị trí của bạn"
            description={isTracking ? "Đang theo dõi real-time" : "Shipper"}
          >
            <View style={[
              styles.currentLocationMarker,
              isTracking && styles.trackingMarker
            ]}>
              <Icon name="account" size={20} color="#ffffff" />
              {isTracking && (
                <View style={styles.trackingIndicator}>
                  <View style={styles.trackingPulse} />
                </View>
              )}
            </View>
          </Marker>
        )}

        {/* Pickup Location Marker */}
        {pickupCoords && (
          <Marker
            coordinate={pickupCoords}
            title="Điểm lấy hàng"
            description={order.pickupLocation || order.pickupAddress}
          >
            <View style={styles.pickupMarker}>
              <Icon name="store" size={20} color="#ffffff" />
            </View>
          </Marker>
        )}

        {/* Destination Marker - Make it more prominent with debugging info */}
        {destinationCoords && (
          <Marker
            coordinate={destinationCoords}
            title="🎯 Điểm giao hàng"
            description={`${order.deliveryLocation || order.address}\nTọa độ: ${destinationCoords.latitude.toFixed(6)}, ${destinationCoords.longitude.toFixed(6)}`}
          >
            <View style={styles.destinationMarker}>
              <View style={styles.destinationMarkerInner}>
                <Icon name="map-marker" size={24} color="#ffffff" />
              </View>
              <View style={styles.destinationMarkerPulse} />
            </View>
          </Marker>
        )}

        {/* Route Polyline */}
        {/* Route Polylines based on status */}
        {(() => {
          // A shipper is considered "In Delivery" (going to customer) 
          // only AFTER picking up the items or explicitly starting delivery
          const isInDelivery = ['shipped', 'in_progress', 'picked_up', 'in_transit', 'delivered'].includes(order.status) || 
                              order.deliveryStarted === true;
          
          return (
            <>
              {/* Path 1: To Store (if not yet picked up) */}
              {!isInDelivery && currentLocation && pickupCoords && (
                <Polyline
                  coordinates={[currentLocation, pickupCoords]}
                  strokeColor="#3b82f6" // Primary Blue for active leg
                  strokeWidth={5}
                  lineJoin="round"
                  lineCap="round"
                />
              )}

              {/* Path 2: Store to Destination (always visible, but dashed if not yet at store) */}
              {pickupCoords && destinationCoords && (
                <Polyline
                  coordinates={[pickupCoords, destinationCoords]}
                  strokeColor={!isInDelivery ? "#94a3b8" : "#10b981"} // Gray if second leg, Green if active
                  strokeWidth={!isInDelivery ? 3 : 5}
                  lineDashPattern={!isInDelivery ? [10, 10] : null}
                  lineJoin="round"
                  lineCap="round"
                />
              )}
            </>
          );
        })()}
      </MapView>

      {/* Floating Action Button - Center on Destination */}
      {destinationCoords && (
        <TouchableOpacity 
          style={styles.centerDestinationButton}
          onPress={() => {
            setMapRegion({
              ...destinationCoords,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }}
        >
          <Icon name="target" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Order Info Card */}
      <View style={styles.orderInfoCard}>
        <View style={styles.orderInfoHeader}>
          <Text style={styles.orderInfoTitle}>Thông tin đơn hàng</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Icon name={getStatusIcon(order.status)} size={14} color="#ffffff" />
            <Text style={styles.statusBadgeText}>{getStatusText(order.status)}</Text>
          </View>
        </View>
        
        <View style={styles.orderInfoContent}>
          <View style={styles.infoRow}>
            <Icon name="map-marker" size={20} color="#ef4444" />
            <Text style={styles.infoText} numberOfLines={2}>
              {orderData.deliveryLocation}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Icon name="crosshairs" size={18} color="#6b7280" />
            <Text style={styles.infoTextMuted}>
              Tọa độ: {destinationCoords?.latitude.toFixed(6)}, {destinationCoords?.longitude.toFixed(6)}
            </Text>
          </View>
          
          <View style={styles.metricDivider} />

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Icon name="road-variant" size={18} color="#1e293b" />
              <Text style={styles.metricText}>
                {(() => {
                  const isInDelivery = ['picked_up', 'in_transit', 'delivered'].includes(order.status);
                  if (isInDelivery && storeToCustomerInfo.distance) {
                    return `${storeToCustomerInfo.distance} km (tổng)`;
                  }
                  return routeInfo.distance ? `${routeInfo.distance} km` : orderData.distance;
                })()}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Icon name="clock-outline" size={18} color="#1e293b" />
              <Text style={styles.metricText}>
                {(() => {
                  const isInDelivery = ['picked_up', 'in_transit', 'delivered'].includes(order.status);
                  if (isInDelivery && storeToCustomerInfo.duration) {
                    return `${storeToCustomerInfo.duration} phút`;
                  }
                  return (routeInfo.duration && routeInfo.duration > 1) ? `${routeInfo.duration} phút` : orderData.estimatedTime;
                })()}
                {!['shipped', 'in_progress', 'in_transit', 'picked_up'].includes(orderData.status) ? ' đến kho' : ''}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Icon name="cash" size={20} color="#10b981" />
              <Text style={styles.metricTextPrice}>
                {formatVND(orderData.totalPrice || 0)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.callActionButton}
          onPress={handleCallCustomer}
        >
          <Icon name="phone" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Gọi</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navigateActionButton}
          onPress={handleNavigate}
        >
          <Icon name="navigation-variant" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>Điều hướng</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.trackActionButton, isTracking && styles.trackActionButtonActive]}
          onPress={() => {
            if (isTracking) {
              stopLocationTracking();
            } else {
              startLocationTracking();
            }
          }}
        >
          <Icon name="crosshairs-gps" size={20} color="#ffffff" />
          <Text style={styles.actionButtonText}>
            {isTracking ? "Đang theo dõi" : "Theo dõi"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  currentLocationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  pickupMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  destinationMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    elevation: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  destinationMarkerInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationMarkerPulse: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ef4444',
    opacity: 0.2,
    top: -10,
    left: -10,
  },
  orderInfoCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: -30, // Float over map slightly
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  orderInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderInfoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  orderInfoContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  infoTextMuted: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
  },
  metricDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '700',
  },
  metricTextPrice: {
    fontSize: 15,
    color: '#10b981',
    fontWeight: '800',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  callActionButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
  },
  navigateActionButton: {
    flex: 1.5,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
  },
  trackActionButton: {
    flex: 1,
    backgroundColor: '#64748b',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
  },
  trackActionButtonActive: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  trackingMarker: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  trackingIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  trackingPulse: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    opacity: 0.3,
  },
  centerDestinationButton: {
    position: 'absolute',
    top: 120,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MapScreen;
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from '@react-native-community/geolocation';
import shipperService from '../services/shipperService';
import * as mapService from '../services/mapService';
import { formatVND } from '../utils/currency';
import { safeGoBack } from '../utils/navigationUtils';

// --- Global Helper Functions ---

const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return '#f59e0b';
    case 'confirmed': return '#3b82f6';
    case 'shipped': return '#8b5cf6';
    case 'in_progress': return '#3b82f6';
    case 'in_transit': return '#8b5cf6';
    case 'delivered': return '#10b981';
    case 'cancelled': return '#ef4444';
    default: return '#6b7280';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'pending': return 'clock-outline';
    case 'confirmed': return 'check-outline';
    case 'shipped': return 'truck-fast';
    case 'in_progress': return 'truck-delivery';
    case 'in_transit': return 'truck-fast';
    case 'delivered': return 'check-circle';
    case 'cancelled': return 'close-circle';
    default: return 'package';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'pending': return 'Chờ xác nhận';
    case 'confirmed': return 'Chờ lấy hàng';
    case 'shipped': return 'Đang vận chuyển';
    case 'in_progress': return 'Đang giao';
    case 'in_transit': return 'Đang vận chuyển';
    case 'delivered': return 'Đã giao';
    case 'cancelled': return 'Đã hủy';
    default: return status;
  }
};

// --- Sub-components (Visual sections to keep main component clean) ---

const UserView = ({ order, navigation, handleAction }) => (
  <ScrollView style={styles.container}>
    {/* Header */}
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => safeGoBack(navigation)}
      >
        <Icon name="arrow-left" size={24} color="#1f2937" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
      <View style={styles.headerRight} />
    </View>

    {/* Order Status */}
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Icon name={getStatusIcon(order.status)} size={18} color={getStatusColor(order.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{getStatusText(order.status)}</Text>
        </View>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
      </View>
      <Text style={styles.orderDate}>Ngày đặt: {order.orderDate}</Text>
      {order.estimatedDelivery && (
        <Text style={[styles.infoText, { marginTop: 4 }]}>
          🚚 Dự kiến giao: {order.estimatedDelivery}
        </Text>
      )}
    </View>

    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Sản phẩm đã đặt</Text>
      {(order.items || []).map((item, index) => (
        <View key={index} style={styles.productItem}>
          <Image source={{ uri: item.image }} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productMeta}>Số lượng: {item.quantity}</Text>
            <Text style={styles.productPrice}>{formatVND(item.price)}</Text>
          </View>
        </View>
      ))}
    </View>

    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Địa chỉ nhận hàng</Text>
      <View style={styles.customerRow}>
        <View style={[styles.customerAvatar, { backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' }]}>
          <Icon name="map-marker-outline" size={24} color="#3b82f6" />
        </View>
        <View style={styles.customerDetails}>
          <Text style={styles.customerName}>{order.shippingAddress?.fullName || 'Khách hàng'}</Text>
          <Text style={styles.customerPhone}>{order.shippingAddress?.phone || 'N/A'}</Text>
          <Text style={[styles.customerPhone, { marginTop: 2 }]}>{order.shippingAddress?.address || order.address || 'Hồ Chí Minh'}</Text>
        </View>
      </View>
    </View>

    <View style={styles.actionsContainer}>
      {(order.status === 'pending' || order.status === 'processing') && (
        <TouchableOpacity style={styles.dangerActionBtn} onPress={() => handleAction('cancel')}>
          <Text style={styles.dangerActionText}>Hủy đơn hàng</Text>
        </TouchableOpacity>
      )}
    </View>
  </ScrollView>
);

const ShipperView = ({ order, navigation, handleAction, metrics }) => {
  const customer = order.user || order.customer || {};
  // Priority: shippingAddress.fullName > shippingAddress.name > customer.name > customer.username
  const customerName = order.shippingAddress?.fullName || 
                      order.shippingAddress?.name || 
                      customer.name || 
                      customer.username || 
                      'Khách hàng';
  const customerPhone = customer.phone || order.shippingAddress?.phone || 'N/A';
  const customerAvatar = customer.avatar || 'https://via.placeholder.com/50';
  const pickupAddress = order.pickupAddress || 'Store ABC, 456 Nguyen Hue St';
  const deliveryAddress = order.shippingAddress?.address || 
                          (order.shippingAddress?.street ? `${order.shippingAddress.street}, ${order.shippingAddress.city || ''}` : order.address) || 
                          order.orderAddress ||
                          'Địa chỉ giao hàng';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack(navigation)}>
          <Icon name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn giao</Text>
        <TouchableOpacity style={styles.callActionButton} onPress={() => handleAction('call')}>
          <Icon name="phone" size={20} color="#10b981" />
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Icon name={getStatusIcon(order.status)} size={18} color={getStatusColor(order.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>{getStatusText(order.status)}</Text>
          </View>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        </View>
        <View style={styles.deliveryMetrics}>
          <View style={styles.metricRow}>
            <Icon name="store-outline" size={16} color="#3b82f6" />
            <Text style={styles.metricLabel}>Đến kho:</Text>
            <Text style={styles.metricValue}>{metrics.warehouseDist} ({metrics.warehouseTime})</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricRow}>
            <Icon name="map-marker-distance" size={16} color="#10b981" />
            <Text style={styles.metricLabel}>Giao khách:</Text>
            <Text style={styles.metricValue}>{metrics.deliveryDist} ({metrics.deliveryTime})</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
        <View style={styles.customerRow}>
          <Image source={{ uri: customerAvatar }} style={styles.customerAvatar} />
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.customerPhone}>{customerPhone}</Text>
          </View>
          <TouchableOpacity style={styles.customerCallBtn} onPress={() => handleAction('call')}>
            <Icon name="phone-outline" size={20} color="#10b981" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lộ trình giao hàng</Text>
          <TouchableOpacity 
            style={styles.mapLink}
            onPress={() => navigation.navigate('Map', { 
              order: { ...order, pickupLocation: pickupAddress, deliveryLocation: deliveryAddress }
            })}
          >
            <Text style={styles.mapLinkText}>Xem bản đồ</Text>
            <Icon name="chevron-right" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View style={styles.timelineContainer}>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDotContainer}>
              <View style={[styles.timelineDot, { backgroundColor: '#3b82f6' }]} />
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Điểm lấy hàng</Text>
              <Text style={styles.timelineAddress} numberOfLines={2}>{pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDotContainer}>
              <View style={[styles.timelineDot, { backgroundColor: '#ef4444' }]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Điểm giao hàng</Text>
              <Text style={styles.timelineAddress} numberOfLines={2}>{deliveryAddress}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Sản phẩm ({order.items?.length || 0})</Text>
        {(order.items || []).map((item, index) => (
          <View key={index} style={styles.productItem}>
            <Image source={{ uri: item.image || 'https://via.placeholder.com/60' }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.productMeta}>Số lượng: {item.quantity}</Text>
              <Text style={styles.productPrice}>{formatVND(item.price)}</Text>
            </View>
          </View>
        ))}

        <View style={styles.paymentSection}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Tiền hàng</Text>
            <Text style={styles.paymentValue}>{formatVND(order.totalPrice || order.total || 0)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Phí giao hàng</Text>
            <Text style={styles.paymentValue}>{formatVND(order.shippingFee || 15000)}</Text>
          </View>
          <View style={styles.dashedDivider} />
          <View style={styles.paymentRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatVND((order.totalPrice || order.total || 0) + (order.shippingFee || 15000))}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        {order.status === 'confirmed' && (
          <TouchableOpacity style={styles.primaryActionBtn} onPress={() => handleAction('accept')}>
            <Icon name="check-circle-outline" size={22} color="#ffffff" />
            <Text style={styles.primaryActionText}>Nhận đơn hàng</Text>
          </TouchableOpacity>
        )}
        {order.status === 'shipped' && (
          <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => handleAction('ship')}>
            <Icon name="truck-delivery" size={22} color="#ffffff" />
            <Text style={styles.secondaryActionText}>Bắt đầu giao</Text>
          </TouchableOpacity>
        )}
        {(order.status === 'in_progress' || order.status === 'in_transit' || order.status === 'shipped') && (
          <TouchableOpacity style={styles.primaryActionBtn} onPress={() => handleAction('complete')}>
            <Icon name="check-all" size={22} color="#ffffff" />
            <Text style={styles.primaryActionText}>Hoàn thành đơn</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

// --- Main Screen Component ---

// --- Main Screen Component ---

const OrderDetailScreen = ({ navigation, route }) => {
  // 1. Hooks (Absolute top, fixed order)
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [showAcceptModal, setShowAcceptModal] = React.useState(false);
  const [deliveryStarted, setDeliveryStarted] = React.useState(false);
  const [currentLocation, setCurrentLocation] = React.useState(null);
  const [locationError, setLocationError] = React.useState(null);
  const { user } = useSelector((state) => state.auth);

  const { order, isShipper } = route.params || {};

  // Get current location for distance calculation with fallback
  React.useEffect(() => {
    let isMounted = true;
    let fallbackTimer = null;

    const getLocation = async () => {
      if (!isShipper) return;

      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Quyền truy cập vị trí',
              message: 'Ứng dụng cần quyền truy cập vị trí để tính toán quãng đường giao hàng.',
              buttonNeutral: 'Hỏi lại sau',
              buttonNegative: 'Từ chối',
              buttonPositive: 'Đồng ý',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            if (isMounted) setLocationError('Permission denied');
            return;
          }
        }

        fallbackTimer = setTimeout(() => {
          if (isMounted && !currentLocation) {
            setCurrentLocation({ latitude: 10.7740, longitude: 106.7010 });
          }
        }, 5000);

        Geolocation.getCurrentPosition(
          (position) => {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            if (isMounted) {
              const { latitude, longitude } = position.coords;
              setCurrentLocation({ latitude, longitude });
              setLocationError(null);
            }
          },
          (error) => {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            if (isMounted) {
              setCurrentLocation({ latitude: 10.7740, longitude: 106.7010 });
              setLocationError(error.message);
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 }
        );
      } catch (err) {
        console.warn(err);
      }
    };

    getLocation();

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [isShipper]);

  // Derived metrics logic
  const metrics = React.useMemo(() => {
    if (!order) return { distance: "N/A", time: "--", warehouseDist: "N/A" };
    
    const storeCoords = { latitude: 10.7740, longitude: 106.7010 };
    const destCoords = {
      latitude: order.shippingAddress?.latitude || order.latitude || 10.8435, 
      longitude: order.shippingAddress?.longitude || order.longitude || 106.7135
    };
    
    // Distance from current location to store (Pickup stage)
    let warehouseDist = "N/A";
    let warehouseTime = "--";
    if (currentLocation) {
      const dToStore = mapService.calculateDistance(currentLocation, storeCoords);
      warehouseDist = mapService.formatDistance(dToStore);
      warehouseTime = mapService.estimateTravelTime(dToStore);
    }

    // Distance from store to customer (Delivery stage)
    const dToCustomer = mapService.calculateDistance(storeCoords, destCoords);
    const deliveryDistStr = mapService.formatDistance(dToCustomer);
    const deliveryTime = mapService.estimateTravelTime(dToCustomer);

    const isPickupPhase = ['confirmed', 'processing', 'pending'].includes(order.status);
    
    return {
      warehouseDist,
      warehouseTime,
      deliveryDist: deliveryDistStr,
      deliveryTime,
      isPickupPhase
    };
  }, [order, currentLocation]);

  // Early return UI (AFTER all hooks)
  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 100 }}>Không tìm thấy thông tin đơn hàng</Text>
      </View>
    );
  }

  const handleAction = (action) => {
    switch (action) {
      case 'accept': setShowAcceptModal(true); break;
      case 'cancel': setShowCancelModal(true); break;
      case 'ship': setDeliveryStarted(true); Alert.alert('Thành công', 'Bắt đầu giao hàng'); break;
      case 'complete': 
        shipperService.updateOrderByShipper(order._id, { status: 'delivered' })
          .then(() => safeGoBack(navigation))
          .catch(err => Alert.alert('Lỗi', 'Không thể hoàn thành'));
        break;
    }
  };

  const confirmAccept = async () => {
    try {
      const resp = await shipperService.updateOrderByShipper(order._id, { status: 'shipped' });
      if (resp.success) {
        setShowAcceptModal(false);
        safeGoBack(navigation);
      }
    } catch (err) { Alert.alert('Lỗi', 'Không thể nhận đơn'); }
  };

  // 4. Final Render logic
  return (
    <View style={{ flex: 1 }}>
      {isShipper ? (
        <ShipperView order={order} navigation={navigation} handleAction={handleAction} metrics={metrics} />
      ) : (
        <UserView order={order} navigation={navigation} handleAction={handleAction} />
      )}

      {/* Accept Modal */}
      <Modal visible={showAcceptModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.acceptModalIcon}>
              <Icon name="check-circle" size={48} color="#10b981" />
            </View>
            <Text style={styles.modalTitle}>Nhận đơn hàng</Text>
            <Text style={styles.modalSubtitle}>Xác nhận bạn muốn nhận đơn hàng {order.orderNumber}?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAcceptModal(false)}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmButton, { backgroundColor: '#10b981' }]} onPress={confirmAccept}>
                <Text style={styles.modalConfirmText}>Nhận đơn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hủy đơn hàng</Text>
            <Text style={styles.modalSubtitle}>Xác nhận hủy đơn hàng {order.orderNumber}?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalCancelText}>Không</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.modalConfirmText}>Hủy đơn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// --- Styles ---

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1e293b' 
  },
  backButton: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
  },
  callActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: { 
    margin: 16, 
    padding: 20, 
    backgroundColor: '#ffffff', 
    borderRadius: 20, 
    elevation: 3,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  statusHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12,
    gap: 6
  },
  statusText: { 
    fontSize: 12, 
    fontWeight: '700', 
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  orderNumber: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#475569' 
  },
  deliveryMetrics: { 
    gap: 12 
  },
  metricRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  metricLabel: { 
    fontSize: 13, 
    color: '#64748b', 
    flex: 1 
  },
  metricValue: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1e293b' 
  },
  metricDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  sectionCard: { 
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16, 
    backgroundColor: '#ffffff', 
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1e293b', 
    marginBottom: 16 
  },
  customerRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12
  },
  customerAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25,
    backgroundColor: '#f1f5f9'
  },
  customerDetails: { 
    flex: 1 
  },
  customerName: { 
    fontSize: 16, 
    fontWeight: '700',
    color: '#1e293b'
  },
  customerPhone: { 
    fontSize: 13, 
    color: '#64748b',
    marginTop: 2
  },
  customerCallBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  mapLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 50,
  },
  timelineDotContainer: {
    alignItems: 'center',
    width: 20,
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
  },
  timelineAddress: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },
  productItem: { 
    flexDirection: 'row', 
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
  },
  productImage: { 
    width: 60, 
    height: 60, 
    borderRadius: 12,
    backgroundColor: '#ffffff'
  },
  productInfo: { 
    flex: 1, 
    marginLeft: 12,
    justifyContent: 'center'
  },
  productName: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#1e293b' 
  },
  productMeta: { 
    fontSize: 12, 
    color: '#64748b',
    marginTop: 2 
  },
  productPrice: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#3b82f6',
    marginTop: 4
  },
  paymentSection: { 
    marginTop: 8, 
    paddingTop: 16, 
    gap: 10 
  },
  paymentRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  paymentLabel: { 
    fontSize: 14, 
    color: '#64748b' 
  },
  paymentValue: { 
    fontSize: 14, 
    color: '#1e293b', 
    fontWeight: '600' 
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  totalLabel: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#1e293b' 
  },
  totalValue: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#3b82f6' 
  },
  actionsContainer: { 
    padding: 16, 
    paddingBottom: 32,
    gap: 12 
  },
  primaryActionBtn: { 
    backgroundColor: '#10b981', 
    padding: 18, 
    borderRadius: 16, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10,
    elevation: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryActionText: { 
    color: '#ffffff', 
    fontWeight: '800',
    fontSize: 16
  },
  secondaryActionBtn: { 
    backgroundColor: '#f59e0b', 
    padding: 18, 
    borderRadius: 16, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10,
    elevation: 2,
  },
  secondaryActionText: { 
    color: '#ffffff', 
    fontWeight: '800',
    fontSize: 16
  },
  dangerActionBtn: { 
    backgroundColor: '#fee2e2', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  dangerActionText: { 
    color: '#ef4444', 
    fontWeight: '700',
    fontSize: 15
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  modalContent: { 
    backgroundColor: '#ffffff', 
    borderRadius: 24, 
    padding: 24, 
    width: '100%', 
    maxWidth: 400,
    elevation: 20
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#1e293b',
    textAlign: 'center', 
    marginBottom: 8 
  },
  modalSubtitle: { 
    fontSize: 15, 
    color: '#64748b', 
    textAlign: 'center', 
    marginBottom: 24,
    lineHeight: 22
  },
  modalActions: { 
    flexDirection: 'row', 
    gap: 12 
  },
  modalCancelBtn: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  modalConfirmBtn: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: '#ef4444', 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  modalCancelBtnText: { 
    color: '#64748b', 
    fontWeight: '700' 
  },
  modalConfirmBtnText: { 
    color: '#ffffff', 
    fontWeight: '700' 
  },
  acceptModalIcon: { 
    alignItems: 'center', 
    marginBottom: 20 
  },
});

export default OrderDetailScreen;

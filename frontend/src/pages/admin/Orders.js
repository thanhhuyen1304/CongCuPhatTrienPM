import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useI18n } from '../../i18n';
import socketService from '../../services/socketService';
import { formatVND } from '../../utils/currency';
import { 
  EyeIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserIcon,
  TruckIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { PrinterIcon, MapIcon } from '@heroicons/react/24/outline';
import { FixedSizeList } from 'react-window';
import OrderPrint from '../../components/OrderPrint';
import AdminOrderMap from '../../components/AdminOrderMap';

const AdminOrders = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [orderStats, setOrderStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [paymentStatus, setPaymentStatus] = useState('');
  const [printingOrder, setPrintingOrder] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      
      // Convert "active" status to multiple statuses
      let statusParam = status;
      if (status === 'active') {
        statusParam = 'shipped';
      }
      
      const params = new URLSearchParams({
        page,
        limit: 20,
        ...(statusParam && { status: statusParam }),
        ...(searchTerm && { search: searchTerm }),
        ...(paymentStatus && { paymentStatus }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      });

      const [ordersResponse, statsResponse] = await Promise.all([
        api.get(`/orders/admin/all?${params}`),
        api.get('/orders/admin/stats').catch(err => {
          console.error('Stats error:', err);
          return { data: { data: { statusCounts: [] } } };
        })
      ]);

      setOrders(ordersResponse.data.data.orders);
      setTotalPages(ordersResponse.data.data.pagination.pages);
      setOrderStats(statsResponse.data.data);
    } catch (error) {
      toast.error(t('common.error') + ': ' + (error.response?.data?.message || t('common.loading')));
    } finally {
      setLoading(false);
    }
  }, [page, status, searchTerm, paymentStatus, dateRange, t]);

  const fetchOrderStats = useCallback(async () => {
    try {
      const statsResponse = await api.get('/orders/admin/stats');
      setOrderStats(statsResponse.data.data);
    } catch (error) {
      console.error('Stats error:', error);
    }
  }, []);

  useEffect(() => {
    fetchOrderStats();
    fetchOrders();
  }, [fetchOrderStats, fetchOrders]);

  // Setup real-time updates
  useEffect(() => {
    const handleOrderStatusUpdate = (data) => {
      console.log('📦 Real-time order update received:', data);
      
      // Update the orders list
      setOrders(prevOrders => {
        return prevOrders.map(order => {
          if (order._id === data.orderId) {
            return {
              ...order,
              status: data.newStatus,
              shipper: data.order.shipper || order.shipper
            };
          }
          return order;
        });
      });
      
      // Refresh stats to get updated counts
      fetchOrderStats();
    };

    const handleNewOrder = (data) => {
      console.log('🆕 New order received:', data);
      // Refresh orders list to include new order
      fetchOrders();
    };

    // Register socket listeners
    socketService.on('order_status_updated', handleOrderStatusUpdate);
    socketService.on('new_order', handleNewOrder);

    // Cleanup listeners on unmount
    return () => {
      socketService.off('order_status_updated', handleOrderStatusUpdate);
      socketService.off('new_order', handleNewOrder);
    };
  }, [fetchOrders, fetchOrderStats]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const loadingToast = toast.loading('Sửa trạng thái...');
      const response = await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.dismiss(loadingToast);
      
      if (response.data.success) {
        const newStatusLabel = getStatusConfig(newStatus).label;
        toast.success(`Đã chuyển trạng thái sang ${newStatusLabel}`);
        // Refresh orders and stats
        fetchOrders();
        fetchOrderStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleOpenTracking = async (orderId) => {
    try {
      const loadingToast = toast.loading('Đang lấy dữ liệu định vị...');
      const response = await api.get(`/orders/${orderId}`);
      toast.dismiss(loadingToast);
      
      if (response.data.success) {
        setTrackingOrder(response.data.data.order);
      }
    } catch (error) {
      toast.error('Không thể lấy dữ liệu theo dõi');
      console.error(error);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { 
        color: 'bg-amber-50 text-amber-700 border-amber-200', 
        icon: ClockIcon,
        label: 'Chờ xác nhận',
        bgGradient: 'from-amber-400 to-orange-500'
      },
      confirmed: { 
        color: 'bg-blue-50 text-blue-700 border-blue-200', 
        icon: CheckIcon,
        label: 'Đã xác nhận',
        bgGradient: 'from-blue-400 to-blue-600'
      },
      shipped: { 
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200', 
        icon: TruckIcon,
        label: 'Đang giao',
        bgGradient: 'from-indigo-400 to-indigo-600'
      },
      delivered: { 
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        icon: CheckCircleIcon,
        label: 'Đã giao',
        bgGradient: 'from-emerald-400 to-emerald-600'
      },
      cancelled: { 
        color: 'bg-red-50 text-red-700 border-red-200', 
        icon: XMarkIcon,
        label: 'Đã hủy',
        bgGradient: 'from-red-400 to-red-600'
      },
    };
    return configs[status] || configs.pending;
  };

  const getPaymentStatusConfig = (paymentStatus) => {
    const configs = {
      pending: { color: 'text-amber-600', icon: ClockIcon, label: 'Chờ thanh toán' },
      paid: { color: 'text-emerald-600', icon: CheckCircleIcon, label: 'Đã thanh toán' },
      failed: { color: 'text-red-600', icon: XCircleIcon, label: 'Thất bại' },
      refunded: { color: 'text-gray-600', icon: ArrowPathIcon, label: 'Đã hoàn tiền' },
    };
    return configs[paymentStatus] || configs.pending;
  };

  const clearFilters = () => {
    setStatus('');
    setSearchTerm('');
    setPaymentStatus('');
    setDateRange({ start: '', end: '' });
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hidden print component */}
      {printingOrder && (
        <OrderPrint 
          order={printingOrder} 
          onComplete={() => setPrintingOrder(null)} 
        />
      )}

      {/* Tracking Map Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              aria-hidden="true" 
              onClick={() => setTrackingOrder(null)}
            ></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <MapIcon className="w-6 h-6 mr-2 text-blue-600" />
                    Theo dõi đơn hàng: {trackingOrder.orderNumber}
                  </h3>
                  <button 
                    onClick={() => setTrackingOrder(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 uppercase font-bold mb-1">Trạng thái</p>
                    <p className="font-semibold text-blue-900">{getStatusConfig(trackingOrder.status).label}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                    <p className="text-xs text-emerald-600 uppercase font-bold mb-1">Khách hàng</p>
                    <p className="font-semibold text-emerald-900">{trackingOrder.shippingAddress?.fullName}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <p className="text-xs text-indigo-600 uppercase font-bold mb-1">Shipper</p>
                    <p className="font-semibold text-indigo-900">{trackingOrder.shipper?.name || 'Đang chờ nhận đơn'}</p>
                  </div>
                </div>
                <AdminOrderMap order={trackingOrder} />
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setTrackingOrder(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quản lý đơn hàng</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Theo dõi và quản lý tất cả đơn hàng trong hệ thống
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FunnelIcon className="w-4 h-4 mr-2" />
                  Bộ lọc
                </button>
                <button
                  onClick={fetchOrders}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Làm mới
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {orderStats?.statusCounts && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { status: 'pending', label: 'Chờ xác nhận', icon: '⏳' },
                { status: 'confirmed', label: 'Đã xác nhận', icon: '✅' },
                { 
                  status: 'active', 
                  label: 'Đang giao', 
                  icon: '🚚',
                  customCount: () => {
                    const shippedCount = orderStats.statusCounts.find((s) => s._id === 'shipped')?.count || 0;
                    return shippedCount;
                  }
                },
                { status: 'delivered', label: 'Đã giao', icon: '📦' },
                { status: 'cancelled', label: 'Đã hủy', icon: '❌' },
              ].map((item) => {
                const count = item.customCount ? item.customCount() : (orderStats.statusCounts.find((s) => s._id === item.status)?.count || 0);
                const config = getStatusConfig(item.status === 'active' ? 'processing' : item.status);
                return (
                  <div
                    key={item.status}
                    onClick={() => { setStatus(status === item.status ? '' : item.status); setPage(1); }}
                    className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${config.bgGradient} p-6 text-white cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                      status === item.status ? 'ring-4 ring-white ring-opacity-50 scale-105' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white/80">{item.label}</p>
                        <p className="text-3xl font-bold">{count}</p>
                      </div>
                      <div className="text-3xl opacity-80">{item.icon}</div>
                    </div>
                    <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo mã đơn hàng, tên khách hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="pending">Chờ xác nhận</option>
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="active">Đang giao</option>
                  <option value="delivered">Đã giao</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
                
                <select
                  value={paymentStatus}
                  onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Tất cả thanh toán</option>
                  <option value="pending">Chờ thanh toán</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="failed">Thất bại</option>
                  <option value="refunded">Đã hoàn tiền</option>
                </select>

                {(status || searchTerm || paymentStatus || dateRange.start || dateRange.end) && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Xóa bộ lọc
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Không có đơn hàng</h3>
              <p className="text-gray-600">Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Đơn hàng
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Khách hàng
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tổng tiền
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shipper
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thanh toán
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày tạo
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.length > 50 ? (
                      <FixedSizeList
                        height={600}
                        itemCount={orders.length}
                        itemSize={80}
                        width="100%"
                      >
                        {({ index, style }) => {
                          const order = orders[index];
                          const statusConfig = getStatusConfig(order.status);
                          const paymentConfig = getPaymentStatusConfig(order.paymentStatus);
                          const StatusIcon = statusConfig.icon;
                          const PaymentIcon = paymentConfig.icon;
                          
                          return (
                            <div style={style} className="flex border-b hover:bg-gray-50 transition-colors px-3 py-4">
                              <div className="w-24 shrink-0">
                                <div className="text-xs font-medium text-gray-900">{order.orderNumber}</div>
                                <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</div>
                              </div>
                              <div className="flex-1 px-4">
                                <div className="text-xs font-medium text-gray-900 truncate">{order.shippingAddress?.fullName || 'N/A'}</div>
                                <div className="text-xs text-gray-500 truncate">{order.shippingAddress?.address}</div>
                              </div>
                              <div className="w-32 px-4 text-xs font-semibold text-gray-900">
                                {formatVND(order.totalPrice)}
                              </div>
                              <div className="w-32 px-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusConfig.label}
                                </span>
                              </div>
                              <div className="w-48 px-4 flex flex-col space-y-1">
                                <button
                                  onClick={() => navigate(`/orders/${order._id}`)}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  Chi tiết
                                </button>
                                <button
                                  onClick={() => setPrintingOrder(order)}
                                  className="text-gray-600 hover:text-gray-800 text-xs font-medium"
                                >
                                  In đơn
                                </button>
                                {order.status === 'pending' && (
                                  <button
                                    onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                                    className="text-emerald-600 hover:text-emerald-800 text-xs font-medium"
                                  >
                                    Xác nhận
                                  </button>
                                )}
                                {['pending', 'confirmed'].includes(order.status) && (
                                  <button
                                    onClick={() => {
                                      if (window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
                                        handleStatusUpdate(order._id, 'cancelled');
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 text-xs font-medium"
                                  >
                                    Hủy đơn
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        }}
                      </FixedSizeList>
                    ) : (
                      orders.map((order) => {
                        const statusConfig = getStatusConfig(order.status);
                        const paymentConfig = getPaymentStatusConfig(order.paymentStatus);
                        const StatusIcon = statusConfig.icon;
                        const PaymentIcon = paymentConfig.icon;
                        
                        return (
                          <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div>
                                <div className="text-xs font-medium text-gray-900">{order.orderNumber}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <UserIcon className="h-4 w-4 text-gray-500" />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-xs font-medium text-gray-900">
                                    {order.shippingAddress?.fullName || order.user?.name || 'N/A'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {order.shippingAddress?.phone || order.user?.email || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <CurrencyDollarIcon className="h-3 w-3 text-green-500 mr-1" />
                                <span className="text-xs font-semibold text-gray-900">
                                  {formatVND(order.totalPrice)}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {(['shipped', 'delivered'].includes(order.status)) ? (
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-6 w-6">
                                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                                      <TruckIcon className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                  <div className="ml-2">
                                    <div className="text-xs font-medium text-gray-900">
                                      {order.shipper?.name || 'Nguyễn Văn Shipper'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {order.shipper?.phone || '0123456789'}
                                    </div>
                                  </div>
                                </div>
                              ) : order.shipper && order.status !== 'pending' && order.status !== 'processing' ? (
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-6 w-6">
                                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                                      <TruckIcon className="h-3 w-3 text-white" />
                                    </div>
                                  </div>
                                  <div className="ml-2">
                                    <div className="text-xs font-medium text-gray-900">{order.shipper?.name || 'N/A'}</div>
                                    <div className="text-xs text-gray-500">{order.shipper?.phone || 'N/A'}</div>
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                  <ClockIcon className="w-3 h-3 mr-1" />
                                  {order.status === 'confirmed' ? 'Chờ lấy' : 'Chưa có'}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <div className="flex items-center">
                                <PaymentIcon className={`w-3 h-3 mr-1 ${paymentConfig.color}`} />
                                <span className={`text-xs font-medium ${paymentConfig.color}`}>
                                  {paymentConfig.label}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500">
                              <div className="flex items-center">
                                <CalendarDaysIcon className="w-3 h-3 mr-1" />
                                {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-col space-y-2">
                                <button
                                  onClick={() => navigate(`/orders/${order._id}`)}
                                  className="inline-flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm"
                                >
                                  <EyeIcon className="w-3.5 h-3.5 mr-1.5" />
                                  Chi tiết
                                </button>
                                <button
                                  onClick={() => setPrintingOrder(order)}
                                  className="inline-flex items-center justify-center px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50"
                                >
                                  <PrinterIcon className="w-3.5 h-3.5 mr-1.5" />
                                  In đơn
                                </button>
                                 {['confirmed', 'shipped', 'delivered'].includes(order.status) && (
                                   <button
                                     onClick={() => handleOpenTracking(order._id)}
                                     className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-all duration-200 shadow-sm"
                                   >
                                     <MapIcon className="w-3.5 h-3.5 mr-1.5" />
                                     Theo dõi
                                   </button>
                                 )}
                                 {order.status === 'pending' && (
                                   <button
                                     onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                                     className="inline-flex items-center justify-center px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-all duration-200 shadow-sm"
                                   >
                                     <CheckIcon className="w-3.5 h-3.5 mr-1.5" />
                                     Xác nhận
                                   </button>
                                 )}
                                 {['pending', 'confirmed'].includes(order.status) && (
                                   <button
                                     onClick={() => {
                                       if (window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
                                         handleStatusUpdate(order._id, 'cancelled');
                                       }
                                     }}
                                     className="inline-flex items-center justify-center px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-all duration-200 shadow-sm"
                                   >
                                     <XMarkIcon className="w-3.5 h-3.5 mr-1.5" />
                                     Hủy đơn
                                   </button>
                                 )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Trước
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sau
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Hiển thị trang <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span>
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  page === pageNum
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                } ${i === 0 ? 'rounded-l-md' : ''} ${i === Math.min(5, totalPages) - 1 ? 'rounded-r-md' : ''}`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;

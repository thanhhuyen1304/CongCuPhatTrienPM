const express = require('express');
const router = express.Router();
const { protect, shipper } = require('../middleware/auth');

// @desc    Get shipper dashboard
// @route   GET /api/shipper/dashboard
// @access  Private/Shipper
router.get('/dashboard', protect, shipper, async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        shipperInfo: user.shipperInfo,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message,
    });
  }
});

// @desc    Get shipper orders (pending deliveries)
// @route   GET /api/shipper/orders
// @access  Private/Shipper
router.get('/orders', protect, shipper, async (req, res) => {
  try {
    // TODO: Fetch orders assigned to this shipper
    res.status(200).json({
      success: true,
      data: {
        orders: [],
        total: 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message,
    });
  }
});

// @desc    Accept delivery order
// @route   POST /api/shipper/orders/:orderId/accept
// @access  Private/Shipper
router.post('/orders/:orderId/accept', protect, shipper, async (req, res) => {
  try {
    // TODO: Update order status and assign to shipper
    res.status(200).json({
      success: true,
      message: 'Order accepted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error accepting order',
      error: error.message,
    });
  }
});

// @desc    Update delivery status
// @route   PUT /api/shipper/orders/:orderId/status
// @access  Private/Shipper
router.put('/orders/:orderId/status', protect, shipper, async (req, res) => {
  try {
    const { status } = req.body;
    // TODO: Update order delivery status (inTransit, completed, etc.)
    res.status(200).json({
      success: true,
      message: 'Status updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message,
    });
  }
});

// @desc    Get shipper route
// @route   GET /api/shipper/route
// @access  Private/Shipper
router.get('/route', protect, shipper, async (req, res) => {
  try {
    // TODO: Get current delivery route
    res.status(200).json({
      success: true,
      data: {
        route: {
          totalStops: 0,
          completedStops: 0,
          distance: '0 km',
          estimatedTime: '0 min',
          stops: [],
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching route',
      error: error.message,
    });
  }
});

// @desc    Update shipper location
// @route   PUT /api/shipper/location
// @access  Private/Shipper
router.put('/location', protect, shipper, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    // TODO: Update shipper's real-time location
    res.status(200).json({
      success: true,
      message: 'Location updated',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message,
    });
  }
});

// @desc    Get shipper stats
// @route   GET /api/shipper/stats
// @access  Private/Shipper
router.get('/stats', protect, shipper, async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      data: {
        totalDeliveries: user.shipperInfo?.totalDeliveries || 0,
        rating: user.shipperInfo?.rating || 5,
        vehicleType: user.shipperInfo?.vehicleType,
        isVerified: user.shipperInfo?.isVerified,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message,
    });
  }
});

module.exports = router;

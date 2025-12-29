const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  trackOrder,
  reorder
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// All order routes require authentication
router.use(protect);

router.post('/create', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:orderId/cancel', cancelOrder);
router.get('/:id/track', trackOrder);
router.post('/:orderId/reorder', reorder);

module.exports = router;
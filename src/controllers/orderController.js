const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Address = require('../models/Address');

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddressId,
      paymentMethod,
      couponCode
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Get shipping address
    const shippingAddress = await Address.findOne({
      _id: shippingAddressId,
      user: req.user.id
    });

    if (!shippingAddress) {
      return res.status(404).json({
        success: false,
        message: 'Shipping address not found'
      });
    }

    // Validate and process items
    let itemsPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`
        });
      }

      // Check stock
      const sizeStock = product.sizes.find(s => s.size === item.size);
      if (!sizeStock || sizeStock.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name} in size ${item.size}`
        });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0],
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: product.price
      });

      itemsPrice += product.price * item.quantity;
    }

 // Calculate charges
const deliveryCharge = itemsPrice >= 500 ? 0 : 40;
const gst = Math.round(itemsPrice * 0.05);
let discount = 0;

// Apply coupon if provided
if (couponCode) {
  if (couponCode === 'FIRST20') {
    discount = Math.round(itemsPrice * 0.20);
  }
}

const totalAmount = itemsPrice + deliveryCharge + gst - discount;

// Generate unique order number
const orderNumber = `ORD${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

// Create order
const order = await Order.create({
  orderNumber,
  user: req.user.id,
  items: orderItems,
  shippingAddress: {
    fullName: shippingAddress.fullName,
    phone: shippingAddress.phone,
    addressLine1: shippingAddress.addressLine1,
    addressLine2: shippingAddress.addressLine2,
    city: shippingAddress.city,
    state: shippingAddress.state,
    pincode: shippingAddress.pincode,
    country: shippingAddress.country
  },
  paymentMethod,
  paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
  itemsPrice,
  deliveryCharge,
  gst,
  discount,
  totalAmount,
  orderStatus: 'pending',
  statusHistory: [{
    status: 'pending',
    timestamp: new Date(),
    note: 'Order placed successfully'
  }],
  expectedDelivery: {
    minDays: 3,
    maxDays: 7
  }
});    // Update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: {
            [`sizes.$[size].stock`]: -item.quantity,
            totalStock: -item.quantity
          }
        },
        {
          arrayFilters: [{ 'size.size': item.size }]
        }
      );
    }

    // Clear user's cart
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: [], totalAmount: 0, totalItems: 0 }
    );

    // Populate order details
    await order.populate('items.product', 'name brand images');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

// Get user's orders
exports.getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { user: req.user.id };
    if (status) filter.orderStatus = status;

    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
      .populate('items.product', 'name brand images');

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get single order details
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name brand images rating');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled', 'returned'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status: ${order.orderStatus}`
      });
    }

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: {
            [`sizes.$[size].stock`]: item.quantity,
            totalStock: item.quantity
          }
        },
        {
          arrayFilters: [{ 'size.size': item.size }]
        }
      );
    }

    // Update order
    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason;
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: reason || 'Cancelled by user'
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
};

// Track order
exports.trackOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .select('orderNumber orderStatus statusHistory expectedDelivery deliveredAt createdAt');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to track this order'
      });
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        currentStatus: order.orderStatus,
        statusHistory: order.statusHistory,
        expectedDelivery: order.expectedDelivery,
        deliveredAt: order.deliveredAt,
        orderedAt: order.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error tracking order',
      error: error.message
    });
  }
};

// Reorder (create new order from previous order)
exports.reorder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const previousOrder = await Order.findById(orderId)
      .populate('items.product');

    if (!previousOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order belongs to user
    if (previousOrder.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Add items to cart
    const cart = await Cart.findOne({ user: req.user.id });
    
    for (const item of previousOrder.items) {
      const product = item.product;

      // Check if product still exists and has stock
      if (product && product.isActive) {
        const sizeStock = product.sizes.find(s => s.size === item.size);
        
        if (sizeStock && sizeStock.stock > 0) {
          // Check if item already in cart
          const existingItemIndex = cart.items.findIndex(
            cartItem => 
              cartItem.product.toString() === product._id.toString() && 
              cartItem.size === item.size
          );

          if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += item.quantity;
          } else {
            cart.items.push({
              product: product._id,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              price: product.price
            });
          }
        }
      }
    }

    await cart.save();
    await cart.populate('items.product', 'name brand price images');

    res.json({
      success: true,
      message: 'Items added to cart',
      data: cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reordering',
      error: error.message
    });
  }
};
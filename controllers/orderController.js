const mongoose = require("mongoose");

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

/**
 * Create Order
 * POST /api/orders
 */
const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      shippingAddress,
      paymentMethod = "COD"
    } = req.body;

    // Find User Cart
    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Cart is empty"
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    // Validate Products & Stock
    for (const item of cart.items) {

      const product = await Product.findById(item.product._id).session(session);

      if (!product) {
        await session.abortTransaction();
        session.endSession();

        return res.status(404).json({
          success: false,
          message: `${item.product.name} not found`
        });
      }

      if (product.stock < item.quantity) {
        await session.abortTransaction();
        session.endSession();

        return res.status(400).json({
          success: false,
          message: `${product.name} is out of stock`
        });
      }

      const subtotal = product.price * item.quantity;

      totalAmount += subtotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        quantity: item.quantity,
        price: product.price,
        subtotal
      });

      // Reduce Stock
      product.stock -= item.quantity;

      await product.save({ session });
    }

    // Create Order
    const order = await Order.create(
      [
        {
          user: req.user.id,
          items: orderItems,
          shippingAddress,
          totalAmount,
          paymentMethod,
          paymentStatus: "Pending",
          orderStatus: "Pending"
        }
      ],
      { session }
    );

    // Clear Cart
    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order[0]
    });

  } catch (error) {

    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

/**
 * Get Logged-in User Orders
 * GET /api/orders/my-orders
 */
const getMyOrders = async (req, res) => {

  try {

    const orders = await Order.find({ user: req.user.id })
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

/**
 * Get Order By ID
 * GET /api/orders/:id
 */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("items.product", "name image price");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Allow only owner or admin
    if (
      order.user._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get All Orders (Admin)
 * GET /api/orders
 */
const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name price")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update Order Status (Admin)
 * PATCH /api/orders/:id/status
 */
const updateOrderStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { orderStatus } = req.body;

    const validStatus = [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (!validStatus.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.orderStatus = orderStatus;

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Cancel Order
 * PATCH /api/orders/:id/cancel
 */
const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();

      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Owner or Admin
    if (
      order.user.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      await session.abortTransaction();
      session.endSession();

      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (
      order.orderStatus === "Delivered" ||
      order.orderStatus === "Cancelled"
    ) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled",
      });
    }

    // Restore Stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        {
          $inc: {
            stock: item.quantity,
          },
        },
        { session }
      );
    }

    order.orderStatus = "Cancelled";

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
};
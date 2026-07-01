const express = require("express");

const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/orderController");

router.post("/", authMiddleware, createOrder);

router.get("/my-orders", authMiddleware, getMyOrders);

router.get("/:id", authMiddleware, getOrderById);

router.get("/", authMiddleware, getAllOrders);

router.patch("/:id/status", authMiddleware, updateOrderStatus);

router.patch("/:id/cancel", authMiddleware, cancelOrder);

module.exports = router;
const express = require("express");

const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
    addToCart,
    getCart,
    updateCartItem,
    removeCartItem,
    clearCart
} = require("../controllers/cartController");

router.post("/add", authMiddleware, addToCart);

router.get("/", authMiddleware, getCart);

router.put("/update", authMiddleware, updateCartItem);

router.delete("/remove/:productId", authMiddleware, removeCartItem);

router.delete("/clear", authMiddleware, clearCart);

module.exports = router;
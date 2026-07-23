// Cart Page
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Add Product to Cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const qty = quantity || 1;

    // Check Product Exists
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find User Cart
    let cart = await Cart.findOne({ user: req.user.id });

    // Create Cart if not exists
    if (!cart) {
      cart = new Cart({
        user: req.user.id,
        items: [],
      });
    }

    // Check Product Already Exists
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += qty;
    } else {
      cart.items.push({
        product: productId,
        quantity: qty,
      });
    }

    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",
      select: "name price image stock",
    });

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      data: updatedCart,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Logged In User Cart
const getCart = async (req, res) => {
    try {

        const cart = await Cart.findOne({ user: req.user.id }).populate({
            path: "items.product",
            select: "name price image stock category"
        });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart is empty"
            });
        }

        let grandTotal = 0;

        cart.items.forEach(item => {
            grandTotal += item.product.price * item.quantity;
        });

        return res.status(200).json({
            success: true,
            totalItems: cart.items.length,
            grandTotal,
            data: cart
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

// Update Cart Item Quantity
const updateCartItem = async (req, res) => {

    try {

        const { productId, quantity } = req.body;

        if (!productId || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid Data"
            });
        }

        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        const item = cart.items.find(
            item => item.product.toString() === productId
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Product not found in cart"
            });
        }

        item.quantity = quantity;

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Quantity updated successfully",
            data: cart
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// Remove Product From Cart
const removeCartItem = async (req, res) => {

    try {

        const { productId } = req.params;

        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        cart.items = cart.items.filter(
            item => item.product.toString() !== productId
        );

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Product removed from cart",
            data: cart
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

// Clear Cart
const clearCart = async (req, res) => {

    try {

        const cart = await Cart.findOne({ user: req.user.id });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        cart.items = [];

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Cart cleared successfully"
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
  addToCart,
    getCart,
    updateCartItem,
    removeCartItem,
    clearCart
};

const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
  createProduct,
  getAllProducts,
  getProductById
} = require("../controllers/productController");

router.post("/", authMiddleware, createProduct);
router.get("/", getAllProducts);
router.get("/:id", getProductById);

module.exports = router;
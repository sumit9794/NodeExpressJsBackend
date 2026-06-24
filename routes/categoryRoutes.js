const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { createCategory, getAllCategories} = require("../controllers/categoryController");

router.post("/", authMiddleware, createCategory);
router.get("/", getAllCategories);

module.exports = router;
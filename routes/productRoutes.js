import express from "express";
import { authorizeRoles, isAuth } from "./../middlewares/authMiddleware.js";
import {
  createProductController,
  deleteProductController,
  deleteProductImageController,
  getAllProductsController,
  getSingleProductController,
  getTopProductsController,
  productReviewController,
  updateProductController,
  updateProductImageController,
} from "../controllers/productController.js";
import { singleUpload } from "../middlewares/multer.js";

const router = express.Router();

//rroutes
// ============== PRODUCT ROUTES ==================

// GET ALL PRODUCTS
router.get("/get-all", getAllProductsController);

// GET TOP PRODUCTS
router.get("/top", getTopProductsController);

// GET SINGLE PRODUCTS
router.get("/:id", getSingleProductController);

// CREATE PRODUCT
router.post(
  "/create",
  isAuth,
  authorizeRoles("admin", "manager"),
  singleUpload,
  createProductController
);

// UPDATE PRODUCT
router.put("/:id", isAuth, authorizeRoles("admin", "manager"), updateProductController);

// UPDATE PRODUCT IMAGE
router.put(
  "/image/:id",
  isAuth,
  authorizeRoles("admin", "manager"),
  singleUpload,
  updateProductImageController
);

// delete product image
router.delete(
  "/delete-image/:id",
  isAuth,
  authorizeRoles("admin", "manager"),
  deleteProductImageController
);

// delete product
router.delete(
  "/delete/:id",
  isAuth,
  authorizeRoles("admin", "manager"),
  deleteProductController
);

// REVIEW PRODUCT
router.put("/:id/review", isAuth, productReviewController);

// ====================================================================

export default router;

import express from "express";
import colors from "colors";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cloudinary from "cloudinary";
import Stripe from "stripe";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";

// ENV CONFIG
dotenv.config();

// EXPRESS APP
const app = express();

// ================= DATABASE CONNECTION (FIXED) =================
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) return;

    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "test",
    });

    console.log("MongoDB Connected".bgGreen.white);
  } catch (error) {
    console.log("MongoDB Error:", error);
  }
};

// Call DB
await connectDB();

// ================= STRIPE =================
export const stripe = process.env.STRIPE_API_SECRET
  ? new Stripe(process.env.STRIPE_API_SECRET)
  : null;

// ================= CLOUDINARY =================
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// ================= MIDDLEWARE =================
app.use(helmet());
app.use(mongoSanitize());
app.use(morgan("dev"));
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// ================= ROUTES =================
import testRoutes from "./routes/testRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

app.use("/api/v1", testRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/cat", categoryRoutes);
app.use("/api/v1/order", orderRoutes);

// ================= ROOT =================
app.get("/", (req, res) => {
  res.status(200).send("<h1>Server Running Successfully</h1>");
});

// ================= ❌ REMOVE THIS =================
// app.listen(PORT, () => {})

// ================= ✅ SERVERLESS EXPORT =================
export default app;
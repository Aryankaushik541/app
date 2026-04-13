import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readJson = async (fileName) => {
  const filePath = path.join(__dirname, "..", "data", fileName);
  const fileContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(fileContent);
};

const ensureStaffUsers = async () => {
  const staffUsers = [
    {
      name: "May Admin",
      email: "admin@maydesigne.com",
      password: "Admin@123",
      address: "HQ",
      city: "Delhi",
      country: "India",
      phone: "9999999999",
      answer: "admin",
      role: "admin",
      isEmailVerified: true,
    },
    {
      name: "May Manager",
      email: "manager@maydesigne.com",
      password: "Manager@123",
      address: "Warehouse",
      city: "Delhi",
      country: "India",
      phone: "8888888888",
      answer: "manager",
      role: "manager",
      isEmailVerified: true,
    },
  ];

  for (const staffUser of staffUsers) {
    const existingUser = await userModel.findOne({ email: staffUser.email });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(staffUser.password, 10);
      await userModel.create({ ...staffUser, password: hashedPassword });
    }
  }
};

export const seedStoreData = async () => {
  const categoryCount = await categoryModel.countDocuments();
  const productCount = await productModel.countDocuments();

  if (categoryCount > 0 && productCount > 0) {
    await ensureStaffUsers();
    return;
  }

  const [categories, products] = await Promise.all([
    readJson("categories.json"),
    readJson("products.json"),
  ]);

  let categoryDocs = await categoryModel.find({});

  if (categoryDocs.length === 0) {
    categoryDocs = await categoryModel.insertMany(categories);
  }

  if (productCount === 0) {
    const categoryMap = new Map(categoryDocs.map((item) => [item.slug, item._id]));
    const preparedProducts = products.map(({ categorySlug, ...product }) => ({
      ...product,
      category: categoryMap.get(categorySlug),
    }));
    await productModel.insertMany(preparedProducts);
  }

  await ensureStaffUsers();
};

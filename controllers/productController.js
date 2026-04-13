import productModel from "../models/productModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "./../utils/features.js";

export const getAllProductsController = async (req, res) => {
  const { keyword, category, featured, hero } = req.query;

  try {
    const filters = {
      name: {
        $regex: keyword ? keyword : "",
        $options: "i",
      },
    };

    if (category) filters.category = category;
    if (featured === "true") filters.featured = true;
    if (hero === "true") filters.hero = true;

    const products = await productModel.find(filters).populate("category");

    res.status(200).send({
      success: true,
      message: "all products fetched successfully",
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Get All Products API",
      error,
    });
  }
};

export const getTopProductsController = async (req, res) => {
  try {
    const products = await productModel.find({}).sort({ rating: -1 }).limit(6);
    res.status(200).send({
      success: true,
      message: "top products",
      products,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Get TOP PRODUCTS API",
      error,
    });
  }
};

export const getSingleProductController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "product not found",
      });
    }
    res.status(200).send({
      success: true,
      message: "Product Found",
      product,
    });
  } catch (error) {
    console.log(error);
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid Id",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error In Get single Products API",
      error,
    });
  }
};

export const createProductController = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      stock,
      slug,
      brand,
      discount,
      featured,
      hero,
      imageUrl,
      tags,
    } = req.body;

    let images = [];

    if (req.file) {
      const file = getDataUri(req.file);
      const cdb = await cloudinary.v2.uploader.upload(file.content);
      images = [
        {
          public_id: cdb.public_id,
          url: cdb.secure_url,
        },
      ];
    } else if (imageUrl) {
      images = [{ public_id: `manual-${Date.now()}`, url: imageUrl }];
    }

    const product = await productModel.create({
      name,
      description,
      price,
      category,
      stock,
      slug,
      brand,
      discount,
      featured,
      hero,
      tags: Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(",").map((item) => item.trim()).filter(Boolean)
        : [],
      images,
    });

    res.status(201).send({
      success: true,
      message: "product Created Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Create Product API",
      error,
    });
  }
};

export const updateProductController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const {
      name,
      description,
      price,
      stock,
      category,
      slug,
      brand,
      discount,
      featured,
      hero,
      tags,
    } = req.body;

    if (name) product.name = name;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (stock !== undefined) product.stock = stock;
    if (category) product.category = category;
    if (slug) product.slug = slug;
    if (brand) product.brand = brand;
    if (discount !== undefined) product.discount = discount;
    if (featured !== undefined) product.featured = featured;
    if (hero !== undefined) product.hero = hero;
    if (tags) {
      product.tags = Array.isArray(tags)
        ? tags
        : tags.split(",").map((item) => item.trim()).filter(Boolean);
    }

    await product.save();
    res.status(200).send({
      success: true,
      message: "product details updated",
      product,
    });
  } catch (error) {
    console.log(error);
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid Id",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error In Update Products API",
      error,
    });
  }
};

export const updateProductImageController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    if (!req.file) {
      return res.status(404).send({
        success: false,
        message: "Product image not found",
      });
    }

    const file = getDataUri(req.file);
    const cdb = await cloudinary.v2.uploader.upload(file.content);
    const image = {
      public_id: cdb.public_id,
      url: cdb.secure_url,
    };

    product.images.push(image);
    await product.save();
    res.status(200).send({
      success: true,
      message: "product image updated",
      product,
    });
  } catch (error) {
    console.log(error);
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid Id",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error In Update Product Image API",
      error,
    });
  }
};

export const deleteProductImageController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product Not Found",
      });
    }

    const id = req.query.id;
    if (!id) {
      return res.status(404).send({
        success: false,
        message: "product image not found",
      });
    }

    let isExist = -1;
    product.images.forEach((item, index) => {
      if (item._id.toString() === id.toString()) isExist = index;
    });
    if (isExist < 0) {
      return res.status(404).send({
        success: false,
        message: "Image Not Found",
      });
    }

    await cloudinary.v2.uploader.destroy(product.images[isExist].public_id);
    product.images.splice(isExist, 1);
    await product.save();
    return res.status(200).send({
      success: true,
      message: "Product Image Deleted Successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid Id",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error In Delete Product IMAGE API",
      error,
    });
  }
};

export const deleteProductController = async (req, res) => {
  try {
    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "product not found",
      });
    }

    for (let index = 0; index < product.images.length; index++) {
      const publicId = product.images[index].public_id;
      if (publicId && !publicId.startsWith("seed-") && !publicId.startsWith("manual-")) {
        await cloudinary.v2.uploader.destroy(publicId);
      }
    }

    await product.deleteOne();
    res.status(200).send({
      success: true,
      message: "PRoduct Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid Id",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error In Delete Product API",
      error,
    });
  }
};

export const productReviewController = async (req, res) => {
  try {
    const { comment, rating } = req.body;
    const product = await productModel.findById(req.params.id);
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).send({
        success: false,
        message: "Product Alredy Reviewed",
      });
    }
    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };
    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;
    await product.save();
    res.status(200).send({
      success: true,
      message: "Review Added!",
      product,
    });
  } catch (error) {
    console.log(error);
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid Id",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error In Review Comment API",
      error,
    });
  }
};

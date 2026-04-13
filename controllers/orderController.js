import QRCode from "qrcode";

import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import { stripe } from "../server.js";

const buildUpiLink = ({ amount, orderId }) => {
  const upiId = process.env.UPI_ID || "maydesigne@upi";
  const payeeName = encodeURIComponent(process.env.UPI_NAME || "MayDesigne Store");
  const note = encodeURIComponent(`Order ${orderId}`);
  return `upi://pay?pa=${upiId}&pn=${payeeName}&am=${Number(amount).toFixed(
    2
  )}&cu=INR&tn=${note}`;
};

export const createOrderController = async (req, res) => {
  try {
    const {
      shippingInfo,
      orderItems,
      paymentMethod,
      paymentInfo,
      itemPrice,
      tax,
      shippingCharges,
      totalAmount,
    } = req.body;

    const createdOrder = await orderModel.create({
      user: req.user._id,
      shippingInfo,
      orderItems,
      paymentMethod,
      paymentInfo,
      itemPrice,
      tax,
      shippingCharges,
      totalAmount,
    });

    for (let i = 0; i < orderItems.length; i++) {
      const product = await productModel.findById(orderItems[i].product);
      if (product) {
        product.stock -= orderItems[i].quantity;
        await product.save();
      }
    }

    res.status(201).send({
      success: true,
      message: "Order Placed Successfully",
      order: createdOrder,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Create Order API",
      error,
    });
  }
};

export const getMyOrdersCotroller = async (req, res) => {
  try {
    const orders = await orderModel.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      message: "your orders data",
      totalOrder: orders.length,
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In My orders Order API",
      error,
    });
  }
};

export const singleOrderDetrailsController = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).send({
        success: false,
        message: "no order found",
      });
    }
    res.status(200).send({
      success: true,
      message: "your order fetched",
      order,
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
      message: "Error In Get Order API",
      error,
    });
  }
};

export const paymetsController = async (req, res) => {
  try {
    const { totalAmount } = req.body;
    if (!stripe) {
      return res.status(400).send({
        success: false,
        message: "Stripe is not configured on this server",
      });
    }
    if (!totalAmount) {
      return res.status(404).send({
        success: false,
        message: "Total Amount is require",
      });
    }
    const { client_secret } = await stripe.paymentIntents.create({
      amount: Number(totalAmount * 100),
      currency: "usd",
    });
    res.status(200).send({
      success: true,
      client_secret,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Payments API",
      error,
    });
  }
};

export const createUpiPaymentController = async (req, res) => {
  try {
    const { totalAmount, orderId } = req.body;

    if (!totalAmount || !orderId) {
      return res.status(400).send({
        success: false,
        message: "orderId and totalAmount are required",
      });
    }

    const order = await orderModel.findById(orderId);
    if (!order) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    const upiLink = buildUpiLink({ amount: totalAmount, orderId });
    const qrCode = await QRCode.toDataURL(upiLink);

    order.paymentMethod = "UPI";
    order.paymentInfo = {
      id: `upi-${orderId}`,
      status: "pending",
      qrCode,
      upiLink,
    };
    await order.save();

    res.status(200).send({
      success: true,
      payment: {
        qrCode,
        upiLink,
        amount: totalAmount,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in UPI payment API",
      error,
    });
  }
};

export const confirmUpiPaymentController = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);

    if (!order) {
      return res.status(404).send({
        success: false,
        message: "Order not found",
      });
    }

    order.paymentInfo = {
      ...order.paymentInfo,
      id: order.paymentInfo?.id || `upi-${order._id}`,
      status: "completed",
      qrCode: order.paymentInfo?.qrCode,
      upiLink: order.paymentInfo?.upiLink,
    };
    order.paidAt = new Date();
    await order.save();

    res.status(200).send({
      success: true,
      message: "UPI payment marked as completed",
      order,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in confirm payment API",
      error,
    });
  }
};

export const getAllOrdersController = async (req, res) => {
  try {
    const orders = await orderModel
      .find({})
      .populate("user", "name email role")
      .sort({ createdAt: -1 });
    res.status(200).send({
      success: true,
      message: "All Orders Data",
      totalOrders: orders.length,
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Get All Orders API",
      error,
    });
  }
};

export const changeOrderStatusController = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) {
      return res.status(404).send({
        success: false,
        message: "order not found",
      });
    }
    if (order.orderStatus === "processing") order.orderStatus = "shipped";
    else if (order.orderStatus === "shipped") {
      order.orderStatus = "deliverd";
      order.deliverdAt = Date.now();
    } else {
      return res.status(500).send({
        success: false,
        message: "order already deliverd",
      });
    }
    await order.save();
    res.status(200).send({
      success: true,
      message: "order status updated",
      order,
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
      message: "Error In Update Order API",
      error,
    });
  }
};

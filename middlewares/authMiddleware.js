import JWT from "jsonwebtoken";
import userMdoel from "../models/userModel.js";

export const isAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const headerToken = req.headers.authorization?.split(" ")[1];
    const finalToken = token || headerToken;

    if (!finalToken) {
      return res.status(401).send({
        success: false,
        message: "UnAuthorized User",
      });
    }

    const decodeData = JWT.verify(finalToken, process.env.JWT_SECRET);
    req.user = await userMdoel.findById(decodeData._id).select("-password");

    if (!req.user) {
      return res.status(401).send({
        success: false,
        message: "User not found",
      });
    }

    next();
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const isAdmin = async (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(401).send({
      success: false,
      message: "admin only",
    });
  }
  next();
};

export const authorizeRoles = (...roles) => async (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).send({
      success: false,
      message: "You do not have permission to access this resource",
    });
  }
  next();
};

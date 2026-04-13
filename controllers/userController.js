import userModel from "../models/userModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/features.js";
import { sendOtpEmail } from "../utils/mailer.js";

const sanitizeUser = (user) => {
  const plainUser = user.toObject ? user.toObject() : { ...user };
  delete plainUser.password;
  delete plainUser.loginOtp;
  return plainUser;
};

const generateOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`;

const issueLoginOtp = async (user) => {
  const otp = generateOtp();
  user.loginOtp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };
  await user.save();

  const delivery = await sendOtpEmail({
    to: user.email,
    otp,
    name: user.name,
  });

  return {
    message: delivery.delivered
      ? "OTP sent to your email"
      : "OTP generated. Configure SMTP to send email automatically",
    otpPreview: delivery.preview,
  };
};

export const registerController = async (req, res) => {
  try {
    const { name, email, password, address, city, country, phone, answer } =
      req.body;

    if (
      !name ||
      !email ||
      !password ||
      !city ||
      !address ||
      !country ||
      !phone ||
      !answer
    ) {
      return res.status(400).send({
        success: false,
        message: "Please Provide All Fields",
      });
    }

    const exisitingUSer = await userModel.findOne({ email });
    if (exisitingUSer) {
      return res.status(409).send({
        success: false,
        message: "email already taken",
      });
    }

    const user = await userModel.create({
      name,
      email,
      password,
      address,
      city,
      country,
      phone,
      answer,
    });

    res.status(201).send({
      success: true,
      message: "Registeration Success, please login",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Register API",
      error,
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send({
        success: false,
        message: "Please Add Email OR Password",
      });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "USer Not Found",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).send({
        success: false,
        message: "invalid credentials",
      });
    }

    const delivery = await issueLoginOtp(user);

    res.status(200).send({
      success: true,
      requiresOtp: true,
      message: delivery.message,
      email,
      otpPreview: delivery.otpPreview,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: "false",
      message: "Error In Login Api",
      error,
    });
  }
};

export const resendLoginOtpController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Email is required",
      });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    const delivery = await issueLoginOtp(user);

    res.status(200).send({
      success: true,
      message: delivery.message,
      email,
      otpPreview: delivery.otpPreview,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in resend login OTP API",
      error,
    });
  }
};

export const verifyLoginOtpController = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).send({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const user = await userModel.findOne({ email });

    if (!user || !user.loginOtp?.code) {
      return res.status(400).send({
        success: false,
        message: "OTP request not found",
      });
    }

    if (user.loginOtp.expiresAt < new Date()) {
      user.loginOtp = undefined;
      await user.save();
      return res.status(400).send({
        success: false,
        message: "OTP expired. Please login again",
      });
    }

    if (user.loginOtp.code !== otp) {
      return res.status(400).send({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.loginOtp = undefined;
    user.isEmailVerified = true;
    await user.save();

    const token = user.generateToken();

    res
      .status(200)
      .cookie("token", token, {
        expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
      })
      .send({
        success: true,
        message: "Login Successfully",
        token,
        user: sanitizeUser(user),
      });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in verify login OTP API",
      error,
    });
  }
};

export const getUserProfileController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    res.status(200).send({
      success: true,
      message: "USer Prfolie Fetched Successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In PRofile API",
      error,
    });
  }
};

export const logoutController = async (req, res) => {
  try {
    res
      .status(200)
      .cookie("token", "", {
        expires: new Date(Date.now()),
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
      })
      .send({
        success: true,
        message: "Logout SUccessfully",
      });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In LOgout API",
      error,
    });
  }
};

export const updateProfileController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const { name, email, address, city, country, phone } = req.body;

    if (name) user.name = name;
    if (email) user.email = email;
    if (address) user.address = address;
    if (city) user.city = city;
    if (country) user.country = country;
    if (phone) user.phone = phone;

    await user.save();
    res.status(200).send({
      success: true,
      message: "User Profile Updated",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In update profile API",
      error,
    });
  }
};

export const udpatePasswordController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).send({
        success: false,
        message: "Please provide old or new password",
      });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).send({
        success: false,
        message: "Invalid Old Password",
      });
    }

    user.password = newPassword;
    await user.save();
    res.status(200).send({
      success: true,
      message: "Password Updated Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In update password API",
      error,
    });
  }
};

export const updateProfilePicController = async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const file = getDataUri(req.file);

    if (user.profilePic?.public_id) {
      await cloudinary.v2.uploader.destroy(user.profilePic.public_id);
    }

    const cdb = await cloudinary.v2.uploader.upload(file.content);
    user.profilePic = {
      public_id: cdb.public_id,
      url: cdb.secure_url,
    };

    await user.save();

    res.status(200).send({
      success: true,
      message: "profile picture updated",
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In update profile pic API",
      error,
    });
  }
};

export const passwordResetController = async (req, res) => {
  try {
    const { email, newPassword, answer } = req.body;
    if (!email || !newPassword || !answer) {
      return res.status(400).send({
        success: false,
        message: "Please Provide All Fields",
      });
    }

    const user = await userModel.findOne({ email, answer });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "invalid user or answer",
      });
    }

    user.password = newPassword;
    await user.save();
    res.status(200).send({
      success: true,
      message: "Your Password Has Been Reset Please Login !",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In password reset API",
      error,
    });
  }
};

export const getAdminUsersController = async (req, res) => {
  try {
    const users = await userModel
      .find({})
      .select("-password -loginOtp")
      .sort({ createdAt: -1 });

    res.status(200).send({
      success: true,
      totalUsers: users.length,
      users,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error in admin users API",
      error,
    });
  }
};

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user");
// const User = require("../models/User"); // 

const otpStore = {};

// POST /api/auth/send-otp
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone number is required" });

    // Generate OTP for BOTH new and existing users
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[phone] = otp;
    console.log(`🔐 OTP for ${phone}: ${otp}`);

    const user = await User.findOne({ phone });

    res.json({
      message: "OTP sent successfully",
      isNewUser: !user, // true if new user
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: "Phone and OTP required" });

    if (otpStore[phone] !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    delete otpStore[phone];

    const user = await User.findOne({ phone });

    // Existing user — direct login
    if (user) {
      const token = jwt.sign(
        { userId: user._id, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        message: "Login successful",
        isNewUser: false,
        token,
        user: {
          name: user.name,
          phone: user.phone,
          address: user.address,
          age: user.age,
          email: user.email,
          isFirstUser: user.isFirstUser,
        },
      });
    }

    // New user — OTP verified, now collect details
    res.json({
      message: "OTP verified! Please complete registration.",
      isNewUser: true,
      phone,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, phone, address, age, email } = req.body;
    if (!name || !phone || !address || !age || !email)
      return res.status(400).json({ message: "All fields are required" });

    if (age < 18)
      return res.status(400).json({ message: "Age must be 18 or above" });

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Please enter a valid email address" });

    const existingUser = await User.findOne({ phone });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail)
      return res.status(400).json({ message: "Email already registered" });

    const user = new User({ name, phone, address, age, email });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        name: user.name,
        phone: user.phone,
        address: user.address,
        age: user.age,
        email: user.email,
        isFirstUser: user.isFirstUser,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// GET /api/auth/check-user/:phone
router.get("/check-user/:phone", async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.params.phone });
    res.json({ isNewUser: !user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/firebase-login
router.post("/firebase-login", async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        name: user.name,
        phone: user.phone,
        address: user.address,
        age: user.age,
        email: user.email,
        isFirstUser: user.isFirstUser,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;
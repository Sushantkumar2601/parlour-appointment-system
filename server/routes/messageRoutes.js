const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");

// GET /api/messages/my-chat 
router.get("/my-chat", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ user: req.user.userId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/messages/send 
router.post("/send", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "Message empty nahi ho sakta" });

    const message = new Message({
      user: req.user.userId,
      sender: "user",
      text: text.trim(),
      read: false,
    });
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/messages/mark-read — 
router.patch("/mark-read", authMiddleware, async (req, res) => {
  try {
    await Message.updateMany(
      { user: req.user.userId, sender: "admin", read: { $ne: true } },
      { read: true }
    );
    res.json({ message: "Messages marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
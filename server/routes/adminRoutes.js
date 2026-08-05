const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Appointment = require("../models/Appointment");
const Message = require("../models/Message");

// GET /api/admin/customer-history/:phone
router.get("/customer-history/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "Customer not found" });
    }
    const appointments = await Appointment.find({ user: user._id })
      .populate("servicesSelected")
      .sort({ createdAt: -1 });

    res.json({
      profile: {
        name: user.name,
        phone: user.phone,
        address: user.address,
        age: user.age,
        email: user.email,
        isFirstUser: user.isFirstUser,
        createdAt: user.createdAt,
      },
      appointments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/appointment/:id/status
router.patch("/appointment/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Pending", "Confirmed", "Completed", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateData = { status };

    if (status === "Cancelled") {
      const existing = await Appointment.findById(req.params.id);
      updateData.cancelledAt = new Date();
      if (existing && existing.paymentMode === "Online") {
        updateData.refundStatus = "Pending";
      }
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json({ message: "Status updated!", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/appointment/:id/reschedule
router.patch("/appointment/:id/reschedule", async (req, res) => {
  try {
    const { proposedDate, proposedTimeSlot, rescheduleReason } = req.body;

    if (!proposedDate || !proposedTimeSlot) {
      return res.status(400).json({ message: "New date and time slot required" });
    }

   const conflict = await Appointment.findOne({
      _id: { $ne: req.params.id },
      date: proposedDate,
      timeSlot: proposedTimeSlot,
      status: { $in: ["Pending", "Confirmed", "RescheduleRequested"] },
    });


    if (conflict) {
      return res.status(400).json({ message: "This new time slot is already booked; select another one.." });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        status: "RescheduleRequested",
        proposedDate,
        proposedTimeSlot,
        rescheduleReason: rescheduleReason || "",
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({ message: "Reschedule request sent to customer!", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// PATCH /api/admin/appointment/:id/mark-refunded
router.patch("/appointment/:id/mark-refunded", async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { refundStatus: "Refunded" },
      { new: true }
    );
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json({ message: "Marked as refunded!", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// GET /api/admin/all-appointments
router.get("/all-appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("servicesSelected")
      .populate("user", "name phone address age")
      .sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/all-chats (For Admin -  All users who sends  message)
router.get("/all-chats", async (req, res) => {
  try {
    const messages = await Message.find().populate("user", "name phone").sort({ createdAt: -1 });

    // Group by user — sirf unique users with latest message
    const chatMap = {};
    messages.forEach((msg) => {
      if (!msg.user) return;
      const userId = msg.user._id.toString();
      if (!chatMap[userId]) {
        chatMap[userId] = {
          userId,
          name: msg.user.name,
          phone: msg.user.phone,
          lastMessage: msg.text,
          lastMessageTime: msg.createdAt,
          unreadCount: 0,
        };
      }
      if (msg.sender === "user" && msg.read !== true) {
        chatMap[userId].unreadCount += 1;
      }
    });

    const chatList = Object.values(chatMap).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    res.json(chatList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/chat/:userId (Admin can see specific chats of user)
router.get("/chat/:userId", async (req, res) => {
  try {
    const messages = await Message.find({ user: req.params.userId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/admin/chat/:userId/mark-read —
router.patch("/chat/:userId/mark-read", async (req, res) => {
  try {
    await Message.updateMany(
      { user: req.params.userId, sender: "user", read: { $ne: true } },
      { read: true }
    );
    res.json({ message: "Messages marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/chat/:userId/reply 
router.post("/chat/:userId/reply", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: "Message can't be empty" });

    const message = new Message({
      user: req.params.userId,
      sender: "admin",
      text: text.trim(),
      read: false,
    });
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
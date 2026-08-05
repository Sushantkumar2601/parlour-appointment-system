const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/user");
const { sendAdminNewAppointmentEmail } = require("../utils/sendEmail");

// Daily time slots
const ALL_SLOTS = [
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
  "5:00 PM - 6:00 PM",
];

// POST /api/appointments/book
router.post("/book", authMiddleware, async (req, res) => {
  try {
    const {
      date,
      timeSlot,
      servicesSelected,
      totalAmount,
      discountApplied,
      paymentMode,
    } = req.body;

    // Check for conflict — only active appointments
    const existing = await Appointment.findOne({
      date,
      timeSlot,
      status: { $in: ["Pending", "Confirmed", "RescheduleRequested"] },
    });

    if (existing) {
      return res.status(400).json({
        message: "This time slot is already booked.",
      });
    }

    const appointment = new Appointment({
      user: req.user.userId,
      date,
      timeSlot,
      servicesSelected,
      totalAmount,
      discountApplied: discountApplied || 0,
      paymentMode,
    });

    await appointment.save();

    // First booking ke baad isFirstUser false karo
    await User.findByIdAndUpdate(req.user.userId, { isFirstUser: false });

    // Email sned when config set 
    if (process.env.SEND_EMAILS !== "false") {
      try {
        const user = await User.findById(req.user.userId);
        const populatedAppointment = await Appointment.findById(
          appointment._id
        ).populate("servicesSelected");

        await sendAdminNewAppointmentEmail({
          user,
          appointment: populatedAppointment,
          services: populatedAppointment.servicesSelected,
        });
        console.log("Admin appointment email sent successfully");
      } catch (emailErr) {
        console.error("Email failed:", emailErr.message);
      }
    } else {
      console.log("Email skipped (SEND_EMAILS=false)");
    }

    res.status(201).json({ message: "Appointment booked!", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/appointments/available-slots?date=YYYY-MM-DD
router.get("/available-slots", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    // Get booked slots — only active appointments
    const bookedAppointments = await Appointment.find({
      date,
      status: { $in: ["Pending", "Confirmed", "RescheduleRequested"] },
    });
    const bookedSlots = bookedAppointments.map((a) => a.timeSlot);

    // Check if selected date is today
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const isToday = date === todayStr;

    const slots = ALL_SLOTS.map((slot) => {
      let status = bookedSlots.includes(slot) ? "Booked" : "Available";

      // Aaj ki date mein past slots hide karo
      if (isToday && status === "Available") {
        const startTimeStr = slot.split(" - ")[0];
        const [time, meridian] = startTimeStr.split(" ");
        let [hour, minute] = time.split(":").map(Number);
        if (meridian === "PM" && hour !== 12) hour += 12;
        if (meridian === "AM" && hour === 12) hour = 0;

        const slotTimeInMinutes = hour * 60 + minute;
        const nowTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        if (slotTimeInMinutes <= nowTimeInMinutes) {
          status = "Past";
        }
      }

      return { slot, status };
    });

    res.json({ date, slots });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/appointments/my-history (protected)
router.get("/my-history", authMiddleware, async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user.userId })
      .populate("servicesSelected")
      .sort({ createdAt: -1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/appointments/:id/respond-reschedule
router.patch("/:id/respond-reschedule", authMiddleware, async (req, res) => {
  try {
    const { action } = req.body;

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status !== "RescheduleRequested") {
      return res.status(400).json({ message: "No reschedule request pending" });
    }

    if (action === "accept") {
      appointment.date = appointment.proposedDate;
      appointment.timeSlot = appointment.proposedTimeSlot;
      appointment.status = "Confirmed";
      appointment.proposedDate = null;
      appointment.proposedTimeSlot = null;
      appointment.rescheduleReason = "";
      await appointment.save();
      return res.json({ message: "New time accepted!", appointment });
    }

    if (action === "reject") {
      appointment.status = "Cancelled";
      appointment.proposedDate = null;
      appointment.proposedTimeSlot = null;
      appointment.cancelledAt = new Date();
      if (appointment.paymentMode === "Online") {
        appointment.refundStatus = "Pending";
      }
      await appointment.save();
      return res.json({ message: "Appointment cancelled!", appointment });
    }

    res.status(400).json({ message: "Invalid action" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
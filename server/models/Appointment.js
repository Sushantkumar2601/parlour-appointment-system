const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  servicesSelected: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
  totalAmount: { type: Number, required: true },
  discountApplied: { type: Number, default: 0 },
  paymentMode: { type: String, enum: ["Cash", "Online"], required: true },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Completed", "Cancelled", "RescheduleRequested"],
    default: "Pending",
  },
  proposedDate: { type: String, default: null },
  proposedTimeSlot: { type: String, default: null },
  rescheduleReason: { type: String, default: "" },
  cancelledAt: { type: Date, default: null },
  refundStatus: { type: String, enum: ["NotApplicable", "Pending", "Refunded"], default: "NotApplicable" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);
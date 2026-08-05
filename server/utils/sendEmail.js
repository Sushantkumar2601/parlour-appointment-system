
const nodemailer = require("nodemailer");
const getEmailConfig = () => ({
  user: (process.env.EMAIL_USER || "").trim(),
  pass: (process.env.EMAIL_PASS || "").replace(/\s/g, ""),
  adminEmail: (process.env.ADMIN_EMAIL || "").trim(),
});

const isEmailConfigured = () => {
  const { user, pass, adminEmail } = getEmailConfig();
  return Boolean(user && pass && adminEmail);
};

const createTransporter = () => {
  const { user, pass } = getEmailConfig();

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
};

const sendAdminNewAppointmentEmail = async ({ user, appointment, services }) => {
  const { user: emailUser, adminEmail } = getEmailConfig();

  if (!isEmailConfigured()) {
    console.warn("Email not configured — skipping admin notification");
    return;
  }

  const serviceLines =
    services.length > 0
      ? services.map((s) => `  • ${s.name} — ₹${s.price}`).join("\n")
      : "  • No services listed";

  const finalAmount = appointment.totalAmount - (appointment.discountApplied || 0);

  const text = [
    "New appointment booked on Parlour App",
    "",
    `Customer: ${user.name}`,
    `Email: ${user.email || "Not provided"}`,
    `Phone: ${user.phone}`,
    `Address: ${user.address}`,
    `Age: ${user.age}`,
    "",
    `Date: ${appointment.date}`,
    `Time: ${appointment.timeSlot}`,
    `Payment: ${appointment.paymentMode}`,
    `Status: ${appointment.status}`,
    "",
    "Services:",
    serviceLines,
    "",
    `Total: ₹${appointment.totalAmount}`,
    `Discount: ₹${appointment.discountApplied || 0}`,
    `Final Amount: ₹${finalAmount}`,
  ].join("\n");

  const html = `
    <h2>New Appointment Booked</h2>
    <p>A customer has booked a new appointment on Parlour App.</p>
    <h3>Customer Details</h3>
    <ul>
      <li><strong>Name:</strong> ${user.name}</li>
      <li><strong>Email:</strong> ${user.email || "Not provided"}</li>
      <li><strong>Phone:</strong> ${user.phone}</li>
      <li><strong>Address:</strong> ${user.address}</li>
      <li><strong>Age:</strong> ${user.age}</li>
    </ul>
    <h3>Appointment Details</h3>
    <ul>
      <li><strong>Date:</strong> ${appointment.date}</li>
      <li><strong>Time:</strong> ${appointment.timeSlot}</li>
      <li><strong>Payment Mode:</strong> ${appointment.paymentMode}</li>
      <li><strong>Status:</strong> ${appointment.status}</li>
    </ul>
    <h3>Services</h3>
    <ul>
      ${services.map((s) => `<li>${s.name} — ₹${s.price}</li>`).join("") || "<li>No services listed</li>"}
    </ul>
    <p><strong>Total:</strong> ₹${appointment.totalAmount}<br/>
    <strong>Discount:</strong> ₹${appointment.discountApplied || 0}<br/>
    <strong>Final Amount:</strong> ₹${finalAmount}</p>
  `;

  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: `"Parlour App" <${emailUser}>`,
    to: adminEmail,
    subject: `New Appointment — ${user.name} (${appointment.date})`,
    text,
    html,
  });

  console.log(`Admin notification email sent to ${adminEmail} (${info.messageId})`);
};

module.exports = { sendAdminNewAppointmentEmail, isEmailConfigured };

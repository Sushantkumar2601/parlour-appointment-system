import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import toast from "react-hot-toast";
import SlotPicker from "../components/SlotPicker";


const UPI_ID = "8218953659@ybl";
const PAYEE_NAME = "Glamour Parlour";


const getServiceIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes("haircut") || n.includes("hair cut")) return "💇";
  if (n.includes("facial")) return "🧖";
  if (n.includes("manicure")) return "💅";
  if (n.includes("pedicure")) return "🦶";
  if (n.includes("waxing")) return "🪒";
  if (n.includes("threading")) return "🪡";
  if (n.includes("saree") || n.includes("draping")) return "🥻";
  if (n.includes("polish")) return "✨";
  if (n.includes("makeup") || n.includes("make up")) return "💄";
  if (n.includes("massage")) return "💆";
  if (n.includes("hair") || n.includes("color") || n.includes("colour")) return "🎨";
  if (n.includes("spa")) return "🛀";
  if (n.includes("bridal")) return "👰";
  if (n.includes("nail")) return "💅";
  if (n.includes("cleanup") || n.includes("clean up")) return "🧼";
  return "💖"; // default fallback
};

const getRefundInfo = (apt) => {
  if (apt.paymentMode !== "Online" || apt.status !== "Cancelled" || apt.refundStatus === "NotApplicable") {
    return null;
  }
  if (apt.refundStatus === "Refunded") {
    return { type: "done" };
  }
  if (!apt.cancelledAt) return null;

  const cancelledTime = new Date(apt.cancelledAt).getTime();
  const now = Date.now();
  const hoursPassed = (now - cancelledTime) / (1000 * 60 * 60);

  if (hoursPassed >= 3) {
    return { type: "delayed" };
  }
  const hoursLeft = Math.max(0, 3 - hoursPassed);
  return { type: "pending", hoursLeft: hoursLeft.toFixed(1) };
};

const Dashboard = () => {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("book");
  const [hoveredService, setHoveredService] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const copyUpiId = () => {
  navigator.clipboard.writeText(UPI_ID);
  toast.success("UPI ID copied! 📋");
};

useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchHistory();
    fetchServices();
    fetchChatMessages();

    // Polling — har 8 second mein naye messages check karo
    const interval = setInterval(() => {
      fetchChatMessages();
    }, 8000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
 const fetchHistory = async () => {
    try {
      const res = await axios.get("https://parlour-backend-gv16.onrender.com/api/appointments/my-history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Session is expire! Please login again.");
        logout();
        navigate("/");
      }
    }
  };
  const fetchServices = async () => {
    try {
      const res = await axios.get("https://parlour-backend-gv16.onrender.com/api/services");
      setServices(res.data);
    } catch (err) { console.log(err); }
  };
  const fetchChatMessages = async () => {
    try {
      const res = await axios.get("https://parlour-backend-gv16.onrender.com/api/messages/my-chat", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChatMessages(res.data);
      const unread = res.data.filter(m => m.sender === "admin" && !m.read).length;
      setUnreadCount(unread);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/");
      }
    }
  };

  const markUserMessagesAsRead = async () => {
    try {
      await axios.patch(
        "https://parlour-backend-gv16.onrender.com/api/messages/mark-read",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUnreadCount(0);
    } catch (err) {
      console.log(err);
    }
  };

  const handleTabChange = async (tabId) => {
    setActiveTab(tabId);
    if (tabId === "help") {
      await fetchChatMessages();
      await markUserMessagesAsRead();
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    try {
      const res = await axios.post(
        "https://parlour-backend-gv16.onrender.com/api/messages/send",
        { text: chatInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChatMessages((prev) => [...prev, res.data]);
      setChatInput("");
    } catch (err) {
      toast.error("Failed Message!");
    }
    setChatLoading(false);
  };

  const addToCart = (service) => {
    if (!cart.find((i) => i._id === service._id)) setCart([...cart, service]);
  };

  const removeFromCart = (id) => setCart(cart.filter((i) => i._id !== id));

  const subtotal = cart.reduce((sum, i) => sum + i.price, 0);
  const discount = user?.isFirstUser ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal - discount;

  const handleBooking = async () => {
    if (!selectedDate) return toast.error("Please select a date!");
    if (!selectedSlot) return toast.error("Please select a time slot!");
    if (cart.length === 0) return toast.error("Please add services!");
    setLoading(true);
    try {
      await axios.post(
        "https://parlour-backend-gv16.onrender.com/api/appointments/book",
        { date: selectedDate, timeSlot: selectedSlot, servicesSelected: cart.map((i) => i._id), totalAmount: total, discountApplied: discount, paymentMode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
if (user?.isFirstUser) {
  const updatedUser = { ...user, isFirstUser: false };
  login(updatedUser, token);
}


toast.success("Appointment booked! 🎉");
    
      setCart([]); setSelectedSlot(""); setSelectedDate(""); setShowBooking(false);
      setActiveTab("history");
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Booking failed!");
    }
    setLoading(false);
  };
const handleRescheduleResponse = async (appointmentId, action) => {
    try {
      await axios.patch(
        `https://parlour-backend-gv16.onrender.com/api/appointments/${appointmentId}/respond-reschedule`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(action === "accept" ? "New time confirmed! ✅" : "Appointment cancelled");
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed!");
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "Confirmed": return { bg: "linear-gradient(135deg, #11998e, #38ef7d)", text: "white" };
      case "Cancelled": return { bg: "linear-gradient(135deg, #eb3349, #f45c43)", text: "white" };
      case "Completed": return { bg: "linear-gradient(135deg, #4776e6, #8e54e9)", text: "white" };
      default: return { bg: "linear-gradient(135deg, #f7971e, #ffd200)", text: "white" };
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", fontFamily: "'Segoe UI', sans-serif" }}>

      {/* NAVBAR */}
      <nav style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        padding: "15px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px" }}>💅</span>
          <h1 style={{ color: "white", fontSize: "22px", fontWeight: "700", margin: 0 }}>
            Glamour Parlour
          </h1>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{
            background: "rgba(255,255,255,0.1)", borderRadius: "25px",
            padding: "8px 16px", color: "white", fontSize: "14px"
          }}>
            👋 {user?.name}
          </div>
          <button onClick={() => navigate("/")} style={navBtn("#ffffff20", "white")}>🏠 Home</button>
          <button onClick={() => { logout(); navigate("/"); }} style={navBtn("#ff416c", "white")}>Logout</button>
        </div>
      </nav>

      <div style={{ padding: "30px 40px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* PROFILE CARD */}
        <div style={{
          background: "linear-gradient(135deg, #e91e8c, #ff6b6b, #ffd200)",
          borderRadius: "20px", padding: "30px",
          marginBottom: "30px", position: "relative", overflow: "hidden"
        }}>
          <div style={{
            position: "absolute", top: "-30px", right: "-30px",
            width: "150px", height: "150px", borderRadius: "50%",
            background: "rgba(255,255,255,0.1)"
          }} />
          <div style={{
            position: "absolute", bottom: "-50px", right: "100px",
            width: "200px", height: "200px", borderRadius: "50%",
            background: "rgba(255,255,255,0.05)"
          }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
            <div>
              <div style={{
                width: "65px", height: "65px", borderRadius: "50%",
                background: "rgba(255,255,255,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "28px", marginBottom: "12px",
                border: "2px solid rgba(255,255,255,0.5)"
              }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ color: "white", fontSize: "26px", margin: "0 0 5px 0", fontWeight: "700" }}>
                {user?.name}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.85)", margin: "0 0 3px 0" }}>📞 {user?.phone}</p>
              <p style={{ color: "rgba(255,255,255,0.85)", margin: 0 }}>📍 {user?.address}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              {user?.isFirstUser && (
                <div style={{
                  background: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "15px", padding: "15px 20px",
                  border: "1px solid rgba(255,255,255,0.3)"
                }}>
                  <div style={{ fontSize: "28px", marginBottom: "5px" }}>🎁</div>
                  <p style={{ color: "white", fontWeight: "700", margin: "0 0 3px 0", fontSize: "16px" }}>
                    WELCOME5
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.8)", margin: 0, fontSize: "13px" }}>
                    5% First User Discount!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "15px", marginBottom: "30px"
        }}>
          {[
            { label: "Total Bookings", value: appointments.length, emoji: "📋", gradient: "linear-gradient(135deg, #667eea, #764ba2)" },
            { label: "Completed", value: appointments.filter(a => a.status === "Completed").length, emoji: "✅", gradient: "linear-gradient(135deg, #11998e, #38ef7d)" },
            { label: "Upcoming", value: appointments.filter(a => a.status === "Confirmed" || a.status === "Pending").length, emoji: "⏰", gradient: "linear-gradient(135deg, #f7971e, #ffd200)" },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: stat.gradient,
              borderRadius: "15px", padding: "20px",
              textAlign: "center",
              boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
              transition: "transform 0.2s",
              cursor: "default"
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ fontSize: "30px", marginBottom: "8px" }}>{stat.emoji}</div>
              <div style={{ color: "white", fontSize: "28px", fontWeight: "700" }}>{stat.value}</div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{
          display: "flex", gap: "5px", marginBottom: "25px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "15px", padding: "5px",
          backdropFilter: "blur(10px)"
        }}>
        {[
            { id: "book", label: "📅 Book Appointment" },
            { id: "history", label: "📋 My History" },
            { id: "help", label: unreadCount > 0 ? `💬 Help & Support (${unreadCount})` : "💬 Help & Support" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} style={{
              flex: 1, padding: "12px",
              border: "none", borderRadius: "12px",
              cursor: "pointer", fontSize: "15px", fontWeight: "600",
              background: activeTab === tab.id
                ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                : "transparent",
              color: activeTab === tab.id ? "white" : "rgba(255,255,255,0.6)",
              transition: "all 0.3s"
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* BOOK APPOINTMENT TAB */}
        {activeTab === "book" && (
          <div>
            {/* SERVICES GRID */}
            <h3 style={{ color: "white", marginBottom: "15px", fontSize: "18px" }}>
              ✨ Select Services
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "15px", marginBottom: "25px"
            }}>
              {services.map((service) => {
                const inCart = cart.find((i) => i._id === service._id);
                return (
                  <div key={service._id}
                    onMouseEnter={() => setHoveredService(service._id)}
                    onMouseLeave={() => setHoveredService(null)}
                    style={{
                      background: inCart
                        ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                        : hoveredService === service._id
                          ? "rgba(255,255,255,0.15)"
                          : "rgba(255,255,255,0.08)",
                      borderRadius: "15px", padding: "20px",
                      border: inCart ? "none" : "1px solid rgba(255,255,255,0.15)",
                      cursor: "pointer",
                      transition: "all 0.3s",
                      transform: hoveredService === service._id ? "translateY(-5px)" : "translateY(0)",
                      boxShadow: hoveredService === service._id ? "0 15px 35px rgba(0,0,0,0.3)" : "none"
                    }}
                    onClick={() => inCart ? removeFromCart(service._id) : addToCart(service)}
                  >
                  <div style={{ fontSize: "30px", marginBottom: "10px" }}>{getServiceIcon(service.name)}</div>
                    <h4 style={{ color: "white", margin: "0 0 5px 0", fontSize: "16px" }}>
                      {service.name}
                    </h4>
                    <p style={{ color: "rgba(255,255,255,0.7)", margin: "0 0 10px 0", fontSize: "13px" }}>
                      ⏱ {service.duration} mins
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: inCart ? "white" : "#ffd200", fontWeight: "700", fontSize: "18px" }}>
                        ₹{service.price}
                      </span>
                      <span style={{
                        background: inCart ? "rgba(255,255,255,0.3)" : "#e91e8c",
                        color: "white", padding: "4px 10px",
                        borderRadius: "20px", fontSize: "12px", fontWeight: "600"
                      }}>
                        {inCart ? "✓ Added" : "+ Add"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CART SUMMARY */}
            {cart.length > 0 && (
              <div style={{
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(20px)",
                borderRadius: "15px", padding: "20px",
                marginBottom: "25px",
                border: "1px solid rgba(255,255,255,0.15)"
              }}>
                <h4 style={{ color: "white", marginBottom: "15px", fontSize: "16px" }}>🛒 Cart Summary</h4>
                {cart.map((item) => (
                  <div key={item._id} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: "8px"
                  }}>
                    <span style={{ color: "rgba(255,255,255,0.8)" }}>{item.name}</span>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span style={{ color: "#ffd200", fontWeight: "600" }}>₹{item.price}</span>
                      <button onClick={() => removeFromCart(item._id)} style={{
                        background: "rgba(255,0,0,0.3)", border: "none",
                        color: "white", borderRadius: "50%",
                        width: "22px", height: "22px", cursor: "pointer", fontSize: "12px"
                      }}>✕</button>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "10px", paddingTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.7)" }}>
                    <span>Subtotal</span><span>₹{subtotal}</span>
                  </div>
                  {discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#38ef7d" }}>
                      <span>WELCOME5 (5%)</span><span>-₹{discount}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", color: "white", fontWeight: "700", fontSize: "18px", marginTop: "5px" }}>
                    <span>Total</span><span style={{ color: "#ffd200" }}>₹{total}</span>
                  </div>
                </div>
              </div>
            )}

            {/* DATE PICKER */}
            <div style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: "15px", padding: "20px",
              marginBottom: "20px",
              border: "1px solid rgba(255,255,255,0.15)"
            }}>
              <h4 style={{ color: "white", marginBottom: "12px" }}>📅 Select Date</h4>
           <input
                type="date"
                value={selectedDate}
                min={(() => {
                  const now = new Date();
                  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC + 5:30
                  const istDate = new Date(now.getTime() + istOffset);
                  return istDate.toISOString().split("T")[0];
                })()}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(""); }}
                style={{
                  padding: "10px 15px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "10px", color: "white",
                  fontSize: "15px", outline: "none"
                }}
              />
            </div>

            {/* SLOT PICKER */}
            {selectedDate && (
              <div style={{
                background: "rgba(255,255,255,0.08)",
                borderRadius: "15px", padding: "20px",
                marginBottom: "20px",
                border: "1px solid rgba(255,255,255,0.15)"
              }}>
                <SlotPicker
                  date={selectedDate}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  dark={true}
                />
              </div>
            )}

           {/* PAYMENT MODE */}
            <div style={{
              background: "rgba(255,255,255,0.08)",
              borderRadius: "15px", padding: "20px",
              marginBottom: "25px",
              border: "1px solid rgba(255,255,255,0.15)"
            }}>
              <h4 style={{ color: "white", marginBottom: "12px" }}>💳 Payment Mode</h4>
              <div style={{ display: "flex", gap: "12px" }}>
                {["Cash", "Online"].map((mode) => (
                  <button key={mode} onClick={() => setPaymentMode(mode)} style={{
                    padding: "12px 30px", borderRadius: "10px", border: "none",
                    cursor: "pointer", fontWeight: "700", fontSize: "15px",
                    background: paymentMode === mode
                      ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                      : "rgba(255,255,255,0.1)",
                    color: "white",
                    transform: paymentMode === mode ? "scale(1.05)" : "scale(1)",
                    transition: "all 0.2s",
                    boxShadow: paymentMode === mode ? "0 5px 20px rgba(233,30,140,0.4)" : "none"
                  }}>
                    {mode === "Cash" ? "💵 Cash" : "💳 Online"}
                  </button>
                ))}
              </div>

              {/* UPI PAYMENT DETAILS */}
              {paymentMode === "Online" && (
                <div style={{
                  marginTop: "20px", padding: "20px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  textAlign: "center"
                }}>
                  <p style={{ color: "white", marginBottom: "15px", fontWeight: "600", fontSize: "15px" }}>
                    📱 Scan & Pay via UPI
                  </p>

                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${total}&cu=INR&tn=Appointment Booking`
                    )}`}
                    alt="UPI QR Code"
                    style={{ borderRadius: "10px", marginBottom: "15px", background: "white", padding: "8px" }}
                  />

                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    gap: "10px", marginBottom: "15px", flexWrap: "wrap"
                  }}>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>UPI ID:</span>
                    <span style={{ color: "#ffd200", fontWeight: "700", fontSize: "15px" }}>{UPI_ID}</span>
                    <button onClick={copyUpiId} style={{
                      background: "rgba(255,255,255,0.1)", color: "white",
                      border: "1px solid rgba(255,255,255,0.2)",
                      padding: "5px 12px", borderRadius: "8px",
                      fontSize: "12px", cursor: "pointer"
                    }}>
                      📋 Copy
                    </button>
                  </div>

                  
                    <a href={`upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${total}&cu=INR&tn=Appointment Booking`}
                    style={{
                      display: "inline-block",
                      background: "linear-gradient(135deg, #11998e, #38ef7d)",
                      color: "white", padding: "12px 30px",
                      borderRadius: "10px", fontSize: "15px", fontWeight: "700",
                      textDecoration: "none",
                      boxShadow: "0 5px 20px rgba(56,239,125,0.3)"
                    }}
                  >
                    Pay ₹{total} Now 📲
                  </a>

                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", marginTop: "12px" }}>
                    💡 GPay/PhonePe/Paytm will open on your mobile. After making the payment, click "Confirm Appointment" below.</p>
                </div>
              )}
            </div>

            {/* CONFIRM BUTTON */}
            <button onClick={handleBooking} disabled={loading} style={{
              width: "100%", padding: "16px",
              background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
              color: "white", border: "none",
              borderRadius: "15px", fontSize: "18px",
              fontWeight: "700", cursor: "pointer",
              boxShadow: "0 8px 25px rgba(233,30,140,0.4)",
              transition: "all 0.3s",
              transform: loading ? "scale(0.98)" : "scale(1)"
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 12px 35px rgba(233,30,140,0.6)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 8px 25px rgba(233,30,140,0.4)"}
            >
              {loading ? "⏳ Booking..." : "✅ Confirm Appointment"}
            </button>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div>
            <h3 style={{ color: "white", marginBottom: "20px", fontSize: "18px" }}>
              📋 My Appointments
            </h3>
            {appointments.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "60px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.1)"
              }}>
                <div style={{ fontSize: "60px", marginBottom: "15px" }}>💆</div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "18px" }}>
                  No appointments yet!
                </p>
                <button onClick={() => setActiveTab("book")} style={{
                  marginTop: "15px", padding: "12px 30px",
                  background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
                  color: "white", border: "none", borderRadius: "10px",
                  fontSize: "15px", cursor: "pointer", fontWeight: "600"
                }}>
                  Book Now 💄
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {appointments.map((apt, i) => {
                  const statusStyle = getStatusColor(apt.status);
                  return (
                    <div key={apt._id} style={{
                      background: "rgba(255,255,255,0.07)",
                      backdropFilter: "blur(10px)",
                      borderRadius: "15px", padding: "20px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      transition: "all 0.3s"
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}>
                          Appointment #{i + 1}
                        </span>
                        <span style={{
                          background: statusStyle.bg,
                          color: statusStyle.text,
                          padding: "5px 15px", borderRadius: "20px",
                          fontSize: "13px", fontWeight: "600"
                        }}>
                          {apt.status === "RescheduleRequested" ? "🔄 Reschedule Requested" : apt.status}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                        <div>
                          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: "0 0 3px 0" }}>DATE</p>
                          <p style={{ color: "white", fontWeight: "600", margin: 0 }}>📅 {apt.date}</p>
                        </div>
                        <div>
                          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: "0 0 3px 0" }}>TIME SLOT</p>
                          <p style={{ color: "white", fontWeight: "600", margin: 0 }}>⏰ {apt.timeSlot}</p>
                        </div>
                        <div>
                          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: "0 0 3px 0" }}>TOTAL</p>
                          <p style={{ color: "#ffd200", fontWeight: "700", fontSize: "18px", margin: 0 }}>₹{apt.totalAmount}</p>
                        </div>
                        <div>
                          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: "0 0 3px 0" }}>PAYMENT</p>
                          <p style={{ color: "white", margin: 0 }}>💳 {apt.paymentMode}</p>
                        </div>
                        {apt.discountApplied > 0 && (
                          <div>
                            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: "0 0 3px 0" }}>DISCOUNT</p>
                            <p style={{ color: "#38ef7d", fontWeight: "600", margin: 0 }}>-₹{apt.discountApplied}</p>
                          </div>
                        )}
                       <div style={{ gridColumn: "1 / -1" }}>
                          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", margin: "0 0 3px 0" }}>SERVICES</p>
                          <p style={{ color: "white", margin: 0 }}>
                            💆 {apt.servicesSelected?.map((s) => s.name).join(", ") || "-"}
                          </p>
                        </div>
                      </div>
                      
                      {/* REFUND STATUS BANNER */}
                      {(() => {
                        const refundInfo = getRefundInfo(apt);
                        if (!refundInfo) return null;

                        if (refundInfo.type === "done") {
                          return (
                            <div style={{
                              marginTop: "15px", padding: "12px 15px",
                              background: "rgba(56,239,125,0.12)",
                              border: "1px solid rgba(56,239,125,0.3)",
                              borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px"
                            }}>
                              <span style={{ fontSize: "18px" }}>✅</span>
                              <p style={{ color: "#38ef7d", margin: 0, fontSize: "13px", fontWeight: "600" }}>
                                Payment refunded successfully!
                              </p>
                            </div>
                          );
                        }

                        if (refundInfo.type === "pending") {
                          return (
                            <div style={{
                              marginTop: "15px", padding: "12px 15px",
                              background: "rgba(247,151,30,0.12)",
                              border: "1px solid rgba(247,151,30,0.3)",
                              borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px"
                            }}>
                              <span style={{ fontSize: "18px" }}>⏳</span>
                              <p style={{ color: "#ffd200", margin: 0, fontSize: "13px", fontWeight: "600" }}>
                                Aapka payment ₹{apt.totalAmount} refund ho raha hai — ~{refundInfo.hoursLeft} hours mein aa jayega
                              </p>
                            </div>
                          );
                        }

                        if (refundInfo.type === "delayed") {
                          return (
                            <div style={{
                              marginTop: "15px", padding: "12px 15px",
                              background: "rgba(235,51,73,0.12)",
                              border: "1px solid rgba(235,51,73,0.3)",
                              borderRadius: "10px",
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              flexWrap: "wrap", gap: "10px"
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "18px" }}>⚠️</span>
                                <p style={{ color: "#f45c43", margin: 0, fontSize: "13px", fontWeight: "600" }}>
                                  Refund delayed — 3 ghante se zyada ho gaye
                                </p>
                              </div>
                              <a href="mailto:glamour@gmail.com" style={{
                                padding: "7px 16px", background: "linear-gradient(135deg, #eb3349, #f45c43)",
                                color: "white", borderRadius: "8px", fontSize: "12px",
                                fontWeight: "700", textDecoration: "none"
                              }}>
                                💬 Chat with Admin
                              </a>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* RESCHEDULE REQUEST UI */}
                      {apt.status === "RescheduleRequested" && (
                        <div style={{
                          marginTop: "15px", padding: "15px",
                          background: "rgba(155,89,182,0.15)",
                          border: "1px solid rgba(155,89,182,0.4)",
                          borderRadius: "12px"
                        }}>
                          <p style={{ color: "#c39bd3", fontWeight: "700", fontSize: "14px", margin: "0 0 8px 0" }}>
                            🔄The admin has proposed a new time:
                          </p>
                          <div style={{ display: "flex", gap: "20px", marginBottom: "10px", flexWrap: "wrap" }}>
                            <p style={{ color: "white", margin: 0, fontSize: "14px" }}>
                              📅 <strong>{apt.proposedDate}</strong>
                            </p>
                            <p style={{ color: "white", margin: 0, fontSize: "14px" }}>
                              ⏰ <strong>{apt.proposedTimeSlot}</strong>
                            </p>
                          </div>
                          {apt.rescheduleReason && (
                            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", margin: "0 0 12px 0" }}>
                              💬 Reason: {apt.rescheduleReason}
                            </p>
                          )}
                          <div style={{ display: "flex", gap: "10px" }}>
                            <button
                              onClick={() => handleRescheduleResponse(apt._id, "accept")}
                              style={{
                                padding: "10px 20px", borderRadius: "8px", border: "none",
                                background: "linear-gradient(135deg, #11998e, #38ef7d)",
                                color: "white", fontWeight: "700", fontSize: "13px", cursor: "pointer",
                                boxShadow: "0 4px 15px rgba(56,239,125,0.3)"
                              }}
                            >
                              ✅ Accept New Time
                            </button>
                            <button
                              onClick={() => handleRescheduleResponse(apt._id, "reject")}
                              style={{
                                padding: "10px 20px", borderRadius: "8px", border: "none",
                                background: "linear-gradient(135deg, #eb3349, #f45c43)",
                                color: "white", fontWeight: "700", fontSize: "13px", cursor: "pointer",
                                boxShadow: "0 4px 15px rgba(235,51,73,0.3)"
                              }}
                            >
                              ❌ Cancel Appointment
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      {/* HELP & SUPPORT TAB */}
        {activeTab === "help" && (
          <div>
            <div style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(20px)",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.1)",
              overflow: "hidden"
            }}>
              {/* CHAT HEADER */}
              <div style={{
                padding: "20px 25px",
                background: "linear-gradient(135deg, rgba(233,30,140,0.2), rgba(103,58,183,0.2))",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", gap: "12px"
              }}>
                <div style={{
                  width: "45px", height: "45px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "20px"
                }}>👑</div>
                <div>
                  <p style={{ color: "white", fontWeight: "700", margin: 0, fontSize: "16px" }}>
                    Glamour Parlour Support
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "12px" }}>
                    🟢 We typically reply within a few hours or minutes
                  </p>
                </div>
              </div>

              {/* CHAT MESSAGES */}
              <div style={{
                height: "400px", overflowY: "auto",
                padding: "20px", display: "flex",
                flexDirection: "column", gap: "12px"
              }}
                ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
              >
                {/* Welcome message */}
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{
                    background: "rgba(233,30,140,0.15)",
                    border: "1px solid rgba(233,30,140,0.2)",
                    borderRadius: "12px 12px 12px 0",
                    padding: "12px 15px", maxWidth: "75%"
                  }}>
                    <p style={{ color: "white", margin: 0, fontSize: "14px" }}>
                      👋 Hello {user?.name}! Welcome to Glamour Parlour Support. Feel free to ask any questions.
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.4)", margin: "5px 0 0 0", fontSize: "11px" }}>
                      Admin
                    </p>
                  </div>
                </div>

                {chatMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "30px" }}>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px" }}>
                     No messages yet. Write your question! 💬
                    </p>
                  </div>
                )}

                {chatMessages.map((msg) => (
                  <div key={msg._id} style={{
                    display: "flex",
                    justifyContent: msg.sender === "user" ? "flex-end" : "flex-start"
                  }}>
                    <div style={{
                      background: msg.sender === "user"
                        ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                        : "rgba(255,255,255,0.08)",
                      border: msg.sender === "admin" ? "1px solid rgba(255,255,255,0.1)" : "none",
                      borderRadius: msg.sender === "user"
                        ? "12px 12px 0 12px"
                        : "12px 12px 12px 0",
                      padding: "12px 15px", maxWidth: "75%"
                    }}>
                      <p style={{ color: "white", margin: 0, fontSize: "14px" }}>
                        {msg.text}
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.4)", margin: "5px 0 0 0", fontSize: "11px" }}>
                        {msg.sender === "user" ? "Aap" : "Admin"} •{" "}
                        {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CHAT INPUT */}
              <div style={{
                padding: "15px 20px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                display: "flex", gap: "12px", alignItems: "center"
              }}>
                <input
                  type="text"
                  placeholder="Type Your Message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                  style={{
                    flex: 1, padding: "12px 15px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "12px", color: "white",
                    fontSize: "14px", outline: "none"
                  }}
                  onFocus={e => e.target.style.border = "1px solid rgba(233,30,140,0.5)"}
                  onBlur={e => e.target.style.border = "1px solid rgba(255,255,255,0.15)"}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{
                    padding: "12px 20px",
                    background: chatInput.trim()
                      ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                      : "rgba(255,255,255,0.1)",
                    color: "white", border: "none",
                    borderRadius: "12px", fontSize: "18px",
                    cursor: chatInput.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.3s",
                    boxShadow: chatInput.trim() ? "0 4px 15px rgba(233,30,140,0.3)" : "none"
                  }}
                >
                  {chatLoading ? "⏳" : "➤"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

const navBtn = (bg, color) => ({
  background: bg, color, border: "none",
  padding: "8px 16px", borderRadius: "8px",
  fontSize: "14px", cursor: "pointer",
  transition: "all 0.2s"
});

export default Dashboard;
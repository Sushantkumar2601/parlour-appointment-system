import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
const ADMIN_PASSWORD = "2601";
const ADMIN_SESSION_KEY = "glamour_admin_session";
const SESSION_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 days

const isButtonDisabled = (currentStatus, btnStatus) => {
  if (btnStatus === "Confirmed") {
    return currentStatus !== "Pending";
  }
  if (btnStatus === "Completed") {
    return currentStatus !== "Confirmed";
  }
  if (btnStatus === "Cancelled") {
    return currentStatus === "Cancelled" || currentStatus === "Completed";
  }
  return false;
};

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const AdminSearch = () => {
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [phone, setPhone] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [proposedDate, setProposedDate] = useState("");
  const [proposedSlot, setProposedSlot] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [availableSlotsForReschedule, setAvailableSlotsForReschedule] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [earningDate, setEarningDate] = useState(getTodayStr());
  const [newNotificationCount, setNewNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newAppointments, setNewAppointments] = useState([]);
  const [adminTab, setAdminTab] = useState("appointments");
  const [chatList, setChatList] = useState([]);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const prevNotifCountRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    const session = localStorage.getItem(ADMIN_SESSION_KEY);
    if (session) {
      try {
        const { timestamp } = JSON.parse(session);
        if (Date.now() - timestamp < SESSION_DURATION) {
          setIsAdminVerified(true);
        } else {
          localStorage.removeItem(ADMIN_SESSION_KEY);
        }
      } catch (e) {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
    }
  }, []);

useEffect(() => {
    if (isAdminVerified) {
      fetchAllAppointments(false); // First load

      const interval = setInterval(() => {
        fetchAllAppointments(true);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isAdminVerified]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdminVerified) return;
    fetchAllChats();
    const interval = setInterval(() => {
      fetchAllChats();
      if (adminTab === "messages" && selectedChatUser) {
        fetchUserChat(selectedChatUser.userId, true);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [isAdminVerified, selectedChatUser, adminTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const fetchAllChats = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/all-chats");
      setChatList(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchUserChat = async (userId, silent = false) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/admin/chat/${userId}`);
      setChatMessages(res.data);
      if (!silent) fetchAllChats();
    } catch (err) {
      if (!silent) toast.error("Chat load nahi hui!");
    }
  };

  const markChatAsRead = async (userId) => {
    try {
      await axios.patch(`http://localhost:5000/api/admin/chat/${userId}/mark-read`);
      fetchAllChats();
    } catch (err) {
      console.log(err);
    }
  };

  const handleSelectChat = async (chat) => {
    setSelectedChatUser(chat);
    await fetchUserChat(chat.userId);
    await markChatAsRead(chat.userId);
  };

  const sendAdminReply = async () => {
    if (!chatInput.trim() || !selectedChatUser) return;
    setChatLoading(true);
    try {
      const res = await axios.post(
        `http://localhost:5000/api/admin/chat/${selectedChatUser.userId}/reply`,
        { text: chatInput }
      );
      setChatMessages((prev) => [...prev, res.data]);
      setChatInput("");
      fetchAllChats();
    } catch (err) {
      toast.error("Reply send nahi hui!");
    }
    setChatLoading(false);
  };
const fetchAllAppointments = async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/admin/all-appointments");
      const appointments = res.data;

      const lastSeenAt = localStorage.getItem("admin_last_seen_at");

      const newOnes = appointments.filter((a) => {
        if (a.status !== "Pending") return false;
        if (!lastSeenAt) return true;
        return new Date(a.createdAt) > new Date(lastSeenAt);
      });

      if (isPolling && newOnes.length > prevNotifCountRef.current) {
        toast.success(`🔔 New appointment — ${newOnes[0].user?.name || "Customer"}`, {
          duration: 5000,
        });
      }

      prevNotifCountRef.current = newOnes.length;

      setNewAppointments(newOnes);
      setNewNotificationCount(newOnes.length);
      setAllAppointments(appointments);
    } catch (err) {
      if (!isPolling) toast.error("Failed to load!");
    }
    if (!isPolling) setLoading(false);
  };

  const handleAdminLogin = () => {
    if (adminPass === ADMIN_PASSWORD) {
      localStorage.removeItem("admin_last_seen_at");
      localStorage.removeItem("admin_seen_count");
      prevNotifCountRef.current = 0;
      setIsAdminVerified(true);
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ timestamp: Date.now() }));
      toast.success("Welcome Admin! 👑");
    } else {
      toast.error("Wrong password!");
    }
  };

  const handleLogout = () => {
    setIsAdminVerified(false);
    setAdminPass("");
    localStorage.removeItem(ADMIN_SESSION_KEY);
  };

  const handleSearch = async () => {
    if (!phone) return toast.error("Enter phone number!");
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/admin/customer-history/${phone}`);
      setSearchResult(res.data);
      toast.success("Customer found!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Not found!");
      setSearchResult(null);
    }
    setLoading(false);
  };

const handleStatusChange = async (id, newStatus, isSearch = false) => {
    try {
      await axios.patch(`http://localhost:5000/api/admin/appointment/${id}/status`, { status: newStatus });
      toast.success(`Updated to ${newStatus}!`);

      if (isSearch && searchResult) {
        setSearchResult((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) =>
            a._id === id ? { ...a, status: newStatus } : a
          ),
        }));
      }

      if (selectedCustomer) {
        setSelectedCustomer((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) =>
            a._id === id ? { ...a, status: newStatus } : a
          ),
        }));
      }

      fetchAllAppointments(true);
    } catch (err) {
      toast.error("Failed!");
    }
  };

const handleMarkRefunded = async (id, isSearch = false) => {
    try {
      await axios.patch(`http://localhost:5000/api/admin/appointment/${id}/mark-refunded`);
      toast.success("Marked as refunded!");

      if (isSearch && searchResult) {
        setSearchResult((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) =>
            a._id === id ? { ...a, refundStatus: "Refunded" } : a
          ),
        }));
      }

      // selectedCustomer view update karo
      if (selectedCustomer) {
        setSelectedCustomer((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) =>
            a._id === id ? { ...a, refundStatus: "Refunded" } : a
          ),
        }));
      }

      fetchAllAppointments(true);
    } catch (err) { toast.error("Failed!"); }
  };

  const fetchSlotsForReschedule = async (date) => {
    if (!date) return;
    setLoadingSlots(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/appointments/available-slots?date=${date}`);
      setAvailableSlotsForReschedule(res.data.slots);
    } catch (err) {
      toast.error("Failed to load slots!");
    }
    setLoadingSlots(false);
  };

const handleRescheduleSubmit = async () => {
    if (!proposedDate || !proposedSlot) return toast.error("Date aur time slot dono select karo!");
    try {
      await axios.patch(`http://localhost:5000/api/admin/appointment/${rescheduleModal}/reschedule`, {
        proposedDate, proposedTimeSlot: proposedSlot, rescheduleReason,
      });
      toast.success("Reschedule request customer ko bhej diya!");

      // selectedCustomer view update karo
      if (selectedCustomer) {
        setSelectedCustomer((prev) => ({
          ...prev,
          appointments: prev.appointments.map((a) =>
            a._id === rescheduleModal
              ? { ...a, status: "RescheduleRequested", proposedDate, proposedTimeSlot: proposedSlot, rescheduleReason }
              : a
          ),
        }));
      }

      setRescheduleModal(null);
      setProposedDate(""); setProposedSlot(""); setRescheduleReason(""); setAvailableSlotsForReschedule([]);
      fetchAllAppointments(true);
    } catch (err) {
      toast.error("Failed to send reschedule request!");
    }
  };
 const clearNotifications = () => {
    localStorage.setItem("admin_last_seen_at", new Date().toISOString());
    localStorage.removeItem("admin_seen_count");
    setNewNotificationCount(0);
    setNewAppointments([]);
    prevNotifCountRef.current = 0;
    setShowNotifications(false);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Confirmed": return { bg: "linear-gradient(135deg, #11998e, #38ef7d)", shadow: "rgba(56,239,125,0.3)" };
      case "Cancelled": return { bg: "linear-gradient(135deg, #eb3349, #f45c43)", shadow: "rgba(235,51,73,0.3)" };
      case "Completed": return { bg: "linear-gradient(135deg, #4776e6, #8e54e9)", shadow: "rgba(142,84,233,0.3)" };
      case "RescheduleRequested": return { bg: "linear-gradient(135deg, #9b59b6, #8e44ad)", shadow: "rgba(155,89,182,0.3)" };
      default: return { bg: "linear-gradient(135deg, #f7971e, #ffd200)", shadow: "rgba(255,210,0,0.3)" };
    }
  };

  const filteredAppointments = filter === "All"
    ? allAppointments
    : allAppointments.filter((a) => a.status === filter);

// Customers grouped
const groupedCustomers = allAppointments.reduce((acc, apt) => {
  if (!apt.user) return acc;
  const userId = apt.user._id;
  if (!acc[userId]) {
    acc[userId] = {
      user: apt.user,
      appointments: [],
      totalSpent: 0,
    };
  }
  acc[userId].appointments.push(apt);
  if (apt.status === "Completed") {
    acc[userId].totalSpent += apt.totalAmount;
  }
  return acc;
}, {});

const customerList = Object.values(groupedCustomers).sort(
  (a, b) => new Date(b.appointments[0]?.createdAt) - new Date(a.appointments[0]?.createdAt)
);


  const todayStr = getTodayStr();

  const todayEarnings = allAppointments
    .filter(a => a.status === "Completed" && a.date === todayStr)
    .reduce((sum, a) => sum + a.totalAmount, 0);

  const selectedDateEarnings = allAppointments
    .filter(a => a.status === "Completed" && a.date === earningDate)
    .reduce((sum, a) => sum + a.totalAmount, 0);

  const selectedDateCount = allAppointments
    .filter(a => a.status === "Completed" && a.date === earningDate).length;

  const totalUnread = chatList.reduce((sum, chat) => sum + chat.unreadCount, 0);

  // ADMIN LOGIN SCREEN
  if (!isAdminVerified) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', sans-serif", position: "relative", overflow: "hidden"
      }}>
       <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes bellShake {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(-20deg); }
          30% { transform: rotate(20deg); }
          45% { transform: rotate(-15deg); }
          60% { transform: rotate(15deg); }
          75% { transform: rotate(-10deg); }
          90% { transform: rotate(10deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>

        <div style={{ position: "absolute", top: "15%", left: "10%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(233,30,140,0.2), transparent 70%)", animation: "pulse 4s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "15%", right: "10%", width: "250px", height: "250px", borderRadius: "50%", background: "radial-gradient(circle, rgba(103,58,183,0.2), transparent 70%)", animation: "pulse 5s ease-in-out infinite 1s" }} />

        <div style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(30px)",
          borderRadius: "25px", padding: "50px 45px",
          width: "420px", textAlign: "center",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.4)",
          animation: "fadeInUp 0.8s ease",
          position: "relative", zIndex: 1
        }}>
          <div style={{ fontSize: "60px", animation: "float 3s ease-in-out infinite", marginBottom: "15px" }}>👑</div>
          <h2 style={{
            fontSize: "28px", fontWeight: "800", margin: "0 0 8px 0",
            background: "linear-gradient(135deg, #e91e8c, #ffd200)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Admin Access
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "30px", fontSize: "14px" }}>
            Enter your admin password to continue
          </p>

          <div style={{ position: "relative", marginBottom: "15px" }}>
            <input
              type={showPass ? "text" : "password"}
              placeholder="🔑 Admin Password"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              style={{
                width: "100%", padding: "14px 45px 14px 15px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "12px", color: "white",
                fontSize: "15px", outline: "none",
                boxSizing: "border-box",
                transition: "border 0.3s"
              }}
              onFocus={e => e.target.style.border = "1px solid rgba(233,30,140,0.6)"}
              onBlur={e => e.target.style.border = "1px solid rgba(255,255,255,0.15)"}
            />
            <button onClick={() => setShowPass(!showPass)} style={{
              position: "absolute", right: "12px", top: "50%",
              transform: "translateY(-50%)", background: "none",
              border: "none", color: "rgba(255,255,255,0.5)",
              cursor: "pointer", fontSize: "16px"
            }}>
              {showPass ? "🙈" : "👁"}
            </button>
          </div>

          <button onClick={handleAdminLogin} style={{
            width: "100%", padding: "14px",
            background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
            color: "white", border: "none", borderRadius: "12px",
            fontSize: "16px", fontWeight: "700", cursor: "pointer",
            boxShadow: "0 8px 25px rgba(233,30,140,0.4)",
            marginBottom: "12px", transition: "all 0.3s"
          }}
            onMouseEnter={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 12px 35px rgba(233,30,140,0.6)"; }}
            onMouseLeave={e => { e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 8px 25px rgba(233,30,140,0.4)"; }}
          >
            Login as Admin 👑
          </button>

          <button onClick={() => navigate("/")} style={{
            width: "100%", padding: "12px",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px", fontSize: "14px", cursor: "pointer",
            transition: "all 0.3s"
          }}
            onMouseEnter={e => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.color = "white"; }}
            onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.color = "rgba(255,255,255,0.6)"; }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      <style>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(-18deg); }
          20% { transform: rotate(18deg); }
          30% { transform: rotate(-14deg); }
          40% { transform: rotate(14deg); }
          50% { transform: rotate(-10deg); }
          60% { transform: rotate(10deg); }
          70% { transform: rotate(-6deg); }
          80% { transform: rotate(6deg); }
        }
      `}</style>

      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", right: "5%", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(233,30,140,0.1), transparent 70%)", animation: "pulse 4s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "20%", left: "5%", width: "250px", height: "250px", borderRadius: "50%", background: "radial-gradient(circle, rgba(103,58,183,0.1), transparent 70%)", animation: "pulse 5s ease-in-out infinite 1s" }} />
      </div>

      {/* NAVBAR */}
      <nav style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
        padding: "15px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "24px" }}>💅</span>
          <span style={{
            fontSize: "20px", fontWeight: "800",
            background: "linear-gradient(135deg, #e91e8c, #ffd200)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Glamour Parlour
          </span>
          <span style={{
            background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
            color: "white", padding: "3px 12px", borderRadius: "20px",
            fontSize: "12px", fontWeight: "700"
          }}>
            ADMIN
          </span>
        </div>
       <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>

         {/* BELL ICON */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: newNotificationCount > 0
                  ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                  : "rgba(255,255,255,0.08)",
                border: "none", borderRadius: "10px",
                padding: "8px 12px", cursor: "pointer",
                fontSize: "18px", position: "relative",
                transition: "background 0.3s",
                boxShadow: newNotificationCount > 0
                  ? "0 4px 15px rgba(233,30,140,0.4)"
                  : "none",
              }}
            >
              <span style={{
                display: "inline-block",
                animation: newNotificationCount > 0
                  ? "bellShake 0.6s ease-in-out infinite"
                  : "none",
                transformOrigin: "top center"
              }}>
                🔔
              </span>
              {newNotificationCount > 0 && (
                <span style={{
                  position: "absolute", top: "-6px", right: "-6px",
                  background: "#ffd200", color: "#1a1a2e",
                  borderRadius: "50%", width: "20px", height: "20px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: "800"
                }}>
                  {newNotificationCount}
                </span>
              )}
            </button>

            {/* NOTIFICATION DROPDOWN */}
            {showNotifications && (
              <div style={{
                position: "absolute", top: "45px", right: 0,
                background: "#1a1a2e", borderRadius: "15px",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 15px 50px rgba(0,0,0,0.5)",
                width: "320px", zIndex: 999,
                overflow: "hidden"
              }}>
                {/* Header */}
                <div style={{
                  padding: "15px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <span style={{ color: "white", fontWeight: "700", fontSize: "15px" }}>
                    🔔 New Appointments
                  </span>
                  {newNotificationCount > 0 && (
                    <button onClick={clearNotifications} style={{
                      background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)",
                      border: "none", padding: "4px 10px", borderRadius: "6px",
                      fontSize: "12px", cursor: "pointer"
                    }}>
                      Mark all read ✓
                    </button>
                  )}
                </div>

                {/* Notification List */}
                <div style={{ maxHeight: "350px", overflowY: "auto" }}>
                  {newAppointments.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center" }}>
                      <p style={{ fontSize: "30px", marginBottom: "8px" }}>✅</p>
                      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", margin: 0 }}>
                        No New appointment
                      </p>
                    </div>
                  ) : (
                    newAppointments.map((apt, i) => (
                      <div key={apt._id || i} style={{
                        padding: "15px 20px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        background: "rgba(233,30,140,0.05)",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(233,30,140,0.12)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(233,30,140,0.05)"}
                        onClick={clearNotifications}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ color: "white", fontWeight: "700", fontSize: "14px" }}>
                            👤 {apt.user?.name || "Customer"}
                          </span>
                          <span style={{
                            background: "linear-gradient(135deg, #f7971e, #ffd200)",
                            color: "#1a1a2e", padding: "2px 8px",
                            borderRadius: "10px", fontSize: "11px", fontWeight: "700"
                          }}>
                            Pending
                          </span>
                        </div>
                        <p style={{ color: "rgba(255,255,255,0.6)", margin: 0, fontSize: "13px" }}>
                          📅 {apt.date} • ⏰ {apt.timeSlot}
                        </p>
                        <p style={{ color: "rgba(255,255,255,0.4)", margin: "4px 0 0 0", fontSize: "12px" }}>
                          💆 {apt.servicesSelected?.map(s => s.name).join(", ") || "-"} • ₹{apt.totalAmount}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {newAppointments.length > 0 && (
                  <div style={{
                    padding: "12px 20px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    textAlign: "center"
                  }}>
                    <button onClick={() => {
                      clearNotifications();
                      setFilter("Pending");
                    }} style={{
                      background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
                      color: "white", border: "none", padding: "8px 20px",
                      borderRadius: "8px", fontSize: "13px", fontWeight: "700",
                      cursor: "pointer", width: "100%"
                    }}>
                      View All Pending Appointments
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={() => navigate("/")} style={darkBtn}>🏠 Home</button>
          <button onClick={handleLogout} style={redBtn}>Logout</button>
        </div>
      </nav>

      <div style={{ padding: "30px 40px", maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* STATS */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "15px", marginBottom: "30px"
        }}>
          {[
            { label: "Total", count: allAppointments.length, emoji: "📋", gradient: "linear-gradient(135deg, #667eea, #764ba2)" },
            { label: "Pending", count: allAppointments.filter(a => a.status === "Pending").length, emoji: "⏳", gradient: "linear-gradient(135deg, #f7971e, #ffd200)" },
            { label: "Confirmed", count: allAppointments.filter(a => a.status === "Confirmed").length, emoji: "✅", gradient: "linear-gradient(135deg, #11998e, #38ef7d)" },
            { label: "Completed", count: allAppointments.filter(a => a.status === "Completed").length, emoji: "🏁", gradient: "linear-gradient(135deg, #4776e6, #8e54e9)" },
          ].map((stat) => (
            <div key={stat.label}
              style={{
                background: stat.gradient, borderRadius: "16px",
                padding: "22px", textAlign: "center",
                boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
                transition: "transform 0.3s", cursor: "default",
                animation: "fadeInUp 0.5s ease"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
            >
              <div style={{ fontSize: "30px", marginBottom: "8px" }}>{stat.emoji}</div>
              <div style={{ color: "white", fontSize: "32px", fontWeight: "800" }}>{stat.count}</div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", fontWeight: "600" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* TODAY'S EARNINGS BANNER */}
        <div style={{
          background: "linear-gradient(135deg, #f7971e, #ffd200)",
          borderRadius: "16px", padding: "25px 30px",
          marginBottom: "20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 8px 30px rgba(247,151,30,0.3)",
          animation: "fadeInUp 0.5s ease",
          flexWrap: "wrap", gap: "15px"
        }}>
          <div>
            <p style={{ color: "rgba(0,0,0,0.55)", fontSize: "13px", fontWeight: "700", margin: "0 0 5px 0", textTransform: "uppercase", letterSpacing: "1px" }}>
              💰 Today's Earnings — {new Date().toLocaleDateString('en-GB')}
            </p>
            <p style={{ color: "#1a1a2e", fontSize: "38px", fontWeight: "800", margin: 0 }}>
              ₹{todayEarnings}
            </p>
          </div>
          <div style={{ fontSize: "50px" }}>💵</div>
        </div>

        {/* EARNINGS BY DATE */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          borderRadius: "16px", padding: "20px 25px",
          marginBottom: "25px",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: "15px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "20px" }}>📅</span>
            <span style={{ color: "white", fontWeight: "600" }}>View Earnings for:</span>
            <input
              type="date"
              value={earningDate}
              onChange={(e) => setEarningDate(e.target.value)}
              style={{
                padding: "10px 15px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "10px", color: "white",
                fontSize: "14px", outline: "none"
              }}
            />
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: "0 0 3px 0" }}>
              {selectedDateCount} completed appointment(s)
            </p>
            <p style={{
              fontSize: "28px", fontWeight: "800", margin: 0,
              background: "linear-gradient(135deg, #11998e, #38ef7d)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>
              ₹{selectedDateEarnings}
            </p>
          </div>
        </div>

        {/* MAIN TABS */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "25px" }}>
          {[
            { id: "appointments", label: "📋 Appointments" },
            { id: "messages", label: totalUnread > 0 ? `💬 Support Messages (${totalUnread})` : "💬 Support Messages" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setAdminTab(tab.id);
                if (tab.id === "appointments") setSelectedChatUser(null);
              }}
              style={{
                padding: "10px 22px", borderRadius: "12px", border: "none",
                cursor: "pointer", fontSize: "14px", fontWeight: "700",
                background: adminTab === tab.id
                  ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                  : "rgba(255,255,255,0.08)",
                color: adminTab === tab.id ? "white" : "rgba(255,255,255,0.6)",
                boxShadow: adminTab === tab.id ? "0 4px 15px rgba(233,30,140,0.3)" : "none",
                transition: "all 0.3s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {adminTab === "appointments" && (
        <>
        {/* SEARCH BAR */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          borderRadius: "16px", padding: "20px 25px",
          marginBottom: "25px",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex", gap: "15px", alignItems: "center"
        }}>
          <span style={{ fontSize: "20px" }}>🔍</span>
          <input
            type="text"
            placeholder="Search by customer phone number..."
            value={phone}
            onChange={(e) => { setPhone(e.target.value); if (!e.target.value) setSearchResult(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{
              flex: 1, padding: "11px 15px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "10px", color: "white",
              fontSize: "15px", outline: "none", transition: "border 0.3s"
            }}
            onFocus={e => e.target.style.border = "1px solid rgba(233,30,140,0.6)"}
            onBlur={e => e.target.style.border = "1px solid rgba(255,255,255,0.15)"}
          />
          <button onClick={handleSearch} disabled={loading} style={{
            background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
            color: "white", border: "none", padding: "11px 25px",
            borderRadius: "10px", fontSize: "15px", fontWeight: "700",
            cursor: "pointer", boxShadow: "0 5px 20px rgba(233,30,140,0.3)",
            transition: "all 0.3s"
          }}
            onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}
          >
            {loading ? "⏳" : "Search"}
          </button>
          {searchResult && (
            <button onClick={() => { setSearchResult(null); setPhone(""); }} style={{
              background: "rgba(255,255,255,0.1)", color: "white",
              border: "1px solid rgba(255,255,255,0.2)", padding: "11px 18px",
              borderRadius: "10px", fontSize: "14px", cursor: "pointer"
            }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* SEARCH RESULT */}
        {searchResult && (
          <div style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            borderRadius: "16px", padding: "25px",
            marginBottom: "25px",
            border: "1px solid rgba(233,30,140,0.3)",
            boxShadow: "0 8px 30px rgba(233,30,140,0.1)",
            animation: "fadeInUp 0.4s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "20px" }}>
              <div style={{
                width: "55px", height: "55px", borderRadius: "50%",
                background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px", fontWeight: "800", color: "white"
              }}>
                {searchResult.profile.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ color: "white", margin: 0, fontSize: "20px", fontWeight: "700" }}>
                  {searchResult.profile.name}
                </h3>
                <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "14px" }}>
                  📞 {searchResult.profile.phone} • {searchResult.appointments.length} appointment(s)
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "20px" }}>
              {[
                { label: "Phone", value: searchResult.profile.phone },
                { label: "Address", value: searchResult.profile.address },
                { label: "Age", value: `${searchResult.profile.age} years` },
                { label: "First User", value: searchResult.profile.isFirstUser ? "⭐ Yes" : "✅ No" },
              ].map((item) => (
                <div key={item.label} style={{
                  background: "rgba(255,255,255,0.06)", borderRadius: "10px", padding: "12px"
                }}>
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", display: "block", textTransform: "uppercase" }}>{item.label}</span>
                  <span style={{ fontSize: "14px", color: "white", fontWeight: "600" }}>{item.value}</span>
                </div>
              ))}
            </div>

          {searchResult.appointments.map((apt, i) => (
              <AppointmentCard key={apt._id} apt={apt} index={i}
                getStatusStyle={getStatusStyle}
                onStatusChange={(id, s) => handleStatusChange(id, s, true)}
                showCustomer={false}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
                onReschedule={(id) => setRescheduleModal(id)}
                onMarkRefunded={(id) => handleMarkRefunded(id, true)}
              />
            ))}
          </div>
        )}
        {/* ALL APPOINTMENTS */}
        {!searchResult && (
          <div>

            {/* SELECTED CUSTOMER KI APPOINTMENTS */}
            {selectedCustomer ? (
              <div>
                {/* Back button + Customer info */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "15px",
                  marginBottom: "20px", flexWrap: "wrap"
                }}>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    style={{
                      background: "rgba(255,255,255,0.08)", color: "white",
                      border: "1px solid rgba(255,255,255,0.15)", padding: "8px 16px",
                      borderRadius: "10px", cursor: "pointer", fontSize: "14px",
                      fontWeight: "600"
                    }}
                  >
                    ← Back
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "45px", height: "45px", borderRadius: "50%",
                      background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "18px", fontWeight: "800", color: "white"
                    }}>
                      {selectedCustomer.user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ color: "white", fontWeight: "700", fontSize: "16px", margin: 0 }}>
                        {selectedCustomer.user.name}
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: 0 }}>
                        📞 {selectedCustomer.user.phone} • {selectedCustomer.appointments.length} appointment(s)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filter buttons */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                  {["All", "Pending", "Confirmed", "Completed", "Cancelled"].map((f) => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                      padding: "7px 16px", borderRadius: "20px", border: "none",
                      cursor: "pointer", fontSize: "13px", fontWeight: "600",
                      background: filter === f
                        ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                        : "rgba(255,255,255,0.08)",
                      color: filter === f ? "white" : "rgba(255,255,255,0.6)",
                      transition: "all 0.3s",
                      boxShadow: filter === f ? "0 4px 15px rgba(233,30,140,0.3)" : "none"
                    }}>
                      {f}
                    </button>
                  ))}
                </div>

                {/* Appointments list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {selectedCustomer.appointments
                    .filter(apt => filter === "All" || apt.status === filter)
                    .map((apt, i) => (
                      <AppointmentCard key={apt._id} apt={apt} index={i}
                        getStatusStyle={getStatusStyle}
                        onStatusChange={(id, s) => handleStatusChange(id, s, false)}
                        showCustomer={false}
                        hoveredCard={hoveredCard}
                        setHoveredCard={setHoveredCard}
                        onReschedule={(id) => setRescheduleModal(id)}
                        onMarkRefunded={(id) => handleMarkRefunded(id, false)}
                      />
                    ))
                  }
                  {selectedCustomer.appointments.filter(apt => filter === "All" || apt.status === filter).length === 0 && (
                    <div style={{
                      textAlign: "center", padding: "40px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)"
                    }}>
                      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "15px" }}>
                        Is filter mein koi appointment nahi
                      </p>
                    </div>
                  )}
                </div>
              </div>

            ) : (

              /* CUSTOMER LIST VIEW */
              <div>
                <h3 style={{ color: "white", fontSize: "20px", fontWeight: "700", margin: "0 0 20px 0" }}>
                  👥 All Customers
                  <span style={{
                    marginLeft: "10px", background: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)", padding: "3px 10px",
                    borderRadius: "20px", fontSize: "14px"
                  }}>
                    {customerList.length}
                  </span>
                </h3>

                {loading ? (
                  <div style={{ textAlign: "center", padding: "60px" }}>
                    <div style={{ fontSize: "40px", marginBottom: "15px" }}>⏳</div>
                    <p style={{ color: "rgba(255,255,255,0.5)" }}>Loading...</p>
                  </div>
                ) : customerList.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: "60px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)"
                  }}>
                    <div style={{ fontSize: "50px", marginBottom: "15px" }}>👥</div>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "16px" }}>Koi customer nahi abhi tak!</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {customerList.map((customerData) => {
                      const pendingCount = customerData.appointments.filter(a => a.status === "Pending").length;
                      const confirmedCount = customerData.appointments.filter(a => a.status === "Confirmed").length;
                      const completedCount = customerData.appointments.filter(a => a.status === "Completed").length;
                      const lastApt = customerData.appointments[0];

                      return (
                        <div
                          key={customerData.user._id}
                          onClick={() => { setSelectedCustomer(customerData); setFilter("All"); }}
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            backdropFilter: "blur(10px)",
                            borderRadius: "14px", padding: "20px",
                            border: "1px solid rgba(255,255,255,0.08)",
                            cursor: "pointer", transition: "all 0.3s"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                            e.currentTarget.style.border = "1px solid rgba(233,30,140,0.3)";
                            e.currentTarget.style.transform = "translateX(5px)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                            e.currentTarget.style.transform = "translateX(0)";
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            {/* Left — Customer info */}
                            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                              <div style={{
                                width: "50px", height: "50px", borderRadius: "50%",
                                background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "20px", fontWeight: "800", color: "white",
                                flexShrink: 0
                              }}>
                                {customerData.user.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p style={{ color: "white", fontWeight: "700", fontSize: "16px", margin: "0 0 4px 0" }}>
                                  {customerData.user.name}
                                </p>
                                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: "0 0 8px 0" }}>
                                  📞 {customerData.user.phone}
                                </p>
                                {/* Status badges */}
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                  {pendingCount > 0 && (
                                    <span style={{
                                      background: "rgba(247,151,30,0.2)", color: "#ffd200",
                                      padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600"
                                    }}>
                                      ⏳ {pendingCount} Pending
                                    </span>
                                  )}
                                  {confirmedCount > 0 && (
                                    <span style={{
                                      background: "rgba(56,239,125,0.15)", color: "#38ef7d",
                                      padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600"
                                    }}>
                                      ✅ {confirmedCount} Confirmed
                                    </span>
                                  )}
                                  {completedCount > 0 && (
                                    <span style={{
                                      background: "rgba(71,118,230,0.2)", color: "#8e54e9",
                                      padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600"
                                    }}>
                                      🏁 {completedCount} Completed
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right — Stats */}
                            <div style={{ textAlign: "right" }}>
                              <p style={{ color: "#ffd200", fontWeight: "800", fontSize: "20px", margin: "0 0 4px 0" }}>
                                ₹{customerData.totalSpent}
                              </p>
                              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", margin: "0 0 4px 0" }}>
                                Total Spent
                              </p>
                              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", margin: 0 }}>
                                Last: {lastApt?.date || "-"}
                              </p>
                              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", margin: "8px 0 0 0" }}>
                                View Details →
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </>
        )}

        {adminTab === "messages" && (
          <div style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: selectedChatUser ? "320px 1fr" : "1fr",
            minHeight: "520px",
          }}>
            {/* CHAT LIST */}
            <div style={{
              borderRight: selectedChatUser ? "1px solid rgba(255,255,255,0.1)" : "none",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{
                padding: "18px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}>
                <h3 style={{ color: "white", margin: 0, fontSize: "18px", fontWeight: "700" }}>
                  💬 Customer Messages
                </h3>
                <p style={{ color: "rgba(255,255,255,0.5)", margin: "5px 0 0 0", fontSize: "13px" }}>
                  {chatList.length} conversation(s)
                </p>
              </div>

              <div style={{ flex: 1, overflowY: "auto", maxHeight: "460px" }}>
                {chatList.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <div style={{ fontSize: "40px", marginBottom: "12px" }}>💬</div>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", margin: 0 }}>
                      Abhi koi message nahi aaya
                    </p>
                  </div>
                ) : (
                  chatList.map((chat) => (
                    <button
                      key={chat.userId}
                      onClick={() => handleSelectChat(chat)}
                      style={{
                        width: "100%", textAlign: "left", padding: "16px 20px",
                        background: selectedChatUser?.userId === chat.userId
                          ? "rgba(233,30,140,0.15)"
                          : "transparent",
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                        <div>
                          <p style={{ color: "white", margin: 0, fontWeight: "700", fontSize: "15px" }}>
                            {chat.name}
                          </p>
                          <p style={{ color: "rgba(255,255,255,0.45)", margin: "4px 0 0 0", fontSize: "12px" }}>
                            📞 {chat.phone}
                          </p>
                          <p style={{
                            color: "rgba(255,255,255,0.6)", margin: "8px 0 0 0", fontSize: "13px",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px",
                          }}>
                            {chat.lastMessage}
                          </p>
                        </div>
                        {chat.unreadCount > 0 && (
                          <span style={{
                            background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
                            color: "white", borderRadius: "50%",
                            minWidth: "22px", height: "22px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "11px", fontWeight: "700", flexShrink: 0,
                          }}>
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      <p style={{ color: "rgba(255,255,255,0.35)", margin: "8px 0 0 0", fontSize: "11px" }}>
                        {new Date(chat.lastMessageTime).toLocaleString("en-IN")}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* CHAT WINDOW */}
            {selectedChatUser && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{
                  padding: "18px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  background: "linear-gradient(135deg, rgba(233,30,140,0.15), rgba(103,58,183,0.15))",
                  display: "flex", alignItems: "center", gap: "12px",
                }}>
                  <div style={{
                    width: "42px", height: "42px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontWeight: "800", fontSize: "18px",
                  }}>
                    {selectedChatUser.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: "white", margin: 0, fontWeight: "700", fontSize: "16px" }}>
                      {selectedChatUser.name}
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "12px" }}>
                      📞 {selectedChatUser.phone}
                    </p>
                  </div>
                </div>

                <div
                  ref={chatEndRef}
                  style={{
                    flex: 1, overflowY: "auto", padding: "20px",
                    display: "flex", flexDirection: "column", gap: "12px",
                    maxHeight: "360px", minHeight: "360px",
                  }}
                >
                  {chatMessages.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px" }}>
                        Is customer ne abhi message nahi bheja
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg._id} style={{
                        display: "flex",
                        justifyContent: msg.sender === "admin" ? "flex-end" : "flex-start",
                      }}>
                        <div style={{
                          background: msg.sender === "admin"
                            ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                            : "rgba(255,255,255,0.08)",
                          border: msg.sender === "user" ? "1px solid rgba(255,255,255,0.1)" : "none",
                          borderRadius: msg.sender === "admin"
                            ? "12px 12px 0 12px"
                            : "12px 12px 12px 0",
                          padding: "12px 15px", maxWidth: "75%",
                        }}>
                          <p style={{ color: "white", margin: 0, fontSize: "14px" }}>{msg.text}</p>
                          <p style={{ color: "rgba(255,255,255,0.4)", margin: "5px 0 0 0", fontSize: "11px" }}>
                            {msg.sender === "admin" ? "You (Admin)" : selectedChatUser.name} •{" "}
                            {new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{
                  padding: "15px 20px",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", gap: "12px", alignItems: "center",
                }}>
                  <input
                    type="text"
                    placeholder="Write a reply to the customer...."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendAdminReply()}
                    style={{
                      flex: 1, padding: "12px 15px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "12px", color: "white",
                      fontSize: "14px", outline: "none",
                    }}
                  />
                  <button
                    onClick={sendAdminReply}
                    disabled={chatLoading || !chatInput.trim()}
                    style={{
                      padding: "12px 20px",
                      background: chatInput.trim()
                        ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                        : "rgba(255,255,255,0.1)",
                      color: "white", border: "none", borderRadius: "12px",
                      fontSize: "16px", fontWeight: "700",
                      cursor: chatInput.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    {chatLoading ? "⏳" : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RESCHEDULE MODAL */}
      {rescheduleModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#1a1a2e", borderRadius: "20px",
            padding: "30px", width: "420px",
            border: "1px solid rgba(155,89,182,0.4)",
            boxShadow: "0 25px 80px rgba(0,0,0,0.5)"
          }}>
            <h3 style={{ color: "white", marginBottom: "8px", fontSize: "20px" }}>
              🔄 Reschedule Appointment
            </h3>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "20px", fontSize: "13px" }}>
              Propose a new date/time. Customer will accept or reject it.
            </p>

            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", display: "block", marginBottom: "6px" }}>
              New Date
            </label>
            <input
              type="date"
              value={proposedDate}
              min={(() => {
                const now = new Date();
                const istOffset = 5.5 * 60 * 60 * 1000;
                const istDate = new Date(now.getTime() + istOffset);
                return istDate.toISOString().split("T")[0];
              })()}
              style={{
                width: "100%", padding: "10px 12px", marginBottom: "15px",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "10px", color: "white", fontSize: "14px", outline: "none",
                boxSizing: "border-box"
              }}
            />

            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", display: "block", marginBottom: "6px" }}>
               New Time Slot
            </label>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", display: "block", marginBottom: "6px" }}>
            </label>
            {!proposedDate ? (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "15px" }}>
               Select The Date
              </p>
            ) : loadingSlots ? (
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "13px", marginBottom: "15px" }}>
                Loading slots...
              </p>
            ) : (
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
                gap: "8px", marginBottom: "15px"
              }}>
                {availableSlotsForReschedule.map(({ slot, status }) => {
                  const isBooked = status === "Booked" || status === "Past";
                  const isSelected = proposedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setProposedSlot(slot)}
                      style={{
                        padding: "8px", borderRadius: "8px",
                        border: isSelected ? "2px solid #9b59b6" : "1px solid rgba(255,255,255,0.15)",
                        background: isBooked
                          ? "rgba(255,255,255,0.03)"
                          : isSelected
                            ? "rgba(155,89,182,0.3)"
                            : "rgba(255,255,255,0.08)",
                        color: isBooked ? "rgba(255,255,255,0.25)" : "white",
                        cursor: isBooked ? "not-allowed" : "pointer",
                        fontSize: "12px", fontWeight: isSelected ? "700" : "400",
                        textDecoration: isBooked ? "line-through" : "none",
                      }}
                    >
                      {slot}
                      {isBooked && <span style={{ display: "block", fontSize: "10px" }}>Booked</span>}
                    </button>
                  );
                })}
              </div>
            )}

            <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", display: "block", marginBottom: "6px" }}>
              Reason (optional)
            </label>
            <textarea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="e.g. Staff unavailable at this time"
              rows={2}
              style={{
                width: "100%", padding: "10px 12px", marginBottom: "20px",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "10px", color: "white", fontSize: "14px", outline: "none",
                boxSizing: "border-box", resize: "none", fontFamily: "inherit"
              }}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleRescheduleSubmit} style={{
                flex: 1, padding: "12px",
                background: "linear-gradient(135deg, #9b59b6, #8e44ad)",
                color: "white", border: "none", borderRadius: "10px",
                fontSize: "15px", fontWeight: "700", cursor: "pointer"
              }}>
                Send Request
              </button>
              <button onClick={() => { setRescheduleModal(null); setProposedDate(""); setProposedSlot(""); setRescheduleReason(""); setAvailableSlotsForReschedule([]); }} style={{                flex: 1, padding: "12px",
                background: "rgba(255,255,255,0.08)",
                color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px",
                fontSize: "15px", cursor: "pointer"
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AppointmentCard = ({ apt, index, getStatusStyle, onStatusChange, showCustomer, hoveredCard, setHoveredCard, onReschedule, onMarkRefunded }) => {  const statusStyle = getStatusStyle(apt.status);
  const isHovered = hoveredCard === apt._id;

  return (
    <div
      onMouseEnter={() => setHoveredCard(apt._id)}
      onMouseLeave={() => setHoveredCard(null)}
      style={{
        background: isHovered ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
        borderRadius: "14px", padding: "20px",
        border: isHovered ? "1px solid rgba(233,30,140,0.3)" : "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.3s",
        transform: isHovered ? "translateX(5px)" : "translateX(0)",
        boxShadow: isHovered ? "0 8px 30px rgba(0,0,0,0.2)" : "none"
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)",
            padding: "2px 10px", borderRadius: "20px", fontSize: "12px"
          }}>
            #{index + 1}
          </span>
          {showCustomer && apt.user && (
            <span style={{ color: "white", fontWeight: "700", fontSize: "15px" }}>
              👤 {apt.user.name}
              <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: "400", fontSize: "13px", marginLeft: "8px" }}>
                {apt.user.phone}
              </span>
            </span>
          )}
        </div>
        <span style={{
          background: statusStyle.bg, color: "white",
          padding: "5px 15px", borderRadius: "20px",
          fontSize: "13px", fontWeight: "700",
          boxShadow: `0 4px 15px ${statusStyle.shadow}`
        }}>
          {apt.status === "RescheduleRequested" ? "⏳ Awaiting Response" : apt.status}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
        {[
          { label: "DATE", value: `📅 ${apt.date}` },
          { label: "SLOT", value: `⏰ ${apt.timeSlot}` },
          { label: "TOTAL", value: `₹${apt.totalAmount}`, highlight: true },
          { label: "PAYMENT", value: `💳 ${apt.paymentMode}` },
          apt.discountApplied > 0 ? { label: "DISCOUNT", value: `-₹${apt.discountApplied}`, green: true } : null,
          { label: "SERVICES", value: `💆 ${apt.servicesSelected?.map(s => s.name).join(", ") || "-"}`, full: true },
        ].filter(Boolean).map((item, i) => (
          <div key={i} style={{ gridColumn: item.full ? "1 / -1" : "auto" }}>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", margin: "0 0 3px 0", textTransform: "uppercase" }}>
              {item.label}
            </p>
            <p style={{
              color: item.highlight ? "#ffd200" : item.green ? "#38ef7d" : "rgba(255,255,255,0.85)",
              fontWeight: item.highlight ? "700" : "500",
              fontSize: item.highlight ? "18px" : "14px", margin: 0
            }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* RESCHEDULE PENDING INFO */}
      {apt.status === "RescheduleRequested" && (
        <div style={{
          background: "rgba(155,89,182,0.15)", border: "1px solid rgba(155,89,182,0.4)",
          borderRadius: "10px", padding: "12px", marginBottom: "14px"
        }}>
          <p style={{ color: "#c39bd3", fontSize: "13px", margin: 0, fontWeight: "600" }}>
            🔄 Proposed: {apt.proposedDate} • {apt.proposedTimeSlot}
          </p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", margin: "5px 0 0 0" }}>
            Waiting for customer to accept or reject
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {[
          { status: "Confirmed", label: "✅ Confirm", gradient: "linear-gradient(135deg, #11998e, #38ef7d)", shadow: "rgba(56,239,125,0.3)" },
          { status: "Completed", label: "🏁 Complete", gradient: "linear-gradient(135deg, #4776e6, #8e54e9)", shadow: "rgba(142,84,233,0.3)" },
          { status: "Cancelled", label: "❌ Cancel", gradient: "linear-gradient(135deg, #eb3349, #f45c43)", shadow: "rgba(235,51,73,0.3)" },
        ].map((btn) => {
          const disabled = isButtonDisabled(apt.status, btn.status) || apt.status === "RescheduleRequested";
          return (
            <button key={btn.status}
              onClick={() => onStatusChange(apt._id, btn.status)}
              disabled={disabled}
              style={{
                padding: "8px 16px", borderRadius: "8px", border: "none",
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: "700", fontSize: "13px",
                background: disabled ? "rgba(255,255,255,0.06)" : btn.gradient,
                color: disabled ? "rgba(255,255,255,0.25)" : "white",
                boxShadow: disabled ? "none" : `0 4px 15px ${btn.shadow}`,
                transition: "all 0.3s",
              }}
              onMouseEnter={e => { if (!disabled) e.target.style.transform = "scale(1.05)"; }}
              onMouseLeave={e => { e.target.style.transform = "scale(1)"; }}
            >
              {btn.label}
            </button>
          );
        })}

       {(apt.status === "Pending" || apt.status === "Confirmed") && (
          <button
            onClick={() => onReschedule(apt._id)}
            style={{
              padding: "8px 16px", borderRadius: "8px", border: "none",
              cursor: "pointer", fontWeight: "700", fontSize: "13px",
              background: "linear-gradient(135deg, #9b59b6, #8e44ad)",
              color: "white",
              boxShadow: "0 4px 15px rgba(155,89,182,0.3)",
              transition: "all 0.3s",
            }}
            onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}
          >
            🔄 Reschedule
          </button>
        )}

        {apt.status === "Cancelled" && apt.paymentMode === "Online" && apt.refundStatus === "Pending" && (
          <button
            onClick={() => onMarkRefunded(apt._id)}
            style={{
              padding: "8px 16px", borderRadius: "8px", border: "none",
              cursor: "pointer", fontWeight: "700", fontSize: "13px",
              background: "linear-gradient(135deg, #f7971e, #ffd200)",
              color: "#1a1a2e",
              boxShadow: "0 4px 15px rgba(255,210,0,0.3)",
              transition: "all 0.3s",
            }}
            onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}
          >
            💰 Mark as Refunded
          </button>
        )}

        {apt.status === "Cancelled" && apt.paymentMode === "Online" && apt.refundStatus === "Refunded" && (
          <span style={{
            padding: "8px 16px", borderRadius: "8px",
            background: "rgba(56,239,125,0.15)", color: "#38ef7d",
            fontSize: "13px", fontWeight: "700", border: "1px solid rgba(56,239,125,0.3)"
          }}>
            ✅ Refunded
          </span>
        )}
      </div>
    </div>
  );
};

const darkBtn = {
  background: "rgba(255,255,255,0.08)", color: "white",
  border: "1px solid rgba(255,255,255,0.1)", padding: "8px 16px",
  borderRadius: "8px", cursor: "pointer", fontSize: "14px", transition: "all 0.3s"
};

const redBtn = {
  background: "linear-gradient(135deg, #eb3349, #f45c43)", color: "white",
  border: "none", padding: "8px 16px", borderRadius: "8px",
  cursor: "pointer", fontSize: "14px", fontWeight: "600",
  boxShadow: "0 4px 15px rgba(235,51,73,0.3)"
};

export default AdminSearch;
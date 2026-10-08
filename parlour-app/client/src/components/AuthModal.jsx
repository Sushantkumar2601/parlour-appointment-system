import { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const AuthModal = ({ onClose }) => {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", address: "", age: "" });
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const recaptchaRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Setup Recaptcha
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => {},
        }
      );
    }
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // Step 1 — Send OTP via Firebase
  const handleSendOtp = async () => {
    if (!phone) return toast.error("Phone number required!");
    if (phone.length !== 10) return toast.error("Enter valid 10-digit number!");

    setLoading(true);
    try {
      const phoneWithCode = `+91${phone}`;
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneWithCode, appVerifier);
      setConfirmationResult(result);

      // Check if new or existing user
      const userCheck = await axios.get(
        `https://parlour-backend-gv16.onrender.com/api/auth/check-user/${phone}`
      );
      setIsNewUser(userCheck.data.isNewUser);

      toast.success("OTP sent to your phone! 📱");
      setStep("otp");
    } catch (err) {
      console.log(err);
      toast.error("Failed to send OTP. Try again!");
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    }
    setLoading(false);
  };

  // Step 2 — Verify OTP via Firebase
  const handleVerifyOtp = async () => {
    if (!otp) return toast.error("Enter OTP!");
    setLoading(true);
    try {
      await confirmationResult.confirm(otp);

      if (!isNewUser) {
        // Existing user — login via backend
        const res = await axios.post(
          "https://parlour-backend-gv16.onrender.com/api/auth/firebase-login",
          { phone }
        );
        login(res.data.user, res.data.token);
        toast.success(`Welcome back, ${res.data.user.name}! 👋`);
        onClose();
        navigate("/dashboard");
      } else {
        // New user — show registration form
        toast.success("OTP verified! Complete your profile.");
        setStep("register");
      }
    } catch (err) {
      toast.error("Invalid OTP. Please try again!");
    }
    setLoading(false);
  };

  // Step 3 — Register new user
  const handleRegister = async () => {
    if (!form.name || !form.email || !form.address || !form.age)
      return toast.error("All fields required!");

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(form.email.trim()))
      return toast.error("Please enter a valid email address!");

    if (form.age < 18) return toast.error("Age must be 18 or above!");

    setLoading(true);
    try {
      const res = await axios.post(
        "https://parlour-backend-gv16.onrender.com/api/auth/register",
        {
          name: form.name,
          email: form.email.trim(),
          phone,
          address: form.address,
          age: Number(form.age),
        }
      );
      login(res.data.user, res.data.token);
      toast.success("Welcome to Glamour Parlour! 💄");
      onClose();
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed!");
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000
    }}>
      {/* Invisible Recaptcha */}
      <div id="recaptcha-container" ref={recaptchaRef}></div>

      <div style={{
        background: "white", borderRadius: "20px",
        padding: "40px", width: "420px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
      }}>
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px" }}>
          <div>
            <h2 style={{ color: "#1a1a2e", fontSize: "22px", marginBottom: "4px" }}>
              {step === "phone" && "🔐 Login / Register"}
              {step === "otp" && "📱 Verify OTP"}
              {step === "register" && "👋 Complete Profile"}
            </h2>
            <p style={{ color: "#888", fontSize: "13px" }}>
              {step === "phone" && "Enter your phone number"}
              {step === "otp" && `OTP sent to +91${phone}`}
              {step === "register" && "Just a few more details!"}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none",
            fontSize: "20px", cursor: "pointer", color: "#888"
          }}>✕</button>
        </div>

        {/* STEP INDICATOR */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "25px" }}>
          {["phone", "otp", "register"].map((s, i) => (
            <div key={s} style={{
              flex: 1, height: "4px", borderRadius: "2px",
              background: ["phone", "otp", "register"].indexOf(step) >= i
                ? "#e91e8c" : "#f0e0e0"
            }} />
          ))}
        </div>

        {/* PHONE STEP */}
        {step === "phone" && (
          <div>
            <div style={{
              display: "flex", border: "2px solid #f0e0e0",
              borderRadius: "10px", overflow: "hidden", marginBottom: "12px"
            }}>
              <span style={{
                padding: "12px 15px", background: "#f9f9f9",
                color: "#555", fontWeight: "bold", fontSize: "15px"
              }}>+91</span>
              <input
                type="text" placeholder="Phone Number" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/, ""))}
                maxLength={10}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                style={{
                  flex: 1, padding: "12px 15px", border: "none",
                  fontSize: "15px", outline: "none"
                }}
              />
            </div>
            <button onClick={handleSendOtp} disabled={loading} style={primaryBtn}>
              {loading ? "Sending OTP..." : "Send OTP →"}
            </button>
          </div>
        )}

        {/* OTP STEP */}
        {step === "otp" && (
          <div>
            <div style={{
              background: "#e8f5e9", borderRadius: "10px",
              padding: "12px 15px", marginBottom: "15px",
              border: "1px solid #a5d6a7"
            }}>
              <p style={{ color: "#2e7d32", fontSize: "13px", margin: 0 }}>
                📱 OTP sent to your phone +91{phone}
              </p>
            </div>
            <input
              type="text" placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/, ""))}
              maxLength={6}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              style={{
                ...inputStyle,
                fontSize: "28px", textAlign: "center", letterSpacing: "10px"
              }}
            />
            <button onClick={handleVerifyOtp} disabled={loading} style={primaryBtn}>
              {loading ? "Verifying..." : "Verify OTP ✓"}
            </button>
            <button onClick={() => { setStep("phone"); setOtp(""); }} style={secondaryBtn}>
              ← Change Number
            </button>
          </div>
        )}

        {/* REGISTER STEP */}
        {step === "register" && (
          <div>
            <div style={{
              background: "#e8f5e9", borderRadius: "10px",
              padding: "12px 15px", marginBottom: "15px",
              border: "1px solid #a5d6a7"
            }}>
              <p style={{ color: "#2e7d32", fontSize: "13px", margin: 0 }}>
                ✅ Phone verified! Complete your profile.
              </p>
            </div>
            <input placeholder="👤 Full Name" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle} />
            <input placeholder="📧 Email Address" type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={inputStyle} />
            <input placeholder="📍 Address" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              style={inputStyle} />
            <input placeholder="🎂 Age (18+)" type="number" value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              style={inputStyle} />
            <button onClick={handleRegister} disabled={loading} style={primaryBtn}>
              {loading ? "Creating Account..." : "Complete Registration 🎉"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const inputStyle = {
  width: "100%", padding: "12px 15px",
  border: "2px solid #f0e0e0", borderRadius: "10px",
  fontSize: "15px", marginBottom: "12px",
  outline: "none", boxSizing: "border-box"
};

const primaryBtn = {
  width: "100%", padding: "13px",
  background: "#e91e8c", color: "white",
  border: "none", borderRadius: "10px",
  fontSize: "16px", cursor: "pointer",
  marginBottom: "10px", fontWeight: "bold"
};

const secondaryBtn = {
  width: "100%", padding: "10px",
  background: "none", color: "#888",
  border: "1px solid #ddd", borderRadius: "10px",
  fontSize: "14px", cursor: "pointer"
};

export default AuthModal;
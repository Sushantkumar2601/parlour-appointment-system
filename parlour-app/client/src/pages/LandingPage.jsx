import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/AuthModal";
import axios from "axios";

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
  return "💖";
};

const LandingPage = () => {
  const [services, setServices] = useState([]);
  const [cart, setCart] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [hoveredService, setHoveredService] = useState(null);
  const [scrollY, setScrollY] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchServices = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/services");
      setServices(res.data);
    } catch (err) { console.log(err); }
  };

  const addToCart = (service) => {
    if (!cart.find((i) => i._id === service._id)) setCart([...cart, service]);
  };

  const removeFromCart = (id) => setCart(cart.filter((i) => i._id !== id));
  const totalAmount = cart.reduce((sum, i) => sum + i.price, 0);

  const handleBooking = () => {
    if (!user) setShowModal(true);
    else navigate("/dashboard");
  };

  const serviceIcons = ["💆", "✨", "💅", "🌸", "💄", "🧖"];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", fontFamily: "'Segoe UI', sans-serif", overflowX: "hidden" }}>

      {/* ANIMATED BG BLOBS */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "10%", left: "10%",
          width: "400px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(233,30,140,0.15), transparent 70%)",
          animation: "pulse 4s ease-in-out infinite"
        }} />
        <div style={{
          position: "absolute", top: "50%", right: "5%",
          width: "350px", height: "350px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(103,58,183,0.15), transparent 70%)",
          animation: "pulse 5s ease-in-out infinite 1s"
        }} />
        <div style={{
          position: "absolute", bottom: "10%", left: "30%",
          width: "300px", height: "300px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,193,7,0.1), transparent 70%)",
          animation: "pulse 6s ease-in-out infinite 2s"
        }} />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: scrollY > 50 ? "rgba(10,10,10,0.95)" : "transparent",
        backdropFilter: scrollY > 50 ? "blur(20px)" : "none",
        padding: "18px 50px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: scrollY > 50 ? "1px solid rgba(255,255,255,0.08)" : "none",
        transition: "all 0.3s ease"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "28px", animation: "float 3s ease-in-out infinite" }}>💅</span>
          <span style={{
            fontSize: "22px", fontWeight: "800", color: "white",
            background: "linear-gradient(135deg, #e91e8c, #ff6b6b, #ffd200)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Glamour Parlour
          </span>
        </div>

        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <a href="mailto:glamour@gmail.com" style={{
            color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "14px",
            transition: "color 0.2s"
          }}
            onMouseEnter={e => e.target.style.color = "#e91e8c"}
            onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.7)"}
          >
            📧 glamour@gmail.com
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" style={{
            color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "14px",
            transition: "color 0.2s"
          }}
            onMouseEnter={e => e.target.style.color = "#e91e8c"}
            onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.7)"}
          >
            📸 Instagram
          </a>

          {user ? (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{
                color: "white", fontSize: "14px",
                background: "rgba(255,255,255,0.1)",
                padding: "6px 14px", borderRadius: "20px"
              }}>
                👋 {user.name}
              </span>
              <button onClick={() => navigate("/dashboard")} style={glowBtn("#e91e8c")}>
                Dashboard
              </button>
              <button onClick={() => { logout(); }} style={glowBtn("#c0392b")}>
                Logout
              </button>
            </div>
          ) : (
            <button onClick={() => setShowModal(true)} style={glowBtn("#e91e8c")}>
              Login / Register
            </button>
          )}
        </div>
      </nav>

      {/* HERO SECTION */}
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", textAlign: "center",
        padding: "120px 40px 80px", position: "relative", zIndex: 1
      }}>
        <div style={{ animation: "fadeInUp 1s ease both" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(233,30,140,0.15)",
            border: "1px solid rgba(233,30,140,0.3)",
            borderRadius: "30px", padding: "8px 20px",
            color: "#e91e8c", fontSize: "14px", fontWeight: "600",
            marginBottom: "25px", letterSpacing: "1px"
          }}>
            ✨ PREMIUM BEAUTY EXPERIENCE
          </div>

          <h1 style={{
            fontSize: "72px", fontWeight: "900", margin: "0 0 20px 0",
            lineHeight: "1.1", color: "white"
          }}>
            Look{" "}
            <span style={{
              background: "linear-gradient(135deg, #e91e8c, #ff6b6b, #ffd200)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              animation: "shimmer 3s linear infinite"
            }}>
              Beautiful,
            </span>
            <br />Feel Confident
          </h1>

          <p style={{
            fontSize: "20px", color: "rgba(255,255,255,0.6)",
            marginBottom: "40px", maxWidth: "500px", margin: "0 auto 40px"
          }}>
            Book your parlour appointment in just a few clicks. Premium services at your fingertips.
          </p>

          <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleBooking} style={{
              padding: "16px 40px",
              background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
              color: "white", border: "none", borderRadius: "50px",
              fontSize: "18px", fontWeight: "700", cursor: "pointer",
              boxShadow: "0 10px 40px rgba(233,30,140,0.4)",
              transition: "all 0.3s"
            }}
              onMouseEnter={e => {
                e.target.style.transform = "translateY(-3px)";
                e.target.style.boxShadow = "0 15px 50px rgba(233,30,140,0.6)";
              }}
              onMouseLeave={e => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 10px 40px rgba(233,30,140,0.4)";
              }}
            >
              💄 Book Appointment
            </button>

            <button onClick={() => document.getElementById("services").scrollIntoView({ behavior: "smooth" })}
              style={{
                padding: "16px 40px",
                background: "transparent",
                color: "white", border: "2px solid rgba(255,255,255,0.2)",
                borderRadius: "50px", fontSize: "18px", fontWeight: "700",
                cursor: "pointer", transition: "all 0.3s"
              }}
              onMouseEnter={e => {
                e.target.style.borderColor = "#e91e8c";
                e.target.style.color = "#e91e8c";
              }}
              onMouseLeave={e => {
                e.target.style.borderColor = "rgba(255,255,255,0.2)";
                e.target.style.color = "white";
              }}
            >
              View Services ↓
            </button>
          </div>

          {/* STATS */}
          <div style={{
            display: "flex", gap: "40px", justifyContent: "center",
            marginTop: "60px", flexWrap: "wrap"
          }}>
            {[
              { value: "500+", label: "Happy Clients" },
              { value: "50+", label: "Services" },
              { value: "5★", label: "Rating" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: "32px", fontWeight: "800", color: "white",
                  background: "linear-gradient(135deg, #e91e8c, #ffd200)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                }}>
                  {stat.value}
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SERVICES SECTION */}
      <div id="services" style={{ padding: "80px 50px", position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(233,30,140,0.15)",
            border: "1px solid rgba(233,30,140,0.3)",
            borderRadius: "30px", padding: "8px 20px",
            color: "#e91e8c", fontSize: "14px", fontWeight: "600",
            marginBottom: "15px"
          }}>
            OUR SERVICES
          </div>
          <h2 style={{ color: "white", fontSize: "42px", fontWeight: "800", margin: "0 0 10px 0" }}>
            Premium Beauty Services
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px" }}>
            Choose from our wide range of professional beauty treatments
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
          gap: "25px", maxWidth: "1200px", margin: "0 auto"
        }}>
          {services.map((service, i) => (
            <div key={service._id}
              onMouseEnter={() => setHoveredService(service._id)}
              onMouseLeave={() => setHoveredService(null)}
              style={{
                background: hoveredService === service._id
                  ? "linear-gradient(135deg, rgba(233,30,140,0.2), rgba(255,107,107,0.1))"
                  : "rgba(255,255,255,0.04)",
                borderRadius: "20px", padding: "30px",
                border: hoveredService === service._id
                  ? "1px solid rgba(233,30,140,0.4)"
                  : "1px solid rgba(255,255,255,0.08)",
                transition: "all 0.4s ease",
                transform: hoveredService === service._id ? "translateY(-8px)" : "translateY(0)",
                boxShadow: hoveredService === service._id
                  ? "0 20px 50px rgba(233,30,140,0.2)"
                  : "none",
                cursor: "pointer"
              }}>
              <div style={{
                fontSize: "40px", marginBottom: "15px",
                animation: hoveredService === service._id ? "float 2s ease-in-out infinite" : "none"
              }}>
                {getServiceIcon(service.name)}
              </div>
              <h3 style={{ color: "white", fontSize: "20px", fontWeight: "700", margin: "0 0 8px 0" }}>
                {service.name}
              </h3>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", margin: "0 0 20px 0" }}>
                ⏱ {service.duration} mins session
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{
                  fontSize: "26px", fontWeight: "800",
                  background: "linear-gradient(135deg, #e91e8c, #ffd200)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                }}>
                  ₹{service.price}
                </span>
                <button onClick={() => addToCart(service)}
                  disabled={!!cart.find((i) => i._id === service._id)}
                  style={{
                    padding: "10px 20px", borderRadius: "25px", border: "none",
                    background: cart.find((i) => i._id === service._id)
                      ? "rgba(255,255,255,0.1)"
                      : "linear-gradient(135deg, #e91e8c, #ff6b6b)",
                    color: "white", fontSize: "14px", fontWeight: "600",
                    cursor: cart.find((i) => i._id === service._id) ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                    boxShadow: cart.find((i) => i._id === service._id)
                      ? "none" : "0 5px 20px rgba(233,30,140,0.3)"
                  }}>
                  {cart.find((i) => i._id === service._id) ? "✓ Added" : "+ Add to Cart"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CART FLOATING */}
      {cart.length > 0 && (
        <div style={{
          position: "fixed", bottom: "30px", right: "30px",
          background: "rgba(10,10,10,0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: "20px", padding: "20px",
          boxShadow: "0 20px 60px rgba(233,30,140,0.3)",
          minWidth: "300px", zIndex: 999,
          border: "1px solid rgba(233,30,140,0.3)",
          animation: "fadeInUp 0.3s ease"
        }}>
          <h3 style={{ color: "white", marginBottom: "12px", fontSize: "16px" }}>
            🛒 Cart ({cart.length} items)
          </h3>
          {cart.map((item) => (
            <div key={item._id} style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: "8px"
            }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>{item.name}</span>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <span style={{ color: "#ffd200", fontWeight: "600" }}>₹{item.price}</span>
                <button onClick={() => removeFromCart(item._id)} style={{
                  background: "rgba(255,0,0,0.2)", border: "none",
                  color: "#ff6b6b", borderRadius: "50%",
                  width: "22px", height: "22px", cursor: "pointer", fontSize: "12px"
                }}>✕</button>
              </div>
            </div>
          ))}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            marginTop: "12px", paddingTop: "12px",
            display: "flex", justifyContent: "space-between"
          }}>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Total</span>
            <span style={{ color: "#ffd200", fontWeight: "700", fontSize: "18px" }}>₹{totalAmount}</span>
          </div>
          <button onClick={handleBooking} style={{
            width: "100%", marginTop: "12px", padding: "12px",
            background: "linear-gradient(135deg, #e91e8c, #ff6b6b)",
            color: "white", border: "none", borderRadius: "12px",
            fontSize: "15px", fontWeight: "700", cursor: "pointer",
            boxShadow: "0 5px 20px rgba(233,30,140,0.4)",
            transition: "all 0.3s"
          }}
            onMouseEnter={e => e.target.style.transform = "scale(1.02)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}
          >
            Proceed to Book 💄
          </button>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{
        textAlign: "center", padding: "40px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        position: "relative", zIndex: 1
      }}>
        <span style={{ fontSize: "20px" }}>💅</span>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px", marginTop: "8px" }}>
          © 2026 Glamour Parlour. All rights reserved.
        </p>
      </footer>

      {/* AUTH MODAL */}
      {showModal && <AuthModal onClose={() => setShowModal(false)} cart={cart} />}
    </div>
  );
};

const glowBtn = (color) => ({
  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
  color: "white", border: "none",
  padding: "9px 20px", borderRadius: "25px",
  fontSize: "14px", fontWeight: "600",
  cursor: "pointer", transition: "all 0.3s",
  boxShadow: `0 4px 15px ${color}44`
});

export default LandingPage;
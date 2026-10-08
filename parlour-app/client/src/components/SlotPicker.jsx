import { useState, useEffect } from "react";
import axios from "axios";

const SlotPicker = ({ date, selectedSlot, onSelectSlot, dark }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (date) fetchSlots();
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `https://parlour-backend-gvl5.onrender.com/api/appointments/available-slots?date=${date}`
      );
      setSlots(res.data.slots);
    } catch (err) { console.log(err); }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <p style={{ color: dark ? "rgba(255,255,255,0.6)" : "#888" }}>Loading slots...</p>
    </div>
  );

  return (
    <div>
      <h4 style={{ color: dark ? "white" : "#333", marginBottom: "12px" }}>⏰ Select Time Slot</h4>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "10px"
      }}>
        {slots.map(({ slot, status }) => {
          const isBooked = status === "Booked" || status === "Past";
          const isSelected = selectedSlot === slot;
          return (
            <button key={slot} disabled={isBooked} onClick={() => onSelectSlot(slot)} style={{
              padding: "10px 8px", borderRadius: "10px",
              border: isSelected ? "2px solid #ffd200" : "1px solid rgba(255,255,255,0.15)",
              background: isBooked
                ? "rgba(255,255,255,0.03)"
                : isSelected
                  ? "linear-gradient(135deg, #e91e8c, #ff6b6b)"
                  : "rgba(255,255,255,0.08)",
              color: isBooked ? "rgba(255,255,255,0.25)" : "white",
              cursor: isBooked ? "not-allowed" : "pointer",
              fontSize: "13px", fontWeight: isSelected ? "700" : "400",
              textDecoration: isBooked ? "line-through" : "none",
              transition: "all 0.2s",
              boxShadow: isSelected ? "0 5px 20px rgba(233,30,140,0.4)" : "none"
            }}>
              {slot}
              {
              isBooked && (
                <span style={{ display: "block", fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
                  {status === "Past" ? "Time Over" : "Booked"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SlotPicker;
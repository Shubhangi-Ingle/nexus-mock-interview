import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

const IconChevron = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
  </svg>
);
const IconShieldUser = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
  </svg>
);
const IconHistory = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
  </svg>
);
const IconLogout = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5M21 12H9" />
  </svg>
);

function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <div
      className="sticky top-0 z-20 w-full h-16 bg-white border-b border-brand-orange/60 px-6 flex items-center justify-between overflow-visible"
      style={{ boxShadow: "0 4px 16px -8px rgba(15,27,76,0.12)" }}
    >
      <img src={logo} alt="Nexus Corporate Training Center" className="h-16 w-auto shrink-0" />

      {user && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 active:scale-[0.98] transition"
          >
            <span className="w-8 h-8 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center ring-2 ring-transparent hover:ring-navy/15 transition">
              {initials}
            </span>
            <span className="text-sm font-semibold text-navy">{user.name}</span>
            <IconChevron
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] bg-white border border-gray-100 rounded-xl min-w-[220px] overflow-hidden animate-dropdown-in"
              style={{ boxShadow: "0 16px 32px -12px rgba(15,27,76,0.22), 0 4px 10px -4px rgba(15,27,76,0.08)" }}
            >
              <div className="px-3.5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-navy truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              {user.role === "admin" && (
                <button
                  onClick={() => navigate("/admin")}
                  className="w-full flex items-center gap-2.5 text-left px-3.5 py-3 text-sm font-semibold text-navy hover:bg-navy-light transition border-b border-gray-100"
                >
                  <IconShieldUser className="w-4 h-4 shrink-0" />
                  Admin Panel
                </button>
              )}
              {user.role !== "admin" && (
                <button
                  onClick={() => navigate("/history")}
                  className="w-full flex items-center gap-2.5 text-left px-3.5 py-3 text-sm font-semibold text-navy hover:bg-navy-light transition border-b border-gray-100"
                >
                  <IconHistory className="w-4 h-4 shrink-0" />
                  History
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 text-left px-3.5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
              >
                <IconLogout className="w-4 h-4 shrink-0" />
                Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Navbar;
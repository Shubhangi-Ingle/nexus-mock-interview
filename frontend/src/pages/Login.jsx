import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [successMsg] = useState(location.state?.message || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-light via-white to-orange-light px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-xl shadow-navy/5 p-8"
      >
        <img src={logo} alt="Nexus Corporate Training Center" className="h-20 w-auto mx-auto -mb-2" />

        <h2 className="text-2xl font-bold text-navy tracking-tight text-center">Welcome back</h2>
        <p className="text-sm text-gray-500 mt-1 mb-6 text-center">Log in to your account</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2 mb-3">
            {successMsg}
          </div>
        )}

        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mt-3 mb-1.5">
          Username
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          autoComplete="username"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition focus:border-navy focus:ring-4 focus:ring-navy/10"
        />

        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            className="w-full px-3.5 py-2.5 pr-16 border border-gray-300 rounded-lg text-sm outline-none transition focus:border-navy focus:ring-4 focus:ring-navy/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 hover:text-navy px-2 py-1 rounded-md hover:bg-navy-light transition"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-navy font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await signup(name, email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed. Please try again.");
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

        <h2 className="text-2xl font-bold text-navy tracking-tight text-center">Create account</h2>
        <p className="text-sm text-gray-500 mt-1 mb-6 text-center">Sign up to get started</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mt-3 mb-1.5">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          autoComplete="name"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition focus:border-navy focus:ring-4 focus:ring-navy/10"
        />

        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">
          Email
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
            placeholder="Create a password"
            autoComplete="new-password"
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

        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mt-4 mb-1.5">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm outline-none transition focus:border-navy focus:ring-4 focus:ring-navy/10"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-navy font-semibold hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;
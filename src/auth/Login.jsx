// src/auth/Login.jsx
import { useState } from "react";
import { post } from "./api";
import { useAuth } from "./AuthProvider";
import validator from "validator";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!email.trim()) return setMsg("Email is required");
    if (!validator.isEmail(email)) return setMsg("Invalid email format");
    if (!password) return setMsg("Password is required");

    try {
      const data = await post("/login", { email: email.trim(), password });

      if (data.error) return setMsg(data.error);
      if (!data.token) return setMsg("Login failed: No token received");

      login(email.trim(), data.token);
      setMsg("Logged in successfully!");
    } catch (error) {
      setMsg("Login failed: " + error.message);
    }
  }

  return (
    <div style={{ maxWidth: 300 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          required
        /><br/>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ paddingRight: 40 }}
          />
          <IconButton
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
          >
            {showPassword ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </div>
        <br/>
        <button type="submit">Login</button>
      </form>
      <div>{msg}</div>
    </div>
  );
}

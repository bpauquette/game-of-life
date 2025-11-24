// src/auth/Login.jsx
import { useState } from "react";
import { post } from "./api";
import { useAuth } from "./AuthProvider";
import validator from "validator";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PropTypes from 'prop-types';

export default function Login({ onSuccess, onError, showRegisterLink = true }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!email.trim()) {
      const error = "Email is required";
      setMsg(error);
      onError?.(error, email.trim());
      return;
    }
    if (!validator.isEmail(email)) {
      const error = "Invalid email format";
      setMsg(error);
      onError?.(error, email.trim());
      return;
    }
    if (!password) {
      const error = "Password is required";
      setMsg(error);
      onError?.(error, email.trim());
      return;
    }

    try {
      const data = await post("/login", { email: email.trim(), password });

      if (data.error) {
        setMsg(data.error);
        onError?.(data.error, email.trim());
        return;
      }
      if (!data.token) {
        const error = "Login failed: No token received";
        setMsg(error);
        onError?.(error, email.trim());
        return;
      }

      login(email.trim(), data.token);
      onSuccess?.();
    } catch (error) {
      const errorMsg = "Login failed: " + error.message;
      setMsg(errorMsg);
      onError?.(errorMsg, email.trim());
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

Login.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  showRegisterLink: PropTypes.bool,
};

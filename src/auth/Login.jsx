// src/auth/Login.jsx
import React, { useState } from "react";
import { post } from "./api.js";
import { useAuth } from "./AuthProvider.js";
import validator from "validator";
import ResetRequest from './ResetRequest.jsx';
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PropTypes from 'prop-types';

export default function Login({ onSuccess, onError, initialEmail = '' }) {
  const { login } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorId] = useState(() => `login-error-${Math.random().toString(36).slice(2)}`);

  // Keep email input in sync if caller provides a new initial value (e.g., from cached last email)
  React.useEffect(() => {
    if (initialEmail && initialEmail !== email) {
      setEmail(initialEmail);
    }
  }, [initialEmail, email]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (submitting) return;

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
    finally {
      setSubmitting(false);
    }
  }

  if (showResetRequest) {
    return (
      <div style={{ maxWidth: 300 }}>
        <ResetRequest />
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowResetRequest(false)}>Back to login</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 300 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} aria-busy={submitting} noValidate>
        <label htmlFor="login-email">Email</label><br/>
        <input
          id="login-email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
          disabled={submitting}
        /><br/>
        <label htmlFor="login-password">Password</label><br/>
        <div style={{ position: 'relative' }}>
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={submitting}
            style={{ paddingRight: 40 }}
          />
          <IconButton
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
            aria-label={showPassword ? "Hide password" : "Show password"}
            type="button"
            tabIndex={-1}
          >
            {showPassword ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </div>
        <br/>
        <button type="submit" disabled={submitting} aria-describedby={msg ? errorId : undefined}>Login</button>
      </form>
      <div style={{ marginTop: 8 }} aria-live="polite" id={errorId}>{msg}</div>
      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={() => setShowResetRequest(true)}
          style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', padding: 0 }}
          disabled={submitting}
        >
          Forgot password?
        </button>
      </div>
    </div>
  );
}

Login.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  showRegisterLink: PropTypes.bool,
  initialEmail: PropTypes.string,
};

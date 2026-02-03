// src/auth/Register.jsx
import React from 'react';
import { useState } from "react";
import { post } from "./api.js";
import { useAuth } from "./AuthProvider.js";
import validator from "validator";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PropTypes from 'prop-types';

export default function Register({ onSuccess, onError, onSwitchToLogin }) {
  // showLoginLink is unused, so remove from props
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [msg, setMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorId] = useState(() => `register-error-${Math.random().toString(36).slice(2)}`);

  function validatePassword(pw) {
    if (pw.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter.";
    if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter.";
    if (!/[0-9]/.test(pw)) return "Password must contain a digit.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return "Password must contain a special character.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (submitting) return;
    setSubmitting(true);

    if (!firstName.trim()) {
      const error = "First name is required";
      setMsg(error);
      onError?.(error);
      return;
    }
    if (!lastName.trim()) {
      const error = "Last name is required";
      setMsg(error);
      onError?.(error);
      return;
    }
    if (!email.trim()) {
      const error = "Email is required";
      setMsg(error);
      onError?.(error);
      return;
    }
    if (!validator.isEmail(email.trim())) {
      const error = "Invalid email format";
      setMsg(error);
      onError?.(error);
      return;
    }
    if (!password) {
      const error = "Password is required";
      setMsg(error);
      onError?.(error);
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      setMsg(pwError);
      onError?.(pwError);
      return;
    }

    try {
      const data = await post("/register", {
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        aboutMe: aboutMe.trim()
      });

      if (data.error) {
        setMsg(data.error);
        onError?.(data.error);
        return;
      }

      // If server returns a token (legacy behavior), use it.
      if (data.token) {
        login(email.trim(), data.token);
        onSuccess?.();
        return;
      }

      // New behavior: server returns success without token. Attempt to log in
      // automatically using the provided credentials. If that fails, show a
      // clear message and switch to the login view so the user can sign in.
      if (data.ok) {
        try {
          const loginResp = await post('/login', { email: email.trim(), password });
          if (loginResp && loginResp.token) {
            login(email.trim(), loginResp.token);
            onSuccess?.();
            return;
          }
        } catch (loginErr) {
          // Fall through to show success message below
        }

        const successMsg = 'Registration successful — please log in.';
        setMsg(successMsg);
        onSuccess?.();
        // If caller provided a switch callback, open the login view
        if (typeof onSwitchToLogin === 'function') onSwitchToLogin();
        return;
      }

      const error = 'Registration failed: unexpected server response';
      setMsg(error);
      onError?.(error);
    } catch (error) {
        const status = error && error.status ? error.status : null;
        const serverMessage = error && error.message ? error.message : String(error);
        const errorMsg = 'Registration failed: ' + serverMessage;
        setMsg(errorMsg);
        onError?.(errorMsg);
        // If account already exists, surface the login view so the user can sign in
        if (status === 409 && typeof onSwitchToLogin === 'function') {
          // small delay so message renders in modal before switching
          try {
            onSwitchToLogin();
          } catch (e) {
            // ignore
          }
        }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 300 }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit} aria-busy={submitting} noValidate>
        <label htmlFor="register-first-name">First Name (required)</label><br/>
        <input
          id="register-first-name"
          name="firstName"
          placeholder="First Name (required)"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required
          autoComplete="given-name"
          disabled={submitting}
        /><br/>
        <label htmlFor="register-last-name">Last Name (required)</label><br/>
        <input
          id="register-last-name"
          name="lastName"
          placeholder="Last Name (required)"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          required
          autoComplete="family-name"
          disabled={submitting}
        /><br/>
        <label htmlFor="register-about-me">About Me (optional)</label><br/>
        <input
          id="register-about-me"
          name="aboutMe"
          placeholder="About Me (optional)"
          value={aboutMe}
          onChange={e => setAboutMe(e.target.value)}
          autoComplete="off"
          disabled={submitting}
        /><br/>
        <label htmlFor="register-email">Email (required)</label><br/>
        <input
          id="register-email"
          name="email"
          placeholder="Email (required)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          type="email"
          autoComplete="email"
          disabled={submitting}
        /><br/>
        <div style={{ position: 'relative' }}>
          <label className="sr-only" htmlFor="register-password">Password (required)</label>
          <input
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password (required)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ paddingRight: 40 }}
            autoComplete="new-password"
            disabled={submitting}
          />
          <IconButton
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
            type="button"
          >
            {showPassword ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </div><br/>
        <button type="submit" disabled={submitting} aria-describedby={msg ? errorId : undefined}>Register</button>
      </form>
      <div aria-live="polite" id={errorId}>{msg}</div>
    </div>
  );
}

Register.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  showLoginLink: PropTypes.bool,
  onSwitchToLogin: PropTypes.func,
};

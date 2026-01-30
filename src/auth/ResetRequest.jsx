// src/auth/ResetRequest.jsx
import React from 'react';
import { useState } from "react";
import { post } from "./api.js";
import validator from "validator";

export default function ResetRequest() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!email.trim()) return setMsg("Email is required");
    if (!validator.isEmail(email.trim())) return setMsg("Invalid email format");

    try {
      const data = await post("/reset/request", { email: email.trim() });

      if (data.error) return setMsg(data.error);

      setMsg("If that email exists, you will receive a reset link.");
    } catch (error) {
      setMsg("Request failed: " + error.message);
    }
  }

  return (
    <div style={{ maxWidth: 300 }}>
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          type="email"
          required
        /><br/>
        <button type="submit">Send Reset Link</button>
      </form>
      <div>{msg}</div>
    </div>
  );
}

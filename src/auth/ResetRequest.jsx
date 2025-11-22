// src/auth/ResetRequest.jsx
import { useState } from "react";
import { post } from "./api";

export default function ResetRequest() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const data = await post("/reset/request", { email });

    if (data.error) return setMsg(data.error);

    setMsg("If that email exists, you will receive a reset link.");
  }

  return (
    <div style={{ maxWidth: 300 }}>
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        /><br/>
        <button type="submit">Send Reset Link</button>
      </form>
      <div>{msg}</div>
    </div>
  );
}

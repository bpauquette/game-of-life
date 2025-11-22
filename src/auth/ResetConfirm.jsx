// src/auth/ResetConfirm.jsx
import { useState } from "react";
import { post } from "./api";

export default function ResetConfirm({ token }) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const data = await post(`/reset/confirm/${token}`, { password });

    if (data.error) return setMsg(data.error);
    setMsg("Password reset successful!");
  }

  return (
    <div style={{ maxWidth: 300 }}>
      <h2>Set New Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        /><br/>
        <button type="submit">Reset Password</button>
      </form>
      <div>{msg}</div>
    </div>
  );
}

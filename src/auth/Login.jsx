// src/auth/Login.jsx
import { useState } from "react";
import { post } from "./api";
import { useAuth } from "./AuthProvider";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const data = await post("/login", { email, password });

    if (data.error) return setMsg(data.error);
    if (!data.token) return setMsg("Unexpected error");

    login(email, data.token);
    setMsg("Logged in!");
  }

  return (
    <div style={{ maxWidth: 300 }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        /><br/>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        /><br/>
        <button type="submit">Login</button>
      </form>
      <div>{msg}</div>
    </div>
  );
}

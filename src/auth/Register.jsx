// src/auth/Register.jsx
import { useState } from "react";
import { post } from "./api";
import { useAuth } from "./AuthProvider";

export default function Register() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const data = await post("/register", { email, password });

    if (data.error) return setMsg(data.error);
    if (!data.token) return setMsg("Unexpected error");

    login(email, data.token);
    setMsg("Registration successful!");
  }

  return (
    <div style={{ maxWidth: 300 }}>
      <h2>Register</h2>
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
        <button type="submit">Register</button>
      </form>
      <div>{msg}</div>
    </div>
  );
}

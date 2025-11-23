// src/auth/Register.jsx
import { useState } from "react";
import { post } from "./api";
import { useAuth } from "./AuthProvider";

export default function Register() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [msg, setMsg] = useState("");

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
    if (!firstName.trim()) return setMsg("First name is required");
    if (!lastName.trim()) return setMsg("Last name is required");
    if (!email.trim()) return setMsg("Email is required");
    if (!password) return setMsg("Password is required");
    const pwError = validatePassword(password);
    if (pwError) return setMsg(pwError);
    const data = await post("/register", { email, password, firstName, lastName, aboutMe });

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
          placeholder="First Name (required)"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required
        /><br/>
        <input
          placeholder="Last Name (required)"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          required
        /><br/>
        <input
          placeholder="About Me (optional)"
          value={aboutMe}
          onChange={e => setAboutMe(e.target.value)}
        /><br/>
        <input
          placeholder="Email (required)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        /><br/>
        <input
          type="password"
          placeholder="Password (required)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        /><br/>
        <button type="submit">Register</button>
      </form>
      <div>{msg}</div>
    </div>
  );
}

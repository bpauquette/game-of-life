import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import Database from "better-sqlite3";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

// --- CONFIG -------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || "replace_this_with_strong_secret";
const RESET_TOKEN_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

// Email config — using Gmail SMTP (cheapest free option)
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS
	}
});

// --- DB SETUP -----------------------------------------------------

const db = new Database("auth.db");
db.prepare(`CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	email TEXT UNIQUE NOT NULL,
	hashed_password TEXT NOT NULL,
	reset_token TEXT,
	reset_token_expiry INTEGER,
	login_count INTEGER DEFAULT 0,
	last_login TEXT
)`).run();

// --- ROUTER SETUP -------------------------------------------------
const router = express.Router();
router.use(express.json());

// --- HELPERS -------------------------------------------------------
function issueJWT(user) {
	return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
		expiresIn: "7d"
	});
}

// --- REGISTER ------------------------------------------------------
router.post("/register", (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) return res.status(400).json({ error: "Missing fields" });

	const userId = uuidv4();

	bcrypt.hash(password, 12).then(hashed => {
		try {
			db.prepare(`INSERT INTO users (id, email, hashed_password) VALUES (?, ?, ?)`)
				.run(userId, email, hashed);
			const token = issueJWT({ id: userId, email });
			res.json({ token });
		} catch (err) {
			return res.status(400).json({ error: "Email already in use" });
		}
	});
});

// --- LOGIN ---------------------------------------------------------
router.post("/login", (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) return res.status(400).json({ error: "Missing fields" });

	const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
	if (!user) return res.status(401).json({ error: "Invalid login" });
	bcrypt.compare(password, user.hashed_password).then(match => {
		if (!match) return res.status(401).json({ error: "Invalid login" });
		// Update login_count and last_login
		const nowIso = new Date().toISOString();
		db.prepare(`UPDATE users SET login_count = COALESCE(login_count,0) + 1, last_login = ? WHERE id = ?`).run(nowIso, user.id);
		// Get updated user for JWT
		const updatedUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id);
		const token = issueJWT(updatedUser);
		res.json({ token });
	});
});

// --- REQUEST PASSWORD RESET ----------------------------------------
router.post("/reset/request", (req, res) => {
	const { email } = req.body;
	if (!email) return res.status(400).json({ error: "Missing email" });

	const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
	if (!user) return res.status(200).json({ ok: true }); // Don't reveal existence
	const token = crypto.randomBytes(32).toString("hex");
	const expiry = Date.now() + RESET_TOKEN_EXPIRY_MS;
	db.prepare(`UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?`)
		.run(token, expiry, user.id);
	const resetURL = `http://localhost:3000/reset/${token}`;
	transporter.sendMail({
		to: email,
		subject: "Password Reset",
		text: `Click to reset your password: ${resetURL}`
	});
	res.json({ ok: true });
});

// --- CONFIRM PASSWORD RESET ----------------------------------------
router.post("/reset/confirm/:token", (req, res) => {
	const token = req.params.token;
	const { password } = req.body;

	if (!password) return res.status(400).json({ error: "Missing password" });

	const user = db.prepare(`SELECT * FROM users WHERE reset_token = ?`).get(token);
	if (!user) return res.status(400).json({ error: "Invalid token" });
	if (Date.now() > user.reset_token_expiry)
		return res.status(400).json({ error: "Expired token" });
	bcrypt.hash(password, 12).then(hashed => {
		db.prepare(`UPDATE users SET hashed_password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?`)
			.run(hashed, user.id);
		res.json({ ok: true });
	});
});

// --- EXPORT ROUTER --------------------------------------------------
export default router;

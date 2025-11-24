import express from "express";
import logger from '../logger.js';
import bcrypt from "bcrypt";
import crypto from "crypto";
import Database from "better-sqlite3";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import Joi from "joi";

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
	first_name TEXT,
	last_name TEXT,
	about_me TEXT,
	reset_token TEXT,
	reset_token_expiry INTEGER,
	login_count INTEGER DEFAULT 0,
	last_login TEXT
)`).run();

// Create system user for existing shapes
const SYSTEM_USER_ID = 'system-user';
const systemUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(SYSTEM_USER_ID);
if (!systemUser) {
  // Create a dummy hashed password for system user (never used for login)
  const dummyPassword = await bcrypt.hash('system-password-not-used', 10);
  db.prepare(`INSERT INTO users (id, email, hashed_password, first_name, last_name, about_me) VALUES (?, ?, ?, ?, ?, ?)`).run(
    SYSTEM_USER_ID,
    'system@gameoflife.com',
    dummyPassword,
    'System',
    'User',
    'Built-in shapes and patterns'
  );
  logger.info('Created system user for existing shapes');
}

// Close DB on exit
process.on('exit', () => db.close());
process.on('SIGINT', () => { db.close(); process.exit(); });
process.on('SIGTERM', () => { db.close(); process.exit(); });

// --- ROUTER SETUP -------------------------------------------------
const router = express.Router();
router.use(express.json());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5, // Limit each IP to 5 requests per windowMs
	message: { error: "Too many requests, please try again later." },
	standardHeaders: true,
	legacyHeaders: false,
});

// --- HELPERS -------------------------------------------------------
function issueJWT(user) {
	return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
		expiresIn: "7d"
	});
}

// Password complexity check
function passwordComplexity(pw) {
	if (typeof pw !== 'string' || pw.length < 8) return false;
	if (!/[A-Z]/.test(pw)) return false;
	if (!/[a-z]/.test(pw)) return false;
	if (!/[0-9]/.test(pw)) return false;
	if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return false;
	return true;
}

// Validation schemas
const registerSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().min(8).required(),
	firstName: Joi.string().optional(),
	lastName: Joi.string().optional(),
	aboutMe: Joi.string().optional(),
});

const loginSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().required(),
});

// --- REGISTER ------------------------------------------------------
router.post("/register", authLimiter, (req, res) => {
	logger.info('[REGISTER] Route handler entered');
	try {
		// Validate input
		const { error, value } = registerSchema.validate(req.body);
		if (error) {
			logger.error('[REGISTER] Validation error:', error.details[0].message);
			return res.status(400).json({ error: error.details[0].message });
		}

		const { email, password, firstName, lastName, aboutMe } = value;
		const first_name = firstName || '';
		const last_name = lastName || '';
		const about_me = aboutMe || '';

		logger.info('[REGISTER] Request:', { email, first_name, last_name });

		if (!passwordComplexity(password)) {
			logger.error('[REGISTER] Password complexity failed');
			return res.status(400).json({ error: "Password does not meet complexity requirements" });
		}

		// Check if user exists
		let existing;
		try {
			existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
			logger.info('[REGISTER] Existing user:', !!existing);
		} catch (dbErr) {
			logger.error('[REGISTER] DB error on select', dbErr);
			return res.status(500).json({ error: "Database error" });
		}
		bcrypt.hash(password, 12).then(hashed => {
			try {
				if (existing) {
					db.prepare(`UPDATE users SET hashed_password = ?, first_name = ?, last_name = ?, about_me = ? WHERE id = ?`)
						.run(hashed, first_name, last_name, about_me, existing.id);
					const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
					logger.info('[REGISTER] Updated user');
					const token = issueJWT({ id: updated.id, email: updated.email });
					res.json({ token });
				} else {
					const userId = uuidv4();
					db.prepare(`INSERT INTO users (id, email, hashed_password, first_name, last_name, about_me) VALUES (?, ?, ?, ?, ?, ?)`)
						.run(userId, email, hashed, first_name, last_name, about_me);
					const created = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
					logger.info('[REGISTER] Created user');
					const token = issueJWT({ id: created.id, email: created.email });
					res.json({ token });
				}
			} catch (err) {
				logger.error('[REGISTER] Registration error:', err);
				return res.status(500).json({ error: "Registration failed" });
			}
		}).catch(hashErr => {
			logger.error('[REGISTER] Hashing error:', hashErr);
			return res.status(500).json({ error: "Password hashing failed" });
		});
	} catch (outerErr) {
		logger.error('[REGISTER] Outer error:', outerErr);
		return res.status(500).json({ error: "Unexpected error" });
	}
});

// --- LOGIN ---------------------------------------------------------
router.post("/login", authLimiter, (req, res) => {
	try {
		// Validate input
		const { error, value } = loginSchema.validate(req.body);
		if (error) {
			logger.error('[LOGIN] Validation error:', error.details[0].message);
			return res.status(400).json({ error: error.details[0].message });
		}

		const { email, password } = value;

		const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
		if (!user) {
			logger.warn('[LOGIN] Invalid email:', email);
			return res.status(401).json({ error: "Invalid login" });
		}
		bcrypt.compare(password, user.hashed_password).then(match => {
			if (!match) {
				logger.warn('[LOGIN] Invalid password for:', email);
				return res.status(401).json({ error: "Invalid login" });
			}
			// Update login_count and last_login
			const nowIso = new Date().toISOString();
			db.prepare(`UPDATE users SET login_count = COALESCE(login_count,0) + 1, last_login = ? WHERE id = ?`).run(nowIso, user.id);
			// Get updated user for JWT
			const updatedUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id);
			const token = issueJWT(updatedUser);
			logger.info('[LOGIN] Successful login for:', email);
			res.json({ token });
		}).catch(compareErr => {
			logger.error('[LOGIN] Bcrypt error:', compareErr);
			return res.status(500).json({ error: "Login failed" });
		});
	} catch (outerErr) {
		logger.error('[LOGIN] Outer error:', outerErr);
		return res.status(500).json({ error: "Unexpected error" });
	}
});

// --- LOGOUT --------------------------------------------------------
router.post("/logout", (req, res) => {
	// Since JWT is stateless, logout is client-side, but we can log it
	logger.info('[LOGOUT] Logout requested');
	res.json({ ok: true });
});

// --- REQUEST PASSWORD RESET ----------------------------------------
router.post("/reset/request", authLimiter, (req, res) => {
	try {
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
	} catch (err) {
		logger.error('[RESET REQUEST] Error:', err);
		return res.status(500).json({ error: "Reset request failed" });
	}
});

// --- CONFIRM PASSWORD RESET ----------------------------------------
router.post("/reset/confirm/:token", (req, res) => {
	try {
		const token = req.params.token;
		const { password } = req.body;

		if (!password) return res.status(400).json({ error: "Missing password" });
		if (!passwordComplexity(password)) return res.status(400).json({ error: "Password does not meet complexity requirements" });

		const user = db.prepare(`SELECT * FROM users WHERE reset_token = ?`).get(token);
		if (!user) return res.status(400).json({ error: "Invalid token" });
		if (Date.now() > user.reset_token_expiry)
			return res.status(400).json({ error: "Expired token" });
		bcrypt.hash(password, 12).then(hashed => {
			db.prepare(`UPDATE users SET hashed_password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?`)
				.run(hashed, user.id);
			res.json({ ok: true });
		});
	} catch (err) {
		logger.error('[RESET CONFIRM] Error:', err);
		return res.status(500).json({ error: "Reset confirm failed" });
	}
});

// --- CHECK EMAIL EXISTS ---------------------------------------------
router.post("/check-email", authLimiter, (req, res) => {
	try {
		const { email } = req.body;
		if (!email || !email.trim()) {
			return res.status(400).json({ error: "Email is required" });
		}

		const user = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.trim());
		res.json({ exists: !!user });
	} catch (err) {
		logger.error('[CHECK EMAIL] Error:', err);
		return res.status(500).json({ error: "Check email failed" });
	}
});

// --- EXPORT ROUTER --------------------------------------------------
export default router;
export { SYSTEM_USER_ID };

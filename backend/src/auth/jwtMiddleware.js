import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "replace_this_with_strong_secret";

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing auth token' });

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

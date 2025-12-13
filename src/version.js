// This file is auto-generated at build time.
// Do not edit manually.
export const FRONTEND_VERSION = '0.1.0';
// Format: YYYY-MM-DD HH:mm:ss EST (24-hour)
const pad = n => n.toString().padStart(2, '0');
const now = new Date();
const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
export const FRONTEND_TIMESTAMP = `${est.getFullYear()}-${pad(est.getMonth()+1)}-${pad(est.getDate())}T${pad(est.getHours())}:${pad(est.getMinutes())}:${pad(est.getSeconds())} EST`;

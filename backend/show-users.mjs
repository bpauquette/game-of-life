import Database from 'better-sqlite3';
const db = new Database('auth.db');
const users = db.prepare('SELECT * FROM users').all();
for (const user of users) {
	console.log(user);
}
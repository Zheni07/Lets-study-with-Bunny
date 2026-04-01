/**
 * Reset admin password to Admin123!
 * Run: node reset-admin-password.js
 */
require("dotenv").config();
const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");

const dbPath = path.resolve(__dirname, "data", process.env.DB_PATH?.replace("./data/", "") || "app.db");
const db = new Database(dbPath);

const newPassword = "Admin123!";
const hash = bcrypt.hashSync(newPassword, 10);

const res = db.prepare(
  "UPDATE users SET password = ? WHERE email = 'dislexia.bunny@gmail.com' AND role = 'admin'"
).run(hash);

db.close();

if (res.changes > 0) {
  console.log("✓ Admin password reset to: Admin123!");
} else {
  console.log("✗ No admin user found with dislexia.bunny@gmail.com. Run the backend once to seed the database.");
}

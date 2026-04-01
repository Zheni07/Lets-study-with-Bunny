/**
 * Deletes a legacy placeholder admin account from DB.
 *
 * Set `LEGACY_ADMIN_EMAIL` to the email you want to delete.
 * Run: node delete-admin-example.js
 */
require("dotenv").config();

const path = require("path");
const Database = require("better-sqlite3");

const emailToDelete = process.env.LEGACY_ADMIN_EMAIL || "";
if (!emailToDelete) {
  console.log(
    "No LEGACY_ADMIN_EMAIL provided. Nothing to delete (DB already cleaned if you followed the steps)."
  );
  process.exit(0);
}

const dbPath = path.resolve(
  __dirname,
  "data",
  process.env.DB_PATH?.replace("./data/", "") || "app.db"
);

try {
  const db = new Database(dbPath);

  const before = db.prepare("SELECT COUNT(1) AS count FROM users WHERE email = ?").get(emailToDelete).count;
  console.log(`Before delete: users with email=${emailToDelete}: ${before}`);

  const user = db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(emailToDelete);
  if (user?.id) {
    // Prevent FK constraint failures by detaching references.
    // articles.createdBy is a FK without ON DELETE, so we null it first.
    const affectedArticles = db
      .prepare("SELECT COUNT(1) AS count FROM articles WHERE createdBy = ?")
      .get(user.id).count;

    if (affectedArticles > 0) {
      console.log(`Detaching ${affectedArticles} article(s) referencing this admin...`);
      db.prepare("UPDATE articles SET createdBy = NULL WHERE createdBy = ?").run(user.id);
    }
  }

  const res = db.prepare("DELETE FROM users WHERE email = ?").run(emailToDelete);
  console.log(`Deleted rows: ${res.changes}`);

  const after = db.prepare("SELECT COUNT(1) AS count FROM users WHERE email = ?").get(emailToDelete).count;
  console.log(`After delete: users with email=${emailToDelete}: ${after}`);

  db.close();
} catch (err) {
  console.error("Failed to delete legacy admin from DB.");
  console.error("Error:", err.message);
  console.error("Hint: make sure the backend has been started at least once to initialize the DB schema.");
}


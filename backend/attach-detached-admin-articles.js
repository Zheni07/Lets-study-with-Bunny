/**
 * Re-attaches previously detached articles to the real admin user.
 *
 * It updates: articles.createdBy = adminId
 * where: articles.createdBy IS NULL
 *
 * Run: node attach-detached-admin-articles.js
 */
require("dotenv").config({ path: "./.env" });

const path = require("path");
const Database = require("better-sqlite3");

const ADMIN_EMAIL = "dislexia.bunny@gmail.com";

const dbPath = path.resolve(
  __dirname,
  "data",
  process.env.DB_PATH?.replace("./data/", "") || "app.db"
);

const db = new Database(dbPath);

try {
  const admin = db
    .prepare("SELECT id, email, role FROM users WHERE email = ? LIMIT 1")
    .get(ADMIN_EMAIL);

  if (!admin) {
    throw new Error(`Admin not found in DB: ${ADMIN_EMAIL}`);
  }
  if (admin.role !== "admin") {
    throw new Error(`Admin user is not role=admin for: ${ADMIN_EMAIL}`);
  }

  const nullCount = db
    .prepare("SELECT COUNT(1) AS count FROM articles WHERE createdBy IS NULL")
    .get().count;

  console.log(`Articles with createdBy IS NULL (before): ${nullCount}`);
  if (nullCount === 0) {
    console.log("Nothing to attach.");
    db.close();
    process.exit(0);
  }

  const res = db
    .prepare("UPDATE articles SET createdBy = ? WHERE createdBy IS NULL")
    .run(admin.id);

  const afterNullCount = db
    .prepare("SELECT COUNT(1) AS count FROM articles WHERE createdBy IS NULL")
    .get().count;

  console.log(`Updated rows: ${res.changes}`);
  console.log(`Articles with createdBy IS NULL (after): ${afterNullCount}`);
} catch (err) {
  console.error("Failed to attach detached articles:", err.message);
  process.exitCode = 1;
} finally {
  db.close();
}


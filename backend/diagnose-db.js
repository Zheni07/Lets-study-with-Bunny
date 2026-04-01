// Diagnostic script to check database issues
// Run: node diagnose-db.js

require("dotenv").config({ path: "./.env" });

const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const { env } = require("./src/config/env");
const { initDb, query, queryOne, exec, closeDb } = require("./src/db/db");

async function main() {
  console.log("🔍 Diagnosing Database Issues...\n");
  console.log(`DB_KIND=${env.DB_KIND}`);

  if (env.DB_KIND !== "postgres") {
    console.log("\n1. Checking SQLite database file...");
    const dbPath = path.join(__dirname, "data", "app.db");
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log(`   ✓ Database file exists: ${dbPath}`);
      console.log(`   ✓ File size: ${(stats.size / 1024).toFixed(2)} KB`);
    } else {
      console.log(`   ✗ Database file NOT found: ${dbPath}`);
      console.log("   → Database will be created on first server start");
    }
  } else {
    console.log("\n1. Postgres mode (no local DB file).");
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? "set" : "missing"}`);
  }

  console.log("\n2. Initializing DB (migrations + seed)...");
  await initDb();

  console.log("\n3. Checking tables/data...");
  const userCount = await queryOne("SELECT COUNT(*) as count FROM users", []);
  const gameCount = await queryOne("SELECT COUNT(*) as count FROM games", []);
  const articleCount = await queryOne("SELECT COUNT(*) as count FROM articles", []);
  console.log(`   Users: ${userCount?.count ?? "?"}`);
  console.log(`   Games: ${gameCount?.count ?? "?"}`);
  console.log(`   Articles: ${articleCount?.count ?? "?"}`);

  if (Number(userCount?.count || 0) > 0) {
    const users = await query(
      "SELECT id, username, email, role, createdAt FROM users ORDER BY createdAt DESC LIMIT 5",
      []
    );
    console.log("\n   Sample users:");
    users.forEach((u) => console.log(`      - ${u.username} (${u.email}) - ${u.role}`));
  }

  console.log("\n4. Testing insert operation...");
  const testEmail = `test_${Date.now()}@test.com`;
  const passwordHash = bcrypt.hashSync("test123", 10);
  const inserted = await exec(
    "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id",
    ["TestUser", testEmail, passwordHash, "user"]
  );
  const newId = inserted.rows?.[0]?.id;
  if (!newId) throw new Error("Insert failed: no ID returned");
  console.log(`   ✓ Insert successful! User ID: ${newId}`);

  const saved = await queryOne("SELECT id, email FROM users WHERE id = $1", [newId]);
  if (saved?.id) console.log("   ✓ User found in database after insert");

  await exec("DELETE FROM users WHERE id = $1", [newId]);
  console.log("   ✓ Test user removed");

  console.log("\n✅ Database diagnostics complete!");
}

main()
  .catch((e) => {
    console.error("\n✗ Database error:", e.message);
    console.error("Full error:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closeDb();
    } catch (_) {
      // ignore
    }
  });

// Diagnostic script to check database issues
// Run: node diagnose-db.js

const path = require("path");
const fs = require("fs");

console.log("🔍 Diagnosing Database Issues...\n");

// Check 1: Database file exists
console.log("1. Checking database file...");
const dbPath = path.join(__dirname, "data", "app.db");
if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log(`   ✓ Database file exists: ${dbPath}`);
  console.log(`   ✓ File size: ${(stats.size / 1024).toFixed(2)} KB`);
} else {
  console.log(`   ✗ Database file NOT found: ${dbPath}`);
  console.log("   → Database will be created on first server start");
}

// Check 2: Try to require better-sqlite3
console.log("\n2. Checking better-sqlite3...");
try {
  const Database = require("better-sqlite3");
  console.log("   ✓ better-sqlite3 is installed");
} catch (error) {
  console.log("   ✗ better-sqlite3 is NOT installed");
  console.log("   → Run: npm install");
  process.exit(1);
}

// Check 3: Try to connect to database
console.log("\n3. Testing database connection...");
try {
  const { getDb, initDb } = require("./src/db/db");
  
  // Initialize if needed
  if (!fs.existsSync(dbPath)) {
    console.log("   Initializing database...");
    initDb();
  }
  
  const db = getDb();
  const test = db.prepare("SELECT 1 as test").get();
  if (test.test === 1) {
    console.log("   ✓ Database connection successful");
  }
  
  // Check tables
  console.log("\n4. Checking tables...");
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name IN ('users', 'articles', 'games')
  `).all();
  
  console.log(`   ✓ Found ${tables.length} table(s):`);
  tables.forEach(t => console.log(`      - ${t.name}`));
  
  // Check data
  console.log("\n5. Checking data...");
  try {
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const gameCount = db.prepare("SELECT COUNT(*) as count FROM games").get().count;
    const articleCount = db.prepare("SELECT COUNT(*) as count FROM articles").get().count;
    
    console.log(`   Users: ${userCount}`);
    console.log(`   Games: ${gameCount}`);
    console.log(`   Articles: ${articleCount}`);
    
    if (userCount > 0) {
      console.log("\n   Sample users:");
      const users = db.prepare("SELECT id, username, email, role FROM users LIMIT 5").all();
      users.forEach(u => {
        console.log(`      - ${u.username} (${u.email}) - ${u.role}`);
      });
    }
  } catch (err) {
    console.log("   ✗ Error reading data:", err.message);
  }
  
  // Test insert
  console.log("\n6. Testing insert operation...");
  try {
    const testEmail = `test_${Date.now()}@test.com`;
    const bcrypt = require("bcrypt");
    const passwordHash = bcrypt.hashSync("test123", 10);
    
    const insertResult = db.prepare(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)"
    ).run("TestUser", testEmail, passwordHash, "user");
    
    if (insertResult.lastInsertRowid) {
      console.log(`   ✓ Insert successful! User ID: ${insertResult.lastInsertRowid}`);
      
      // Verify it was saved
      const saved = db.prepare("SELECT * FROM users WHERE id = ?").get(insertResult.lastInsertRowid);
      if (saved) {
        console.log("   ✓ User found in database after insert");
      }
      
      // Clean up
      db.prepare("DELETE FROM users WHERE id = ?").run(insertResult.lastInsertRowid);
      console.log("   ✓ Test user removed");
    } else {
      console.log("   ✗ Insert failed: no ID returned");
    }
  } catch (err) {
    console.log("   ✗ Insert test failed:", err.message);
    console.log("   Error details:", err);
  }
  
  console.log("\n✅ Database diagnostics complete!");
  
} catch (error) {
  console.error("\n✗ Database error:", error.message);
  console.error("Full error:", error);
  process.exit(1);
}

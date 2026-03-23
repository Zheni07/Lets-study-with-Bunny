const { getDb } = require("../db/db");

function mapUser(row) {
  if (!row) return null;
  const { password, ...rest } = row;
  return rest;
}

function findByEmail(email) {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

function findById(id) {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

function createUser({ username, email, passwordHash, role = "user" }) {
  const db = getDb();
  
  try {
    console.log(`[createUser] Attempting to create user: ${email}`);
    
    // Prepare statement once for better performance
    const insertStmt = db.prepare(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)"
    );
    
    console.log(`[createUser] Executing INSERT for: ${username}, ${email}`);
    
    // Execute insert - better-sqlite3 auto-commits
    const res = insertStmt.run(username, email, passwordHash, role);
    
    console.log(`[createUser] Insert result:`, {
      changes: res.changes,
      lastInsertRowid: res.lastInsertRowid
    });
    
    if (!res.lastInsertRowid) {
      throw new Error("Failed to create user: no ID returned from INSERT");
    }
    
    if (res.changes !== 1) {
      throw new Error(`Failed to create user: expected 1 change, got ${res.changes}`);
    }
    
    console.log(`[createUser] User inserted with ID: ${res.lastInsertRowid}`);
    
    // Use a transaction to ensure we can read immediately after write
    const user = db.transaction(() => {
      return db.prepare("SELECT * FROM users WHERE id = ?").get(res.lastInsertRowid);
    })();
    
    if (!user) {
      // Try one more time without transaction
      const userRetry = db.prepare("SELECT * FROM users WHERE id = ?").get(res.lastInsertRowid);
      if (!userRetry) {
        throw new Error("Failed to retrieve created user immediately after insert");
      }
      console.log(`[createUser] User verified in database (retry): ${userRetry.email}`);
      return userRetry;
    }
    
    console.log(`[createUser] User verified in database: ${user.email}`);
    
    return user;
  } catch (error) {
    console.error("[createUser] Error creating user:", error.message);
    console.error("[createUser] Error code:", error.code);
    console.error("[createUser] Error stack:", error.stack);
    
    // If it's a locking error, provide helpful message
    if (error.code === 'SQLITE_BUSY' || error.message.includes('locked')) {
      const helpfulError = new Error(
        "Database is locked. Close DB Browser for SQLite and try again."
      );
      helpfulError.status = 503;
      helpfulError.expose = true;
      throw helpfulError;
    }
    
    // Handle UNIQUE constraint violation (duplicate email)
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message.includes('UNIQUE constraint')) {
      const helpfulError = new Error(
        "User with this email already exists"
      );
      helpfulError.status = 400;
      helpfulError.expose = true;
      throw helpfulError;
    }
    
    // For other database errors, expose them as 400 if they're constraint violations
    if (error.code && error.code.startsWith('SQLITE_CONSTRAINT')) {
      const helpfulError = new Error(
        "Invalid data provided. Please check your input."
      );
      helpfulError.status = 400;
      helpfulError.expose = true;
      throw helpfulError;
    }
    
    // Re-throw with status if not set
    if (!error.status) {
      error.status = 500;
    }
    error.expose = true; // Expose error message
    throw error;
  }
}

function listUsers() {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, username, email, role, createdAt FROM users ORDER BY createdAt DESC"
    )
    .all();
  return rows;
}

function deleteUser(id) {
  const db = getDb();
  return db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

function updateUserRole(id, role) {
  const db = getDb();
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  return findById(id);
}

function updateUserPassword(id, passwordHash) {
  const db = getDb();
  db.prepare("UPDATE users SET password = ? WHERE id = ?").run(passwordHash, id);
  return findById(id);
}

module.exports = {
  mapUser,
  findByEmail,
  findById,
  createUser,
  listUsers,
  deleteUser,
  updateUserRole,
  updateUserPassword,
};


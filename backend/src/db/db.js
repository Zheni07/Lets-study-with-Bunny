const path = require("path");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const { env } = require("../config/env");

let dbInstance;

function getDb() {
  if (!dbInstance) {
    const dbPath = path.resolve(path.join(__dirname, "..", "..", env.DB_PATH));
    console.log(`Database path: ${dbPath}`);
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!require("fs").existsSync(dbDir)) {
      require("fs").mkdirSync(dbDir, { recursive: true });
      console.log(`Created database directory: ${dbDir}`);
    }
    
    try {
      // Open database with write access and WAL mode for better concurrency
      dbInstance = new Database(dbPath, { 
        verbose: (sql) => {
          // Only log errors, not all queries
          if (sql.includes("ERROR") || sql.includes("FAIL")) {
            console.log("[SQL]", sql);
          }
        }
      });
      
      // Enable WAL mode for better concurrency (allows DB Browser to read while we write)
      dbInstance.pragma("journal_mode = WAL");
      
      // Enable foreign keys
      dbInstance.pragma("foreign_keys = ON");
      
      // Set busy timeout to handle locks gracefully
      dbInstance.pragma("busy_timeout = 5000");
      
      // Test write access
      try {
        const testResult = dbInstance.prepare("SELECT 1 as test").get();
        if (!testResult || testResult.test !== 1) {
          throw new Error("Database read test failed");
        }
      } catch (testError) {
        console.error("Database read test failed:", testError);
        throw testError;
      }
      
      console.log(`✓ Database connected: ${dbPath}`);
      console.log(`✓ Database is writable (WAL mode enabled)`);
    } catch (error) {
      console.error(`✗ Failed to connect to database at ${dbPath}:`, error);
      throw error;
    }
  }
  return dbInstance;
}

function migrate() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      shortDescription TEXT NOT NULL,
      content TEXT NOT NULL,
      image TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      createdBy INTEGER,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      tokenHash TEXT NOT NULL UNIQUE,
      expiresAt DATETIME NOT NULL,
      usedAt DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      previewVideoUrl TEXT NOT NULL,
      gameUrl TEXT NOT NULL
    );
  `);
}

function seed() {
  const db = getDb();

  // Seed admin user if none exists
  const adminExists = db
    .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
    .get();
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync("Admin123!", 10);
    db.prepare(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)"
    ).run("Admin", "admin@example.com", passwordHash, "admin");
  }

  // Seed games if empty
  const gamesCount = db.prepare("SELECT COUNT(1) as count FROM games").get()
    .count;
  if (gamesCount === 0) {
    const stmt = db.prepare(
      "INSERT INTO games (name, previewVideoUrl, gameUrl) VALUES (?, ?, ?)"
    );
    const seedGames = [
      {
        name: "Letter Match",
        previewVideoUrl: "https://example.com/previews/letter-match.mp4",
        gameUrl: "https://example.com/games/letter-match",
      },
      {
        name: "Word Builder",
        previewVideoUrl: "https://example.com/previews/word-builder.mp4",
        gameUrl: "https://example.com/games/word-builder",
      },
      {
        name: "Speed Reader",
        previewVideoUrl: "https://example.com/previews/speed-reader.mp4",
        gameUrl: "https://example.com/games/speed-reader",
      },
    ];
    seedGames.forEach((g) => stmt.run(g.name, g.previewVideoUrl, g.gameUrl));
  }
}

function initDb() {
  try {
    console.log("Initializing database...");
    migrate();
    console.log("✓ Database tables created/verified");
    seed();
    console.log("✓ Database seeded with initial data");
    
    // Verify database is working
    const db = getDb();
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const gameCount = db.prepare("SELECT COUNT(*) as count FROM games").get().count;
    console.log(`✓ Database ready: ${userCount} user(s), ${gameCount} game(s)`);
  } catch (error) {
    console.error("✗ Database initialization failed:", error);
    throw error;
  }
}

module.exports = {
  getDb,
  initDb,
};


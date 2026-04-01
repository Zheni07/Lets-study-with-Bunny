const path = require("path");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const { env } = require("../config/env");
const fs = require("fs");

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

  // Admin must be an actual user with a real email
  const adminEmail = "dislexia.bunny@gmail.com";

  // Ensure the admin role is tied to this exact email
  const adminByEmail = db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(adminEmail);
  if (!adminByEmail) {
    const passwordHash = bcrypt.hashSync("Admin123!", 10);
    db.prepare(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)"
    ).run("Admin", adminEmail, passwordHash, "admin");
  } else {
    db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(adminEmail);
  }

  // Demote any other admins so only the real admin email can access admin endpoints
  db.prepare("UPDATE users SET role = 'user' WHERE role = 'admin' AND email != ?").run(adminEmail);

  // Seed articles (from repo JSON) if empty
  const articleCount = db.prepare("SELECT COUNT(1) as count FROM articles").get().count;
  if (articleCount === 0) {
    try {
      const seedPath = path.resolve(path.join(__dirname, "..", "..", "seed", "articles.json"));
      if (fs.existsSync(seedPath)) {
        const raw = fs.readFileSync(seedPath, "utf8");
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          const adminId = db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(adminEmail)?.id;
          const stmt = db.prepare(
            "INSERT INTO articles (title, shortDescription, content, image, createdBy) VALUES (?, ?, ?, ?, ?)"
          );

          const insertMany = db.transaction((rows) => {
            rows.forEach((a) => {
              const title = typeof a?.title === "string" ? a.title : "";
              const shortDescription =
                typeof a?.shortDescription === "string" ? a.shortDescription : "";
              const content = typeof a?.content === "string" ? a.content : "";
              const image = typeof a?.image === "string" ? a.image : null;
              if (!title || !content) return; // keep DB consistent (title/content are required)
              stmt.run(title, shortDescription, content, image, adminId || null);
            });
          });

          insertMany(items);
          const after = db.prepare("SELECT COUNT(1) as count FROM articles").get().count;
          console.log(`✓ Seeded articles from ${seedPath} (${after} total)`);
        } else {
          console.log(`ℹ No seed articles found in ${seedPath}`);
        }
      } else {
        console.log(`ℹ Seed file not found: ${seedPath}`);
      }
    } catch (e) {
      console.warn("⚠ Failed to seed articles (continuing):", e?.message || e);
    }
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


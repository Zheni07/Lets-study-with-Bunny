const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const { Pool } = require("pg");
const { env } = require("../config/env");

let sqliteInstance;
let pgPool;

function assertPgConfigured() {
  if (!env.DATABASE_URL) {
    throw new Error(
      "Missing DATABASE_URL. Set DB_KIND=postgres and provide DATABASE_URL in backend/.env"
    );
  }
}

function getSqliteDb() {
  if (!sqliteInstance) {
    const dbPath = path.resolve(path.join(__dirname, "..", "..", env.DB_PATH));
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    sqliteInstance = new Database(dbPath);
    sqliteInstance.pragma("journal_mode = WAL");
    sqliteInstance.pragma("foreign_keys = ON");
    sqliteInstance.pragma("busy_timeout = 5000");
    console.log(`✓ SQLite connected: ${dbPath}`);
  }
  return sqliteInstance;
}

function getPgPool() {
  if (!pgPool) {
    assertPgConfigured();
    pgPool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.DATABASE_URL.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });
    console.log("✓ Postgres pool created");
  }
  return pgPool;
}

function expandSqliteParams(sql, params = []) {
  // Convert $1, $2... to ? and expand params in appearance order.
  const outParams = [];
  const outSql = sql.replace(/\$(\d+)/g, (_m, nStr) => {
    const idx = Number(nStr) - 1;
    outParams.push(params[idx]);
    return "?";
  });
  return { sql: outSql, params: outParams };
}

async function query(sql, params = []) {
  if (env.DB_KIND === "postgres") {
    const pool = getPgPool();
    const res = await pool.query(sql, params);
    return res.rows;
  }
  const db = getSqliteDb();
  const norm = expandSqliteParams(sql, params);
  return db.prepare(norm.sql).all(norm.params);
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0];
}

async function exec(sql, params = []) {
  if (env.DB_KIND === "postgres") {
    const pool = getPgPool();
    const res = await pool.query(sql, params);
    return { rowCount: res.rowCount, rows: res.rows };
  }
  const db = getSqliteDb();
  const norm = expandSqliteParams(sql, params);
  const stmt = db.prepare(norm.sql);
  const isReturning = /\breturning\b/i.test(sql);
  if (isReturning) {
    // SQLite supports RETURNING since 3.35, better-sqlite3 supports it.
    const row = stmt.get(norm.params);
    return { rowCount: row ? 1 : 0, rows: row ? [row] : [] };
  }
  const res = stmt.run(norm.params);
  return { rowCount: res.changes, lastInsertId: res.lastInsertRowid };
}

async function migratePostgres() {
  const pool = getPgPool();
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`
  );

  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const already = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE id = $1 LIMIT 1",
      [file]
    );
    if (already.rowCount > 0) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.log(`✓ Applied migration: ${file}`);
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }
  }
}

async function migrateSqlite() {
  const db = getSqliteDb();
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

async function seedCommon() {
  const adminEmail = "dislexia.bunny@gmail.com";
  const passwordHash = bcrypt.hashSync("Admin123!", 10);

  // Ensure admin exists and is admin
  const admin = await queryOne("SELECT id, email, role FROM users WHERE email = $1 LIMIT 1", [
    adminEmail,
  ]);
  if (!admin) {
    await exec(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)",
      ["Admin", adminEmail, passwordHash, "admin"]
    );
  } else {
    await exec("UPDATE users SET role = 'admin' WHERE email = $1", [adminEmail]);
  }
  await exec("UPDATE users SET role = 'user' WHERE role = 'admin' AND email != $1", [
    adminEmail,
  ]);

  // Seed games if empty
  const games = await queryOne("SELECT COUNT(1) as count FROM games", []);
  if (Number(games?.count || 0) === 0) {
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
    for (const g of seedGames) {
      await exec("INSERT INTO games (name, previewVideoUrl, gameUrl) VALUES ($1, $2, $3)", [
        g.name,
        g.previewVideoUrl,
        g.gameUrl,
      ]);
    }
  }

  // Seed articles from repo JSON if empty
  const articles = await queryOne("SELECT COUNT(1) as count FROM articles", []);
  if (Number(articles?.count || 0) === 0) {
    const seedPath = path.resolve(path.join(__dirname, "..", "..", "seed", "articles.json"));
    if (fs.existsSync(seedPath)) {
      try {
        const raw = fs.readFileSync(seedPath, "utf8");
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          const adminRow = await queryOne(
            "SELECT id FROM users WHERE email = $1 LIMIT 1",
            [adminEmail]
          );
          const adminId = adminRow?.id ?? null;
          for (const a of items) {
            const title = typeof a?.title === "string" ? a.title : "";
            const shortDescription =
              typeof a?.shortDescription === "string" ? a.shortDescription : "";
            const content = typeof a?.content === "string" ? a.content : "";
            const image = typeof a?.image === "string" ? a.image : null;
            if (!title || !content) continue;
            await exec(
              "INSERT INTO articles (title, shortDescription, content, image, createdBy) VALUES ($1, $2, $3, $4, $5)",
              [title, shortDescription, content, image, adminId]
            );
          }
        }
      } catch (e) {
        console.warn("⚠ Failed to seed articles (continuing):", e?.message || e);
      }
    }
  }
}

async function initDb() {
  console.log(`Initializing database (DB_KIND=${env.DB_KIND})...`);
  if (env.DB_KIND === "postgres") {
    await migratePostgres();
  } else {
    await migrateSqlite();
  }
  await seedCommon();
  console.log("✓ Database initialized");
}

async function migrateOnly() {
  console.log(`Running migrations (DB_KIND=${env.DB_KIND})...`);
  if (env.DB_KIND === "postgres") {
    await migratePostgres();
  } else {
    await migrateSqlite();
  }
  console.log("✓ Migrations complete");
}

async function closeDb() {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = undefined;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = undefined;
  }
}

module.exports = {
  initDb,
  migrateOnly,
  closeDb,
  query,
  queryOne,
  exec,
  // Back-compat export (used by old scripts). Prefer query/exec in new code.
  getDb: getSqliteDb,
};


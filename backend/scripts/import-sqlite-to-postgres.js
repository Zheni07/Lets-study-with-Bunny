require("dotenv").config({ path: "./.env" });

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { Pool } = require("pg");

function parseArgs(argv) {
  const out = { sqlite: undefined, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sqlite") out.sqlite = argv[i + 1];
    if (a === "--force") out.force = true;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.sqlite) {
    throw new Error("Usage: node scripts/import-sqlite-to-postgres.js --sqlite ./data/app.db [--force]");
  }

  const sqlitePath = path.resolve(process.cwd(), args.sqlite);
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite file not found: ${sqlitePath}`);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL in backend/.env");
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  const pg = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const counts = await pg.query(
      `SELECT
        (SELECT COUNT(1) FROM users)  AS users,
        (SELECT COUNT(1) FROM articles) AS articles,
        (SELECT COUNT(1) FROM games) AS games,
        (SELECT COUNT(1) FROM password_reset_tokens) AS tokens`
    );
    const c = counts.rows[0];
    const hasAny =
      Number(c.users) > 0 || Number(c.articles) > 0 || Number(c.games) > 0 || Number(c.tokens) > 0;
    if (hasAny && !args.force) {
      throw new Error(
        "Target Postgres DB is not empty. Re-run with --force if you are sure, or use a fresh database."
      );
    }

    const users = sqlite
      .prepare("SELECT id, username, email, password, role, createdAt FROM users ORDER BY id ASC")
      .all();
    const games = sqlite
      .prepare("SELECT id, name, previewVideoUrl, gameUrl FROM games ORDER BY id ASC")
      .all();
    const articles = sqlite
      .prepare(
        "SELECT id, title, shortDescription, content, image, createdAt, createdBy FROM articles ORDER BY id ASC"
      )
      .all();
    const tokens = sqlite
      .prepare(
        "SELECT id, userId, tokenHash, expiresAt, usedAt, createdAt FROM password_reset_tokens ORDER BY id ASC"
      )
      .all();

    await pg.query("BEGIN");
    try {
      for (const u of users) {
        await pg.query(
          `INSERT INTO users (id, username, email, password, role, createdAt)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [u.id, u.username, u.email, u.password, u.role, u.createdAt]
        );
      }

      for (const g of games) {
        await pg.query(
          `INSERT INTO games (id, name, previewVideoUrl, gameUrl)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [g.id, g.name, g.previewVideoUrl, g.gameUrl]
        );
      }

      for (const a of articles) {
        await pg.query(
          `INSERT INTO articles (id, title, shortDescription, content, image, createdAt, createdBy)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [a.id, a.title, a.shortDescription, a.content, a.image, a.createdAt, a.createdBy]
        );
      }

      for (const t of tokens) {
        await pg.query(
          `INSERT INTO password_reset_tokens (id, userId, tokenHash, expiresAt, usedAt, createdAt)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [t.id, t.userId, t.tokenHash, t.expiresAt, t.usedAt, t.createdAt]
        );
      }

      // Reset sequences to max(id) so next inserts don't collide
      await pg.query(
        `SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT MAX(id) FROM users), 1), true)`
      );
      await pg.query(
        `SELECT setval(pg_get_serial_sequence('articles','id'), COALESCE((SELECT MAX(id) FROM articles), 1), true)`
      );
      await pg.query(
        `SELECT setval(pg_get_serial_sequence('games','id'), COALESCE((SELECT MAX(id) FROM games), 1), true)`
      );
      await pg.query(
        `SELECT setval(pg_get_serial_sequence('password_reset_tokens','id'), COALESCE((SELECT MAX(id) FROM password_reset_tokens), 1), true)`
      );

      await pg.query("COMMIT");
    } catch (e) {
      await pg.query("ROLLBACK");
      throw e;
    }

    const after = await pg.query(
      `SELECT
        (SELECT COUNT(1) FROM users)  AS users,
        (SELECT COUNT(1) FROM articles) AS articles,
        (SELECT COUNT(1) FROM games) AS games,
        (SELECT COUNT(1) FROM password_reset_tokens) AS tokens`
    );
    console.log("✓ Import complete.");
    console.log(after.rows[0]);
  } finally {
    sqlite.close();
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});


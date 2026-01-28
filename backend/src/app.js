const express = require("express");
const cors = require("cors");
const path = require("path");

const { env } = require("./config/env");
const { errorHandler } = require("./middleware/errorHandler");
const { notFound } = require("./middleware/notFound");

const authRoutes = require("./routes/authRoutes");
const articleRoutes = require("./routes/articleRoutes");
const gameRoutes = require("./routes/gameRoutes");
const adminRoutes = require("./routes/adminRoutes");

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));

  // Optional: serve uploaded images
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "..", "uploads"))
  );

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // Test registration endpoint (for debugging)
  app.post("/api/test/register", async (req, res, next) => {
    try {
      const { getDb } = require("./db/db");
      const bcrypt = require("bcrypt");
      const db = getDb();
      
      const testEmail = `test_${Date.now()}@test.com`;
      const passwordHash = await bcrypt.hash("test123", 10);
      
      console.log("[TEST] Attempting direct insert...");
      const result = db.prepare(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)"
      ).run("TestUser", testEmail, passwordHash, "user");
      
      console.log("[TEST] Insert result:", {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      });
      
      // Verify
      const saved = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      
      res.json({
        success: true,
        insertResult: {
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid
        },
        saved: saved ? {
          id: saved.id,
          username: saved.username,
          email: saved.email
        } : null
      });
    } catch (error) {
      console.error("[TEST] Error:", error);
      next(error);
    }
  });

  // Database status endpoint
  app.get("/api/db/status", (req, res, next) => {
    try {
      const { getDb } = require("./db/db");
      const db = getDb();
      
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
      const articleCount = db.prepare("SELECT COUNT(*) as count FROM articles").get().count;
      const gameCount = db.prepare("SELECT COUNT(*) as count FROM games").get().count;
      
      // Get recent users for debugging
      const recentUsers = db.prepare(`
        SELECT id, username, email, role, createdAt 
        FROM users 
        ORDER BY createdAt DESC 
        LIMIT 5
      `).all();
      
      res.json({
        ok: true,
        database: "connected",
        tables: {
          users: userCount,
          articles: articleCount,
          games: gameCount,
        },
        recentUsers: recentUsers,
      });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/articles", articleRoutes);
  app.use("/api/games", gameRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };


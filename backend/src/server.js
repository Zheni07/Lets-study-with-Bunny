const fs = require("fs");
const path = require("path");

const { env } = require("./config/env");
const { createApp } = require("./app");
const { initDb } = require("./db/db");

async function main() {
  try {
    // Ensure folders exist
    const dataDir = path.join(__dirname, "..", "data");
    const uploadsDir = path.join(__dirname, "..", "uploads");
    
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("✓ Data directories created");

    // Initialize database (creates tables and seeds data)
    initDb();

    const app = createApp();
    app.listen(env.PORT, "0.0.0.0", () => {
      // eslint-disable-next-line no-console
      console.log(`✓ API listening on http://localhost:${env.PORT} and on your network (use same host as frontend, port ${env.PORT})`);
      // eslint-disable-next-line no-console
      console.log(`✓ Database location: ${path.resolve(dataDir, env.DB_PATH.replace("./data/", ""))}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", error);
    throw error;
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


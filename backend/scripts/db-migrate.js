require("dotenv").config({ path: "./.env" });

const { migrateOnly, closeDb } = require("../src/db/db");

async function main() {
  await migrateOnly();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await closeDb();
    } catch (_) {
      // ignore
    }
  });


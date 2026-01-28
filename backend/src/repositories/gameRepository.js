const { getDb } = require("../db/db");

function listGames() {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, name, previewVideoUrl, gameUrl FROM games ORDER BY id ASC"
    )
    .all();
}

function findById(id) {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, name, previewVideoUrl, gameUrl FROM games WHERE id = ?"
    )
    .get(id);
}

module.exports = {
  listGames,
  findById,
};


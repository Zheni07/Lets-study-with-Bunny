const { query, queryOne } = require("../db/db");

async function listGames() {
  return query("SELECT id, name, previewVideoUrl, gameUrl FROM games ORDER BY id ASC", []);
}

async function findById(id) {
  return queryOne("SELECT id, name, previewVideoUrl, gameUrl FROM games WHERE id = $1", [id]);
}

module.exports = {
  listGames,
  findById,
};


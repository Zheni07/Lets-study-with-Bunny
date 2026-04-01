const { listGames, findById } = require("../repositories/gameRepository");

async function getAllGames() {
  return listGames();
}

async function getGameById(id) {
  const game = await findById(id);
  if (!game) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }
  return game;
}

async function getGamePreview(id) {
  const game = await findById(id);
  if (!game) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }
  // Return only preview information (no gameUrl for guests)
  return {
    id: game.id,
    name: game.name,
    previewVideoUrl: game.previewVideoUrl,
  };
}

async function getGamePlayUrl(id) {
  const game = await findById(id);
  if (!game) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }
  // Return full game information including gameUrl for authenticated users
  return game;
}

module.exports = {
  getAllGames,
  getGameById,
  getGamePreview,
  getGamePlayUrl,
};

const { listGames, findById } = require("../repositories/gameRepository");

function getAllGames() {
  return listGames();
}

function getGameById(id) {
  const game = findById(id);
  if (!game) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }
  return game;
}

function getGamePreview(id) {
  const game = findById(id);
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

function getGamePlayUrl(id) {
  const game = findById(id);
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

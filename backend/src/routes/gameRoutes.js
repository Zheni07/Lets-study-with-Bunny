const express = require("express");
const gameService = require("../services/gameService");
const { optionalAuth, requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

// GET /api/games - Public access (all roles)
// Guests see games without gameUrl, authenticated users see full game info
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const games = gameService.getAllGames();
    // If user is authenticated and has user/admin role, include gameUrl
    if (req.user && (req.user.role === "user" || req.user.role === "admin")) {
      res.json({ games });
    } else {
      // For guests, don't include gameUrl
      const gamesList = games.map((game) => ({
        id: game.id,
        name: game.name,
        previewVideoUrl: game.previewVideoUrl,
      }));
      res.json({ games: gamesList });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:id/preview - Public access (guest can access)
router.get("/:id/preview", async (req, res, next) => {
  try {
    const game = gameService.getGamePreview(Number(req.params.id));
    res.json({ game });
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:id/play - User and Admin only
router.get(
  "/:id/play",
  requireAuth,
  requireRole("user", "admin"),
  async (req, res, next) => {
    try {
      const game = gameService.getGamePlayUrl(Number(req.params.id));
      res.json({ game });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

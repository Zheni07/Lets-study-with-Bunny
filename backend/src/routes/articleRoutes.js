const express = require("express");
const path = require("path");
const articleService = require("../services/articleService");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");
const { uploadImage } = require("../middleware/upload");

const router = express.Router();

// GET /api/articles - Public access (all roles including guest)
router.get("/", async (req, res, next) => {
  try {
    const articles = await articleService.getAllArticles();
    res.json({ articles });
  } catch (error) {
    next(error);
  }
});

// GET /api/articles/:id - Public access
router.get("/:id", async (req, res, next) => {
  try {
    const article = await articleService.getArticleById(Number(req.params.id));
    res.json({ article });
  } catch (error) {
    next(error);
  }
});

// POST /api/articles - Admin only
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  uploadImage,
  async (req, res, next) => {
    try {
      const { title, shortDescription, content } = req.body;
      
      // Handle image upload
      let imagePath = null;
      if (req.file) {
        // Return relative path from uploads directory
        imagePath = `/uploads/${req.file.filename}`;
      }

      const article = await articleService.createNewArticle({
        title,
        shortDescription,
        content,
        image: imagePath,
        createdBy: req.user.id,
      });

      res.status(201).json({ article });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/articles/:id - Admin only
router.put(
  "/:id",
  requireAuth,
  requireRole("admin"),
  uploadImage,
  async (req, res, next) => {
    try {
      const { title, shortDescription, content } = req.body;
      
      // Handle image upload
      let imagePath = undefined;
      if (req.file) {
        imagePath = `/uploads/${req.file.filename}`;
      }
      const removeImage =
        req.body && (req.body.removeImage === "true" || req.body.removeImage === "1");
      if (!req.file && removeImage) {
        imagePath = null;
      }

      const article = await articleService.updateExistingArticle(Number(req.params.id), {
        title,
        shortDescription,
        content,
        image: imagePath,
      });

      res.json({ article });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/articles/:id - Admin only
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const result = await articleService.removeArticle(Number(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

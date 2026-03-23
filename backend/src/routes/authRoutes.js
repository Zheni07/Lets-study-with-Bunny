const express = require("express");
const authService = require("../services/authService");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    console.log("Registration attempt:", { username, email, password: "***" });
    const result = await authService.register({ username, email, password });
    console.log("User registered successfully:", result.user.id);
    res.status(201).json(result);
  } catch (error) {
    console.error("Registration error:", error.message);
    next(error);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = authService.getCurrentUser(req.user.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email, frontendBaseUrl } = req.body || {};
    const result = await authService.requestPasswordReset({ email, frontendBaseUrl });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    const result = await authService.resetPassword({ token, newPassword });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

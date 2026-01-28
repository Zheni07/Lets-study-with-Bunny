const express = require("express");
const adminService = require("../services/adminService");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/roles");

const router = express.Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireRole("admin"));

// GET /api/admin/users - Get all users
router.get("/users", async (req, res, next) => {
  try {
    const users = adminService.getAllUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete("/users/:id", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    
    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        error: { message: "You cannot delete your own account" },
      });
    }

    const result = adminService.deleteUserById(userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/role - Change user role
router.put("/users/:id/role", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        error: { message: "Role is required" },
      });
    }

    // Prevent admin from changing their own role
    if (userId === req.user.id) {
      return res.status(400).json({
        error: { message: "You cannot change your own role" },
      });
    }

    const user = adminService.changeUserRole(userId, role);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const { findById } = require("../repositories/userRepository");

const ADMIN_EMAIL = "dislexia.bunny@gmail.com";

/**
 * Ensures that the admin role is only usable by the real admin account
 * (prevents stale/seeded placeholder admins and ties admin access to a specific email).
 */
function requireAdminEmail(req, res, next) {
  if (!req.user?.email) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: { message: "Forbidden" } });
  }

  // Validate the user still exists in DB and is admin there too.
  const user = findById(Number(req.user.id));
  if (!user || user.email !== ADMIN_EMAIL || user.role !== "admin") {
    return res.status(403).json({ error: { message: "Forbidden" } });
  }

  next();
}

module.exports = { requireAdminEmail, ADMIN_EMAIL };


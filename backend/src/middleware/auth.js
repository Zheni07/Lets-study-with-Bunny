const { verifyToken } = require("../utils/jwt");

function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    try {
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (err) {
      // ignore invalid token for optional auth
    }
  }
  next();
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }
}

module.exports = {
  optionalAuth,
  requireAuth,
};


const { getDb } = require("../db/db");

function createResetToken({ userId, tokenHash, expiresAt }) {
  const db = getDb();
  db.prepare(
    "INSERT INTO password_reset_tokens (userId, tokenHash, expiresAt) VALUES (?, ?, ?)"
  ).run(userId, tokenHash, expiresAt);
}

function findValidResetToken(tokenHash) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, userId, tokenHash, expiresAt, usedAt
       FROM password_reset_tokens
       WHERE tokenHash = ?
       LIMIT 1`
    )
    .get(tokenHash);
}

function markTokenUsed(id) {
  const db = getDb();
  db.prepare(
    "UPDATE password_reset_tokens SET usedAt = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(id);
}

module.exports = {
  createResetToken,
  findValidResetToken,
  markTokenUsed,
};


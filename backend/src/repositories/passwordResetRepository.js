const { exec, queryOne } = require("../db/db");

async function createResetToken({ userId, tokenHash, expiresAt }) {
  await exec(
    "INSERT INTO password_reset_tokens (userId, tokenHash, expiresAt) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt]
  );
}

async function findValidResetToken(tokenHash) {
  return queryOne(
    `SELECT id, userId, tokenHash, expiresAt, usedAt
     FROM password_reset_tokens
     WHERE tokenHash = $1
     LIMIT 1`,
    [tokenHash]
  );
}

async function markTokenUsed(id) {
  await exec("UPDATE password_reset_tokens SET usedAt = CURRENT_TIMESTAMP WHERE id = $1", [
    id,
  ]);
}

module.exports = {
  createResetToken,
  findValidResetToken,
  markTokenUsed,
};


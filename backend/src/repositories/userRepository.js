const { queryOne, query, exec } = require("../db/db");

function mapUser(row) {
  if (!row) return null;
  const { password, ...rest } = row;
  return rest;
}

async function findByEmail(email) {
  return queryOne("SELECT * FROM users WHERE email = $1", [email]);
}

async function findById(id) {
  return queryOne("SELECT * FROM users WHERE id = $1", [id]);
}

async function createUser({ username, email, passwordHash, role = "user" }) {
  try {
    const res = await exec(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [username, email, passwordHash, role]
    );
    return res.rows[0];
  } catch (error) {
    // Normalize unique violations across DBs
    const msg = String(error?.message || "");
    const code = String(error?.code || "");
    const isUnique =
      code === "23505" || // postgres unique_violation
      msg.includes("UNIQUE constraint") ||
      msg.toLowerCase().includes("unique");
    if (isUnique) {
      const helpfulError = new Error("User with this email already exists");
      helpfulError.status = 400;
      helpfulError.expose = true;
      throw helpfulError;
    }
    throw error;
  }
}

async function listUsers() {
  return query(
    "SELECT id, username, email, role, createdAt FROM users ORDER BY createdAt DESC",
    []
  );
}

async function deleteUser(id) {
  return exec("DELETE FROM users WHERE id = $1", [id]);
}

async function updateUserRole(id, role) {
  await exec("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
  return findById(id);
}

async function updateUserPassword(id, passwordHash) {
  await exec("UPDATE users SET password = $1 WHERE id = $2", [passwordHash, id]);
  return findById(id);
}

module.exports = {
  mapUser,
  findByEmail,
  findById,
  createUser,
  listUsers,
  deleteUser,
  updateUserRole,
  updateUserPassword,
};


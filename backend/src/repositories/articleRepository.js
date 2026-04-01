const { query, queryOne, exec } = require("../db/db");

async function findAll() {
  return query(
    `SELECT a.id, a.title, a.shortDescription, a.content, a.image, a.createdAt,
            a.createdBy, u.username as author
     FROM articles a
     LEFT JOIN users u ON a.createdBy = u.id
     ORDER BY a.createdAt DESC`,
    []
  );
}

async function findById(id) {
  return queryOne(
    `SELECT a.id, a.title, a.shortDescription, a.content, a.image, a.createdAt,
            a.createdBy, u.username as author
     FROM articles a
     LEFT JOIN users u ON a.createdBy = u.id
     WHERE a.id = $1`,
    [id]
  );
}

async function createArticle({ title, shortDescription, content, image, createdBy }) {
  const res = await exec(
    "INSERT INTO articles (title, shortDescription, content, image, createdBy) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [title, shortDescription, content, image, createdBy]
  );
  return findById(res.rows[0].id);
}

async function updateArticle(id, { title, shortDescription, content, image }) {
  const existing = await findById(id);
  if (!existing) return null;

  // NOTE: use "undefined means keep existing" so callers can set NULL explicitly
  const nextTitle = title === undefined ? existing.title : title;
  const nextShort = shortDescription === undefined ? existing.shortDescription : shortDescription;
  const nextContent = content === undefined ? existing.content : content;
  const nextImage = image === undefined ? existing.image : image;

  await exec(
    `UPDATE articles 
     SET title = $1, shortDescription = $2, content = $3, image = $4
     WHERE id = $5`,
    [nextTitle, nextShort, nextContent, nextImage, id]
  );
  return findById(id);
}

async function deleteArticle(id) {
  return exec("DELETE FROM articles WHERE id = $1", [id]);
}

module.exports = {
  findAll,
  findById,
  createArticle,
  updateArticle,
  deleteArticle,
};


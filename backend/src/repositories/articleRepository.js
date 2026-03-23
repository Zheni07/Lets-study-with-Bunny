const { getDb } = require("../db/db");

function findAll() {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.id, a.title, a.shortDescription, a.content, a.image, a.createdAt,
              a.createdBy, u.username as author
       FROM articles a
       LEFT JOIN users u ON a.createdBy = u.id
       ORDER BY a.createdAt DESC`
    )
    .all();
}

function findById(id) {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.id, a.title, a.shortDescription, a.content, a.image, a.createdAt,
              a.createdBy, u.username as author
       FROM articles a
       LEFT JOIN users u ON a.createdBy = u.id
       WHERE a.id = ?`
    )
    .get(id);
}

function createArticle({ title, shortDescription, content, image, createdBy }) {
  const db = getDb();
  const res = db
    .prepare(
      "INSERT INTO articles (title, shortDescription, content, image, createdBy) VALUES (?, ?, ?, ?, ?)"
    )
    .run(title, shortDescription, content, image, createdBy);
  return findById(res.lastInsertRowid);
}

function updateArticle(id, { title, shortDescription, content, image }) {
  const db = getDb();
  const existing = findById(id);
  if (!existing) return null;

  // NOTE: use "undefined means keep existing" so callers can set NULL explicitly
  const nextTitle = title === undefined ? existing.title : title;
  const nextShort = shortDescription === undefined ? existing.shortDescription : shortDescription;
  const nextContent = content === undefined ? existing.content : content;
  const nextImage = image === undefined ? existing.image : image;

  db.prepare(
    `UPDATE articles 
     SET title = ?, shortDescription = ?, content = ?, image = ?
     WHERE id = ?`
  ).run(
    nextTitle,
    nextShort,
    nextContent,
    nextImage,
    id
  );
  return findById(id);
}

function deleteArticle(id) {
  const db = getDb();
  return db.prepare("DELETE FROM articles WHERE id = ?").run(id);
}

module.exports = {
  findAll,
  findById,
  createArticle,
  updateArticle,
  deleteArticle,
};


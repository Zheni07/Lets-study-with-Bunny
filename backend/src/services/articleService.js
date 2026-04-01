const fs = require("fs");
const path = require("path");

const {
  findAll,
  findById,
  createArticle,
  updateArticle,
  deleteArticle,
} = require("../repositories/articleRepository");

function safeUnlinkUpload(imagePath) {
  if (!imagePath || typeof imagePath !== "string") return;
  // Only delete files we store under /uploads/
  if (!imagePath.startsWith("/uploads/")) return;
  const uploadsDir = path.join(__dirname, "..", "..", "uploads");
  const filename = path.basename(imagePath);
  const abs = path.join(uploadsDir, filename);
  try {
    fs.unlinkSync(abs);
  } catch (_) {
    // Ignore if missing or cannot delete
  }
}

async function getAllArticles() {
  return findAll();
}

async function getArticleById(id) {
  const article = await findById(id);
  if (!article) {
    const error = new Error("Article not found");
    error.status = 404;
    throw error;
  }
  return article;
}

async function createNewArticle({ title, shortDescription, content, image, createdBy }) {
  // Validate required fields
  if (!title || !content) {
    const error = new Error("Title and content are required");
    error.status = 400;
    throw error;
  }

  return createArticle({
    title,
    // DB column is NOT NULL, keep empty string if not used in UI
    shortDescription: typeof shortDescription === "string" ? shortDescription : "",
    content,
    image: image || null,
    createdBy,
  });
}

async function updateExistingArticle(id, { title, shortDescription, content, image }) {
  const existing = await findById(id);
  if (!existing) {
    const error = new Error("Article not found");
    error.status = 404;
    throw error;
  }

  // If image is being replaced or explicitly removed, delete old file (if any)
  const shouldRemoveOld =
    (typeof image === "string" && image.length > 0 && image !== existing.image) ||
    image === null;
  if (shouldRemoveOld && existing.image) {
    safeUnlinkUpload(existing.image);
  }

  return updateArticle(id, {
    title,
    shortDescription,
    content,
    image,
  });
}

async function removeArticle(id) {
  const article = await findById(id);
  if (!article) {
    const error = new Error("Article not found");
    error.status = 404;
    throw error;
  }

  await deleteArticle(id);
  return { message: "Article deleted successfully" };
}

module.exports = {
  getAllArticles,
  getArticleById,
  createNewArticle,
  updateExistingArticle,
  removeArticle,
};

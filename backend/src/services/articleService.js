const {
  findAll,
  findById,
  createArticle,
  updateArticle,
  deleteArticle,
} = require("../repositories/articleRepository");

function getAllArticles() {
  return findAll();
}

function getArticleById(id) {
  const article = findById(id);
  if (!article) {
    const error = new Error("Article not found");
    error.status = 404;
    throw error;
  }
  return article;
}

function createNewArticle({ title, shortDescription, content, image, createdBy }) {
  // Validate required fields
  if (!title || !shortDescription || !content) {
    const error = new Error("Title, short description, and content are required");
    error.status = 400;
    throw error;
  }

  return createArticle({
    title,
    shortDescription,
    content,
    image: image || null,
    createdBy,
  });
}

function updateExistingArticle(id, { title, shortDescription, content, image }) {
  const existing = findById(id);
  if (!existing) {
    const error = new Error("Article not found");
    error.status = 404;
    throw error;
  }

  return updateArticle(id, {
    title,
    shortDescription,
    content,
    image,
  });
}

function removeArticle(id) {
  const article = findById(id);
  if (!article) {
    const error = new Error("Article not found");
    error.status = 404;
    throw error;
  }

  deleteArticle(id);
  return { message: "Article deleted successfully" };
}

module.exports = {
  getAllArticles,
  getArticleById,
  createNewArticle,
  updateExistingArticle,
  removeArticle,
};

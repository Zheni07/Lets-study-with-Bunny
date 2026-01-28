function errorHandler(err, req, res, next) {
  // eslint-disable-next-line no-unused-vars
  const _next = next;

  const status = err.status || 500;
  // Expose error message for client errors (4xx), hide for server errors (5xx) unless explicitly exposed
  const isClientError = status >= 400 && status < 500;
  const message = (err.expose || isClientError) ? err.message : "Internal Server Error";

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  } else {
    // Log client errors for debugging
    console.error(`[Client Error ${status}]:`, err.message);
  }

  res.status(status).json({
    error: {
      message,
      code: err.code || undefined,
    },
  });
}

module.exports = { errorHandler };


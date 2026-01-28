const path = require("path");

require("dotenv").config({
  path: process.env.DOTENV_PATH
    ? path.resolve(process.env.DOTENV_PATH)
    : undefined,
});

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 4000),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  DB_PATH: process.env.DB_PATH || "./data/app.db",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
};

module.exports = { env };


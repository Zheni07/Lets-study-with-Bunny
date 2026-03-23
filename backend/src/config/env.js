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
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 0,
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "",
  EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID || "",
  EMAILJS_TEMPLATE_ID_RESET: process.env.EMAILJS_TEMPLATE_ID_RESET || "",
  EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY || "",
  EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY || "",
};

module.exports = { env };


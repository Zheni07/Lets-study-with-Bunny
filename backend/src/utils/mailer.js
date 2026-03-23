const nodemailer = require("nodemailer");
const { env } = require("../config/env");

function smtpConfigured() {
  return Boolean(
    env.SMTP_HOST &&
      env.SMTP_PORT &&
      env.SMTP_USER &&
      env.SMTP_PASS &&
      env.SMTP_FROM
  );
}

function getTransport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE, // true for 465, false for 587/STARTTLS
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

async function sendMail({ to, subject, html, text }) {
  if (!smtpConfigured()) {
    const err = new Error(
      "SMTP не е конфигуриран. Попълнете SMTP_* променливите в backend/.env"
    );
    err.status = 500;
    err.expose = true;
    throw err;
  }

  const transport = getTransport();
  await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  smtpConfigured,
  sendMail,
};


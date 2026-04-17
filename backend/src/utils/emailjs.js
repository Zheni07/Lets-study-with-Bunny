const { env } = require("../config/env");

function emailjsConfigured() {
  return Boolean(
    env.EMAILJS_SERVICE_ID &&
      env.EMAILJS_TEMPLATE_ID_RESET &&
      env.EMAILJS_PUBLIC_KEY
  );
}

async function sendResetEmail({ toEmail, resetUrl }) {
  if (!emailjsConfigured()) {
    const err = new Error(
      "EmailJS не е конфигуриран. Попълнете EMAILJS_* променливите в backend/.env"
    );
    err.status = 500;
    err.expose = true;
    throw err;
  }
  if (!toEmail || !resetUrl) {
    const err = new Error("Missing toEmail/resetUrl for EmailJS send.");
    err.status = 500;
    err.expose = false;
    throw err;
  }

  const privateKey = String(env.EMAILJS_PRIVATE_KEY || "").trim();

  const payload = {
    service_id: env.EMAILJS_SERVICE_ID,
    template_id: env.EMAILJS_TEMPLATE_ID_RESET,
    user_id: env.EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: toEmail,
      reset_url: resetUrl,
    },
  };

  // Server-side auth for EmailJS strict mode (REST API supports accessToken).
  if (privateKey) {
    payload.accessToken = privateKey;
  }

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `EmailJS send failed (${res.status}): ${text || "Unknown error"}`
    );
    err.status = 502;
    err.expose = true;
    throw err;
  }
}

module.exports = {
  emailjsConfigured,
  sendResetEmail,
};


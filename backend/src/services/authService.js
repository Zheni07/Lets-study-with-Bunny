const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { env } = require("../config/env");
const { findByEmail, createUser, findById, mapUser, updateUserPassword } = require("../repositories/userRepository");
const { createResetToken, findValidResetToken, markTokenUsed } = require("../repositories/passwordResetRepository");
const { smtpConfigured, sendMail } = require("../utils/mailer");
const { emailjsConfigured, sendResetEmail } = require("../utils/emailjs");
const { signToken } = require("../utils/jwt");

async function register({ username, email, password, role = "user" }) {
  console.log(`[authService.register] Starting registration for: ${email}`);
  
  // Check if user already exists
  console.log(`[authService.register] Checking if user exists: ${email}`);
  const existingUser = await findByEmail(email);
  if (existingUser) {
    console.log(`[authService.register] User already exists: ${email}`);
    const error = new Error("User with this email already exists");
    error.status = 400;
    error.expose = true;
    throw error;
  }
  console.log(`[authService.register] User does not exist, proceeding...`);

  // Validate input
  if (!username || !email || !password) {
    const error = new Error("Username, email, and password are required");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  if (password.length < 6) {
    const error = new Error("Password must be at least 6 characters");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  // Hash password
  console.log(`[authService.register] Hashing password...`);
  const passwordHash = await bcrypt.hash(password, 10);
  console.log(`[authService.register] Password hashed`);

  // Create user
  console.log(`[authService.register] Calling createUser...`);
  const user = await createUser({ username, email, passwordHash, role });
  console.log(`[authService.register] User created: ID=${user.id}, email=${user.email}`);

  // Generate token
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  console.log(`[authService.register] Token generated for user ID: ${user.id}`);

  return {
    user: mapUser(user),
    token,
  };
}

async function login({ email, password }) {
  // Find user
  const user = await findByEmail(email);
  if (!user) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  // Generate token
  const token = signToken({ id: user.id, email: user.email, role: user.role });

  return {
    user: mapUser(user),
    token,
  };
}

async function getCurrentUser(userId) {
  const user = await findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }
  return mapUser(user);
}

module.exports = {
  register,
  login,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
};

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function requestPasswordReset({ email, frontendBaseUrl }) {
  // Always return success message to avoid user enumeration
  const user = await findByEmail(email);
  if (!user) {
    return { message: "Ако има акаунт с този имейл, ще получите инструкции за смяна на парола." };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await createResetToken({ userId: user.id, tokenHash, expiresAt });

  const base = frontendBaseUrl || "";
  const resetUrl = base
    ? `${base.replace(/\/+$/, "")}/reset-password.html?token=${rawToken}`
    : null;

  // Preferred: EmailJS (works with Gmail Advanced Protection)
  if (emailjsConfigured() && resetUrl) {
    await sendResetEmail({ toEmail: user.email, resetUrl });
    return { message: "Изпратихме имейл с линк за смяна на парола (ако акаунтът съществува)." };
  }

  // Send real email if SMTP configured
  if (smtpConfigured() && resetUrl) {
    const subject = "Смяна на парола — Да учим с Бъни";
    const text =
      "Заявихте смяна на парола.\n\n" +
      `Линк за смяна на парола (валиден 1 час):\n${resetUrl}\n\n` +
      "Ако не сте вие, игнорирайте този имейл.";
    const html =
      "<p>Заявихте смяна на парола.</p>" +
      `<p><a href="${resetUrl}">Натиснете тук, за да смените паролата</a> (валиден 1 час).</p>` +
      "<p>Ако не сте вие, игнорирайте този имейл.</p>";
    await sendMail({ to: user.email, subject, text, html });
    return { message: "Изпратихме имейл с линк за смяна на парола (ако акаунтът съществува)." };
  }

  // Dev-friendly fallback (no SMTP)
  if (env.NODE_ENV === "development") {
    return {
      message: "EmailJS/SMTP не са настроени. Линкът за смяна на парола е генериран (dev режим).",
      resetUrl,
    };
  }

  return { message: "Ако има акаунт с този имейл, ще получите инструкции за смяна на парола." };
}

async function resetPassword({ token, newPassword }) {
  if (!token || typeof token !== "string") {
    const error = new Error("Невалиден или липсващ token.");
    error.status = 400;
    error.expose = true;
    throw error;
  }
  if (!newPassword || newPassword.length < 6) {
    const error = new Error("Паролата трябва да е поне 6 символа.");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const tokenHash = hashResetToken(token);
  const row = await findValidResetToken(tokenHash);
  if (!row) {
    const error = new Error("Невалиден или изтекъл token.");
    error.status = 400;
    error.expose = true;
    throw error;
  }
  if (row.usedAt) {
    const error = new Error("Token-ът вече е използван.");
    error.status = 400;
    error.expose = true;
    throw error;
  }
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    const error = new Error("Token-ът е изтекъл.");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(row.userId, passwordHash);
  await markTokenUsed(row.id);

  return { message: "Паролата е сменена успешно. Можете да влезете с новата парола." };
}

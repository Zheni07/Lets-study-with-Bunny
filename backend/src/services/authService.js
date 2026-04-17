const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { findByEmail, createUser, findById, mapUser, updateUserPassword } = require("../repositories/userRepository");
const { createResetToken, findValidResetToken, markTokenUsed } = require("../repositories/passwordResetRepository");
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
    console.log(`[authService.login] User not found for email: ${email}`);
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  // Verify password
  console.log(`[authService.login] Verifying password for user: ${user.id}, email: ${email}`);
  const isValid = await bcrypt.compare(password, user.password);
  console.log(`[authService.login] Password valid: ${isValid}`);
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

  if (!resetUrl) {
    const error = new Error("Липсва frontendBaseUrl за генериране на reset линк.");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  if (!emailjsConfigured()) {
    const error = new Error("EmailJS не е конфигуриран коректно.");
    error.status = 500;
    error.expose = true;
    throw error;
  }

  await sendResetEmail({ toEmail: user.email, resetUrl });
    return { message: "Изпратихме имейл с линк за смяна на парола (ако акаунтът съществува)." };
}

async function resetPassword({ token, newPassword }) {
  console.log(`[authService.resetPassword] Called with token: ${token ? token.substring(0,10) + '...' : 'null'}, newPassword length: ${newPassword ? newPassword.length : 0}`);
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
  console.log(`[authService.resetPassword] Updating password for userId: ${row.userId}`);
  try {
    await updateUserPassword(row.userId, passwordHash);
    console.log(`[authService.resetPassword] Password updated successfully`);
  } catch (updateError) {
    console.error(`[authService.resetPassword] Error updating password:`, updateError);
    throw updateError;
  }
  console.log(`[authService.resetPassword] Marking token used: ${row.id}`);
  try {
    await markTokenUsed(row.id);
    console.log(`[authService.resetPassword] Token marked used`);
  } catch (markError) {
    console.error(`[authService.resetPassword] Error marking token used:`, markError);
    throw markError;
  }

  return { message: "Паролата е сменена успешно. Можете да влезете с новата парола." };
}

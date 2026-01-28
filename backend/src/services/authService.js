const bcrypt = require("bcrypt");
const { findByEmail, createUser, findById, mapUser } = require("../repositories/userRepository");
const { signToken } = require("../utils/jwt");

async function register({ username, email, password, role = "user" }) {
  console.log(`[authService.register] Starting registration for: ${email}`);
  
  // Check if user already exists
  console.log(`[authService.register] Checking if user exists: ${email}`);
  const existingUser = findByEmail(email);
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
  const user = createUser({ username, email, passwordHash, role });
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
  const user = findByEmail(email);
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

function getCurrentUser(userId) {
  const user = findById(userId);
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
};

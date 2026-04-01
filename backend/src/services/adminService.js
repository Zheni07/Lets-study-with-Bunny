const { listUsers, deleteUser, updateUserRole, findById } = require("../repositories/userRepository");

async function getAllUsers() {
  return listUsers();
}

async function deleteUserById(id) {
  const user = await findById(id);
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  // Prevent deleting yourself
  // Note: This check should be done in the controller with req.user.id

  await deleteUser(id);
  return { message: "User deleted successfully" };
}

async function changeUserRole(id, newRole) {
  const user = await findById(id);
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  // Validate role
  const validRoles = ["guest", "user", "admin"];
  if (!validRoles.includes(newRole)) {
    const error = new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    error.status = 400;
    throw error;
  }

  const updatedUser = await updateUserRole(id, newRole);
  return updatedUser;
}

module.exports = {
  getAllUsers,
  deleteUserById,
  changeUserRole,
};

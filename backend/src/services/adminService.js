const { listUsers, deleteUser, updateUserRole, findById } = require("../repositories/userRepository");

function getAllUsers() {
  return listUsers();
}

function deleteUserById(id) {
  const user = findById(id);
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  // Prevent deleting yourself
  // Note: This check should be done in the controller with req.user.id

  deleteUser(id);
  return { message: "User deleted successfully" };
}

function changeUserRole(id, newRole) {
  const user = findById(id);
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

  const updatedUser = updateUserRole(id, newRole);
  return updatedUser;
}

module.exports = {
  getAllUsers,
  deleteUserById,
  changeUserRole,
};

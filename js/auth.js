// Връща текущата роля
function getRole() {
    return localStorage.getItem("role") || "guest";
}

// Фалшив вход
function login(role) {
    localStorage.setItem("role", role);
    window.location.href = "index.html";
}

// Изход
function logout() {
    localStorage.removeItem("role");
    window.location.href = "index.html";
}

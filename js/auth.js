// API Base URL – same host as the page, port 4000 (works for 127.0.0.1 and IP like 172.20.10.11)
function getApiBase() {
    return window.location.protocol + "//" + window.location.hostname + ":4000/api";
}
const API_BASE = getApiBase();

// Връща текущата роля
function getRole() {
    return localStorage.getItem("role") || "guest";
}

// Връща текущия потребител
function getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
}

// Връща токена
function getToken() {
    return localStorage.getItem("token");
}

// Проверява дали потребителят е логнат
function isAuthenticated() {
    return !!getToken();
}

// Стара функция за обратна съвместимост (deprecated)
function login(role) {
    console.warn("login(role) is deprecated. Use API registration/login instead.");
    localStorage.setItem("role", role);
    window.location.href = "index.html";
}

// Изход
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    window.location.href = "index.html";
}

// Проверява текущия потребител с API
async function checkAuth() {
    const token = getToken();
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            // Token is invalid, clear it
            logout();
            return null;
        }

        const data = await response.json();
        if (data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("role", data.user.role);
            return data.user;
        }
    } catch (error) {
        console.error("Auth check failed:", error);
        return null;
    }
}

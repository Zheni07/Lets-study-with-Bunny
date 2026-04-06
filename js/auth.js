// API Base URL
// - Local dev fallback: same host, port 4000, path /api
// - Production (Vercel): same origin, path /api (use Vercel rewrites to reach the backend)
// - Optional override: set window.APP_CONFIG.API_BASE before loading this file
function getApiBase() {
    const override = window.APP_CONFIG && window.APP_CONFIG.API_BASE;
    if (typeof override === "string" && override.trim()) return override.trim().replace(/\/$/, "");

    const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "0.0.0.0";

    if (isLocal) {
        return window.location.protocol + "//" + window.location.hostname + ":4000/api";
    }

    return window.location.origin + "/api";
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

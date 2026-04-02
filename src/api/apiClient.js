// ============================================================
// 📁 src/api/apiClient.js
// 🔹 Cliente Axios configurado para tu backend
// ============================================================
import axios from "axios";
import { API_URL } from "../config";
import { auth } from "../firebase"; // 👈 Importamos la instancia cliente

const api = axios.create({
  baseURL: API_URL, // 👈 tu backend
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// 🔹 Interceptor global: adjunta el JWT Auth y el correo
// ============================================================
api.interceptors.request.use(async (config) => {
  try {
    // 1️⃣ Intentar obtener el token desde Firebase Auth directamente
    let token = "";
    const user = auth.currentUser;
    
    if (user) {
      token = await user.getIdToken();
    } else {
      // 2️⃣ Fallback por si la aplicación acaba de recargar y Auth no resolvió aún
      token = localStorage.getItem("idToken") || sessionStorage.getItem("idToken");
    }

    // 🔒 Adjuntar siempre el Token de forma segura
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.warn("⚠️ No se encontró Token JWT. La petición al backend fallará con 401.");
    }
  } catch (err) {
    console.error("❌ Error interceptando el token:", err);
  }

  // 3️⃣ Mantener x-user-email (el backend parcheado lo ignorará, pero previene crashes locales)
  const userEmail = localStorage.getItem("userEmail") || sessionStorage.getItem("userEmail");
  if (userEmail) {
    config.headers["x-user-email"] = userEmail;
  }

  return config;
}, (error) => Promise.reject(error));

export default api;

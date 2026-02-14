// ============================================================
// 📁 src/api/apiClient.js
// 🔹 Cliente Axios configurado para tu backend
// ============================================================
import axios from "axios";
import { API_URL } from "../config";

const api = axios.create({
  baseURL: API_URL, // 👈 tu backend
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// 🔹 Interceptor global: adjunta el correo del usuario logueado
// ============================================================
api.interceptors.request.use((config) => {
  const userEmail = localStorage.getItem("userEmail");
  if (userEmail) {
    config.headers["x-user-email"] = userEmail;
    console.log("📤 Header enviado:", config.headers["x-user-email"]);
  } else {
    console.warn("⚠️ No se encontró userEmail en localStorage");
  }
  return config;
});

export default api;

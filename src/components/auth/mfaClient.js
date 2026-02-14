// ============================================================
// 📁 src/components/auth/mfaClient.js
// ============================================================

import { API_URL as BASE_URL } from "../../config";

// URL base del backend Express
const API_URL = `${BASE_URL}/mfa`;

/* ============================================================
   🔹 Generar o reutilizar QR (Google Authenticator)
   ============================================================ */
export async function mfaGenerate(uid, email) {
  try {
    const res = await fetch(
      `${API_URL}/generate?uid=${encodeURIComponent(uid)}&email=${encodeURIComponent(email)}`
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error al generar QR:", errorText);
      throw new Error("Error generando QR temporal");
    }

    // Devuelve { qr, secret }
    return await res.json();
  } catch (err) {
    console.error("⚠️ Error en mfaGenerate:", err.message);
    throw err;
  }
}

/* ============================================================
   🔹 Verificar código 2FA (token de 6 dígitos)
   ============================================================ */
export async function mfaVerify(uid, token, secret = null) {
  try {
    // 🟢 Obtener correo del usuario desde localStorage
    const email = localStorage.getItem("userEmail") || "";

    const body = { uid, token, email };

    // 🔐 Si hay secreto (primera inscripción), incluirlo
    if (secret) {
      body.secret = secret;
      console.log("🆕 Enviando secreto para primera inscripción");
    }

    const res = await fetch(`${API_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error al verificar código:", errorText);
      throw new Error("Error verificando código 2FA");
    }

    const data = await res.json();
    console.log("🔹 Respuesta de verificación:", data);
    return data; // { success: true/false, message?: string }
  } catch (err) {
    console.error("⚠️ Error en mfaVerify:", err.message);
    throw err;
  }
}

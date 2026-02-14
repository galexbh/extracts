// ==============================
// 📁 src/firebaseAdmin.js
// ==============================
const admin = require("firebase-admin");
const path = require("path");

// Ruta al archivo de credenciales
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");

// Inicializa Firebase solo una vez
if (!admin.apps.length) {
  let credential;

  // 1️⃣ Intentar usar variables de entorno (Producción / EasyPanel)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      console.log("[FIREBASE] 🔑 Usando credenciales de variables de entorno");
      const rawKey = process.env.FIREBASE_PRIVATE_KEY;
      // Reemplazar \\n por \n reales para evitar error "Invalid JWT Signature"
      const formattedKey = rawKey ? rawKey.replace(/\\n/g, "\n") : "";

      console.log(`[DEBUG] Longitud de clave: ${formattedKey.length}`);
      console.log(`[DEBUG] Inicio clave: ${formattedKey.substring(0, 30)}...`);
      console.log(`[DEBUG] Fin clave: ...${formattedKey.substring(formattedKey.length - 30)}`);

      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "extractus-auth",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      });
    } catch (error) {
      console.error("[FIREBASE] ❌ Error procesando variables de entorno:", error);
    }
  }

  // 2️⃣ Si no hay env vars, intentar archivo local (Desarrollo)
  if (!credential) {
    try {
      if (require("fs").existsSync(serviceAccountPath)) {
        console.log("[FIREBASE] 📂 Usando archivo serviceAccountKey.json");
        credential = admin.credential.cert(require(serviceAccountPath));
      } else {
        console.error("[FIREBASE] ❌ No se encontró serviceAccountKey.json ni variables de entorno.");
      }
    } catch (e) {
      console.error("[FIREBASE] ❌ Error cargando archivo local:", e);
    }
  }

  if (credential) {
    admin.initializeApp({ credential });
    console.log("[FIREBASE] ✅ Admin inicializado correctamente");
  } else {
    console.error("[FIREBASE] 🚨 FALLÓ la inicialización de Firebase Admin");
  }
}

module.exports = admin;

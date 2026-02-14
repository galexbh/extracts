import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

// ⬇⬇⬇ LUEGO TU CONFIG, VARIABLES, CÓDIGO
const firebaseConfig = {
  apiKey: "AIzaSyB8gvtKn-neXPjG8Ksw5JbKtuXidNlzx0A",
  authDomain: "extractus-auth.firebaseapp.com",
  projectId: "extractus-auth",
  storageBucket: "extractus-auth.appspot.com",
  messagingSenderId: "94584034869",
  appId: "1:94584034869:web:f9b518c09dc4640e69837c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 🔹 Forzar persistencia LOCAL siempre (evita desconexión al refrescar)
setPersistence(auth, browserLocalPersistence)
  .then(() => console.log("✅ Persistencia Local activada globalmente"))
  .catch((err) => console.error("❌ Error activando persistencia:", err));

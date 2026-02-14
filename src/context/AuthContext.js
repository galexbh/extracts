// ============================================================
// 📁 src/context/AuthContext.jsx
// ============================================================
import { createContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);

      // 🔥 SI HAY USUARIO → sincroniza UID y EMAIL para el backend
      if (firebaseUser) {
        localStorage.setItem("uid", firebaseUser.uid);
        if (firebaseUser.email) {
          localStorage.setItem("userEmail", firebaseUser.email);
          // También asegurar sessionStorage por si acaso
          if (sessionStorage.getItem("idToken")) {
            sessionStorage.setItem("userEmail", firebaseUser.email);
          }
        }
      }

      setLoadingAuth(false);
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

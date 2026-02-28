// ============================================================
// 📁 src/hooks/useIdleTimeout.js
// ⏱️ Cierra la sesión automáticamente tras X minutos de inactividad
// ============================================================

import { useEffect, useRef, useCallback } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

// Eventos que cuentan como "actividad del usuario"
const ACTIVITY_EVENTS = [
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
    "click",
];

/**
 * useIdleTimeout
 * @param {number} timeoutMs  Tiempo de inactividad en ms (default: 30 min)
 * @param {function} onTimeout Callback opcional al cerrar sesión
 */
export default function useIdleTimeout(
    timeoutMs = 30 * 60 * 1000,
    onTimeout = null
) {
    const navigate = useNavigate();
    const timerRef = useRef(null);

    const logout = useCallback(async () => {
        // Limpiar storage (respetando rememberMe y rememberEmail)
        const keep = ["rememberMe", "rememberEmail"];
        Object.keys(localStorage).forEach((k) => {
            if (!keep.includes(k)) localStorage.removeItem(k);
        });
        sessionStorage.clear();

        await signOut(auth).catch(() => { });

        if (onTimeout) onTimeout();

        navigate("/login", { replace: true });
    }, [navigate, onTimeout]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logout, timeoutMs);
    }, [logout, timeoutMs]);

    useEffect(() => {
        // Arrancar el temporizador al montar
        resetTimer();

        // Reiniciar con cada evento de actividad
        ACTIVITY_EVENTS.forEach((ev) =>
            window.addEventListener(ev, resetTimer, { passive: true })
        );

        return () => {
            // Limpiar al desmontar
            if (timerRef.current) clearTimeout(timerRef.current);
            ACTIVITY_EVENTS.forEach((ev) =>
                window.removeEventListener(ev, resetTimer)
            );
        };
    }, [resetTimer]);
}

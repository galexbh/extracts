// UI para resolver el segundo factor durante el login
// Úsalo cuando captures el error "auth/multi-factor-auth-required"
import React, { useState } from "react";
import { resolveSignIn } from "../auth/mfaClient";

export default function MfaResolver({ resolver, onSuccess, onError }) {
  const [code6, setCode6] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    try {
      setLoading(true);
      setMsg("");
      const cred = await resolveSignIn(resolver, code6);
      setMsg("✅ Verificado. Sesión completada.");
      onSuccess && onSuccess(cred);
    } catch (e) {
      setMsg(e.message || "Código inválido o error al verificar TOTP.");
      onError && onError(e);
    } finally {
      setLoading(false);
    }
  };

  // Opcional: mostrar factores disponibles
  const factors = resolver?.hints || [];

  return (
    <div style={{ maxWidth: 360 }}>
      <h3>Verificación de segundo factor</h3>
      {factors.length > 1 && (
        <ul>
          {factors.map((f) => (
            <li key={f.uid}>{f.displayName || f.factorId}</li>
          ))}
        </ul>
      )}

      <input
        placeholder="Código de 6 dígitos"
        value={code6}
        onChange={(e) => setCode6(e.target.value.trim())}
        maxLength={6}
        style={{ padding: 8, width: "100%", boxSizing: "border-box" }}
      />

      <button onClick={submit} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? "Verificando..." : "Verificar código"}
      </button>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}

// ============================================================
// ✅ utils/validaciones.js (VERSIÓN SEGURA - SIN RECURSIÓN)
// ============================================================

// ==========================
// 💡 Requerido
// ==========================
export const validarRequerido = (valor, campo = "Campo") => {
  if (valor === null || valor === undefined) return `${campo} es obligatorio.`;
  if (valor === 0 || valor === "0") return `${campo} es obligatorio.`;
  if (String(valor).trim() === "") return `${campo} es obligatorio.`;
  return null;
};

// ============================================================
// 🔡 LETRAS
// ============================================================
const _soloLetras = (txt) => /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(String(txt ?? ""));

// helpers internos con nombres únicos (no exportados)
const _tieneNumero = (txt) => /[0-9]/.test(String(txt ?? ""));
const _tieneEspecialNoPermitido = (txt) =>
  /[^A-Za-zÁÉÍÓÚÑáéíóúñ\s]/.test(String(txt ?? ""));

// ✅ Validar solo letras (mensaje específico) - SIN RECURSIÓN
export const validarSoloLetras = (txt, campo = "Campo", requerida = true) => {
  const v = String(txt ?? "").trim();

  if (v === "") return requerida ? `${campo} es obligatorio.` : null;

  if (/[0-9]/.test(v)) return `${campo}: no se permiten números, solo letras.`;
  if (/[^A-Za-zÁÉÍÓÚÑáéíóúñ\s]/.test(v))
    return `${campo}: no se permiten caracteres especiales, solo letras.`;

  // ✅ AQUÍ ESTÁ LA CLAVE:
  // NO debe decir validarSoloLetras(v) porque eso se llama a sí misma
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(v))
    return `${campo}: solo se permiten letras.`;

  return null;
};

// ============================================================
// 🔢 NÚMEROS
// ============================================================
const _soloNumeros = (txt) => /^[0-9]+$/.test(String(txt ?? "").trim());
const _tieneLetra = (txt) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(String(txt ?? ""));

export const validarSoloNumeros = (txt, campo = "Campo", requerida = true) => {
  const v = String(txt ?? "").trim();

  if (v === "") return requerida ? `${campo} es obligatorio.` : null;

  if (_tieneLetra(v)) return `${campo}: no se permiten letras, solo números.`;
  if (/[^0-9]/.test(v))
    return `${campo}: no se permiten caracteres especiales, solo números.`;

  if (!_soloNumeros(v)) return `${campo}: solo se permiten números.`;
  return null;
};

// ============================================================
// 📞 TELÉFONO (Honduras) 8 dígitos + formato 9999-9999
// ============================================================
export const validarTelefono = (tel, requerida = true) => {
  const v = String(tel ?? "").trim();
  if (v === "") return requerida ? "Teléfono es obligatorio." : null;

  const limpio = v.replace(/-/g, "");

  if (_tieneLetra(limpio)) return "Teléfono: no se permiten letras, solo números.";
  if (/[^0-9]/.test(limpio))
    return "Teléfono: no se permiten caracteres especiales, solo números.";

  if (!/^[0-9]{8}$/.test(limpio)) return "Teléfono: debe tener 8 dígitos (9999-9999).";
  return null;
};

export const formatearTelefono = (tel) => {
  const limpio = String(tel ?? "").replace(/\D/g, "").slice(0, 8);
  return limpio.length >= 5 ? `${limpio.slice(0, 4)}-${limpio.slice(4)}` : limpio;
};

// ============================================================
// 🧾 RTN o ID (13 o 14 dígitos)
// ============================================================
export const validarRTN = (rtn, requerida = true) => {
  const v = String(rtn ?? "").trim();
  if (v === "") return requerida ? "RTN o ID es obligatorio." : null;

  if (_tieneLetra(v)) return "RTN o ID: no se permiten letras, solo números.";
  if (/[^0-9]/.test(v))
    return "RTN o ID: no se permiten caracteres especiales, solo números.";

  if (v.length !== 13 && v.length !== 14)
    return "RTN o ID debe tener 13 (Identidad) o 14 (RTN) dígitos.";

  return null;
};

export const detectarTipoRTNoID = (valor) => {
  const v = String(valor ?? "").trim();
  if (!/^[0-9]+$/.test(v)) return null;
  if (v.length === 13) return "Identidad";
  if (v.length === 14) return "RTN";
  return null;
};

// ============================================================
// 📧 EMAIL
// ============================================================
export const validarEmail = (email, requerida = true) => {
  const v = String(email ?? "").trim();
  if (v === "") return requerida ? "Correo es obligatorio." : null;

  const regex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|hn|net|org|edu|info|gob)$/;

  if (!regex.test(v)) return "Debe ingresar un correo válido.";
  return null;
};

export const validarEmailSeguridad = (email, requerida = true) => {
  const v = String(email ?? "").trim();
  if (v === "") return requerida ? "Correo es obligatorio." : null;

  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!regex.test(v))
    return "Debe ingresar un correo válido (ej. usuario@dominio.com).";
  return null;
};

// ============================================================
// 🔠 LONGITUD MÍNIMA
// ============================================================
export const validarLongitudMinima = (valor, campo = "Campo", min = 3) => {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  if (texto.length > 0 && texto.length < min)
    return `${campo} debe tener al menos ${min} caracteres.`;
  return null;
};

// ============================================================
// 🔐 CONTRASEÑA
// ============================================================
export const validarPassword = (password, requerida = true) => {
  const v = String(password ?? "");

  if (v.trim() === "") return requerida ? "La contraseña es obligatoria." : null;
  if (v.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(v)) return "La contraseña debe incluir al menos una letra mayúscula.";
  if (!/[a-z]/.test(v)) return "La contraseña debe incluir al menos una letra minúscula.";
  if (!/[0-9]/.test(v)) return "La contraseña debe incluir al menos un número.";
  if (!/[^A-Za-z0-9]/.test(v))
    return "La contraseña debe incluir al menos un carácter especial (ej. @, #, !).";

  return null;
};
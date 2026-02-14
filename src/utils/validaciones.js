// ==========================
// 💡 Validar campo obligatorio
// ==========================
export const validarRequerido = (valor, campo = "Campo") => {
  if (valor === null || valor === undefined) {
    return `${campo} es obligatorio.`;
  }
  //ya no devuelve un valor vacio 
  if (String(valor).trim() === "") {
    return `${campo} es obligatorio.`;
  }
  return null;
};

// ==========================
// 🔡 Solo letras
// ==========================
export const soloLetras = (txt) =>
  /^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(txt);

// ==========================
// 📞 Validar teléfono
// ==========================
export const validarTelefono = (tel) => {
  const limpio = tel.replace("-", "");
  if (!/^[0-9]{8}$/.test(limpio)) return "Debe tener 8 dígitos (9999-9999)";
  return null;
};

export const formatearTelefono = (tel) => {
  const limpio = tel.replace(/\D/g, "").slice(0, 8);
  return limpio.length >= 5
    ? `${limpio.slice(0, 4)}-${limpio.slice(4)}`
    : limpio;
};

// ==========================
// 🧾 Validar RTN
// ==========================
export const validarRTN = (rtn) => {
  if (!/^[0-9]{14}$/.test(rtn)) return "El RTN debe tener 14 dígitos numéricos.";
  return null;
};

// ==========================
// 📧 Validar Email
// ==========================
export const validarEmail = (email) => {
  const regex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|hn|net|org|edu|info|gob)$/;
  if (!regex.test(email)) return "Debe ingresar un correo válido.";
  return null;
};

// ==========================
// Validar Longitud Mínima
// ==========================
export const validarLongitudMinima = (valor, campo = "Campo", min = 3) => {
  if (valor === null || valor === undefined) return null; // Ya lo maneja validarRequerido
  
  const texto = String(valor).trim();
  
  if (texto.length > 0 && texto.length < min) {
    return `${campo} debe tener al menos ${min} caracteres.`;
  }
  return null;
};

// ==========================
// Validar Email Seguridad 
// ==========================
export const validarEmailSeguridad = (email) => {
  if (email === null || email === undefined) return null;
  const emailLimpio = String(email).trim(); 
  if (emailLimpio === "") return null;

  const regex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(com|hn|net|org|edu|info|gob)$/;
  if (!regex.test(emailLimpio)) return "Debe ingresar un correo válido.";
  return null;
};



// src/utils/firebaseErrors.js

export function traducirErrorFirebase(errorCode, errorMessage = "") {
  switch (errorCode) {
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";

    case "auth/password-does-not-meet-requirements":
      return "Tu contraseña no cumple los requisitos de seguridad: debe incluir al menos 6 caracteres, una letra mayúscula, una minúscula, un número y un símbolo.";

    case "auth/policy-enforced":
      return "Tu contraseña no cumple con las políticas de seguridad establecidas.";

    case "auth/email-already-in-use":
      return "Este correo ya está registrado.";

    case "auth/invalid-email":
      return "El formato del correo no es válido.";

    case "auth/user-not-found":
      return "No se encontró una cuenta con ese correo.";

    case "auth/wrong-password":
      return "La contraseña ingresada es incorrecta.";

    default:
      // Si Firebase devuelve un mensaje largo (como el de tu captura)
      if (errorMessage.includes("Password must contain")) {
        return "Tu contraseña no cumple los requisitos: debe tener al menos 6 caracteres, una mayúscula, una minúscula, un número y un carácter especial.";
      }
      return "Ocurrió un error al procesar tu solicitud.";
  }
}

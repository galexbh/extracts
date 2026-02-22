
// src/utils/firebaseErrors.js

export function traducirErrorFirebase(errorCode, errorMessage = "") {
  switch (errorCode) {
    // ─── Credenciales ────────────────────────────────────────────
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "Correo o contraseña incorrectos.";

    case "auth/user-not-found":
      return "No se encontró una cuenta con ese correo.";

    case "auth/user-disabled":
      return "Esta cuenta ha sido deshabilitada. Contacta al administrador.";

    // ─── Correo ──────────────────────────────────────────────────
    case "auth/invalid-email":
      return "El formato del correo electrónico no es válido.";

    case "auth/email-already-in-use":
      return "Este correo ya está registrado en el sistema.";

    case "auth/missing-email":
      return "Por favor ingresa un correo electrónico.";

    // ─── Contraseña ──────────────────────────────────────────────
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";

    case "auth/password-does-not-meet-requirements":
      return "La contraseña no cumple los requisitos: mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.";

    case "auth/policy-enforced":
      return "La contraseña no cumple las políticas de seguridad establecidas.";

    // ─── Sesión y límites ────────────────────────────────────────
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.";

    case "auth/network-request-failed":
      return "Error de conexión. Verifica tu acceso a internet.";

    case "auth/operation-not-allowed":
      return "Este método de inicio de sesión no está habilitado.";

    case "auth/requires-recent-login":
      return "Por seguridad, vuelve a iniciar sesión para continuar.";

    // ─── Restablecimiento ────────────────────────────────────────
    case "auth/expired-action-code":
      return "El enlace de restablecimiento ha expirado. Solicita uno nuevo.";

    case "auth/invalid-action-code":
      return "El enlace de restablecimiento no es válido o ya fue usado.";

    // ─── Popup/Proveedor ─────────────────────────────────────────
    case "auth/popup-closed-by-user":
      return "Cerraste la ventana de inicio de sesión antes de completar el proceso.";

    case "auth/cancelled-popup-request":
      return "La solicitud de inicio de sesión fue cancelada.";

    // ─── Default ─────────────────────────────────────────────────
    default:
      if (errorMessage && errorMessage.includes("Password must contain")) {
        return "La contraseña no cumple los requisitos: debe tener mayúscula, minúscula, número y carácter especial.";
      }
      return "Ocurrió un error inesperado. Inténtalo de nuevo.";
  }
}

type AuthLikeError = {
  message?: string;
  code?: string;
  status?: number;
} | null | undefined;

const includesAny = (value: string, terms: string[]) =>
  terms.some((term) => value.includes(term));

export function getAuthErrorMessage(
  error: AuthLikeError,
  fallback = "No pudimos completar la acción. Inténtalo de nuevo."
) {
  if (!error) return fallback;

  const code = String(error.code || "").toLowerCase();
  const message = String(error.message || "").toLowerCase();
  const value = `${code} ${message}`;

  if (
    includesAny(value, [
      "invalid login credentials",
      "invalid_credentials",
      "invalid_grant",
    ])
  ) {
    return "El correo o la contraseña no son correctos.";
  }

  if (includesAny(value, ["email not confirmed", "email_not_confirmed"])) {
    return "Primero debes confirmar tu correo electrónico. Revisa tu bandeja de entrada.";
  }

  if (
    includesAny(value, [
      "user already registered",
      "user_already_exists",
      "email address already registered",
    ])
  ) {
    return "Ya existe una cuenta con este correo electrónico. Intenta iniciar sesión.";
  }

  if (
    includesAny(value, [
      "password should be at least",
      "weak_password",
      "password is too short",
    ])
  ) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  if (
    includesAny(value, [
      "email rate limit exceeded",
      "over_email_send_rate_limit",
      "rate limit",
      "too many requests",
    ])
  ) {
    return "Has hecho varios intentos seguidos. Espera un momento antes de volver a intentarlo.";
  }

  if (includesAny(value, ["signup is disabled", "signup_disabled"])) {
    return "El registro de nuevas cuentas está temporalmente deshabilitado.";
  }

  if (includesAny(value, ["email address is invalid", "invalid_email"])) {
    return "Escribe un correo electrónico válido.";
  }

  if (includesAny(value, ["same password", "same_password"])) {
    return "La nueva contraseña debe ser diferente a la anterior.";
  }

  if (includesAny(value, ["otp expired", "otp_expired", "token has expired"])) {
    return "Este enlace ya venció. Solicita uno nuevo e inténtalo otra vez.";
  }

  return fallback;
}

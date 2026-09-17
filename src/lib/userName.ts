type UserMetadata = Record<string, unknown> | null | undefined;

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export function getPreferredUserName(metadata: UserMetadata, email?: string | null) {
  const preferred = clean(metadata?.preferred_name);
  if (preferred) return preferred;

  const firstName = clean(metadata?.first_name);
  if (firstName) return firstName;

  const fullName = clean(metadata?.full_name);
  if (fullName) return fullName.split(/\s+/)[0] || fullName;

  return email?.split("@")[0] || "Mi perfil";
}

export function getFullUserName(metadata: UserMetadata) {
  const fullName = clean(metadata?.full_name);
  if (fullName) return fullName;

  const firstName = clean(metadata?.first_name);
  const lastName = clean(metadata?.last_name);
  return [firstName, lastName].filter(Boolean).join(" ") || "Usuario";
}

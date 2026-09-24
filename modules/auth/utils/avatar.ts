export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AVATAR_ACCEPT = AVATAR_TYPES.join(",");
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

// Misma validación que /api/profile/avatar, para avisar antes de subir.
export function avatarFileError(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return "La foto debe ser JPG, PNG o WebP.";
  if (file.size > MAX_AVATAR_BYTES) return "La foto debe pesar como máximo 2 MB.";
  return null;
}

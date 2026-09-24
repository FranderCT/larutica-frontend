import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { profileRowToSystemUser, type ProfileRow } from "@/lib/supabase/profiles";
import { requireAppSession } from "@/lib/supabase/session";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Solo se borran archivos propios del bucket de avatares.
function ownAvatarPath(url: string | null | undefined, userId: string) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  const path = decodeURIComponent(url.slice(index + marker.length));
  return path.startsWith(`${userId}/`) ? path : null;
}

export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const appSession = await requireAppSession(request);
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) throw new ApiError("Debes seleccionar una imagen.", 400);
    const extension = AVATAR_EXTENSIONS[file.type];
    if (!extension) throw new ApiError("La foto debe ser JPG, PNG o WebP.", 400);
    if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) {
      throw new ApiError("La foto debe pesar como máximo 2 MB.", 400);
    }

    const userId = appSession.session.userId;
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const admin = getSupabaseAdminClient();
    const { error: uploadError } = await admin.storage
      .from(AVATAR_BUCKET)
      .upload(path, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const { data, error } = await admin
      .from("profiles")
      .update({ avatar_url: publicUrl.publicUrl })
      .eq("id", userId)
      .select("*")
      .single();
    if (error || !data) {
      await admin.storage.from(AVATAR_BUCKET).remove([path]);
      throw error ?? new ApiError("No se pudo guardar la foto de perfil.", 500);
    }

    const previous = ownAvatarPath(appSession.profile.avatar_url, userId);
    if (previous) await admin.storage.from(AVATAR_BUCKET).remove([previous]);

    return Response.json(
      { data: profileRowToSystemUser(data as ProfileRow) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

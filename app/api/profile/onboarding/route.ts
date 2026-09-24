import { assertSameOrigin, ApiError, apiErrorResponse } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { getSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { profileRowToSystemUser, type ProfileRow } from "@/lib/supabase/profiles";
import { requireAppSession } from "@/lib/supabase/session";

// Marca la bienvenida como vista, tanto si el usuario la completó como si la omitió.
export async function POST(request: Request) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const appSession = await requireAppSession(request);
    if (appSession.profile.onboarding_completed_at) {
      return Response.json(
        { data: profileRowToSystemUser(appSession.profile) },
        { headers: { "cache-control": "no-store" } },
      );
    }

    const { data, error } = await getSupabaseAdminClient()
      .from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", appSession.session.userId)
      .select("*")
      .single();
    if (error || !data) throw error ?? new ApiError("No se pudo finalizar la bienvenida.", 500);
    return Response.json(
      { data: profileRowToSystemUser(data as ProfileRow) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

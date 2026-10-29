import { assertSameOrigin } from "@/lib/api/errors";
import { proxyRemoteApiRequest } from "@/lib/api/remote-proxy";
import { assertUuid } from "@/lib/payments/admin";
import { refundPromotionByAdmin } from "@/lib/payments/promotion";
import { adminErrorResponse, requireAdmin } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const remote = await proxyRemoteApiRequest(request);
  if (remote) return remote;

  try {
    assertSameOrigin(request);
    const { admin } = await requireAdmin(request);
    const { id } = await context.params;
    await refundPromotionByAdmin(admin, assertUuid(id, "El pago"));
    return Response.json({ data: { refunded: true } }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

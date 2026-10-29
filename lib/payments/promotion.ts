import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import {
  createOnvoPaymentIntent,
  createOnvoRefund,
  extractNumber,
  extractString,
  fetchOnvoPaymentIntent,
  fromMinorUnits,
  getOnvoPublishableKey,
  mapOnvoStatus,
  type PaymentStatus,
} from "@/lib/payments/onvo";
import {
  PROMOTION_PRICE_USD,
  canStartPromotion,
  decidePromotionSettlement,
  promotionEndsAt,
  type PromotionDecision,
} from "@/lib/promotions/window";

const CURRENCY = "USD" as const;
const PAYMENT_COLUMNS = "id, publication_id, provider_payment_id, amount, currency, status, refunded_amount";

type PromotionPaymentRow = {
  id: string;
  publication_id: string;
  provider_payment_id: string;
  amount: number | string;
  currency: string;
  status: PaymentStatus;
  refunded_amount: number | string;
};

type AgencyLink = { owner_user_id: string } | { owner_user_id: string }[] | null;

export type OwnedPublication = {
  id: string;
  title: string | null;
  status: string;
  promotedUntil: string | null;
  ownerUserId: string;
};

export type StartedPromotionPayment = {
  paymentIntentId: string;
  publishableKey: string;
  amount: number;
  currency: typeof CURRENCY;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function money(value: number | string): number {
  return Math.round(Number(value) * 100) / 100;
}

function ownerId(agency: AgencyLink): string | null {
  if (!agency) return null;
  const row = Array.isArray(agency) ? agency[0] : agency;
  return row?.owner_user_id ?? null;
}

export async function getOwnedPublication(
  admin: SupabaseClient,
  publicationId: string,
  userId: string,
): Promise<OwnedPublication | null> {
  const { data, error } = await admin
    .from("publications")
    .select("id, title, status, promoted_until, agencies!inner(owner_user_id)")
    .eq("id", publicationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    id: string;
    title: string | null;
    status: string;
    promoted_until: string | null;
    agencies: AgencyLink;
  };
  const owner = ownerId(row.agencies);
  if (!owner || owner !== userId) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    promotedUntil: row.promoted_until,
    ownerUserId: owner,
  };
}

async function listPayments(admin: SupabaseClient, publicationId: string): Promise<PromotionPaymentRow[]> {
  const { data, error } = await admin.from("publication_promotion_payments").select(PAYMENT_COLUMNS)
    .eq("publication_id", publicationId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PromotionPaymentRow[];
}

async function loadPublicationWindow(admin: SupabaseClient, publicationId: string): Promise<string | null> {
  const { data, error } = await admin.from("publications").select("promoted_until").eq("id", publicationId).maybeSingle();
  if (error) throw error;
  return (data as { promoted_until: string | null } | null)?.promoted_until ?? null;
}

async function refundPromotionPayment(
  admin: SupabaseClient,
  payment: PromotionPaymentRow,
  event: Record<string, unknown>,
): Promise<void> {
  const amount = money(payment.amount);
  const refund = await createOnvoRefund(payment.provider_payment_id, amount);
  await admin.from("publication_promotion_payments").update({
    status: "refunded",
    refunded_amount: amount,
    refunded_at: new Date().toISOString(),
    provider_refund_id: refund.id ?? null,
    last_event: event,
  }).eq("id", payment.id);
}

async function applyDecision(
  admin: SupabaseClient,
  payment: PromotionPaymentRow,
  decision: PromotionDecision,
  event: Record<string, unknown>,
): Promise<void> {
  if (decision.action === "unchanged") return;
  if (decision.action === "refund") {
    await refundPromotionPayment(admin, payment, event);
    return;
  }
  const paidAt = new Date().toISOString();
  const { error: publicationError } = await admin.from("publications").update({
    promoted_until: decision.promotedUntil,
  }).eq("id", payment.publication_id);
  if (publicationError) throw publicationError;
  const { error: paymentError } = await admin.from("publication_promotion_payments").update({
    status: "paid",
    paid_at: paidAt,
    last_event: event,
  }).eq("id", payment.id).eq("status", payment.status);
  if (paymentError) throw paymentError;
}

/**
 * Reembolso total hecho por un admin. Si la ventana de la publicación todavía es la de este cobro,
 * se cierra; si un cobro posterior la extendió, se conserva.
 */
export async function refundPromotionByAdmin(admin: SupabaseClient, paymentId: string): Promise<void> {
  const { data, error } = await admin.from("publication_promotion_payments").select(`${PAYMENT_COLUMNS}, paid_at`)
    .eq("id", paymentId).maybeSingle();
  if (error) throw error;
  const payment = data as (PromotionPaymentRow & { paid_at: string | null }) | null;
  if (!payment) throw new ApiError("El pago de la promoción no existe.", 404);
  if (payment.status === "refunded") throw new ApiError("Este pago ya fue reembolsado.", 409);
  if (payment.status !== "paid") throw new ApiError("Solo se puede reembolsar un pago ya cobrado.", 409);

  await refundPromotionPayment(admin, payment, { source: "admin-refund" });

  const windowEnd = payment.paid_at ? Date.parse(promotionEndsAt(Date.parse(payment.paid_at))) : NaN;
  const current = await loadPublicationWindow(admin, payment.publication_id);
  if (current && Date.parse(current) === windowEnd) {
    const { error: closeError } = await admin.from("publications").update({ promoted_until: null })
      .eq("id", payment.publication_id);
    if (closeError) throw closeError;
  }
}

/** Crea o reutiliza la intención de 12 USD. El navegador no envía el monto. */
export async function startPromotionPayment(
  admin: SupabaseClient,
  publication: OwnedPublication,
  userId: string,
): Promise<StartedPromotionPayment> {
  const now = Date.now();
  if (!canStartPromotion(publication.status, publication.promotedUntil, now)) {
    if (publication.status !== "APPROVED") {
      throw new ApiError("Solo una publicación aprobada puede promocionarse.", 400);
    }
    throw new ApiError("Esta publicación ya está promocionada.", 409);
  }
  const amount = PROMOTION_PRICE_USD;
  const payments = await listPayments(admin, publication.id);
  for (const payment of payments.filter((row) => row.status === "pending" && money(row.amount) === amount)) {
    const intent = await fetchOnvoPaymentIntent(payment.provider_payment_id);
    const status = mapOnvoStatus(intent.status);
    if (status === "pending") {
      return { paymentIntentId: intent.id, publishableKey: getOnvoPublishableKey(), amount, currency: CURRENCY };
    }
    await applyPromotionPaymentStatus(admin, intent.id, status, { source: "start", paymentIntent: intent });
    if (status === "paid") throw new ApiError("Esta publicación ya está promocionada.", 409);
  }

  const intent = await createOnvoPaymentIntent({
    amount,
    currency: CURRENCY,
    description: `LaRutica · Promoción · ${publication.title ?? "Publicación"}`.slice(0, 200),
    metadata: { publicationId: publication.id, ownerUserId: userId, kind: "promotion" },
  });
  const { error } = await admin.from("publication_promotion_payments").insert({
    publication_id: publication.id,
    provider_payment_id: intent.id,
    amount,
    currency: CURRENCY,
    status: mapOnvoStatus(intent.status),
  });
  if (error) {
    if (error.code === "23505") {
      const pending = (await listPayments(admin, publication.id)).find((row) => row.status === "pending");
      if (pending) {
        return {
          paymentIntentId: pending.provider_payment_id,
          publishableKey: getOnvoPublishableKey(),
          amount,
          currency: CURRENCY,
        };
      }
    }
    throw error;
  }
  return { paymentIntentId: intent.id, publishableKey: getOnvoPublishableKey(), amount, currency: CURRENCY };
}

export async function applyPromotionPaymentStatus(
  admin: SupabaseClient,
  providerPaymentId: string,
  next: PaymentStatus,
  event: Record<string, unknown>,
): Promise<PromotionPaymentRow | null> {
  const { data, error } = await admin.from("publication_promotion_payments").select(PAYMENT_COLUMNS)
    .eq("provider_payment_id", providerPaymentId).maybeSingle();
  if (error) throw error;
  const payment = data as PromotionPaymentRow | null;
  if (!payment) return null;
  if (payment.status === "paid" || payment.status === "refunded" || payment.status === next) return payment;

  if (next !== "paid") {
    const { error: updateError } = await admin.from("publication_promotion_payments").update({
      status: next,
      last_event: event,
    }).eq("id", payment.id).eq("status", payment.status);
    if (updateError) throw updateError;
    return payment;
  }

  const promotedUntil = await loadPublicationWindow(admin, payment.publication_id);
  const decision = decidePromotionSettlement({ promotedUntil, onvoStatus: "paid", now: Date.now() });
  await applyDecision(admin, payment, decision, event);
  return payment;
}

export async function confirmPromotionPayment(
  admin: SupabaseClient,
  publication: OwnedPublication,
  paymentIntentId: string,
): Promise<{ promotedUntil: string | null }> {
  const payments = await listPayments(admin, publication.id);
  if (!payments.some((payment) => payment.provider_payment_id === paymentIntentId)) {
    throw new ApiError("Este pago no pertenece a la publicación.", 404);
  }
  let intent = await fetchOnvoPaymentIntent(paymentIntentId);
  for (let attempt = 0; attempt < 4 && mapOnvoStatus(intent.status) !== "paid"; attempt++) {
    await sleep(750);
    intent = await fetchOnvoPaymentIntent(paymentIntentId);
  }
  const status = mapOnvoStatus(intent.status);
  if (status !== "paid") {
    throw new ApiError("El pago todavía no está confirmado. Si se te cobró, se reflejará en unos minutos.", 409);
  }
  await applyPromotionPaymentStatus(admin, paymentIntentId, "paid", { source: "client-confirm", paymentIntent: intent });
  return { promotedUntil: await loadPublicationWindow(admin, publication.id) };
}

export async function applyPromotionRefundEvent(
  admin: SupabaseClient,
  providerPaymentId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await admin.from("publication_promotion_payments").select(PAYMENT_COLUMNS)
    .eq("provider_payment_id", providerPaymentId).maybeSingle();
  if (error) throw error;
  const payment = data as PromotionPaymentRow | null;
  if (!payment) return;
  const minor = extractNumber(payload, ["data.amount", "data.object.amount", "amount"]);
  const refunded = Math.max(money(payment.refunded_amount), minor === undefined ? 0 : fromMinorUnits(minor));
  await admin.from("publication_promotion_payments").update({
    refunded_amount: refunded,
    refunded_at: new Date().toISOString(),
    provider_refund_id: extractString(payload, ["data.id", "data.object.id", "refundId"]) ?? null,
    status: refunded >= money(payment.amount) ? "refunded" : payment.status,
    last_event: payload,
  }).eq("id", payment.id);
}

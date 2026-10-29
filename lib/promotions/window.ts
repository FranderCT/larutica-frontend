export const PROMOTION_PRICE_USD = 12;
export const PROMOTION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type PromotionSortKey = {
  promotedUntil: string | null;
  createdAt: string;
};

export type PromotionDecision =
  | { action: "unchanged" }
  | { action: "promote"; promotedUntil: string }
  | { action: "refund" };

export function isPromotionActive(promotedUntil: string | null | undefined, now: number): boolean {
  if (!promotedUntil) return false;
  const end = Date.parse(promotedUntil);
  return Number.isFinite(end) && end > now;
}

export function promotionEndsAt(paidAt: number): string {
  return new Date(paidAt + PROMOTION_DURATION_MS).toISOString();
}

/** Activas primero, la que vence más tarde primero, luego las más recientes. Una fecha vencida no adelanta a una nunca promocionada. */
export function comparePromotedPublications(a: PromotionSortKey, b: PromotionSortKey, now: number): number {
  const aActive = isPromotionActive(a.promotedUntil, now);
  const bActive = isPromotionActive(b.promotedUntil, now);
  if (aActive !== bActive) return aActive ? -1 : 1;
  if (aActive && bActive) {
    const byEnd = Date.parse(b.promotedUntil ?? "") - Date.parse(a.promotedUntil ?? "");
    if (byEnd !== 0) return byEnd;
  }
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

export function catalogPromotionFlag(promotedUntil: string | null | undefined, now: number): { promoted: boolean } {
  return { promoted: isPromotionActive(promotedUntil, now) };
}

export function canStartPromotion(status: string, promotedUntil: string | null | undefined, now: number): boolean {
  return status === "APPROVED" && !isPromotionActive(promotedUntil, now);
}

/** Un cobro que Onvo no acepta deja la ventana igual. Si ya hay una ventana abierta, el cobro duplicado se devuelve. */
export function decidePromotionSettlement(input: {
  promotedUntil: string | null;
  onvoStatus: "pending" | "paid" | "failed" | "canceled" | "expired" | "refunded";
  now: number;
}): PromotionDecision {
  if (input.onvoStatus !== "paid") return { action: "unchanged" };
  if (isPromotionActive(input.promotedUntil, input.now)) return { action: "refund" };
  return { action: "promote", promotedUntil: promotionEndsAt(input.now) };
}

/** Si el intento no está en los pagos de reserva, el webhook lo liquida como promoción. */
export function settlementTarget(reservationPayment: { id: string } | null): "reservation" | "promotion" {
  return reservationPayment ? "reservation" : "promotion";
}

export const PROMOTION_EXPIRING_SOON_MS = 48 * 60 * 60 * 1000;

export type PromotionPeriodState = "active" | "expiring" | "expired" | "none";

/** Estado de la ventana de un cobro: sin pago aceptado no hay periodo. Un reembolso la cierra. */
export function promotionPeriodState(
  payment: { status: string; expiresAt: string | null },
  now: number,
): PromotionPeriodState {
  if (payment.status !== "paid" || !payment.expiresAt) return "none";
  const end = Date.parse(payment.expiresAt);
  if (!Number.isFinite(end) || end <= now) return "expired";
  return end - now <= PROMOTION_EXPIRING_SOON_MS ? "expiring" : "active";
}

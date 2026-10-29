import { apiFetch } from "@/lib/api/browser-fetch";
import type {
  AdminPaymentRow,
  AdminPromotionPaymentRow,
  AgencyBalance,
  Settlement,
  SettlementInput,
} from "@/lib/payments/admin";

export type { AdminPaymentRow, AdminPromotionPaymentRow, AgencyBalance, Settlement, SettlementInput };

export type PaymentFilters = {
  agencyId?: string;
  status?: string;
  from?: string;
  to?: string;
};

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { data?: T; message?: string; error?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? body?.error ?? "No pudimos completar la solicitud.");
  return body?.data as T;
}

export async function getAgencyBalances(): Promise<AgencyBalance[]> {
  return parse(await apiFetch("/api/admin/payments/balances", { credentials: "include" }));
}

export async function getAdminPayments(filters: PaymentFilters): Promise<AdminPaymentRow[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return parse(await apiFetch(`/api/admin/payments${params.size ? `?${params}` : ""}`, { credentials: "include" }));
}

export async function getSettlements(agencyId?: string): Promise<Settlement[]> {
  const query = agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : "";
  return parse(await apiFetch(`/api/admin/settlements${query}`, { credentials: "include" }));
}

export async function postSettlement(input: SettlementInput): Promise<Settlement> {
  return parse(await apiFetch("/api/admin/settlements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  }));
}

export async function patchAgencyCommission(agencyId: string, commissionRate: number): Promise<void> {
  await parse(await apiFetch(`/api/admin/agencies/${encodeURIComponent(agencyId)}/commission`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ commissionRate }),
  }));
}

export async function getAdminPromotionPayments(filters: PaymentFilters): Promise<AdminPromotionPaymentRow[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return parse(await apiFetch(`/api/admin/promotions${params.size ? `?${params}` : ""}`, { credentials: "include" }));
}

export async function refundPromotionPayment(paymentId: string): Promise<void> {
  await parse(await apiFetch(`/api/admin/promotions/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    credentials: "include",
  }));
}

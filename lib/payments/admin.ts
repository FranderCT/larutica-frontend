import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";
import { promotionEndsAt } from "@/lib/promotions/window";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYMENT_STATUSES = ["pending", "paid", "failed", "canceled", "expired", "refunded"] as const;
const SETTLEMENT_COLUMNS =
  "id, agency_id, kind, amount, occurred_on, method, reference, notes, created_at, agencies ( commercial_name ), profiles ( full_name )";

export type SettlementKind = "PAYOUT" | "ADJUSTMENT";

export type AdminPaymentRow = {
  paymentId: string;
  reservationId: string;
  status: string;
  amount: number;
  refundedAmount: number;
  commissionRate: number;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  passengerName: string;
  passengerEmail: string;
  publicationTitle: string;
  departureStartAt: string;
  numberOfPeople: number;
  agencyId: string;
  agencyName: string;
};

export type AgencyBalance = {
  agencyId: string;
  agencyName: string;
  commissionRate: number;
  paymentsCount: number;
  gross: number;
  refunded: number;
  net: number;
  commission: number;
  owed: number;
  payouts: number;
  adjustments: number;
  balance: number;
};

export type AdminPromotionPaymentRow = {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  refundedAmount: number;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  /** Fin de la ventana de 7 días de este cobro. Null si nunca se pagó. */
  expiresAt: string | null;
  publicationId: string;
  publicationTitle: string;
  agencyId: string;
  agencyName: string;
};

export type Settlement = {
  id: string;
  agencyId: string;
  agencyName: string;
  kind: SettlementKind;
  amount: number;
  occurredOn: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type SettlementInput = {
  agencyId: string;
  kind: SettlementKind;
  amount: number;
  occurredOn?: string;
  method?: string;
  reference?: string;
  notes?: string;
};

const cents = (value: number | string | null | undefined) => Math.round(Number(value ?? 0) * 100) / 100;

function fail(message: string, status = 400): never {
  throw new ApiError(message, status);
}

function asRecord(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("El cuerpo de la solicitud no es válido.");
  return body as Record<string, unknown>;
}

function optionalText(value: unknown, label: string, max: number): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") fail(`${label} no es válido.`);
  const text = value.trim();
  if (text.length > max) fail(`${label} es demasiado largo.`);
  return text || undefined;
}

export function assertUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) fail(`${label} no es válido.`);
  return value;
}

export function parseSettlementBody(body: unknown): SettlementInput {
  const record = asRecord(body);
  const kind = record.kind;
  if (kind !== "PAYOUT" && kind !== "ADJUSTMENT") fail("El tipo de movimiento no es válido.");
  const amount = record.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || Math.abs(amount) > 10_000_000) {
    fail("Indica un monto válido.");
  }
  const rounded = cents(amount);
  if (rounded === 0) fail("El monto no puede ser cero.");
  if (kind === "PAYOUT" && rounded < 0) fail("Un pago a la agencia debe ser mayor que cero. Para corregir usa un ajuste.");
  const occurredOn = optionalText(record.occurredOn, "La fecha", 10);
  if (occurredOn !== undefined) {
    const parsed = new Date(`${occurredOn}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== occurredOn) {
      fail("La fecha no es válida.");
    }
  }
  const notes = optionalText(record.notes, "La nota", 500);
  if (kind === "ADJUSTMENT" && !notes) fail("Explica el motivo del ajuste en la nota.");
  return {
    agencyId: assertUuid(record.agencyId, "La agencia"),
    kind,
    amount: rounded,
    occurredOn,
    method: optionalText(record.method, "El método", 60),
    reference: optionalText(record.reference, "La referencia", 120),
    notes,
  };
}

export function parseCommissionBody(body: unknown): number {
  const rate = asRecord(body).commissionRate;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 100) {
    fail("La comisión debe estar entre 0 y 100.");
  }
  return cents(rate);
}

export type PaymentFilters = {
  agencyId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export function parsePaymentFilters(params: URLSearchParams): PaymentFilters {
  const filters: PaymentFilters = {};
  const agencyId = params.get("agencyId");
  if (agencyId) filters.agencyId = assertUuid(agencyId, "La agencia");
  const status = params.get("status");
  if (status) {
    if (!(PAYMENT_STATUSES as readonly string[]).includes(status)) fail("El estado no es válido.");
    filters.status = status;
  }
  for (const key of ["from", "to"] as const) {
    const value = params.get(key);
    if (!value) continue;
    if (Number.isNaN(Date.parse(value))) fail("La fecha no es válida.");
    filters[key] = new Date(value).toISOString();
  }
  const limit = Number(params.get("limit") ?? 500);
  const offset = Number(params.get("offset") ?? 0);
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(offset) || offset < 0) fail("La paginación no es válida.");
  filters.limit = Math.min(limit, 1000);
  filters.offset = offset;
  return filters;
}

type PaymentRowDb = {
  payment_id: string;
  reservation_id: string;
  status: string;
  amount: number | string;
  refunded_amount: number | string;
  commission_rate: number | string;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  passenger_name: string;
  passenger_email: string;
  publication_title: string;
  departure_start_at: string;
  number_of_people: number;
  agency_id: string;
  agency_name: string;
};

export async function listPaymentRows(admin: SupabaseClient, filters: PaymentFilters): Promise<AdminPaymentRow[]> {
  const { data, error } = await admin.rpc("admin_payment_rows", {
    p_agency_id: filters.agencyId ?? null,
    p_status: filters.status ?? null,
    p_from: filters.from ?? null,
    p_to: filters.to ?? null,
    p_limit: filters.limit ?? 500,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw error;
  return ((data ?? []) as PaymentRowDb[]).map((row) => ({
    paymentId: row.payment_id,
    reservationId: row.reservation_id,
    status: row.status,
    amount: cents(row.amount),
    refundedAmount: cents(row.refunded_amount),
    commissionRate: Number(row.commission_rate),
    createdAt: row.created_at,
    paidAt: row.paid_at,
    refundedAt: row.refunded_at,
    passengerName: row.passenger_name,
    passengerEmail: row.passenger_email,
    publicationTitle: row.publication_title,
    departureStartAt: row.departure_start_at,
    numberOfPeople: row.number_of_people,
    agencyId: row.agency_id,
    agencyName: row.agency_name,
  }));
}

type PromotionPaymentRowDb = {
  id: string;
  status: string;
  amount: number | string;
  currency: string;
  refunded_amount: number | string;
  created_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  publications: {
    id: string;
    title: string | null;
    agency_id: string;
    agencies: { commercial_name: string } | { commercial_name: string }[] | null;
  } | null;
};

const PROMOTION_COLUMNS =
  "id, status, amount, currency, refunded_amount, created_at, paid_at, refunded_at, publications!inner ( id, title, agency_id, agencies ( commercial_name ) )";

export async function listPromotionPayments(
  admin: SupabaseClient,
  filters: PaymentFilters,
): Promise<AdminPromotionPaymentRow[]> {
  let query = admin.from("publication_promotion_payments").select(PROMOTION_COLUMNS)
    .order("created_at", { ascending: false })
    .range(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 500) - 1);
  if (filters.agencyId) query = query.eq("publications.agency_id", filters.agencyId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lt("created_at", filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as PromotionPaymentRowDb[]).flatMap((row) => {
    const publication = one(row.publications);
    if (!publication) return [];
    return [{
      paymentId: row.id,
      status: row.status,
      amount: cents(row.amount),
      currency: row.currency,
      refundedAmount: cents(row.refunded_amount),
      createdAt: row.created_at,
      paidAt: row.paid_at,
      refundedAt: row.refunded_at,
      expiresAt: row.paid_at ? promotionEndsAt(Date.parse(row.paid_at)) : null,
      publicationId: publication.id,
      publicationTitle: publication.title ?? "",
      agencyId: publication.agency_id,
      agencyName: one(publication.agencies)?.commercial_name ?? "",
    }];
  });
}

type BalanceRowDb = {
  agency_id: string;
  agency_name: string;
  commission_rate: number | string;
  payments_count: number | string;
  gross: number | string;
  refunded: number | string;
  net: number | string;
  commission: number | string;
  owed: number | string;
  payouts: number | string;
  adjustments: number | string;
  balance: number | string;
};

export async function listAgencyBalances(admin: SupabaseClient): Promise<AgencyBalance[]> {
  const { data, error } = await admin.rpc("admin_agency_balances");
  if (error) throw error;
  return ((data ?? []) as BalanceRowDb[]).map((row) => ({
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    commissionRate: Number(row.commission_rate),
    paymentsCount: Number(row.payments_count),
    gross: cents(row.gross),
    refunded: cents(row.refunded),
    net: cents(row.net),
    commission: cents(row.commission),
    owed: cents(row.owed),
    payouts: cents(row.payouts),
    adjustments: cents(row.adjustments),
    balance: cents(row.balance),
  }));
}

type SettlementRowDb = {
  id: string;
  agency_id: string;
  kind: SettlementKind;
  amount: number | string;
  occurred_on: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  agencies?: { commercial_name: string } | { commercial_name: string }[] | null;
  profiles?: { full_name: string } | { full_name: string }[] | null;
};

const one = <T,>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? value[0] ?? null : value ?? null);

function toSettlement(row: SettlementRowDb): Settlement {
  return {
    id: row.id,
    agencyId: row.agency_id,
    agencyName: one(row.agencies)?.commercial_name ?? "",
    kind: row.kind,
    amount: cents(row.amount),
    occurredOn: row.occurred_on,
    method: row.method,
    reference: row.reference,
    notes: row.notes,
    createdBy: one(row.profiles)?.full_name ?? null,
    createdAt: row.created_at,
  };
}

export async function listSettlements(admin: SupabaseClient, agencyId?: string): Promise<Settlement[]> {
  let query = admin.from("agency_settlements").select(SETTLEMENT_COLUMNS)
    .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  if (agencyId) query = query.eq("agency_id", agencyId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as SettlementRowDb[]).map(toSettlement);
}

/** Registra un movimiento. Un pago no puede superar el saldo pendiente: los excesos se corrigen con un ajuste. */
export async function createSettlement(admin: SupabaseClient, createdBy: string, input: SettlementInput): Promise<Settlement> {
  const { data: agency, error: agencyError } = await admin.from("agencies").select("id").eq("id", input.agencyId).maybeSingle();
  if (agencyError) throw agencyError;
  if (!agency) fail("La agencia no existe.", 404);

  if (input.kind === "PAYOUT") {
    const balance = (await listAgencyBalances(admin)).find((row) => row.agencyId === input.agencyId)?.balance ?? 0;
    if (input.amount > balance) {
      fail(`El pago supera el saldo pendiente de la agencia (${balance.toFixed(2)} USD). Registra primero un ajuste si corresponde.`, 409);
    }
  }

  const { data, error } = await admin.from("agency_settlements").insert({
    agency_id: input.agencyId,
    kind: input.kind,
    amount: input.amount,
    ...(input.occurredOn ? { occurred_on: input.occurredOn } : {}),
    method: input.method ?? null,
    reference: input.reference ?? null,
    notes: input.notes ?? null,
    created_by: createdBy,
  }).select(SETTLEMENT_COLUMNS).single();
  if (error) throw error;
  return toSettlement(data as unknown as SettlementRowDb);
}

export async function setAgencyCommission(admin: SupabaseClient, agencyId: string, commissionRate: number): Promise<void> {
  const { data, error } = await admin.from("agencies").update({ commission_rate: commissionRate })
    .eq("id", agencyId).select("id").maybeSingle();
  if (error) throw error;
  if (!data) fail("La agencia no existe.", 404);
}

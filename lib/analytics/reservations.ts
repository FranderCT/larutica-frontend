export type AnalyticsReservation = {
  createdAt: string;
  status: string;
  numberOfPeople: number;
  total: number;
  paymentStatus?: string;
  publicationTitle: string;
  agencyName?: string;
};

export type MonthSummary = { reservations: number; travelers: number; revenue: number; cancelled: number };
export type Ranked = { label: string; value: number };

const cents = (value: number) => Math.round(value * 100) / 100;

/** Día calendario en Costa Rica (UTC−6 todo el año), sin depender de la zona del navegador. */
export function costaRicaDay(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return new Date(time - 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** "2026-10" desplazado `offset` meses. */
export function shiftMonth(month: string, offset: number): string {
  const [year, number] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, number - 1 + offset, 1));
  return Number.isNaN(shifted.getTime()) ? "" : shifted.toISOString().slice(0, 7);
}

export function daysInMonth(month: string): number {
  const [year, number] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Number.isNaN(days) ? 0 : days;
}

export function inMonth(rows: AnalyticsReservation[], month: string): AnalyticsReservation[] {
  return month ? rows.filter((row) => costaRicaDay(row.createdAt).startsWith(month)) : [];
}

/** Las canceladas no suman viajeros. Solo lo cobrado cuenta como ingreso. */
export function summarize(rows: AnalyticsReservation[]): MonthSummary {
  let travelers = 0;
  let revenue = 0;
  let cancelled = 0;
  for (const row of rows) {
    if (row.status === "CANCELLED") { cancelled++; continue; }
    travelers += Number(row.numberOfPeople) || 0;
    if (row.paymentStatus === "PAID") revenue += Number(row.total) || 0;
  }
  return { reservations: rows.length, travelers, revenue: cents(revenue), cancelled };
}

/** Variación porcentual contra el periodo anterior. Null si no hay base de comparación. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function dailySeries(rows: AnalyticsReservation[], month: string, metric: "count" | "revenue") {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (metric === "revenue" && (row.status === "CANCELLED" || row.paymentStatus !== "PAID")) continue;
    const day = costaRicaDay(row.createdAt);
    totals.set(day, (totals.get(day) ?? 0) + (metric === "count" ? 1 : Number(row.total) || 0));
  }
  return Array.from({ length: daysInMonth(month) }, (_, index) => {
    const day = `${month}-${String(index + 1).padStart(2, "0")}`;
    return { day, count: cents(totals.get(day) ?? 0) };
  });
}

/** Cuenta o suma por clave, de mayor a menor. */
export function rank<T>(items: T[], key: (item: T) => string | null | undefined, weight: (item: T) => number = () => 1, limit = 8): Ranked[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const label = key(item)?.trim();
    if (!label) continue;
    totals.set(label, (totals.get(label) ?? 0) + weight(item));
  }
  return [...totals].map(([label, value]) => ({ label, value: cents(value) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)).slice(0, limit);
}

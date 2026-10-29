import assert from "node:assert/strict";
import test from "node:test";
import {
  costaRicaDay, dailySeries, inMonth, percentChange, rank, shiftMonth, summarize,
} from "../lib/analytics/reservations.ts";

const row = (overrides) => ({
  createdAt: "2026-10-10T18:00:00.000Z", status: "CONFIRMED", numberOfPeople: 2, total: 100,
  paymentStatus: "PAID", publicationTitle: "Volcán", agencyName: "Arenal", ...overrides,
});

test("el día calendario usa Costa Rica, no UTC", () => {
  assert.equal(costaRicaDay("2026-10-01T03:00:00.000Z"), "2026-09-30");
  assert.equal(costaRicaDay("2026-10-01T06:00:00.000Z"), "2026-10-01");
  assert.equal(costaRicaDay("no es fecha"), "");
});

test("shiftMonth cruza el año", () => {
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
});

test("las canceladas no suman viajeros ni ingresos; solo lo cobrado es ingreso", () => {
  const summary = summarize([
    row(),
    row({ status: "CANCELLED", total: 500 }),
    row({ paymentStatus: "UNPAID", total: 300, numberOfPeople: 3 }),
  ]);
  assert.deepEqual(summary, { reservations: 3, travelers: 5, revenue: 100, cancelled: 1 });
});

test("la variación no se calcula sin base", () => {
  assert.equal(percentChange(10, 0), null);
  assert.equal(percentChange(15, 10), 50);
  assert.equal(percentChange(5, 10), -50);
});

test("la serie diaria cubre todo el mes y respeta la métrica", () => {
  const rows = [row(), row({ total: 50 }), row({ status: "CANCELLED" })];
  const counts = dailySeries(rows, "2026-10", "count");
  assert.equal(counts.length, 31);
  assert.equal(counts.find((bar) => bar.day === "2026-10-10").count, 3);
  assert.equal(dailySeries(rows, "2026-10", "revenue").find((bar) => bar.day === "2026-10-10").count, 150);
});

test("inMonth filtra por mes de Costa Rica", () => {
  const rows = [row(), row({ createdAt: "2026-09-10T18:00:00.000Z" })];
  assert.equal(inMonth(rows, "2026-10").length, 1);
  assert.equal(inMonth(rows, "").length, 0);
});

test("rank ordena de mayor a menor, ignora vacíos y limita", () => {
  const rows = [row(), row(), row({ agencyName: "Tortuguero" }), row({ agencyName: " " })];
  assert.deepEqual(rank(rows, (r) => r.agencyName), [
    { label: "Arenal", value: 2 }, { label: "Tortuguero", value: 1 },
  ]);
  assert.equal(rank(rows, (r) => r.agencyName, (r) => r.total, 1).length, 1);
});

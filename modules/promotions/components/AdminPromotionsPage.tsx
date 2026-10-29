"use client";

import { Download, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeading } from "@/components/ui/page-heading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePreferences } from "@/lib/preferences/Preferences";
import { promotionPeriodState, type PromotionPeriodState } from "@/lib/promotions/window";
import { money } from "@/modules/booking/types";
import {
  getAdminPromotionPayments,
  refundPromotionPayment,
  type AdminPromotionPaymentRow,
} from "@/modules/payments/admin/admin-payments.service";
import { downloadCsv, toCsv } from "@/modules/payments/admin/csv";

const STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  refunded: "Reembolsado",
  pending: "Pendiente",
  failed: "Fallido",
  canceled: "Cancelado",
  expired: "Expirado",
};

const PERIOD_LABELS: Record<PromotionPeriodState, string> = {
  active: "Vigente",
  expiring: "Vence pronto",
  expired: "Vencida",
  none: "Sin periodo",
};

const DEFAULT_STATUS = "paid";

// Costa Rica no usa horario de verano: UTC−6 todo el año.
const startOfDay = (date: string) => (date ? `${date}T00:00:00-06:00` : undefined);
const startOfNextDay = (date: string) => {
  if (!date) return undefined;
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return `${next.toISOString().slice(0, 10)}T00:00:00-06:00`;
};

export function AdminPromotionsPage() {
  const { t, dateLabel } = usePreferences();
  const [rows, setRows] = useState<AdminPromotionPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [refunding, setRefunding] = useState<AdminPromotionPaymentRow | null>(null);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      setRows(await getAdminPromotionPayments({ status, from: startOfDay(from), to: startOfNextDay(to) }));
      setNow(Date.now());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar los pagos de promociones.");
    } finally { setLoading(false); }
  }, [status, from, to]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  const agencies = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of rows) byId.set(row.agencyId, row.agencyName);
    return [...byId].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const visible = useMemo(() => (agencyId ? rows.filter((row) => row.agencyId === agencyId) : rows), [rows, agencyId]);
  const periods = visible.map((row) => promotionPeriodState(row, now));

  const totals = visible.reduce((sum, row, index) => ({
    net: sum.net + (row.status === "paid" || row.status === "refunded" ? row.amount - row.refundedAmount : 0),
    active: sum.active + (periods[index] === "active" || periods[index] === "expiring" ? 1 : 0),
    expiring: sum.expiring + (periods[index] === "expiring" ? 1 : 0),
    expired: sum.expired + (periods[index] === "expired" ? 1 : 0),
  }), { net: 0, active: 0, expiring: 0, expired: 0 });

  function exportRows() {
    downloadCsv(`promociones-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(
      ["Fecha de pago", "Vence", "Agencia", "Publicación", "Estado del pago", "Periodo", "Cobrado", "Moneda", "Reembolsado"],
      visible.map((row, index) => [row.paidAt ?? row.createdAt, row.expiresAt, row.agencyName, row.publicationTitle,
        STATUS_LABELS[row.status] ?? row.status, PERIOD_LABELS[periods[index]], row.amount, row.currency, row.refundedAmount]),
    ));
  }

  async function confirmRefund() {
    if (!refunding) return;
    setRefundBusy(true); setRefundError("");
    try {
      await refundPromotionPayment(refunding.paymentId);
      setRefunding(null);
      await load();
    } catch (cause) {
      setRefundError(cause instanceof Error ? cause.message : "No pudimos procesar el reembolso.");
    } finally { setRefundBusy(false); }
  }

  const activeFilters = [agencyId, status !== DEFAULT_STATUS ? status : "", from, to].filter(Boolean).length;
  function clearFilters() { setAgencyId(""); setStatus(DEFAULT_STATUS); setFrom(""); setTo(""); }

  const stats: Array<[string, string]> = [
    [t("Cobrado"), loading ? "…" : money(totals.net)],
    [t("Vigentes"), loading ? "…" : String(totals.active)],
    [t("Vencen pronto"), loading ? "…" : String(totals.expiring)],
    [t("Vencidas"), loading ? "…" : String(totals.expired)],
  ];

  return <div className="mx-auto max-w-7xl space-y-6">
    <PageHeading
      eyebrow={<DashboardBreadcrumb items={[{ label: "Promociones" }]} className="mb-2" />}
      title={t("Promociones")}
      description={t("Pagos de las agencias por destacar sus publicaciones y su vencimiento.")}
      actions={<>
        <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label={t("Actualizar")}><RefreshCw className="size-4" aria-hidden="true" /></Button>
        <Button variant="outline" onClick={exportRows} disabled={visible.length === 0}><Download className="size-4" aria-hidden="true" />{t("Exportar CSV")}</Button>
        <Button variant="outline" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />{t("Filtros")}
          {activeFilters ? <Badge className="ml-1 px-1.5">{activeFilters}</Badge> : null}
        </Button>
      </>}
    />
    {error ? <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive">{t(error)}</p> : null}

    <dl aria-label={t("Resumen")} className="flex flex-wrap gap-x-10 gap-y-3 border-b pb-4">
      {stats.map(([label, value]) => <div key={label}>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-xl font-semibold">{value}</dd>
      </div>)}
    </dl>

    <div className="overflow-x-auto rounded-md border bg-card">
      <Table>
        <TableHeader><TableRow>
          <TableHead>{t("Agencia")}</TableHead><TableHead>{t("Publicación")}</TableHead><TableHead>{t("Fecha de pago")}</TableHead>
          <TableHead>{t("Vence")}</TableHead><TableHead>{t("Estado")}</TableHead><TableHead className="text-right">{t("Cobrado")}</TableHead><TableHead><span className="sr-only">{t("Acciones")}</span></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {visible.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">{loading ? t("Cargando…") : t("No hay pagos de promociones con estos filtros.")}</TableCell></TableRow> : null}
          {visible.map((row, index) => {
            const period = periods[index];
            const label = period === "none" ? STATUS_LABELS[row.status] ?? row.status : PERIOD_LABELS[period];
            return <TableRow key={row.paymentId}>
              <TableCell className="font-medium">{row.agencyName}</TableCell>
              <TableCell>{row.publicationTitle || t("Publicación sin título")}</TableCell>
              <TableCell>{dateLabel(row.paidAt ?? row.createdAt)}</TableCell>
              <TableCell>{row.expiresAt ? dateLabel(row.expiresAt) : "—"}</TableCell>
              <TableCell><Badge variant={period === "expiring" ? "destructive" : period === "active" ? "default" : "outline"}>{t(label)}</Badge></TableCell>
              <TableCell className="text-right">
                {money(row.amount)}
                {row.refundedAmount ? <span className="block text-xs text-muted-foreground">{t("Reembolsado")}: {money(row.refundedAmount)}</span> : null}
              </TableCell>
              <TableCell className="text-right">
                {row.status === "paid" ? <Button size="sm" variant="ghost" onClick={() => { setRefundError(""); setRefunding(row); }}>{t("Reembolsar")}</Button> : null}
              </TableCell>
            </TableRow>;
          })}
        </TableBody>
      </Table>
    </div>
    {rows.length >= 500 ? <p className="text-sm text-muted-foreground">{t("Se muestran los 500 más recientes; usa los filtros para acotar.")}</p> : null}

    <Dialog open={!!refunding} onOpenChange={(open) => { if (!open && !refundBusy) setRefunding(null); }}>
      <DialogContent>
        <div>
          <DialogTitle>{t("Reembolsar promoción")}</DialogTitle>
          <DialogDescription>
            {refunding ? `${refunding.agencyName} · ${refunding.publicationTitle || t("Publicación sin título")} · ${money(refunding.amount)}` : ""}
          </DialogDescription>
        </div>
        <p className="text-sm text-muted-foreground">{t("Se devuelve el monto completo a la tarjeta de la agencia y la promoción deja de destacar la publicación. No se puede deshacer.")}</p>
        {refundError ? <p role="alert" className="text-sm font-medium text-destructive">{t(refundError)}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setRefunding(null)} disabled={refundBusy}>{t("Cancelar")}</Button>
          <Button variant="destructive" onClick={() => void confirmRefund()} disabled={refundBusy}>{refundBusy ? t("Procesando…") : t("Reembolsar")}</Button>
        </div>
      </DialogContent>
    </Dialog>

    <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{t("Filtros")}</SheetTitle>
          <SheetDescription>{visible.length} {t("pagos")}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4">
          <div className="grid gap-2">
            <Label htmlFor="promo-filter-agency">{t("Agencia")}</Label>
            <Select value={agencyId || "all"} onValueChange={(value) => setAgencyId(value === "all" ? "" : value)}>
              <SelectTrigger id="promo-filter-agency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("Todas las agencias")}</SelectItem>
                {agencies.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="promo-filter-status">{t("Estado")}</Label>
            <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
              <SelectTrigger id="promo-filter-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("Todos los estados")}</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{t(label)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2"><Label htmlFor="promo-filter-from">{t("Desde")}</Label><Input id="promo-filter-from" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></div>
          <div className="grid gap-2"><Label htmlFor="promo-filter-to">{t("Hasta")}</Label><Input id="promo-filter-to" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></div>
        </div>
        <SheetFooter>
          <Button onClick={() => setFiltersOpen(false)}>{t("Ver resultados")}</Button>
          <Button variant="ghost" onClick={clearFilters} disabled={activeFilters === 0}>{t("Limpiar filtros")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  </div>;
}

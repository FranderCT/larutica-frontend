"use client";

import { Download, Eye, MoreHorizontal, Percent, SlidersVertical, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeading } from "@/components/ui/page-heading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TablePagination, usePagedRows } from "@/components/ui/table-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePreferences } from "@/lib/preferences/Preferences";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { money } from "@/modules/booking/types";
import { CommissionDialog, SettlementDialog } from "./AgencyDialogs";
import {
  getAdminPayments,
  getAgencyBalances,
  getSettlements,
  type AdminPaymentRow,
  type AgencyBalance,
  type Settlement,
  type SettlementInput,
} from "./admin-payments.service";
import { downloadCsv, toCsv } from "./csv";

const STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  refunded: "Reembolsado",
  pending: "Pendiente",
  failed: "Fallido",
  canceled: "Cancelado",
  expired: "Expirado",
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

type Dialogs = { settle?: { agency: AgencyBalance; kind: SettlementInput["kind"] }; commission?: AgencyBalance };

export function AdminPayments() {
  const { t, dateLabel } = usePreferences();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [balances, setBalances] = useState<AgencyBalance[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dialogs, setDialogs] = useState<Dialogs>({});
  const [tab, setTab] = useState("agencies");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [nextBalances, nextPayments, nextSettlements] = await Promise.all([
        getAgencyBalances(),
        getAdminPayments({ agencyId, status, from: startOfDay(from), to: startOfNextDay(to) }),
        getSettlements(agencyId || undefined),
      ]);
      setBalances(nextBalances); setPayments(nextPayments); setSettlements(nextSettlements);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar los pagos.");
    } finally { setLoading(false); }
  }, [agencyId, status, from, to]);

  useEffect(() => { if (isAdmin) queueMicrotask(() => { void load(); }); }, [isAdmin, load]);

  const totals = useMemo(() => balances.reduce((sum, row) => ({
    net: sum.net + row.net, commission: sum.commission + row.commission,
    refunded: sum.refunded + row.refunded, balance: sum.balance + row.balance, gross: sum.gross + row.gross,
  }), { net: 0, commission: 0, refunded: 0, balance: 0, gross: 0 }), [balances]);

  const pagedBalances = usePagedRows(balances);
  const pagedPayments = usePagedRows(payments);
  const pagedSettlements = usePagedRows(settlements);

  function exportPayments() {
    downloadCsv(`pagos-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(
      ["Fecha", "Agencia", "Experiencia", "Viajero", "Correo", "Personas", "Estado", "Cobrado USD", "Reembolsado USD", "Comisión %", "Reserva"],
      payments.map((row) => [row.paidAt ?? row.createdAt, row.agencyName, row.publicationTitle, row.passengerName, row.passengerEmail,
        row.numberOfPeople, STATUS_LABELS[row.status] ?? row.status, row.amount, row.refundedAmount, row.commissionRate, row.reservationId]),
    ));
  }

  if (!isAdmin) {
    return <div className="mx-auto max-w-7xl"><PageHeading title={t("Pagos y liquidaciones")} description={t("Solo los administradores pueden ver esta sección.")} /></div>;
  }

  const activeFilters = [agencyId, status !== DEFAULT_STATUS ? status : "", from, to].filter(Boolean).length;
  function clearFilters() { setAgencyId(""); setStatus(DEFAULT_STATUS); setFrom(""); setTo(""); }

  const stats: Array<[string, number]> = [
    [t("Cobrado"), totals.net],
    [t("Comisión de LaRutica"), totals.commission],
    [t("Reembolsado"), totals.refunded],
    [t("Por pagar a agencias"), totals.balance],
  ];
  const empty = (columns: number, message: string) => <TableRow><TableCell colSpan={columns} className="py-8 text-center text-muted-foreground">{loading ? t("Cargando…") : message}</TableCell></TableRow>;

  return <div className="mx-auto max-w-7xl space-y-6">
    <PageHeading
      eyebrow={<DashboardBreadcrumb items={[{ label: "Pagos" }]} className="mb-2" />}
      title={t("Pagos y liquidaciones")}
      description={t("Lo cobrado por cada agencia, lo que le entregas y sus ajustes.")}
      actions={<>
        <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label={t("Actualizar")}><RefreshCw className="size-4" aria-hidden="true" /></Button>
        {tab === "payments" ? <Button variant="outline" onClick={exportPayments} disabled={payments.length === 0}><Download className="size-4" aria-hidden="true" />{t("Exportar CSV")}</Button> : null}
        {tab !== "agencies" ? <Button variant="outline" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />{t("Filtros")}
          {activeFilters ? <Badge className="ml-1 px-1.5">{activeFilters}</Badge> : null}
        </Button> : null}
      </>}
    />
    {error ? <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive">{t(error)}</p> : null}

    <dl aria-label={t("Resumen")} className="flex flex-wrap gap-x-10 gap-y-3">
      {stats.map(([label, value]) => <div key={label}>
        <dt className="text-sm text-muted-foreground">{label}</dt>
        <dd className="text-xl font-semibold">{loading ? "…" : money(value)}</dd>
      </div>)}
    </dl>

    <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label={t("Secciones de pagos")}>
        <TabsTrigger value="agencies">{t("Agencias")}</TabsTrigger>
        <TabsTrigger value="payments">{t("Pagos")}</TabsTrigger>
        <TabsTrigger value="settlements">{t("Movimientos")}</TabsTrigger>
      </TabsList>

      <TabsContent value="agencies">
        <p className="text-sm text-muted-foreground">{t("Corresponde = cobrado − reembolsos − comisión. Saldo = corresponde + ajustes − pagos entregados.")}</p>
        <div className="overflow-x-auto rounded-md border bg-card">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t("Agencia")}</TableHead><TableHead className="text-right">{t("Cobrado")}</TableHead>
              <TableHead className="text-right">{t("Corresponde")}</TableHead><TableHead className="text-right">{t("Saldo")}</TableHead>
              <TableHead><span className="sr-only">{t("Acciones")}</span></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {balances.length === 0 ? empty(5, t("Todavía no hay cobros registrados.")) : null}
              {pagedBalances.pageRows.map((row) => <TableRow key={row.agencyId}>
                <TableCell className="font-medium">{row.agencyName}<span className="block text-xs font-normal text-muted-foreground">{t("Comisión")} {row.commissionRate}% · {row.paymentsCount} {t("pagos")}</span></TableCell>
                <TableCell className="text-right">{money(row.gross)}{row.refunded ? <span className="block text-xs text-muted-foreground">{t("Reembolsado")}: {money(row.refunded)}</span> : null}</TableCell>
                <TableCell className="text-right">{money(row.owed)}{row.adjustments || row.payouts ? <span className="block text-xs text-muted-foreground">{t("Ajustes")} {money(row.adjustments)} · {t("Entregado")} {money(row.payouts)}</span> : null}</TableCell>
                <TableCell className="text-right font-semibold">{money(row.balance)}</TableCell>
                <TableCell><div className="flex items-center justify-end gap-1">
                  <Button size="sm" disabled={row.balance <= 0} onClick={() => setDialogs({ settle: { agency: row, kind: "PAYOUT" } })}>{t("Registrar pago")}</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" aria-hidden="true" /><span className="sr-only">{t("Más acciones")} · {row.agencyName}</span></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDialogs({ settle: { agency: row, kind: "ADJUSTMENT" } })}><SlidersVertical className="size-4" aria-hidden="true" />{t("Ajuste")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDialogs({ commission: row })}><Percent className="size-4" aria-hidden="true" />{t("Comisión")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setAgencyId(row.agencyId); setTab("payments"); }}><Eye className="size-4" aria-hidden="true" />{t("Ver pagos")}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>
        <TablePagination {...pagedBalances} onPageChange={pagedBalances.setPage} />
      </TabsContent>

      <TabsContent value="payments">
        <div className="overflow-x-auto rounded-md border bg-card">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t("Fecha")}</TableHead><TableHead>{t("Experiencia")}</TableHead><TableHead>{t("Viajero")}</TableHead>
              <TableHead>{t("Estado")}</TableHead><TableHead className="text-right">{t("Cobrado")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {payments.length === 0 ? empty(5, t("No hay pagos con estos filtros.")) : null}
              {pagedPayments.pageRows.map((row) => <TableRow key={row.paymentId}>
                <TableCell>{dateLabel(row.paidAt ?? row.createdAt)}</TableCell>
                <TableCell className="font-medium">{row.publicationTitle}<span className="block text-xs font-normal text-muted-foreground">{row.agencyName} · {t("Salida")}: {dateLabel(row.departureStartAt)} · {row.numberOfPeople} {t("personas")}</span></TableCell>
                <TableCell>{row.passengerName}<span className="block text-xs text-muted-foreground">{row.passengerEmail}</span></TableCell>
                <TableCell><Badge variant={row.status === "paid" ? "default" : row.status === "refunded" ? "secondary" : "outline"}>{t(STATUS_LABELS[row.status] ?? row.status)}</Badge></TableCell>
                <TableCell className="text-right">{money(row.amount)}{row.refundedAmount ? <span className="block text-xs text-muted-foreground">{t("Reembolsado")}: {money(row.refundedAmount)}</span> : null}</TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </div>
        <TablePagination {...pagedPayments} onPageChange={pagedPayments.setPage} />
        {payments.length >= 500 ? <p className="text-sm text-muted-foreground">{t("Se muestran los 500 más recientes; usa los filtros para acotar.")}</p> : null}
      </TabsContent>

      <TabsContent value="settlements">
        <div className="overflow-x-auto rounded-md border bg-card">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t("Fecha")}</TableHead><TableHead>{t("Agencia")}</TableHead><TableHead>{t("Tipo")}</TableHead><TableHead className="text-right">{t("Monto")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {settlements.length === 0 ? empty(4, t("Todavía no hay movimientos.")) : null}
              {pagedSettlements.pageRows.map((row) => {
                const detail = [row.method, row.reference, row.notes, row.createdBy].filter(Boolean).join(" · ");
                return <TableRow key={row.id}>
                  <TableCell>{row.occurredOn}</TableCell>
                  <TableCell className="font-medium">{row.agencyName}{detail ? <span className="block max-w-md whitespace-normal text-xs font-normal text-muted-foreground">{detail}</span> : null}</TableCell>
                  <TableCell><Badge variant={row.kind === "PAYOUT" ? "default" : "outline"}>{row.kind === "PAYOUT" ? t("Pago") : t("Ajuste")}</Badge></TableCell>
                  <TableCell className="text-right">{money(row.amount)}</TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination {...pagedSettlements} onPageChange={pagedSettlements.setPage} />
      </TabsContent>
    </Tabs>

    <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{t("Filtros")}</SheetTitle>
          <SheetDescription>{tab === "payments" ? `${payments.length} ${t("pagos")}` : `${settlements.length} ${t("Movimientos")}`}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-5 px-4">
          <div className="grid gap-2">
            <Label htmlFor="filter-agency">{t("Agencia")}</Label>
            <Select value={agencyId || "all"} onValueChange={(value) => setAgencyId(value === "all" ? "" : value)}>
              <SelectTrigger id="filter-agency" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{t("Todas las agencias")}</SelectItem>
                {balances.map((row) => <SelectItem key={row.agencyId} value={row.agencyId}>{row.agencyName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {tab === "payments" ? <>
            <div className="grid gap-2">
              <Label htmlFor="filter-status">{t("Estado")}</Label>
              <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? "" : value)}>
                <SelectTrigger id="filter-status" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">{t("Todos los estados")}</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{t(label)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label htmlFor="filter-from">{t("Desde")}</Label><Input id="filter-from" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor="filter-to">{t("Hasta")}</Label><Input id="filter-to" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></div>
          </> : null}
        </div>
        <SheetFooter>
          <Button onClick={() => setFiltersOpen(false)}>{t("Ver resultados")}</Button>
          <Button variant="ghost" onClick={clearFilters} disabled={activeFilters === 0}>{t("Limpiar filtros")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <SettlementDialog agency={dialogs.settle?.agency ?? null} initialKind={dialogs.settle?.kind ?? "PAYOUT"} onClose={() => setDialogs({})} onSaved={() => { setDialogs({}); void load(); }} />
    <CommissionDialog agency={dialogs.commission ?? null} onClose={() => setDialogs({})} onSaved={() => { setDialogs({}); void load(); }} />
  </div>;
}

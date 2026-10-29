"use client";

import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  costaRicaDay, dailySeries, inMonth, percentChange, rank, shiftMonth, summarize, type Ranked,
} from "@/lib/analytics/reservations";
import { usePreferences } from "@/lib/preferences/Preferences";
import { money } from "@/modules/booking/types";
import { useAdminGraphics } from "../hooks/useAdminGraphics";
import { ReservationsBarChart } from "./ReservationsBarChart";

const RESERVATION_STATUS: Record<string, string> = {
  PENDING: "Pendiente", CONFIRMED: "Confirmada", PAST: "Finalizada", CANCELLED: "Cancelada",
};
const ENTITY_STATUS: Record<string, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada", ACTIVE: "Activa", INACTIVE: "Inactiva", SUSPENDED: "Suspendida",
};

function Breakdown({ title, items, format = String }: { title: string; items: Ranked[]; format?: (value: number) => string }) {
  const { t } = usePreferences();
  const maximum = Math.max(1, ...items.map((item) => item.value));
  return <section aria-label={t(title)} className="space-y-3">
    <h3 className="!m-0 !text-sm !font-semibold text-foreground">{t(title)}</h3>
    {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("Sin datos en este período.")}</p> : (
      <ul className="space-y-3">
        {items.map((item) => <li key={item.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{format(item.value)}</span>
          </div>
          <div aria-hidden="true" className="h-1.5 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / maximum) * 100}%` }} />
          </div>
        </li>)}
      </ul>
    )}
  </section>;
}

function Kpi({ label, value, change, loading }: { label: string; value: string; change?: number | null; loading: boolean }) {
  const { t } = usePreferences();
  return <div>
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="text-2xl font-semibold tabular-nums">
      {loading ? <Skeleton aria-label={t("Cargando datos…")} className="h-8 w-24" /> : value}
    </dd>
    {!loading && change !== undefined ? <dd className="text-xs text-muted-foreground">
      {change === null ? t("Sin período anterior") : `${change > 0 ? "+" : ""}${change}% ${t("vs. mes anterior")}`}
    </dd> : null}
  </div>;
}

export function AdminGraphics() {
  const { t } = usePreferences();
  const graphics = useAdminGraphics();
  const [period, setPeriod] = useState<"month" | "previous">("month");
  const [tab, setTab] = useState("reservations");

  const reservationsLoading = graphics.reservations.loading;
  const failed = [graphics.users, graphics.agencies, graphics.publications, graphics.reservations].some((resource) => resource.error);

  const metrics = useMemo(() => {
    const rows = graphics.reservations.data ?? [];
    const current = graphics.today ? costaRicaDay(graphics.today).slice(0, 7) : "";
    const selected = current ? shiftMonth(current, period === "previous" ? -1 : 0) : "";
    const periodRows = inMonth(rows, selected);
    const previousRows = inMonth(rows, selected ? shiftMonth(selected, -1) : "");
    const now = summarize(periodRows);
    const before = summarize(previousRows);
    return {
      now,
      cancellationRate: now.reservations ? Math.round((now.cancelled / now.reservations) * 100) : 0,
      change: {
        reservations: percentChange(now.reservations, before.reservations),
        travelers: percentChange(now.travelers, before.travelers),
        revenue: percentChange(now.revenue, before.revenue),
      },
      reservationBars: dailySeries(periodRows, selected, "count"),
      revenueBars: dailySeries(periodRows, selected, "revenue"),
      byStatus: rank(periodRows, (row) => RESERVATION_STATUS[row.status] ?? row.status, undefined, 4),
      topPublications: rank(periodRows.filter((row) => row.status !== "CANCELLED"), (row) => row.publicationTitle, undefined, 5),
      topAgencies: rank(periodRows.filter((row) => row.status !== "CANCELLED" && row.paymentStatus === "PAID"), (row) => row.agencyName, (row) => Number(row.total) || 0, 5),
    };
  }, [graphics.reservations.data, graphics.today, period]);

  const platform = useMemo(() => ({
    usersByRole: rank(graphics.users.data ?? [], (user) => user.role),
    agenciesByStatus: rank(graphics.agencies.data ?? [], (agency) => ENTITY_STATUS[agency.status] ?? agency.status),
    publicationsByStatus: rank(graphics.publications.data ?? [], (publication) => ENTITY_STATUS[publication.status] ?? publication.status),
  }), [graphics.users.data, graphics.agencies.data, graphics.publications.data]);

  return <div className="mx-auto max-w-7xl space-y-6">
    <PageHeading
      eyebrow={<DashboardBreadcrumb items={[{ label: "Gráficas" }]} className="mb-2" />}
      title={t("Gráficas")}
      description={t("Indicadores y tendencias de la plataforma.")}
      actions={<>
        <Select value={period} onValueChange={(value) => setPeriod(value === "previous" ? "previous" : "month")}>
          <SelectTrigger aria-label={t("Período de reservas")} className="min-w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="month">{t("Este mes")}</SelectItem><SelectItem value="previous">{t("Mes anterior")}</SelectItem></SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={graphics.reload} aria-label={t("Actualizar")}><RefreshCw className="size-4" aria-hidden="true" /></Button>
      </>}
    />
    {failed ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3">
      <p className="text-sm font-medium text-destructive">{t("No se pudieron cargar los datos.")}</p>
      <Button type="button" variant="outline" size="sm" onClick={graphics.reload}>{t("Reintentar")}</Button>
    </div> : null}

    <dl aria-label={t("Resumen")} className="flex flex-wrap gap-x-12 gap-y-4">
      <Kpi label={t("Reservas")} value={String(metrics.now.reservations)} change={metrics.change.reservations} loading={reservationsLoading} />
      <Kpi label={t("Ingresos cobrados")} value={money(metrics.now.revenue)} change={metrics.change.revenue} loading={reservationsLoading} />
      <Kpi label={t("Viajeros")} value={String(metrics.now.travelers)} change={metrics.change.travelers} loading={reservationsLoading} />
      <Kpi label={t("Cancelación")} value={`${metrics.cancellationRate}%`} loading={reservationsLoading} />
    </dl>

    <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label={t("Secciones de gráficas")}>
        <TabsTrigger value="reservations">{t("Reservas")}</TabsTrigger>
        <TabsTrigger value="revenue">{t("Ingresos")}</TabsTrigger>
        <TabsTrigger value="platform">{t("Plataforma")}</TabsTrigger>
      </TabsList>

      <TabsContent value="reservations">
        <ReservationsBarChart bars={metrics.reservationBars} />
        <div className="grid gap-8 pt-2 md:grid-cols-2">
          <Breakdown title="Por estado" items={metrics.byStatus} />
          <Breakdown title="Experiencias más reservadas" items={metrics.topPublications} />
        </div>
      </TabsContent>

      <TabsContent value="revenue">
        <ReservationsBarChart bars={metrics.revenueBars} title="Ingresos cobrados por día" emptyMessage="No hay ingresos cobrados en este período." format={money} />
        <div className="pt-2"><Breakdown title="Ingresos por agencia" items={metrics.topAgencies} format={money} /></div>
      </TabsContent>

      <TabsContent value="platform">
        <p className="text-sm text-muted-foreground">{t("Estado actual de la plataforma, sin importar el período.")}</p>
        <div className="grid gap-8 md:grid-cols-3">
          <Breakdown title="Usuarios por rol" items={platform.usersByRole} />
          <Breakdown title="Agencias por estado" items={platform.agenciesByStatus} />
          <Breakdown title="Publicaciones por estado" items={platform.publicationsByStatus} />
        </div>
      </TabsContent>
    </Tabs>
  </div>;
}

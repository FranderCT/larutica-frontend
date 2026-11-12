"use client";
import { durationLabel } from "@/lib/preferences/format";
import { RecordTablePagination, usePagedRows } from "@/components/ui/table-pagination";
import type { AdminPublicationDeparture } from "../../services/admin/admin-publication.service";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { JourneyView } from "@/modules/journeys/JourneyView";

import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";
import { Building2, CalendarDays, Check, Clock3, ImageIcon, MapPin, RefreshCw, Users, X } from "lucide-react";
import { Tabs } from "radix-ui";
import { useAdminPublication } from "../../hooks/admin/useAdminPublication";
import type { AdminPublicationStatus } from "../../services/admin/admin-publication.service";

interface AdminPublicationDetailProps {
  publicationId: string;
}

const emptyDepartures: AdminPublicationDeparture[] = [];

const tabClassName = "min-h-12 shrink-0 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=active]:border-primary data-[state=active]:text-primary";
const panelClassName = "py-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

export default function AdminPublicationDetail({ publicationId }: AdminPublicationDetailProps) {
  const { t, language } = usePreferences();
  const { publication, loading, reviewing, error, loadPublication, approve, reject } = useAdminPublication(publicationId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const pagedDepartures = usePagedRows(publication?.departures ?? emptyDepartures);
  const rejectButtonRef = useRef<HTMLButtonElement>(null);

  if (loading) return <LoadingState />;

  if (!publication) {
    return (
      <div className="mx-auto w-full max-w-[1180px]">
        <DashboardBreadcrumb items={[{ label: "Publicaciones", href: "/dashboard/publications" }, { label: "Revisión de publicación" }]} />
        <div className="py-12 text-center">
          <ImageIcon size={32} className="mx-auto text-muted-foreground" aria-hidden="true" />
          <p className="mt-4 font-semibold">{t("No se pudo cargar la publicación")}</p>
          {error && <p role="alert" className="mt-2 text-sm text-destructive">{t(error)}</p>}
          <button type="button" onClick={() => void loadPublication()} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
            <RefreshCw size={16} aria-hidden="true" />{t("Reintentar")}
          </button>
        </div>
      </div>
    );
  }

  const canReview = publication.status === "PENDING";

  async function reviewPublication(status: "APPROVED" | "REJECTED") {
    if (!publication || reviewing) return;
    if (status === "REJECTED") {
      setRejectionReason("");
      setRejectOpen(true);
      return;
    }
    const action = status === "APPROVED" ? "¿Deseas aprobar la publicación" : "¿Deseas rechazar la publicación";
    if (!window.confirm(`${t(action)} "${publication.title ?? t("Sin título")}"?`)) return;
    try {
      await approve();
    } catch {
      // The hook displays the review error and keeps the current publication.
    }
  }

  async function rejectPublication() {
    if (reviewing || !rejectionReason.trim()) return;
    try {
      await reject(rejectionReason.trim());
      setRejectOpen(false);
      setRejectionReason("");
    } catch {
      // Preserve the reason so the administrator can retry.
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] text-foreground">
      <Dialog open={rejectOpen} onOpenChange={(open) => { if (!reviewing) setRejectOpen(open); }}>
        <DialogContent aria-busy={reviewing} onCloseAutoFocus={(event) => { event.preventDefault(); rejectButtonRef.current?.focus(); }}>
          <DialogTitle>{t("Rechazar publicación")}</DialogTitle>
          <DialogDescription>{t("Describe qué debe corregir la agencia...")}</DialogDescription>
          <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void rejectPublication(); }}>
            <label htmlFor="publication-rejection-reason" className="text-sm font-medium">{t("Motivo del rechazo")}</label>
            <Textarea id="publication-rejection-reason" required value={rejectionReason} disabled={reviewing} onChange={(event) => setRejectionReason(event.target.value)} placeholder={t("Describe qué debe corregir la agencia...")} />
            {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" disabled={reviewing} onClick={() => setRejectOpen(false)}>{t("Cancelar")}</Button>
              <Button type="submit" variant="destructive" disabled={reviewing || !rejectionReason.trim()}>{t(reviewing ? "Procesando..." : "Rechazar")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <header className="border-b border-border pb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <DashboardBreadcrumb items={[{ label: "Publicaciones", href: "/dashboard/publications" }, { label: "Revisión de publicación" }]} />
          <StatusBadge status={publication.status} />
        </div>
        <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{t(serviceTypeLabel(publication.serviceType))}</p>
            <h1 className="!m-0 !max-w-none sm:!text-4xl lr-page-title">{publication.title || t("Sin título")}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("Precio por persona")}</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{publication.pricePerPerson !== null ? `USD ${publication.pricePerPerson.toFixed(2)}` : "—"}</p>
              </div>
              <dl className="flex flex-wrap gap-x-8 gap-y-4">
                <InfoItem icon={<MapPin size={16} aria-hidden="true" />} label={t("Destino")} value={publication.destination} />
                <InfoItem icon={<Clock3 size={16} aria-hidden="true" />} label={t("Duración")} value={publication.durationMinutes !== null ? durationLabel(publication.durationMinutes) : null} />
                <InfoItem icon={<Users size={16} aria-hidden="true" />} label={t("Capacidad")} value={publication.defaultCapacity !== null ? `${publication.defaultCapacity} ${t("personas")}` : null} />
              </dl>
            </div>
          </div>
          <div className="h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-44 sm:w-64 lg:w-80">
            {publication.mainImageUrl ? (
              <img src={publication.mainImageUrl} alt={publication.title ?? t("Imagen de publicación")} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon size={32} aria-hidden="true" /></div>
            )}
          </div>
        </div>
      </header>

      {error && <p role="alert" className="mt-4 border-l-2 border-destructive pl-3 text-sm text-destructive">{t(error)}</p>}

      <Tabs.Root defaultValue="overview" className="mt-3">
        <Tabs.List aria-label={t("Información de la publicación")} className="flex gap-6 overflow-x-auto border-b border-border">
          <Tabs.Trigger value="overview" className={tabClassName}>{t("Resumen")}</Tabs.Trigger>
          <Tabs.Trigger value="details" className={tabClassName}>{t("Detalles del servicio")}</Tabs.Trigger>
          <Tabs.Trigger value="departures" className={tabClassName}>
            {t("Salidas programadas")}<span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{publication.departures.length}</span>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className={panelClassName}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <TextSection title={t("Descripción")} value={publication.description} />
            <div className="space-y-6 lg:border-l lg:border-border lg:pl-8">
              <section aria-labelledby="publication-agency-heading">
                <h2 id="publication-agency-heading" className="!m-0 !text-sm !font-semibold !leading-6 !tracking-normal">{t("Agencia responsable")}</h2>
                <div className="mt-3 flex items-center gap-3">
                  {publication.agency?.logoUrl ? (
                    <img src={publication.agency.logoUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                  ) : (
                    <Building2 size={24} className="shrink-0 text-primary" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">{publication.agency?.commercialName || publication.agency?.agencyName || t("Sin agencia")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("Estado de agencia:")} {t(agencyStatusLabel(publication.agency?.status))}</p>
                  </div>
                </div>
              </section>
              <dl className="space-y-5">
                <InfoItem icon={<CalendarDays size={16} aria-hidden="true" />} label={t("Registro")} value={formatDate(publication.createdAt, language)} />
                <InfoItem label={t("Idiomas")} value={publication.languages.map(item => item.name).join(", ") || t("Sin idiomas registrados")} />
              </dl>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="details" className={panelClassName}>
          <div className="mb-6 border-b border-border pb-6">
            <h2 className="lr-section-title">{t("Trayecto")}</h2><JourneyView journey={publication.journey} meetingPoint={publication.meetingPoint}/>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <TextSection title={t("Qué incluye")} value={publication.included} />
            <TextSection title={t("Qué no incluye")} value={publication.notIncluded} />
          </div>
        </Tabs.Content>

        <Tabs.Content value="departures" className={panelClassName}>
          {publication.departures.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <caption className="sr-only">{t("Salidas programadas")}</caption>
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>{["Salida", "Finaliza", "Capacidad", "Estado"].map(label => <th key={label} scope="col" className="px-3 pb-3 font-medium first:pl-0 last:pr-0">{t(label)}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedDepartures.pageRows.map(departure => (
                      <tr key={departure.id}>
                        <td className="py-4 pr-3 font-medium">{formatDateTime(departure.startAt, language)}</td>
                        <td className="px-3 py-4 text-muted-foreground">{departure.endAt ? formatDateTime(departure.endAt, language) : "—"}</td>
                        <td className="px-3 py-4 tabular-nums">{departure.capacity} {t("personas")}</td>
                        <td className="py-4 pl-3"><span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{t(departureStatusLabel(departure.status))}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <RecordTablePagination page={pagedDepartures.page} totalPages={pagedDepartures.totalPages} onPageChange={pagedDepartures.setPage} />
            </div>
          ) : (
            <div className="flex items-start gap-3 py-5">
              <CalendarDays size={22} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">{t("No hay salidas programadas.")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("La agencia aún no ha registrado fechas para este servicio.")}</p>
              </div>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <div className="border-t border-border py-5">
        {canReview ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{t("Decisión de revisión")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("Verifica que la información sea correcta antes de aprobar o rechazar la publicación.")}</p>
            </div>
            <div className="flex shrink-0 gap-3">
              <button type="button" disabled={reviewing} ref={rejectButtonRef} onClick={() => void reviewPublication("REJECTED")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-destructive/30 px-4 text-sm font-semibold text-destructive hover:bg-destructive/5 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">
                <X size={16} aria-hidden="true" />{t("Rechazar")}
              </button>
              <button type="button" disabled={reviewing} onClick={() => void reviewPublication("APPROVED")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">
                <Check size={16} aria-hidden="true" />{t(reviewing ? "Procesando..." : "Aprobar")}
              </button>
            </div>
          </div>
        ) : publication.status === "APPROVED" ? (
          <p className="flex items-center gap-2 text-sm text-primary"><Check size={16} aria-hidden="true" />{t("Esta publicación ya fue aprobada.")}</p>
        ) : publication.status === "REJECTED" ? (
          <p className="flex items-start gap-2 text-sm text-destructive"><X size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{t("Esta publicación fue rechazada. La agencia puede corregirla y volver a enviarla a revisión.")}</p>
        ) : null}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | null }) {
  const { t } = usePreferences();
  return (
    <div>
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{t(label)}</dt>
      <dd className="mt-1 text-sm font-medium">{value || t("Sin información")}</dd>
    </div>
  );
}

function TextSection({ title, value }: { title: string; value: string | null }) {
  const { t } = usePreferences();
  return (
    <section>
      <h2 className="!m-0 !text-base !font-semibold !leading-6 !tracking-normal">{t(title)}</h2>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{value || t("Sin información")}</p>
    </section>
  );
}

function StatusBadge({
  status,
}: {
  status:
    AdminPublicationStatus;
}) {
  const { t } = usePreferences();
  const config: Record<
    AdminPublicationStatus,
    {
      label: string;
      className: string;
    }
  > = {
    DRAFT: {
      label:
        "Borrador",

      className:
        "border-[#DDE2DF] bg-[#F5F6F5] text-[#59615D]",
    },

    PENDING: {
      label:
        "En revisión",

      className:
        "border-[#F1D49A] bg-[#FFF8E8] text-[#886617]",
    },

    APPROVED: {
      label:
        "Aprobada",

      className:
        "border-[#CBE5D4] bg-[#EAF6EE] text-[#075E36]",
    },

    REJECTED: {
      label:
        "Rechazada",

      className:
        "border-[#F2CACA] bg-[#FFF0F0] text-[#A63737]",
    },

    INACTIVE: {
      label:
        "Inactiva",

      className:
        "border-[#DDE2DF] bg-[#F1F2F1] text-[#727A76]",
    },
  };

  const current =
    config[
      status
    ];

  return (
    <span
      className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${current.className}`}
    >
      {
        t(current.label)
      }
    </span>
  );
}

function serviceTypeLabel(
  value:
    | "EXCURSION"
    | "TRANSPORT"
    | null,
) {
  switch (value) {
    case "EXCURSION":
      return "Excursión";

    case "TRANSPORT":
      return "Transporte";

    default:
      return "Servicio";
  }
}

function agencyStatusLabel(
  value:
    | string
    | undefined,
) {
  switch (value) {
    case "APPROVED":
      return "Aprobada";

    case "PENDING":
      return "En revisión";

    case "REJECTED":
      return "Rechazada";

    case "DRAFT":
      return "Borrador";

    case "INACTIVE":
      return "Inactiva";

    default:
      return "Sin información";
  }
}

function departureStatusLabel(
  value:
    | "ACTIVE"
    | "CANCELLED"
    | "COMPLETED",
) {
  switch (value) {
    case "ACTIVE":
      return "Activa";

    case "CANCELLED":
      return "Cancelada";

    case "COMPLETED":
      return "Completada";

    default:
      return value;
  }
}

function formatDate(
  value: string, language: string = "es",
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    language === "en" ? "en-US" : "es-CR",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

function formatDateTime(
  value: string, language: string = "es",
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    language === "en" ? "en-US" : "es-CR",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  ).format(
    date,
  );
}

function LoadingState() {
  const { t } = usePreferences();
  return (
    <div className="mx-auto w-full max-w-[1180px] animate-pulse" role="status" aria-label={t("Cargando publicación")}>
      <div className="mb-6 h-4 w-40 rounded bg-muted" />
      <div className="flex flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:justify-between">
        <div className="flex-1 space-y-5"><div className="h-8 w-3/4 rounded bg-muted" /><div className="h-14 w-2/3 rounded bg-muted" /></div>
        <div className="h-44 w-full rounded-lg bg-muted sm:w-64" />
      </div>
      <div className="my-6 h-10 w-full rounded bg-muted" />
      <div className="h-24 w-2/3 rounded bg-muted" />
    </div>
  );
}

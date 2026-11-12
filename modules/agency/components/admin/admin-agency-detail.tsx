"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Building2,
  Check,
  FileText,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  X,
} from "lucide-react";
import { Tabs } from "radix-ui";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAdminAgency } from "../../hooks/admin/useAdminAgency";
import type { AgencyStatus, BusinessType } from "../../types/agency.types";
import { VerificationDocumentViewer } from "./verification-document-viewer";

const statusBadgeClass: Record<AgencyStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  INACTIVE: "bg-slate-100 text-slate-600 border-slate-200",
};

const statusLabel: Record<AgencyStatus, string> = {
  DRAFT: "Borrador",
  PENDING: "En revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  INACTIVE: "Inactiva",
};

function StatusBadge({ status }: { status: AgencyStatus }) {
  const { t } = usePreferences();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 !text-xs !font-medium",
        statusBadgeClass[status],
      )}
    >
      {t(statusLabel[status])}
    </span>
  );
}

function businessTypeLabel(value: BusinessType) {
  switch (value) {
    case "AGENCY":
      return "Agencia";
    case "TOUR_OPERATOR":
      return "Operador turístico";
    case "TRANSPORT":
      return "Transporte";
    case "INDEPENDENT_GUIDE":
      return "Guía independiente";
    default:
      return value;
  }
}

function formatDate(value: string, language: string = "es") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "en" ? "en-US" : "es-CR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null | undefined;
}) {
  const { t } = usePreferences();
  return (
    <div>
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden="true" />{t(label)}
      </dt>
      <dd className="mt-2 break-words text-sm font-medium">{value?.trim() ? value : "—"}</dd>
    </div>
  );
}

function TagList({ title, values }: { title: string; values: string[] }) {
  const { t } = usePreferences();
  return (
    <section>
      <h2 className="!m-0 !text-sm !font-semibold !leading-6 !tracking-normal">{t(title)}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{values.length > 0 ? values.join(", ") : t("Sin información")}</p>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <Skeleton className="h-4 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-col gap-6 border-b border-border pb-6 sm:flex-row sm:justify-between">
        <Skeleton className="h-24 w-full sm:w-1/2" />
        <Skeleton className="h-44 w-full rounded-lg sm:w-64" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-2/3" />
    </div>
  );
}

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const { t } = usePreferences();
  const backdrop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onMouseDown = (event: MouseEvent) => {if (event.target === backdrop.current) onClose();};
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      ref={backdrop}
    >
      <button
        type="button"
        aria-label={t("Cerrar imagen")}
        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        onClick={onClose}
      >
        <X className="size-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[min(96vw,1100px)] rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}

export default function AdminAgencyDetail({
  agencyId,
}: {
  agencyId: string;
}) {
  const { t, language } = usePreferences();
  const {
    agency,
    loading,
    reviewing,
    error,
    loadAgency,
    approve,
    reject,
  } = useAdminAgency(agencyId);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const rejectButtonRef = useRef<HTMLButtonElement>(null);
  const [lightbox, setLightbox] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  if (loading) return <LoadingState />;

  if (!agency) {
    return (
      <div className="mx-auto w-full max-w-[1180px]">
        <DashboardBreadcrumb items={[{ label: "Agencias", href: "/dashboard/agencies" }, { label: "Detalle" }]} />
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">{t("No se pudo cargar la agencia")}</p>
          {error ? <p role="alert" className="text-sm text-destructive">{t(error)}</p> : null}
          <Button type="button" variant="outline" onClick={() => void loadAgency()}>{t("Intentar de nuevo")}</Button>
        </div>
      </div>
    );
  }

  const canReview = agency.status === "PENDING";
  const location = [agency.city, agency.province, agency.country]
    .filter(Boolean)
    .join(", ");

  async function reviewAgency(status: "APPROVED" | "REJECTED") {
    if (!agency || reviewing) return;
    if (status === "REJECTED") {
      setRejectionReason("");
      setRejectOpen(true);
      return;
    }
    const action = status === "APPROVED" ? "¿Deseas aprobar la agencia" : "¿Deseas rechazar la agencia";
    if (!window.confirm(`${t(action)} "${agency.commercialName}"?`)) return;
    try {
      await approve();
    } catch {
      // The hook displays the error and preserves the agency status.
    }
  }

  async function rejectAgency() {
    if (reviewing || !rejectionReason.trim()) return;
    try {
      await reject(rejectionReason.trim());
      setRejectOpen(false);
      setRejectionReason("");
    } catch {
      // Preserve the reason so the administrator can retry.
    }
  }

  const tabClassName = "min-h-12 shrink-0 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=active]:border-primary data-[state=active]:text-primary";
  const panelClassName = "py-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

  return (
    <div className="mx-auto w-full max-w-[1180px] text-foreground">
      <Dialog open={rejectOpen} onOpenChange={(open) => { if (!reviewing) setRejectOpen(open); }}>
        <DialogContent aria-busy={reviewing} onCloseAutoFocus={(event) => { event.preventDefault(); rejectButtonRef.current?.focus(); }}>
          <DialogTitle>{t("Rechazar agencia")}</DialogTitle>
          <DialogDescription>{t("Describe qué debe corregir la agencia...")}</DialogDescription>
          <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void rejectAgency(); }}>
            <label htmlFor="agency-rejection-reason" className="text-sm font-medium">{t("Motivo del rechazo")}</label>
            <Textarea id="agency-rejection-reason" required value={rejectionReason} disabled={reviewing} onChange={(event) => setRejectionReason(event.target.value)} placeholder={t("Describe qué debe corregir la agencia...")} />
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
          <DashboardBreadcrumb items={[{ label: "Agencias", href: "/dashboard/agencies" }, { label: agency.commercialName || agency.agencyName }]} />
          <StatusBadge status={agency.status} />
        </div>
        <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{t(businessTypeLabel(agency.businessType))}</p>
            <div className="flex items-center gap-4">
              {agency.logoUrl ? (
                <button type="button" className="size-14 shrink-0 cursor-zoom-in overflow-hidden rounded-lg bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:size-16" aria-label={t("Ver logo en grande")} onClick={() => setLightbox({ src: agency.logoUrl!, alt: agency.commercialName })}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={agency.logoUrl} alt="" className="size-full object-cover" />
                </button>
              ) : (
                <Building2 className="size-10 shrink-0 text-primary" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="!m-0 !max-w-none break-words sm:!text-4xl lr-page-title">{agency.commercialName || agency.agencyName}</h1>
                  {agency.status === "APPROVED" ? <BadgeCheck className="size-5 shrink-0 text-primary" aria-label={t("Agencia verificada")} /> : null}
                </div>
                <p className="mt-2 break-words text-sm text-muted-foreground">{agency.agencyName}</p>
              </div>
            </div>
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
              <InfoRow icon={MapPin} label={t("Ubicación")} value={location} />
              <InfoRow icon={FileText} label={t("Fecha de registro")} value={formatDate(agency.createdAt, language)} />
            </dl>
          </div>
          <div className="h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-44 sm:w-64 lg:w-80">
            {agency.coverUrl ? (
              <button type="button" className="size-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary" aria-label={t("Ver portada en grande")} onClick={() => setLightbox({ src: agency.coverUrl!, alt: agency.commercialName })}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={agency.coverUrl} alt="" className="size-full object-cover" />
              </button>
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground"><Building2 size={32} aria-hidden="true" /></div>
            )}
          </div>
        </div>
      </header>

      {error ? <p role="alert" className="mt-4 border-l-2 border-destructive pl-3 text-sm text-destructive">{t(error)}</p> : null}

      <Tabs.Root defaultValue="overview" className="mt-3">
        <Tabs.List aria-label={t("Información de la agencia")} className="flex gap-6 overflow-x-auto border-b border-border">
          <Tabs.Trigger value="overview" className={tabClassName}>{t("Resumen")}</Tabs.Trigger>
          <Tabs.Trigger value="contact" className={tabClassName}>{t("Contacto y ubicación")}</Tabs.Trigger>
          <Tabs.Trigger value="verification" className={tabClassName}>{t("Verificación")}</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className={panelClassName}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section>
              <h2 className="!m-0 !text-base !font-semibold !leading-6 !tracking-normal">{t("Descripción")}</h2>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{agency.description || t("Sin información")}</p>
            </section>
            <div className="space-y-6 lg:border-l lg:border-border lg:pl-8">
              <TagList title={t("Categorías")} values={agency.categories.map(item => item.name)} />
              <TagList title={t("Idiomas")} values={agency.languages.map(item => item.name)} />
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="contact" className={panelClassName}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section>
              <h2 className="!m-0 !text-base !font-semibold !leading-6 !tracking-normal">{t("Contacto")}</h2>
              <dl className="mt-5 grid gap-6 sm:grid-cols-2">
                <InfoRow icon={Mail} label={t("Correo")} value={agency.email} />
                <InfoRow icon={Phone} label={t("Teléfono")} value={agency.phone} />
                <InfoRow icon={Globe2} label="Sitio web" value={agency.website} />
              </dl>
            </section>
            <section className="lg:border-l lg:border-border lg:pl-8">
              <h2 className="!m-0 !text-base !font-semibold !leading-6 !tracking-normal">{t("Ubicación")}</h2>
              <dl className="mt-5 space-y-6">
                <InfoRow icon={MapPin} label={t("Ubicación")} value={location} />
                <InfoRow icon={MapPin} label={t("Dirección exacta")} value={agency.exactAddress} />
              </dl>
            </section>
          </div>
        </Tabs.Content>

        <Tabs.Content value="verification" className={panelClassName}>
          <section className="mb-6 border-b border-border pb-6">
            <h2 className="!m-0 !text-base !font-semibold !leading-6 !tracking-normal">{t("Información de la cuenta")}</h2>
            <dl className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow icon={Building2} label={t("Tipo de negocio")} value={t(businessTypeLabel(agency.businessType))} />
              <InfoRow icon={ShieldCheck} label="Términos" value={t(agency.acceptedTerms ? "Términos aceptados" : "Términos no aceptados")} />
              <InfoRow icon={FileText} label={t("Fecha de registro")} value={formatDate(agency.createdAt, language)} />
            </dl>
          </section>
          <VerificationDocumentViewer agencyId={agency.id} hasDocument={Boolean(agency.verificationDocumentUrl)} documentPath={agency.verificationDocumentUrl} className="rounded-none bg-transparent p-0" />
        </Tabs.Content>
      </Tabs.Root>

      <div className="border-t border-border py-5">
        {canReview ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="!m-0 !text-sm !font-semibold !leading-6 !tracking-normal">{t("Decisión de revisión")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("Aprueba la agencia si la información y documentación son correctas, o recházala para que pueda corregirse.")}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Button type="button" variant="outline" className="min-h-11 gap-2 text-destructive hover:text-destructive" disabled={reviewing} ref={rejectButtonRef} onClick={() => void reviewAgency("REJECTED")}><X className="size-4" aria-hidden="true" />{t("Rechazar")}</Button>
              <Button type="button" className="min-h-11 gap-2" disabled={reviewing} onClick={() => void reviewAgency("APPROVED")}><Check className="size-4" aria-hidden="true" />{t(reviewing ? "Procesando…" : "Aprobar")}</Button>
            </div>
          </div>
        ) : agency.status === "APPROVED" ? (
          <p className="flex items-center gap-2 text-sm text-primary"><Check size={16} aria-hidden="true" />{t("Agencia aprobada · puede operar dentro de LaRutica")}</p>
        ) : agency.status === "REJECTED" ? (
          <p className="flex items-start gap-2 text-sm text-destructive"><X size={16} className="mt-0.5 shrink-0" aria-hidden="true" />{t("Agencia rechazada · el propietario puede corregirla y reenviar")}</p>
        ) : null}
      </div>

      {lightbox ? <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} /> : null}
    </div>
  );
}

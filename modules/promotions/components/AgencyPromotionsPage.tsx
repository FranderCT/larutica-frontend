"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { dateFormatter } from "@/lib/preferences/format";
import { usePreferences } from "@/lib/preferences/Preferences";
import { PublicationStatusBadge } from "@/modules/publications/components/PublicationStatusBadge";
import { usePublications } from "@/modules/publications/hooks/usePublications";
import { isPromotionActive } from "@/lib/promotions/window";
import { AdminPromotionsPage } from "./AdminPromotionsPage";

export function AgencyPromotionsPage() {
  const { role } = useDashboardRole();
  if (role === "Admin") return <AdminPromotionsPage />;
  if (role !== "Agencia") {
    return (
      <DashboardSectionPage
        title="Promociones"
        description="Consulta y gestiona servicios destacados."
      />
    );
  }
  return <AgencyPromotionList />;
}

function AgencyPromotionList() {
  const { t, language } = usePreferences();
  const { publications, loading, error } = usePublications();
  const formatDate = dateFormatter(language);
  const now = Date.now();

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeading
        title={t("Promociones")}
        description={t("Destaca una publicación durante 7 días. El impulso cubre todas sus fechas de salida.")}
      />
      {loading ? <p className="text-sm text-muted-foreground">{t("Cargando publicaciones...")}</p> : null}
      {error ? <p className="text-sm text-destructive" role="alert">{t(error)}</p> : null}
      {!loading && !error && publications.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("No hay publicaciones para promocionar.")}</p>
      ) : null}
      <div className="grid gap-4">
        {publications.map((publication) => {
          const activeUntil = publication.promotedUntil && isPromotionActive(publication.promotedUntil, now)
            ? publication.promotedUntil
            : null;
          const canPay = publication.status === "APPROVED" && !activeUntil;
          return (
            <article
              key={publication.id}
              className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
            >
              <div className="relative h-44 bg-muted">
                {publication.mainImageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={publication.mainImageUrl}
                    alt={publication.title ?? t("Publicación")}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">{t("Sin imagen")}</div>
                )}
                <div className="absolute left-3 top-3">
                  <PublicationStatusBadge status={publication.status} />
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--primary)]">
                      {t(publication.serviceType === "TRANSPORT" ? "Transporte" : "Excursión")}
                    </p>
                    <h2 className="!m-0 mt-1 line-clamp-2 !text-base !font-semibold !leading-6 !tracking-normal text-[var(--ink)]">
                      {publication.title ?? t("Publicación sin título")}
                    </h2>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[var(--ink)]">
                    {publication.pricePerPerson !== null ? `$${publication.pricePerPerson.toFixed(2)}` : t("Sin precio")}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {publication.description ?? t("Sin descripción disponible.")}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 text-xs sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">{t("Destino")}</p>
                    <p className="mt-0.5 truncate font-medium">{publication.destination ?? t("Sin definir")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("Duración")}</p>
                    <p className="mt-0.5 font-medium">
                      {publication.durationMinutes ? `${publication.durationMinutes} min` : t("Sin definir")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("Capacidad")}</p>
                    <p className="mt-0.5 font-medium">
                      {publication.defaultCapacity ? `${publication.defaultCapacity} ${t("personas")}` : t("Sin definir")}
                    </p>
                  </div>
                </div>
                {activeUntil ? (
                  <p className="mt-4 text-sm font-medium text-[var(--ink)]">
                    {t("Promocionada hasta")} {formatDate(activeUntil)}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-4">
                  {canPay ? (
                    <Button variant="outline" size="sm" asChild className="gap-1.5">
                      <Link href={`/dashboard/promotions/${publication.id}/pay`}>
                        <Megaphone size={14} aria-hidden="true" />
                        {t("Promocionar")}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-1.5" disabled>
                      <Megaphone size={14} aria-hidden="true" />
                      {t("Promocionar")}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

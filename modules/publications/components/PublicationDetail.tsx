"use client";
import { Tabs } from "radix-ui";
import { durationLabel } from "@/lib/preferences/format";
import { JourneyView } from "@/modules/journeys/JourneyView";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Languages,
  MapPin,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { usePublications } from "../hooks/usePublications";

import type {
  Publication,
} from "../types/publication.types";

import { PublicationStatusBadge } from "./PublicationStatusBadge";

const tabClassName = "min-h-12 shrink-0 border-b-2 border-transparent px-1 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=active]:border-primary data-[state=active]:text-primary";
const panelClassName = "py-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

export function PublicationDetail({
  id,
}: {
  id: string;
}) {
  const { t } = usePreferences();
  const router =
    useRouter();

  const {
    getById,
    remove,
  } =
    usePublications();

  const [
    publication,
    setPublication,
  ] =
    useState<Publication | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadPublication() {
      setLoading(true);
      setError(null);

      try {
        const result =
          await getById(id);

        if (active) {
          setPublication(
            result,
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "No se pudo cargar la publicación.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPublication();

    return () => {
      active = false;
    };
  }, [
    getById,
    id,
  ]);

  async function handleDelete() {
    if (!publication) {
      return;
    }

    const confirmed =
      window.confirm(
        `¿Desactivar "${publication.title ?? "esta publicación"}"?`,
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      await remove(
        publication.id,
      );

      router.push(
        "/dashboard/publications",
      );
    } catch (deleteError) {
      window.alert(
        deleteError instanceof
          Error
          ? deleteError.message
          : "No se pudo desactivar la publicación.",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="space-y-4">
          <div className="h-7 w-52 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (
    error ||
    !publication
  ) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="!m-0 text-red-800 lr-page-title">{t("No se pudo cargar la publicación ")}</h1>

          <p className="mt-2 text-sm text-red-700">
            {error ??
              "La publicación no existe."}
          </p>

          <Button
            variant="outline"
            asChild
            className="mt-4"
          >
            <Link href="/dashboard/publications">{t("Volver al listado ")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 w-full max-w-[1180px] text-foreground">
      <header className="border-b border-border pb-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><DashboardBreadcrumb className="mb-2" items={[{ label: "Publicaciones", href: "/dashboard/publications" }, { label: "Detalle" }]} /><PublicationStatusBadge
              status={
                publication.status
              }
            /></div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="-ml-2 h-8 gap-1.5 px-2 text-xs text-muted-foreground"
        >
          <Link href="/dashboard/publications">
            <ArrowLeft
              size={15}
            />{t("Volver a publicaciones ")}</Link>
        </Button>
      </div><div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5"
          >
            <Link
              href={`/dashboard/publications/${publication.id}/edit`}
            >
              <Pencil
                size={14}
              />{t("Editar ")}</Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              deleting ||
              publication.status ===
                "INACTIVE"
            }
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() =>
              void handleDelete()
            }
          >
            <Trash2
              size={14}
            />

            {t(publication.status ===
            "INACTIVE"
              ? "Inactiva"
              : deleting
                ? "Desactivando..."
                : "Desactivar")}
          </Button>
        </div></div>
        <div className="flex flex-col-reverse gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-primary">
              {t(publication.serviceType ===
              "TRANSPORT"
                ? "Transporte"
                : "Excursión")}
            </span>
            <h1 className="!m-0 !max-w-none break-words sm:!text-4xl lr-page-title">
            {publication.title ??
              "Publicación sin título"}
          </h1>
            <div className="mt-5"><h2 className="!m-0 !text-sm !font-semibold !leading-5 !tracking-normal text-[var(--ink)]">{t("Información del servicio ")}</h2><div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4"><InfoItem
            icon={
              <CalendarDays
                size={16}
              />
            }
            label={t("Precio")}
            value={
              publication.pricePerPerson !==
              null
                ? `USD ${publication.pricePerPerson.toFixed(
                    2,
                  )}`
                : "Sin definir"
            }
          />
<InfoItem
            icon={
              <MapPin
                size={16}
              />
            }
            label={t("Destino")}
            value={
              publication.destination ??
              "Sin definir"
            }
          />
<InfoItem
            icon={
              <Clock3
                size={16}
              />
            }
            label={t("Duración")}
            value={
              publication.durationMinutes
                ? durationLabel(publication.durationMinutes)
                : "Sin definir"
            }
          />
<InfoItem
            icon={
              <Users
                size={16}
              />
            }
            label={t("Capacidad")}
            value={
              publication.defaultCapacity
                ? `${publication.defaultCapacity} personas`
                : "Sin definir"
            }
          /></div></div>
          </div>
          <div className="h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-44 sm:w-64 lg:w-80">
        {publication.mainImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={
              publication.mainImageUrl
            }
            alt={
              publication.title ??
              "Publicación"
            }
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("Sin imagen principal ")}</div>
        )}
      </div>
        </div>
      </header>
      {publication.status === "REJECTED" && publication.rejectionReason && (
        <section className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="!m-0 !text-sm !font-semibold text-destructive">{t("Motivo del rechazo")}</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{publication.rejectionReason}</p>
        </section>
      )}
      <Tabs.Root defaultValue="overview" className="mt-3">
        <Tabs.List aria-label={t("Información de la publicación")} className="flex gap-6 overflow-x-auto border-b border-border">
          <Tabs.Trigger value="overview" className={tabClassName}>{t("Resumen")}</Tabs.Trigger>
          <Tabs.Trigger value="details" className={tabClassName}>{t("Detalles del servicio")}</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="overview" className={panelClassName}>
          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0">
        <h2 className="!m-0 !text-sm !font-semibold !leading-6 !tracking-normal text-foreground">{t("Descripción ")}</h2>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {publication.description ??
            "Sin descripción."}
        </p>
      </section>
            <aside className="min-w-0 lg:border-l lg:border-border lg:pl-8"><section className="min-w-0">
        <div className="flex items-center gap-2">
          <Languages
            size={16}
            className="text-[var(--primary)]"
          />

          <h2 className="!m-0 !text-sm !font-semibold !leading-6 !tracking-normal text-foreground">{t("Idiomas ")}</h2>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {publication.languages &&
          publication.languages.length >
            0 ? (
            publication.languages.map(
              (language) => (
                <span
                  key={
                    language.id
                  }
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--primary)]"
                >
                  {language.name}
                </span>
              ),
            )
          ) : (
            <p className="text-sm text-muted-foreground">{t("Sin idiomas definidos. ")}</p>
          )}
        </div>
      </section></aside>
          </div>
        </Tabs.Content>
        <Tabs.Content value="details" className={panelClassName}>
          {publication.journey ? <section className="mb-6 border-b border-border pb-6"><h2 className="lr-section-title">{t("Trayecto")}</h2><JourneyView journey={publication.journey} meetingPoint={publication.meetingPoint}/></section> : null}
          {!publication.journey ? <section className="mb-6 min-w-0 border-b border-border pb-6">
        <div className="flex items-center gap-2">
          <MapPin
            size={16}
            className="text-[var(--primary)]"
          />

          <h2 className="!m-0 !text-sm !font-semibold !leading-6 !tracking-normal text-foreground">{t("Punto de encuentro ")}</h2>
        </div>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {publication.meetingPoint ??
            "Sin definir."}
        </p>
      </section> : null}
          <section className="grid min-w-0 gap-8 md:grid-cols-2">
        <div className="min-w-0">
          <h2 className="!m-0 !text-sm !font-semibold !leading-6 !tracking-normal text-foreground">{t("Qué incluye ")}</h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {publication.included ??
              "Sin información."}
          </p>
        </div>

        <div className="min-w-0">
          <h2 className="!m-0 !text-sm !font-semibold !leading-6 !tracking-normal text-foreground">{t("Qué no incluye ")}</h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {publication.notIncluded ??
              "Sin información."}
          </p>
        </div>
      </section>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const { t } = usePreferences();
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}

        <span className="text-xs">
          {t(label)}
        </span>
      </div>

      <p className={label === "Precio" ? "mt-1 break-words text-2xl font-semibold text-primary" : "mt-1 break-words text-sm font-medium text-foreground"}>
        {value}
      </p>
    </div>
  );
}

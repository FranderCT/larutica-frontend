"use client";
import { DashboardBreadcrumb } from "@/components/dashboard/DashboardBreadcrumb";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  useRouter,
} from "next/navigation";

import {
  BadgeCheck,
  Building2,
  FileText,
  Languages,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tags,
} from "lucide-react";

import {
  useAgency,
} from "@/modules/agency/hooks/useAgency";

export default function MyAgencyPage() {
  const { t } = usePreferences();
  const router =
    useRouter();

  const {
    agency,
    loading,
    error,
  } =
    useAgency();

  if (loading) {
    return (
      <AgencyLoadingState />
    );
  }

  if (!agency) {
    return (
      <div className="mx-auto w-full max-w-[1180px]">
        <PageHeader
          title={t("Mi agencia")}
          description={t("Administra la información y el estado de tu agencia dentro de LaRutica.")}
        />

        <section className="overflow-hidden rounded-[22px] border border-[#DDE6E1] bg-white shadow-[0_10px_35px_rgba(18,58,48,0.05)]">
          <div className="px-6 py-10 sm:px-10">
            <div className="mx-auto max-w-[680px] text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#EAF5ED] text-[#075E36]">
                <Building2
                  size={24}
                  strokeWidth={1.8}
                />
              </div>

              <h2 className="!m-0 !mt-5 !text-[24px] !font-bold !leading-8 !tracking-[-0.02em] text-[#123A30]">{t("Registra tu agencia en LaRutica ")}</h2>

              <p className="mx-auto mt-2 max-w-[560px] text-[12px] leading-5 text-[#66706B]">{t("Crea el perfil de tu negocio para comenzar el proceso de revisión y preparar tu cuenta para publicar experiencias, gestionar promociones y recibir reservas. ")}</p>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/dashboard/my-agency/new",
                    )
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#075E36] px-5 text-[12px] font-semibold text-white transition hover:bg-[#064D2D]"
                >
                  <Plus
                    size={15}
                  />{t("Registrar mi agencia ")}</button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] leading-4 text-[#7A837F]">
                <ShieldCheck
                  size={12}
                  className="shrink-0 text-[#6B8176]"
                />

                <span>{t("Tu agencia será revisada por administración antes de activarse. ")}</span>
              </div>
            </div>

            <div className="mx-auto mt-9 grid max-w-[860px] gap-3 border-t border-[#EDF0EE] pt-6 md:grid-cols-3">
              <ProcessStep
                number="1"
                icon={
                  <FileText
                    size={15}
                  />
                }
                title={t("Completa tu perfil")}
                text="Agrega información del negocio, medios de contacto e identidad visual."
              />

              <ProcessStep
                number="2"
                icon={
                  <ShieldCheck
                    size={15}
                  />
                }
                title={t("Envía a revisión")}
                text="Administración revisará la información y documentos enviados."
              />

              <ProcessStep
                number="3"
                icon={
                  <BadgeCheck
                    size={15}
                  />
                }
                title={t("Activa tu agencia")}
                text="Cuando sea aprobada podrás empezar a operar dentro de LaRutica."
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[#F1E5C9] bg-[#FFFCF5] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#765B17]">{t("El servicio de agencias no está disponible temporalmente ")}</p>

              <p className="mt-0.5 text-[10px] leading-4 text-[#8C7743]">{t("Intenta nuevamente dentro de unos momentos. ")}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#D9C993] bg-white px-3 text-[10px] font-semibold text-[#765B17]"
            >
              <RefreshCw
                size={12}
              />{t("Reintentar ")}</button>
          </div>
        )}
      </div>
    );
  }

  const canEdit =
    agency.status ===
      "DRAFT" ||
    agency.status ===
      "REJECTED" ||
    agency.status ===
      "APPROVED";

  const location =
    [
      agency.city,
      agency.province,
      agency.country,
    ]
      .filter(Boolean)
      .join(", ");

  return (
    <div className="mx-auto min-w-0 w-full max-w-[1180px] text-foreground">
      <PageHeader
        title={t("Mi agencia")}
        description={t("Consulta y administra la información de tu agencia.")}
        action={
          canEdit ? (
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/dashboard/my-agency/edit",
                )
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#0A6A42] bg-white px-4 text-[11px] font-semibold text-[#075E36] transition hover:bg-[#EFF8F3]"
            >
              <Pencil
                size={14}
              />

              {t("\r\n\r\n              Editar agencia\r\n            ")}
            </button>
          ) : undefined
        }
      />
      {agency.status ===
        "PENDING" && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#F1D49A] bg-[#FFF9EC] px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1C8] text-[#886617]">
            <ShieldCheck
              size={16}
            />
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#765B17]">{t("Tu agencia está en revisión ")}</p>

            <p className="mt-0.5 text-[10px] leading-4 text-[#8C7743]">{t("Administración está revisando la información y los documentos enviados. Mientras el proceso esté activo no podrás modificar el perfil. ")}</p>
          </div>
        </div>
      )}
      {agency.status ===
        "REJECTED" && (
        <div className="mb-4 rounded-xl border border-[#F2CACA] bg-[#FFF4F4] px-4 py-3">
          <p className="text-[11px] font-semibold text-[#963333]">{t("La agencia requiere correcciones ")}</p>

          <p className="mt-0.5 text-[10px] leading-4 text-[#A75A5A]">{t("Edita la información necesaria y vuelve a enviarla para revisión. ")}</p>
          {agency.rejectionReason && (
            <div className="mt-3 text-sm text-destructive">
              <p className="font-semibold">{t("Motivo del rechazo")}</p>
              <p className="mt-1 whitespace-pre-wrap break-words">{agency.rejectionReason}</p>
            </div>
          )}
        </div>
      )}
      <header className="mb-6 flex flex-col-reverse gap-6 border-b border-border pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-5">
              <div className="flex min-w-0 items-start gap-4">
                {/* LOGO */}
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background p-2">
                  {agency.logoUrl ? (
                    <img
                      src={agency.logoUrl}
                      alt={t("Logo de la agencia")}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building2
                      size={30}
                      className="text-[#075E36]"
                    />
                  )}
                </div>

                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="!m-0 !text-2xl !font-semibold !leading-8 !tracking-normal min-w-0 max-w-full break-words text-foreground">
                      {agency.commercialName}
                    </h2>

                    {agency.status ===
                      "APPROVED" && (
                      <BadgeCheck
                        size={18}
                        className="shrink-0 text-[#075E36]"
                      />
                    )}
                  </div>

                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {agency.agencyName}
                  </p>

                  {agency.description && (
                    <p className="mt-3 max-w-[720px] text-sm leading-5 text-muted-foreground">
                      {agency.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0">
                <AgencyStatusBadge
                  status={
                    agency.status
                  }
                />
              </div>
            </div>
          </div>
        <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-44 lg:w-80">
          {agency.coverUrl ? (
            <img
              src={agency.coverUrl}
              alt={t("Portada de la agencia")}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#EAF3ED] to-[#DCEAE2] text-[#91A69A]">
              <Building2
                size={42}
                strokeWidth={1.4}
              />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
        </div>
      </header>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <div className="grid min-w-0 gap-8 md:grid-cols-2"><InfoCard
              icon={
                <Mail
                  size={17}
                />
              }
              title={t("Contacto")}
              description={t("Información para contactar con la agencia.")}
              items={[
                agency.email
                  ? {
                      icon: (
                        <Mail
                          size={14}
                        />
                      ),

                      text:
                        agency.email,
                    }
                  : null,

                agency.phone
                  ? {
                      icon: (
                        <Phone
                          size={14}
                        />
                      ),

                      text:
                        agency.phone,
                    }
                  : null,
              ]}
            />
<InfoCard
              icon={
                <MapPin
                  size={17}
                />
              }
              title={t("Ubicación")}
              description={t("Ubicación registrada para la agencia.")}
              items={[
                location
                  ? {
                      icon: (
                        <MapPin
                          size={14}
                        />
                      ),

                      text:
                        location,
                    }
                  : null,

                agency.exactAddress
                  ? {
                      icon: (
                        <MapPin
                          size={14}
                        />
                      ),

                      text:
                        agency.exactAddress,
                    }
                  : null,
              ]}
            /></div>
          <div className="grid min-w-0 gap-8 border-t border-border pt-6 md:grid-cols-2">
            <section className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF5ED] text-[#075E36]">
                  <Tags
                    size={17}
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">{t("Categorías ")}</p>

                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t("Tipos de servicios y experiencias que ofrece tu agencia. ")}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {agency.categories.length >
                0 ? (
                  agency.categories.map(
                    (
                      category,
                    ) => (
                      <span
                        key={
                          category.id
                        }
                        className="rounded-full border border-[#CFE3D6] bg-[#EFF8F3] px-3 py-1.5 text-xs font-medium text-[#075E36]"
                      >
                        {
                          category.name
                        }
                      </span>
                    ),
                  )
                ) : (
                  <EmptyInlineText />
                )}
              </div>
            </section>

            <section className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EDF3F0] text-[#315F4C]">
                  <Languages
                    size={17}
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground">{t("Idiomas ")}</p>

                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t("Idiomas disponibles para atender a los viajeros. ")}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {agency.languages.length >
                0 ? (
                  agency.languages.map(
                    (
                      language,
                    ) => (
                      <span
                        key={
                          language.id
                        }
                        className="rounded-full border border-[#DEE5E1] bg-white px-3 py-1.5 text-xs font-medium text-[#52615B]"
                      >
                        {
                          language.name
                        }
                      </span>
                    ),
                  )
                ) : (
                  <EmptyInlineText />
                )}
              </div>
            </section>
          </div>
        </div>
        <aside className="min-w-0 lg:border-l lg:border-border lg:pl-8"><StatusCard
              status={
                agency.status
              }
            /></aside>
      </div>
    </div>
  );
}

function AgencyLoadingState() {
  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="mb-4">
        <div className="h-3 w-32 animate-pulse rounded bg-[#E8ECEA]" />

        <div className="mt-3 h-9 w-44 animate-pulse rounded-lg bg-[#E2E8E4]" />

        <div className="mt-2 h-3 w-80 max-w-full animate-pulse rounded bg-[#EEF1EF]" />
      </div>

      <section className="overflow-hidden rounded-[22px] border border-[#DDE2DF] bg-white">
        <div className="h-[220px] animate-pulse bg-[#EAF1ED]" />

        <div className="px-6 pb-6">
          <div className="-mt-10 rounded-[20px] border border-[#E5EBE8] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="size-[92px] animate-pulse rounded-[20px] bg-[#EAF5ED]" />

              <div className="flex-1">
                <div className="h-5 w-56 animate-pulse rounded bg-[#E4E9E6]" />

                <div className="mt-3 h-3 w-32 animate-pulse rounded bg-[#EEF1EF]" />

                <div className="mt-4 h-3 w-[70%] animate-pulse rounded bg-[#EEF1EF]" />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {Array.from({
              length: 3,
            }).map(
              (
                _,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                  className="h-36 animate-pulse rounded-2xl bg-[#F0F4F2]"
                />
              ),
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;

  action?:
    React.ReactNode;
}) {
  const { t } = usePreferences();
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <DashboardBreadcrumb className="mb-2" items={[{ label: "Mi agencia" }]} />

        <h1 className="!m-0 !max-w-none sm:!text-4xl lr-page-title">
          {t(title)}
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t(description)}
        </p>
      </div>

      {action}
    </div>
  );
}

function ProcessStep({
  number,
  icon,
  title,
  text,
}: {
  number: string;

  icon:
    React.ReactNode;

  title: string;

  text: string;
}) {
  const { t } = usePreferences();
  return (
    <div className="rounded-xl border border-[#E5E9E7] bg-[#FCFDFC] p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF5ED] text-[#075E36]">
          {icon}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold text-[#8A938E]">
            {number}.
          </span>

          <p className="text-[11px] font-semibold text-[#252B28]">
            {t(title)}
          </p>
        </div>
      </div>

      <p className="mt-2 text-[9px] leading-4 text-[#7A837F]">
        {text}
      </p>
    </div>
  );
}

interface InfoItem {
  icon:
    React.ReactNode;

  text: string;
}

function InfoCard({
  icon,
  title,
  description,
  items,
}: {
  icon:
    React.ReactNode;

  title: string;

  description: string;

  items: Array<
    InfoItem | null
  >;
}) {
  const { t } = usePreferences();
  const validItems =
    items.filter(
      (
        item,
      ): item is InfoItem =>
        item !==
          null &&
        Boolean(
          item.text,
        ),
    );

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF5ED] text-[#075E36]">
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">
            {t(title)}
          </p>

          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {t(description)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {validItems.length >
        0 ? (
          validItems.map(
            (
              item,
              index,
            ) => (
              <div
                key={`${item.text}-${index}`}
                className="flex min-w-0 items-start gap-2.5 text-sm leading-6 text-muted-foreground"
              >
                <span className="mt-0.5 shrink-0 text-[#075E36]">
                  {
                    item.icon
                  }
                </span>

                <span className="min-w-0 break-words">
                  {
                    item.text
                  }
                </span>
              </div>
            ),
          )
        ) : (
          <EmptyInlineText />
        )}
      </div>
    </div>
  );
}

function StatusCard({
  status,
}: {
  status: string;
}) {
  const { t } = usePreferences();
  return (
    <div className="min-w-0">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF5ED] text-[#075E36]">
          <ShieldCheck
            size={17}
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{t("Estado del perfil ")}</p>

          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t("Situación actual de tu agencia dentro de LaRutica. ")}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#E5ECE8] bg-white px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EAF5ED] text-[#075E36]">
            <ShieldCheck
              size={14}
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              {getStatusTitle(
                status,
              )}
            </p>

            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {getStatusDescription(
                status,
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyInlineText() {
  const { t } = usePreferences();
  return (
    <span className="text-sm text-muted-foreground">{t("Sin información ")}</span>
  );
}

function AgencyStatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<
    string,
    string
  > = {
    DRAFT:
      "border-[#DDE2DF] bg-[#F5F6F5] text-[#59615D]",

    PENDING:
      "border-[#F1D49A] bg-[#FFF8E8] text-[#886617]",

    APPROVED:
      "border-[#CBE5D4] bg-[#EAF6EE] text-[#075E36]",

    REJECTED:
      "border-[#F2CACA] bg-[#FFF0F0] text-[#A63737]",

    INACTIVE:
      "border-[#DDE2DF] bg-[#F1F2F1] text-[#727A76]",
  };

  const labels: Record<
    string,
    string
  > = {
    DRAFT:
      "Borrador",

    PENDING:
      "En revisión",

    APPROVED:
      "Verificada",

    REJECTED:
      "Rechazada",

    INACTIVE:
      "Inactiva",
  };

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",

        styles[
          status
        ] ??
          "border-[#DDE2DF] bg-[#F5F6F5] text-[#59615D]",
      ].join(
        " ",
      )}
    >
      {labels[
        status
      ] ??
        status}
    </span>
  );
}

function getStatusTitle(
  status: string,
) {
  switch (
    status
  ) {
    case "APPROVED":
      return "Agencia verificada";

    case "PENDING":
      return "Revisión en proceso";

    case "REJECTED":
      return "Requiere correcciones";

    case "INACTIVE":
      return "Agencia inactiva";

    default:
      return "Perfil en borrador";
  }
}

function getStatusDescription(
  status: string,
) {
  switch (
    status
  ) {
    case "APPROVED":
      return "Tu perfil está activo y disponible dentro de la plataforma.";

    case "PENDING":
      return "Administración está revisando la información enviada.";

    case "REJECTED":
      return "Revisa la información necesaria antes de volver a enviarla.";

    case "INACTIVE":
      return "Actualmente tu agencia no está disponible.";

    default:
      return "Completa la información antes de enviarla a revisión.";
  }
}

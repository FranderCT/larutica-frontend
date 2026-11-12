"use client";

import { localeFor, type Language } from "@/lib/preferences/format";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Clock3,
  Info,
  Plus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  createPublicationDeparture,
  getPublicationDepartures,
  updatePublicationDeparture,
} from "../services/publication.service";

import type {
  Publication,
  PublicationDeparture,
} from "../types/publication.types";

type DepartureView =
  | "upcoming"
  | "all";

type DepartureFormState = {
  date: string;
  startTime: string;
  endTime: string;
  capacity: string;
};

const EMPTY_FORM: DepartureFormState = {
  date: "",
  startTime: "",
  endTime: "",
  capacity: "",
};

const COSTA_RICA_TIME_ZONE =
  "America/Costa_Rica";

function toCostaRicaIso(
  date: string,
  time: string,
): string {
  return `${date}T${time}:00-06:00`;
}

function formatDate(
  value: string,
  language: Language,
): string {
  return new Intl.DateTimeFormat(
    localeFor(language),
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone:
        COSTA_RICA_TIME_ZONE,
    },
  ).format(
    new Date(value),
  );
}

function formatTime(
  value: string,
  language: Language,
): string {
  return new Intl.DateTimeFormat(
    localeFor(language),
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone:
        COSTA_RICA_TIME_ZONE,
    },
  ).format(
    new Date(value),
  );
}

function isFutureDeparture(
  departure: PublicationDeparture,
): boolean {
  return (
    new Date(
      departure.startAt,
    ).getTime() >
    Date.now()
  );
}

function getStatusLabel(
  status: PublicationDeparture["status"],
): string {
  if (
    status ===
    "ACTIVE"
  ) {
    return "Activa";
  }

  if (
    status ===
    "CANCELLED"
  ) {
    return "Inactiva";
  }

  return "Completada";
}

function getStatusClass(
  status: PublicationDeparture["status"],
): string {
  if (
    status ===
    "ACTIVE"
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    status ===
    "CANCELLED"
  ) {
    return "bg-slate-100 text-slate-600";
  }

  return "bg-amber-50 text-amber-700";
}

export function PublicationDepartures({
  publication,
}: {
  publication: Publication;
}) {
  const { t, language } =
    usePreferences();

  const [
    departures,
    setDepartures,
  ] = useState<
    PublicationDeparture[]
  >([]);

  const [
    view,
    setView,
  ] =
    useState<DepartureView>(
      "upcoming",
    );

  const [
    form,
    setForm,
  ] =
    useState<DepartureFormState>({
      ...EMPTY_FORM,

      capacity:
        publication.defaultCapacity
          ? String(
              publication.defaultCapacity,
            )
          : "",
    });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    updatingDepartureId,
    setUpdatingDepartureId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null,
    );

  const loadDepartures =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const result =
            await getPublicationDepartures(
              publication.id,
            );

          setDepartures(
            result,
          );
        } catch (loadError) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "No se pudieron cargar las salidas.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        publication.id,
      ],
    );

  useEffect(() => {
    void loadDepartures();
  }, [
    loadDepartures,
  ]);

  /*
   * Próximas muestra TODAS las salidas futuras,
   * tanto activas como inactivas.
   *
   * Esto permite que la agencia pueda
   * volver a activar una salida que
   * previamente desactivó.
   */
  const visibleDepartures =
    useMemo(
      () =>
        departures.filter(
          (departure) =>
            view === "all" ||
            isFutureDeparture(
              departure,
            ),
        ),
      [
        departures,
        view,
      ],
    );

  function patchForm(
    key: keyof DepartureFormState,
    nextValue: string,
  ) {
    setForm(
      (previous) => ({
        ...previous,
        [key]: nextValue,
      }),
    );
  }

  async function handleCreateDeparture() {
    setError(null);
    setSuccess(null);

    if (
      !form.date ||
      !form.startTime
    ) {
      setError(
        "Debes indicar la fecha y la hora de inicio.",
      );

      return;
    }

    const capacity =
      Number(
        form.capacity,
      );

    if (
      !Number.isInteger(
        capacity,
      ) ||
      capacity <= 0
    ) {
      setError(
        "La capacidad debe ser un número entero mayor que cero.",
      );

      return;
    }

    const startAt =
      toCostaRicaIso(
        form.date,
        form.startTime,
      );

    const endAt =
      form.endTime
        ? toCostaRicaIso(
            form.date,
            form.endTime,
          )
        : null;

    if (
      new Date(
        startAt,
      ).getTime() <=
      Date.now()
    ) {
      setError(
        "La salida debe programarse para una fecha y hora futura.",
      );

      return;
    }

    if (
      endAt &&
      new Date(
        endAt,
      ).getTime() <=
        new Date(
          startAt,
        ).getTime()
    ) {
      setError(
        "La hora de fin debe ser posterior a la hora de inicio.",
      );

      return;
    }

    setSaving(true);

    try {
      const created =
        await createPublicationDeparture(
          publication.id,
          {
            startAt,
            endAt,
            capacity,
          },
        );

      setDepartures(
        (current) =>
          [
            ...current,
            created,
          ].sort(
            (
              left,
              right,
            ) =>
              new Date(
                left.startAt,
              ).getTime() -
              new Date(
                right.startAt,
              ).getTime(),
          ),
      );

      setForm({
        ...EMPTY_FORM,

        capacity:
          publication.defaultCapacity
            ? String(
                publication.defaultCapacity,
              )
            : "",
      });

      setSuccess(
        "La salida se guardó correctamente.",
      );
    } catch (createError) {
      setError(
        createError instanceof
          Error
          ? createError.message
          : "No se pudo guardar la salida.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(
    departure: PublicationDeparture,
  ) {
    if (
      departure.status ===
      "COMPLETED"
    ) {
      return;
    }

    const nextStatus:
      PublicationDeparture["status"] =
      departure.status ===
      "ACTIVE"
        ? "CANCELLED"
        : "ACTIVE";

    setError(null);
    setSuccess(null);

    setUpdatingDepartureId(
      departure.id,
    );

    try {
      const updated =
        await updatePublicationDeparture(
          publication.id,
          departure.id,
          {
            status:
              nextStatus,
          },
        );

      /*
       * Actualizamos únicamente la salida
       * modificada sin volver a cargar
       * toda la tabla.
       */
      setDepartures(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              departure.id
                ? updated
                : item,
          ),
      );

      setSuccess(
        nextStatus ===
        "ACTIVE"
          ? "La salida fue activada correctamente."
          : "La salida fue desactivada correctamente.",
      );
    } catch (updateError) {
      setError(
        updateError instanceof
          Error
          ? updateError.message
          : "No se pudo cambiar el estado de la salida.",
      );
    } finally {
      setUpdatingDepartureId(
        null,
      );
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {t(error)}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {t(success)}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)]">
        {/* =====================================================
            SALIDAS PROGRAMADAS
        ====================================================== */}
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-black/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="!m-0 !text-lg !font-semibold !leading-6 !tracking-normal text-[var(--ink)]">
                {t(
                  "Salidas programadas",
                )}
              </h2>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t(
                  "Administra las salidas futuras y su disponibilidad.",
                )}
              </p>
            </div>

            <div className="flex rounded-xl bg-muted/40 p-1">
              <button
                type="button"
                onClick={() =>
                  setView(
                    "upcoming",
                  )
                }
                className={[
                  "rounded-lg px-4 py-2 text-xs font-semibold transition",
                  view ===
                  "upcoming"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(
                  " ",
                )}
              >
                {t(
                  "Próximas",
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setView(
                    "all",
                  )
                }
                className={[
                  "rounded-lg px-4 py-2 text-xs font-semibold transition",
                  view ===
                  "all"
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(
                  " ",
                )}
              >
                {t(
                  "Todas",
                )}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map(
                (item) => (
                  <div
                    key={
                      item
                    }
                    className="h-16 animate-pulse rounded-xl bg-muted"
                  />
                ),
              )}
            </div>
          ) : visibleDepartures.length ===
            0 ? (
            <div className="flex min-h-64 items-center justify-center p-6">
              <div className="max-w-sm text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-[var(--primary)]">
                  <CalendarDays
                    size={22}
                  />
                </div>

                <h3 className="!mb-0 !mt-4 !text-sm !font-semibold !tracking-normal text-[var(--ink)]">
                  {t(
                    view ===
                      "upcoming"
                      ? "No hay próximas salidas"
                      : "Todavía no hay salidas",
                  )}
                </h3>

                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {t(
                    "Agrega una fecha y horario para que los viajeros puedan reservar.",
                  )}
                </p>
              </div>
            </div>
          ) : (
            /*
             * Solo scroll vertical.
             * No utilizamos min-width ni overflow-x.
             */
            <div className="max-h-[390px] overflow-y-auto overflow-x-hidden">
              {/* Encabezado */}
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1.8fr)_minmax(90px,0.85fr)_minmax(78px,0.7fr)_58px] items-center gap-2 border-b border-black/10 bg-[#f8faf9] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.03em] text-muted-foreground">
                <span>
                  {t(
                    "Fecha y hora",
                  )}
                </span>

                <span>
                  {t(
                    "Capacidad",
                  )}
                </span>

                <span>
                  {t(
                    "Estado",
                  )}
                </span>

                <span className="text-center">
                  {t(
                    "Visible",
                  )}
                </span>
              </div>

              {/* Filas */}
              <div>
                {visibleDepartures.map(
                  (
                    departure,
                  ) => {
                    const active =
                      departure.status ===
                      "ACTIVE";

                    const completed =
                      departure.status ===
                      "COMPLETED";

                    const updating =
                      updatingDepartureId ===
                      departure.id;

                    return (
                      <div
                        key={
                          departure.id
                        }
                        className="grid min-h-[72px] grid-cols-[minmax(0,1.8fr)_minmax(90px,0.85fr)_minmax(78px,0.7fr)_58px] items-center gap-2 border-b border-black/10 px-4 py-3 last:border-b-0"
                      >
                        {/* Fecha */}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--ink)]">
                            {formatDate(
                              departure.startAt,
                              language,
                            )}
                          </p>

                          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Clock3
                              size={
                                12
                              }
                              className="shrink-0"
                            />

                            <span className="truncate">
                              {formatTime(
                                departure.startAt,
                                language,
                              )}

                              {departure.endAt
                                ? ` - ${formatTime(
                                    departure.endAt,
                                    language,
                                  )}`
                                : ""}
                            </span>
                          </div>
                        </div>

                        {/* Capacidad */}
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Users
                            size={
                              14
                            }
                            className="shrink-0 text-[var(--primary)]"
                          />

                          <span className="truncate text-xs text-foreground">
                            {
                              departure.capacity
                            }{" "}
                            {t(
                              "personas",
                            )}
                          </span>
                        </div>

                        {/* Estado */}
                        <div>
                          <span
                            className={[
                              "inline-flex max-w-full items-center rounded-md px-2 py-1 text-[11px] font-semibold",
                              getStatusClass(
                                departure.status,
                              ),
                            ].join(
                              " ",
                            )}
                          >
                            {t(
                              getStatusLabel(
                                departure.status,
                              ),
                            )}
                          </span>
                        </div>

                        {/* Switch */}
                        <div className="flex justify-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={
                              active
                            }
                            aria-label={
                              active
                                ? t(
                                    "Desactivar salida",
                                  )
                                : t(
                                    "Activar salida",
                                  )
                            }
                            title={
                              completed
                                ? t(
                                    "Una salida completada no puede reactivarse.",
                                  )
                                : active
                                  ? t(
                                      "Desactivar salida",
                                    )
                                  : t(
                                      "Activar salida",
                                    )
                            }
                            disabled={
                              completed ||
                              updating
                            }
                            onClick={() =>
                              void handleToggleStatus(
                                departure,
                              )
                            }
                            className={[
                              "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border transition-all duration-200",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20",
                              "disabled:cursor-not-allowed disabled:opacity-40",
                              active
                                ? "border-[var(--primary)] bg-[var(--primary)]"
                                : "border-slate-300 bg-slate-200",
                            ].join(
                              " ",
                            )}
                          >
                            <span
                              className={[
                                "block size-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                                active
                                  ? "translate-x-[18px]"
                                  : "translate-x-[3px]",
                              ].join(
                                " ",
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}

          <div className="border-t border-black/10 px-5 py-4">
            <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <Info
                size={15}
                className="mt-0.5 shrink-0 text-[var(--primary)]"
              />

              <p>
                {t(
                  "Desactiva una salida para ocultarla a los viajeros y vuelve a activarla cuando lo necesites. Las salidas completadas quedan bloqueadas.",
                )}
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
            AGREGAR SALIDA
        ====================================================== */}
        <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div>
            <h2 className="!m-0 !text-lg !font-semibold !leading-6 !tracking-normal text-[var(--ink)]">
              {t(
                "Agregar salida",
              )}
            </h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t(
                "Define la fecha, el horario y los cupos.",
              )}
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {/* Fecha */}
            <div>
              <label
                htmlFor="departure-date"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                {t(
                  "Fecha de salida",
                )}

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="relative">
                <CalendarDays
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <Input
                  id="departure-date"
                  type="date"
                  value={
                    form.date
                  }
                  onChange={(
                    event,
                  ) =>
                    patchForm(
                      "date",
                      event
                        .target
                        .value,
                    )
                  }
                  className="pl-9"
                />
              </div>
            </div>

            {/* Horas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="departure-start-time"
                  className="mb-1.5 block text-xs font-medium text-foreground"
                >
                  {t(
                    "Hora de inicio",
                  )}

                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <Clock3
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />

                  <Input
                    id="departure-start-time"
                    type="time"
                    value={
                      form.startTime
                    }
                    onChange={(
                      event,
                    ) =>
                      patchForm(
                        "startTime",
                        event
                          .target
                          .value,
                      )
                    }
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="departure-end-time"
                  className="mb-1.5 block text-xs font-medium text-foreground"
                >
                  {t(
                    "Hora de fin",
                  )}
                </label>

                <div className="relative">
                  <Clock3
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />

                  <Input
                    id="departure-end-time"
                    type="time"
                    value={
                      form.endTime
                    }
                    onChange={(
                      event,
                    ) =>
                      patchForm(
                        "endTime",
                        event
                          .target
                          .value,
                      )
                    }
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Capacidad */}
            <div>
              <label
                htmlFor="departure-capacity"
                className="mb-1.5 block text-xs font-medium text-foreground"
              >
                {t(
                  "Capacidad de esta salida",
                )}

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="relative">
                <Users
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />

                <Input
                  id="departure-capacity"
                  type="number"
                  min={1}
                  step={1}
                  value={
                    form.capacity
                  }
                  onChange={(
                    event,
                  ) =>
                    patchForm(
                      "capacity",
                      event
                        .target
                        .value,
                    )
                  }
                  className="pl-9"
                />
              </div>

              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {t(
                  "Número máximo de personas para esta salida.",
                )}
              </p>
            </div>

            {/* Zona horaria */}
            <div className="rounded-xl border border-[#dcebe5] bg-[#f4faf7] px-4 py-3">
              <div className="flex items-start gap-2">
                <Clock3
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--primary)]"
                />

                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">
                    {t(
                      "Zona horaria: Costa Rica (UTC-6)",
                    )}
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    {t(
                      "Las horas se guardan usando la zona horaria de Costa Rica.",
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Guardar */}
            <Button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void handleCreateDeparture()
              }
              className="w-full gap-2 bg-[var(--primary)] text-white hover:bg-[var(--brand-forest-hover)]"
            >
              <Plus
                size={16}
              />

              {saving
                ? t(
                    "Guardando...",
                  )
                : t(
                    "Guardar salida",
                  )}
            </Button>
          </div>
        </section>
      </div>

      {/* Información */}
      <div className="rounded-xl border border-[#dce5e1] bg-muted/20 px-4 py-3">
        <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <Info
            size={15}
            className="mt-0.5 shrink-0 text-[var(--primary)]"
          />

          <p>
            {t(
              "Cada salida tiene su propia fecha, horario y capacidad. La capacidad predeterminada de la publicación solo se utiliza como valor inicial al crear nuevas salidas.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
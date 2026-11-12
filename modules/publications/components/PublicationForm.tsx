"use client";
import { durationLabel } from "@/lib/preferences/format";

import { usePreferences } from "@/lib/preferences/Preferences";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Bus,
  Check,
  CheckCircle2,
  DollarSign,
  ImageIcon,
  Languages,
  MapPin,
  Mountain,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JourneyEditor } from "@/modules/journeys/JourneyEditor";
import { journeyReady } from "@/modules/journeys/types";

import { Textarea } from "@/components/ui/textarea";

import type {
  CreatePublicationInput,
} from "../types/publication.types";

type PublicationFormProps = {
  initialValue: CreatePublicationInput;
  allowLegacyJourney?: boolean;

  onSubmit: (
    value: CreatePublicationInput,
  ) => Promise<void> | void;

  onCancel: () => void;

  draftLabel?: string;

  submitLabel?: string;
};

type FormStep =
  | 1
  | 2
  | 3
  | 4
  | 5;

const LANGUAGES = [
  {
    id: 1,
    name: "Español",
    code: "es",
  },
  {
    id: 2,
    name: "Inglés",
    code: "en",
  },
];

const STEPS: {
  id: FormStep;
  title: string;
  shortTitle: string;
  description: string;
}[] = [
  {
    id: 1,
    title: "Datos básicos",
    shortTitle: "Datos",
    description:
      "Define el tipo de servicio y la información principal de la publicación.",
  },
  { id: 2, title: "Define el trayecto", shortTitle: "Trayecto", description: "Selecciona y confirma el recorrido en el mapa." },
  {
    id: 3,
    title: "Detalles del servicio",
    shortTitle: "Servicio",
    description:
      "Configura el precio, la duración y la capacidad predeterminada.",
  },
  {
    id: 4,
    title: "Experiencia e idiomas",
    shortTitle: "Experiencia",
    description:
      "Indica los idiomas y lo que incluye la experiencia.",
  },
  {
    id: 5,
    title: "Imagen y revisión",
    shortTitle: "Revisión",
    description:
      "Agrega la imagen principal y revisa toda la información antes de guardar.",
  },
];

export function PublicationForm({
  initialValue,
  allowLegacyJourney = false,
  onSubmit,
  onCancel,
  draftLabel = "Guardar borrador",
  submitLabel = "Enviar a revisión",
}: PublicationFormProps) {
  const { t } = usePreferences();

  const formTopRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [
    value,
    setValue,
  ] =
    useState<CreatePublicationInput>(
      initialValue,
    );

  const [
    activeStep,
    setActiveStep,
  ] =
    useState<FormStep>(1);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    queueMicrotask(() =>
      setValue(initialValue),
    );
  }, [initialValue]);

  function patch<
    K extends keyof CreatePublicationInput,
  >(
    key: K,
    next:
      CreatePublicationInput[K],
  ) {
    setValue(
      (previous) => ({
        ...previous,
        [key]: next,
      }),
    );
  }

  function toggleLanguage(
    languageId: number,
  ) {
    const current =
      value.languageIds ?? [];

    const exists =
      current.includes(
        languageId,
      );

    patch(
      "languageIds",
      exists
        ? current.filter(
            (id) =>
              id !==
              languageId,
          )
        : [
            ...current,
            languageId,
          ],
    );
  }

  function scrollToFormTop() {
    window.setTimeout(
      () => {
        formTopRef.current?.scrollIntoView(
          {
            behavior:
              "smooth",
            block:
              "start",
          },
        );
      },
      20,
    );
  }

  function goToStep(
    step: FormStep,
  ) {
    setError(null);
    setActiveStep(step);
    scrollToFormTop();
  }

  function goNext() {
    const validationError =
      validateStep(
        activeStep,
        value,
        allowLegacyJourney,
      );

    if (validationError) {
      setError(
        validationError,
      );

      scrollToFormTop();

      return;
    }

    if (
      activeStep < 5
    ) {
      goToStep(
        (activeStep +
          1) as FormStep,
      );
    }
  }

  function goBack() {
    if (
      activeStep > 1
    ) {
      goToStep(
        (activeStep -
          1) as FormStep,
      );
    }
  }

  async function handleSubmit(
    action:
      | "DRAFT"
      | "SUBMIT",
  ) {
    setError(null);

    if (
      action === "SUBMIT"
    ) {
      const validationError =
        validateForSubmit(
          value,
          allowLegacyJourney,
        );

      if (validationError) {
        setError(
          validationError,
        );

        const targetStep =
          getStepForValidationError(
            validationError,
          );

        if (
          targetStep !==
          activeStep
        ) {
          setActiveStep(
            targetStep,
          );
        }

        scrollToFormTop();

        return;
      }
    }

    setSubmitting(true);

    try {
      await onSubmit({
        ...value,

        title:
          value.title?.trim() ??
          "",

        description:
          value.description?.trim() ??
          "",

        destination:
          value.destination?.trim() ??
          "",

        included:
          value.included?.trim() ??
          "",

        notIncluded:
          value.notIncluded?.trim() ??
          "",

        meetingPoint:
          value.meetingPoint?.trim() ??
          "",

        mainImageUrl:
          value.mainImageUrl?.trim() ??
          "",

        action,
      });
    } catch (submitError) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "No se pudo guardar la publicación.",
      );

      scrollToFormTop();
    } finally {
      setSubmitting(false);
    }
  }

  const progress =
    activeStep * 20;

  return (
    <div
      ref={
        formTopRef
      }
      className="scroll-mt-6"
    >
      {/* Navegación de pasos */}
      <div className="mb-4 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm">
        <div className="relative">
          <div className="absolute left-4 right-4 top-3.5 h-px bg-slate-200" />

          <div
            className="absolute left-4 top-3.5 h-px bg-[var(--primary)] transition-all duration-300"
            style={{
              width: `calc(${(activeStep - 1) * 25}% - ${(activeStep - 1) / 4 * 2}rem)`,
            }}
          />

          <div className="relative grid grid-cols-5">
            {STEPS.map(
              (
                step,
              ) => {
                const current =
                  activeStep ===
                  step.id;

                const completed =
                  activeStep >
                  step.id;

                return (
                  <button
                    key={
                      step.id
                    }
                    type="button"
                    disabled={
                      submitting ||
                      step.id >
                        activeStep
                    }
                    onClick={() => {
                      if (
                        step.id <
                        activeStep
                      ) {
                        goToStep(
                          step.id,
                        );
                      }
                    }}
                    className="flex min-w-0 flex-col items-center gap-1.5"
                    title={t(
                      step.title,
                    )}
                    aria-label={t(
                      step.title,
                    )}
                  >
                    <span
                      className={[
                        "z-10 flex size-7 items-center justify-center rounded-full border text-[10px] font-semibold transition",
                        current
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                          : completed
                            ? "border-[var(--primary)] bg-white text-[var(--primary)]"
                            : "border-slate-200 bg-white text-slate-400",
                      ].join(
                        " ",
                      )}
                    >
                      {completed ? (
                        <Check
                          size={
                            12
                          }
                        />
                      ) : (
                        step.id
                      )}
                    </span>

                    <span
                      className={[
                        "max-w-full truncate text-[10px] font-medium",
                        current ||
                        completed
                          ? "text-[var(--ink)]"
                          : "text-muted-foreground",
                      ].join(
                        " ",
                      )}
                    >
                      {t(
                        step.shortTitle,
                      )}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {t(error)}
        </div>
      ) : null}

      {/* =====================================================
          PASO 1
          Tipo + información principal
      ====================================================== */}
      {activeStep ===
      1 ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5">
            <StepHeading
              title={t("Información básica")}
            />

            <div className="mt-4">
              <SectionHeader
                title={t(
                  "Tipo de servicio",
                )}
                description=""
              />

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <ServiceTypeButton
                  active={
                    value.serviceType ===
                    "EXCURSION"
                  }
                  icon={
                    <Mountain
                      size={
                        18
                      }
                    />
                  }
                  title={t(
                    "Excursión",
                  )}
                  description={t(
                    "Tours, actividades y experiencias.",
                  )}
                  onClick={() =>
                    patch(
                      "serviceType",
                      "EXCURSION",
                    )
                  }
                />

                <ServiceTypeButton
                  active={
                    value.serviceType ===
                    "TRANSPORT"
                  }
                  icon={
                    <Bus
                      size={
                        18
                      }
                    />
                  }
                  title={t(
                    "Transporte",
                  )}
                  description={t(
                    "Traslados y servicios de transporte.",
                  )}
                  onClick={() =>
                    patch(
                      "serviceType",
                      "TRANSPORT",
                    )
                  }
                />
              </div>
            </div>

            <div className="my-4 border-t border-black/10" />

            <SectionHeader
              title={t(
                "Información principal",
              )}
              description=""
            />

            <div className="mt-4 space-y-3">
              <FormField
                label={t("Nombre de la publicación")}
                required
              >
                <Input
                  value={
                    value.title ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    patch(
                      "title",
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder={t(
                    "Ej. Excursión al Volcán Arenal",
                  )}
                  maxLength={
                    150
                  }
                />
              </FormField>

              <FormField
                label={t("Descripción")}
                required
              >
                <Textarea
                  value={
                    value.description ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    patch(
                      "description",
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder={t(
                    "Describe brevemente la experiencia, recorrido y principales características.",
                  )}
                  maxLength={
                    1000
                  }
                  className="min-h-20 resize-y"
                />

                <p className="mt-1 text-right text-[11px] text-muted-foreground">
                  {
                    (
                      value.description ??
                      ""
                    ).length
                  }
                  /1000
                </p>
              </FormField>


            </div>
          </section>

          <StepActions
            submitting={
              submitting
            }
            showBack={
              false
            }
            onBack={
              goBack
            }
            onCancel={
              onCancel
            }
            onContinue={
              goNext
            }
          />
        </div>
      ) : null}

      {activeStep === 2 ? <div className="space-y-4">
        <JourneyEditor value={value.journey} allowLegacy={allowLegacyJourney} isExcursion={value.serviceType === "EXCURSION"}
          meetingPoint={value.meetingPoint ?? ""} onMeetingPointChange={text => patch("meetingPoint", text)}
          onChange={journey => setValue(previous => ({...previous, journey,
            destination: journey?.points.at(-1)?.name ?? previous.destination}))}/>
        <StepActions submitting={submitting} showBack onBack={goBack} onCancel={onCancel} onContinue={goNext}/>
        <Button type="button" variant="ghost" disabled={submitting} onClick={()=>handleSubmit("DRAFT")}>{t("Guardar trayecto como borrador")}</Button>
      </div> : null}

      {/* =====================================================
          PASO 2
          Precio + duración + capacidad
      ====================================================== */}
      {activeStep ===
      3 ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5">
            <StepHeading
              title={t("Detalles del servicio")}
            />

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FormField
                label={t("Precio por persona")}
                required
              >
                <div className="relative">
                  <DollarSign
                    size={
                      15
                    }
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />

                  <Input
                    type="number"
                    min={
                      0
                    }
                    step="0.01"
                    value={
                      value.pricePerPerson ??
                      ""
                    }
                    onChange={(
                      event,
                    ) =>
                      patch(
                        "pricePerPerson",
                        event
                          .target
                          .value ===
                          ""
                          ? null
                          : Number(
                              event
                                .target
                                .value,
                            ),
                      )
                    }
                    placeholder={t(
                      "0.00",
                    )}
                    className="pl-9"
                  />
                </div>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t(
                    "USD",
                  )}
                </p>
              </FormField>

              <FormField
                label={t("Duración")}
                required
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0 space-y-1">
                    <label htmlFor="publication-duration-hours" className="text-sm text-muted-foreground">{t("Horas")}</label>
                    <Input
                      id="publication-duration-hours"
                      type="number"
                      min={0}
                      step={1}
                      value={value.durationMinutes === null || value.durationMinutes === undefined ? "" : Math.floor(value.durationMinutes / 60)}
                      onChange={(event) => {
                        const hours = Number(event.target.value);
                        if (!Number.isInteger(hours) || hours < 0) return;
                        patch("durationMinutes", hours * 60 + (value.durationMinutes ?? 0) % 60);
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <label htmlFor="publication-duration-minutes" className="text-sm text-muted-foreground">{t("Minutos")}</label>
                    <Input
                      id="publication-duration-minutes"
                      type="number"
                      min={0}
                      max={59}
                      step={1}
                      value={value.durationMinutes === null || value.durationMinutes === undefined ? "" : value.durationMinutes % 60}
                      onChange={(event) => {
                        const minutes = Number(event.target.value);
                        if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) return;
                        patch("durationMinutes", Math.floor((value.durationMinutes ?? 0) / 60) * 60 + minutes);
                      }}
                      placeholder="0"
                    />
                  </div>
                </div>
              </FormField>

              <FormField
                label={t("Capacidad predeterminada")}
                required
              >
                <div className="relative">
                  <Users
                    size={
                      15
                    }
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />

                  <Input
                    type="number"
                    min={
                      1
                    }
                    step={
                      1
                    }
                    value={
                      value.defaultCapacity ??
                      ""
                    }
                    onChange={(
                      event,
                    ) =>
                      patch(
                        "defaultCapacity",
                        event
                          .target
                          .value ===
                          ""
                          ? null
                          : Number(
                              event
                                .target
                                .value,
                            ),
                      )
                    }
                    placeholder={t(
                      "20",
                    )}
                    className="pl-9"
                  />
                </div>

                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  {t(
                    "Se utilizará como capacidad inicial al crear nuevas salidas. Podrás modificarla para cada fecha.",
                  )}
                </p>
              </FormField>
            </div>

            <div className="mt-4 rounded-xl border border-[#dcebe5] bg-[#f4faf7] px-3.5 py-2.5">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--primary)] shadow-sm">
                  <Users
                    size={
                      16
                    }
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-[var(--ink)]">
                    {t(
                      "La capacidad puede variar por salida",
                    )}
                  </p>

                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    {t(
                      "Este valor es solamente el predeterminado. En Salidas y cupos podrás asignar una capacidad distinta a cada fecha y horario.",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <StepActions
            submitting={
              submitting
            }
            showBack
            onBack={
              goBack
            }
            onCancel={
              onCancel
            }
            onContinue={
              goNext
            }
          />
        </div>
      ) : null}

      {/* =====================================================
          PASO 3
          Idiomas + experiencia
      ====================================================== */}
      {activeStep ===
      4 ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5">
            <StepHeading
              title={t("Experiencia e idiomas")}
            />

            <div className="mt-4">
              <SectionHeader
                title={t(
                  "Idiomas",
                )}
                description=""
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {LANGUAGES.map(
                  (
                    language,
                  ) => {
                    const selected =
                      (
                        value.languageIds ??
                        []
                      ).includes(
                        language.id,
                      );

                    return (
                      <button
                        key={
                          language.id
                        }
                        type="button"
                        onClick={() =>
                          toggleLanguage(
                            language.id,
                          )
                        }
                        className={[
                          "inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-medium transition",
                          selected
                            ? "border-[var(--primary)] bg-[var(--accent)] text-[var(--primary)] shadow-sm"
                            : "border-black/10 bg-white text-foreground hover:border-black/20 hover:bg-muted/30",
                        ].join(
                          " ",
                        )}
                      >
                        <Languages
                          size={
                            14
                          }
                        />

                        {
                          language.name
                        }

                        <span className="text-[10px] uppercase opacity-60">
                          {
                            language.code
                          }
                        </span>

                        {selected ? (
                          <Check
                            size={
                              13
                            }
                          />
                        ) : null}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="my-4 border-t border-black/10" />

            <SectionHeader
              title={t(
                "Detalles de la experiencia",
              )}
              description=""
            />

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <FormField
                label={t("Qué incluye")}
                required
              >
                <Textarea
                  value={
                    value.included ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    patch(
                      "included",
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder={t(
                    "Ej. Guía turístico, entrada al parque y refrigerio.",
                  )}
                  className="min-h-24 resize-y"
                />
              </FormField>

              <FormField
                label={t("Qué no incluye")}
                required
              >
                <Textarea
                  value={
                    value.notIncluded ??
                    ""
                  }
                  onChange={(
                    event,
                  ) =>
                    patch(
                      "notIncluded",
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder={t(
                    "Ej. Alimentación, transporte hasta el punto de encuentro.",
                  )}
                  className="min-h-24 resize-y"
                />
              </FormField>
            </div>


          </section>

          <StepActions
            submitting={
              submitting
            }
            showBack
            onBack={
              goBack
            }
            onCancel={
              onCancel
            }
            onContinue={
              goNext
            }
          />
        </div>
      ) : null}

      {/* =====================================================
          PASO 4
          Imagen + revisión
      ====================================================== */}
      {activeStep ===
      5 ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:p-5">
            <StepHeading
              title={t("Imagen y revisión")}
            />

            <div className="mt-4">
              <SectionHeader
                title={t(
                  "Imagen principal",
                )}
                description=""
              />

              <div className="mt-4">
                <FormField
                  label={t("URL de la imagen")}
                  required
                >
                  <div className="relative">
                    <ImageIcon
                      size={
                        15
                      }
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />

                    <Input
                      type="url"
                      value={
                        value.mainImageUrl ??
                        ""
                      }
                      onChange={(
                        event,
                      ) =>
                        patch(
                          "mainImageUrl",
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder={t(
                        "https://...",
                      )}
                      className="pl-9"
                    />
                  </div>
                </FormField>

                {value.mainImageUrl ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        value.mainImageUrl
                      }
                      alt={t("Vista previa de la publicación")}
                      className="h-44 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mt-3 flex h-28 items-center justify-center rounded-xl border border-dashed border-black/15 bg-muted/30">
                    <div className="text-center">
                      <ImageIcon
                        size={
                          22
                        }
                        className="mx-auto text-muted-foreground"
                      />

                      <p className="mt-2 text-xs text-muted-foreground">
                        {t(
                          "La vista previa aparecerá aquí.",
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="my-4 border-t border-black/10" />

            <div className="flex items-center gap-2">
              <CheckCircle2
                size={
                  18
                }
                className="text-[var(--primary)]"
              />

              <div>
                <h3 className="!m-0 !text-sm !font-semibold !tracking-normal text-[var(--ink)]">
                  {t(
                    "Revisa la información",
                  )}
                </h3>

                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  {t(
                    "Puedes volver a cualquier paso anterior si necesitas realizar cambios.",
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 md:grid-cols-2">
              <ReviewItem
                label={t("Tipo de servicio")}
                value={
                  value.serviceType ===
                  "TRANSPORT"
                    ? "Transporte"
                    : value.serviceType ===
                        "EXCURSION"
                      ? "Excursión"
                      : "Sin definir"
                }
                onEdit={() =>
                  goToStep(
                    1,
                  )
                }
              />

              <ReviewItem
                label={t("Nombre")}
                value={
                  value.title?.trim() ||
                  "Sin definir"
                }
                onEdit={() =>
                  goToStep(
                    1,
                  )
                }
              />

              <ReviewItem
                label={t("Destino")}
                value={
                  value.destination?.trim() ||
                  "Sin definir"
                }
                onEdit={() =>
                  goToStep(
                    1,
                  )
                }
              />

              <ReviewItem
                label={t("Precio")}
                value={
                  value.pricePerPerson !==
                    null &&
                  value.pricePerPerson !==
                    undefined
                    ? `USD ${value.pricePerPerson.toFixed(
                        2,
                      )} por persona`
                    : "Sin definir"
                }
                onEdit={() =>
                  goToStep(
                    2,
                  )
                }
              />

              <ReviewItem
                label={t("Duración")}
                value={
                  value.durationMinutes
                    ? durationLabel(value.durationMinutes)
                    : "Sin definir"
                }
                onEdit={() =>
                  goToStep(
                    2,
                  )
                }
              />

              <ReviewItem
                label={t("Capacidad predeterminada")}
                value={
                  value.defaultCapacity
                    ? `${value.defaultCapacity} personas`
                    : "Sin definir"
                }
                onEdit={() =>
                  goToStep(
                    2,
                  )
                }
              />

              <ReviewItem
                label={t("Idiomas")}
                value={
                  getLanguageNames(
                    value.languageIds ??
                      [],
                  )
                }
                onEdit={() =>
                  goToStep(
                    3,
                  )
                }
              />

              <ReviewItem
                label={t("Punto de encuentro")}
                value={
                  value.meetingPoint?.trim() ||
                  "Sin definir"
                }
                onEdit={() =>
                  goToStep(
                    3,
                  )
                }
              />
            </div>
          </section>

          <div className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={
                submitting
              }
              onClick={
                goBack
              }
              className="justify-start gap-2 sm:justify-center"
            >
              <ArrowLeft
                size={
                  15
                }
              />

              {t(
                "Atrás",
              )}
            </Button>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={
                  submitting
                }
                onClick={
                  onCancel
                }
              >
                {t(
                  "Cancelar",
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={
                  submitting
                }
                onClick={() =>
                  void handleSubmit(
                    "DRAFT",
                  )
                }
              >
                {submitting
                  ? t(
                      "Guardando...",
                    )
                  : t(
                      draftLabel,
                    )}
              </Button>

              <Button
                type="button"
                disabled={
                  submitting
                }
                onClick={() =>
                  void handleSubmit(
                    "SUBMIT",
                  )
                }
                className="bg-[var(--primary)] text-white hover:bg-[var(--brand-forest-hover)]"
              >
                {submitting
                  ? t(
                      "Procesando...",
                    )
                  : t(
                      submitLabel,
                    )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function validateStep(step: FormStep, value: CreatePublicationInput, allowLegacy = false): string | null {
  if (step === 1) {
    if (!value.serviceType) return "Selecciona el tipo de servicio.";
    if (!value.title?.trim()) return "Ingresa el nombre de la publicación.";
    if (!value.description?.trim()) return "Ingresa una descripción.";
  }
  if (step === 2) {
    if (!(allowLegacy && !value.journey) && !journeyReady(value.journey)) return "Define y confirma el trayecto.";
    if (!value.destination?.trim()) return "Selecciona la llegada del trayecto.";
    if (!value.meetingPoint?.trim()) return "Ingresa las indicaciones del punto de encuentro.";
  }
  if (step === 3) {
    if (!value.pricePerPerson || value.pricePerPerson <= 0) return "Ingresa un precio por persona válido.";
    if (!value.durationMinutes || value.durationMinutes <= 0) return "Ingresa una duración válida.";
    if (!value.defaultCapacity || value.defaultCapacity <= 0) return "Ingresa una capacidad predeterminada válida.";
  }
  if (step === 4) {
    if (!value.languageIds?.length) return "Selecciona al menos un idioma.";
    if (!value.included?.trim()) return "Indica qué incluye el servicio.";
    if (!value.notIncluded?.trim()) return "Indica qué no incluye el servicio.";
  }
  if (step === 5 && !value.mainImageUrl?.trim()) return "Ingresa una imagen principal.";
  return null;
}
function validateForSubmit(value: CreatePublicationInput, allowLegacy = false): string | null {
  for (const step of [1,2,3,4,5] as FormStep[]) {
    const error = validateStep(step, value, allowLegacy);
    if (error) return error;
  }
  return null;
}
function getStepForValidationError(message: string): FormStep {
  const lower = message.toLowerCase();
  if (["trayecto", "punto de encuentro"].some(s => lower.includes(s))) return 2;
  if (["precio", "duración", "capacidad"].some(s => lower.includes(s))) return 3;
  if (["idioma", "incluye"].some(s => lower.includes(s))) return 4;
  if (lower.includes("imagen")) return 5;
  return 1;
}

function getLanguageNames(
  ids: number[],
): string {
  const names =
    LANGUAGES.filter(
      (language) =>
        ids.includes(
          language.id,
        ),
    ).map(
      (language) =>
        language.name,
    );

  return names.length >
    0
    ? names.join(
        " · ",
      )
    : "Sin definir";
}

function StepHeading({
  title,
}: {
  title: string;
}) {
  const { t } =
    usePreferences();

  return (
    <div>
      <h2 className="!m-0 !text-lg !font-semibold !leading-6 !tracking-normal text-[var(--ink)]">
        {t(
          title,
        )}
      </h2>
    </div>
  );
}

function StepActions({
  submitting,
  showBack,
  onBack,
  onCancel,
  onContinue,
}: {
  submitting: boolean;
  showBack: boolean;
  onBack: () => void;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const { t } =
    usePreferences();

  return (
    <div className="flex flex-col-reverse gap-2 rounded-xl border border-black/10 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        {showBack ? (
          <Button
            type="button"
            variant="ghost"
            disabled={
              submitting
            }
            onClick={
              onBack
            }
            className="w-full justify-start gap-2 sm:w-auto sm:justify-center"
          >
            <ArrowLeft
              size={
                15
              }
            />

            {t(
              "Atrás",
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={
              submitting
            }
            onClick={
              onCancel
            }
            className="w-full sm:w-auto"
          >
            {t(
              "Cancelar",
            )}
          </Button>
        )}
      </div>

      <Button
        type="button"
        disabled={
          submitting
        }
        onClick={
          onContinue
        }
        className="gap-2 bg-[var(--primary)] text-white hover:bg-[var(--brand-forest-hover)]"
      >
        {t(
          "Continuar",
        )}

        <ArrowRight
          size={
            15
          }
        />
      </Button>
    </div>
  );
}

function ReviewItem({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  const { t } =
    usePreferences();

  return (
    <div className="rounded-xl border border-black/10 bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t(
              label,
            )}
          </p>

          <p className="mt-1 break-words text-sm font-medium text-[var(--ink)]">
            {t(
              value,
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={
            onEdit
          }
          className="shrink-0 text-[11px] font-semibold text-[var(--primary)] transition hover:underline"
        >
          {t(
            "Editar",
          )}
        </button>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { t } =
    usePreferences();

  return (
    <div>
      <h2 className="!m-0 !text-sm !font-semibold !leading-5 !tracking-normal text-[var(--ink)]">
        {t(
          title,
        )}
      </h2>

      {description ? (
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
          {t(
            description,
          )}
        </p>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children:
    React.ReactNode;
}) {
  const { t } =
    usePreferences();

  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-foreground">
        {t(
          label,
        )}

        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </label>

      {children}
    </div>
  );
}

function ServiceTypeButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  const { t } =
    usePreferences();

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition",
        active
          ? "border-[var(--primary)] bg-[var(--accent)] shadow-sm"
          : "border-black/10 bg-white hover:border-black/20 hover:bg-muted/30",
      ].join(
        " ",
      )}
    >
      <div
        className={[
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          active
            ? "bg-[var(--primary)] text-white"
            : "bg-muted text-muted-foreground",
        ].join(
          " ",
        )}
      >
        {icon}
      </div>

      <div>
        <p
          className={[
            "text-sm font-semibold",
            active
              ? "text-[var(--primary)]"
              : "text-foreground",
          ].join(
            " ",
          )}
        >
          {t(
            title,
          )}
        </p>

        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
          {t(
            description,
          )}
        </p>
      </div>
    </button>
  );
}

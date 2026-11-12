"use client";
import { usePreferences } from "@/lib/preferences/Preferences";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  BadgeCheck,
  Building2,
  Bus,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  Flower2,
  Globe2,
  ImageIcon,
  Info,
  Landmark,
  Languages,
  Leaf,
  Loader2,
  MapPin,
  MessageCircle,
  Mountain,
  Save,
  Send,
  ShieldCheck,
  Sun,
  Tags,
  UploadCloud,
} from "lucide-react";

import { useAgency } from "../hooks/useAgency";
import {
  uploadAgencyFile,
  type AgencyUploadKind,
} from "../services/agency-upload.service";
import type {
  Agency,
  AgencyFormData,
  BusinessType,
} from "../types/agency.types";

interface AgencyFormProps {
  onCancel: () => void;
  mode?: "create" | "edit";
  initialAgency?: Agency | null;
}

type StepId = 1 | 2 | 3 | 4 | 5;

type StepDefinition = {
  id: StepId;
  title: string;
  shortTitle: string;
  description: string;
  icon: ReactNode;
};

const steps: StepDefinition[] = [
  {
    id: 1,
    title: "Datos generales",
    shortTitle: "Datos generales",
    description: "Información básica de tu agencia",
    icon: <Building2 size={16} />,
  },
  {
    id: 2,
    title: "Contacto y ubicación",
    shortTitle: "Contacto y ubicación",
    description: "Cómo pueden encontrarte",
    icon: <MapPin size={16} />,
  },
  {
    id: 3,
    title: "Categorías y servicios",
    shortTitle: "Categorías y servicios",
    description: "Qué ofreces en LaRutica",
    icon: <Tags size={16} />,
  },
  {
    id: 4,
    title: "Información adicional",
    shortTitle: "Información adicional",
    description: "Identidad visual y verificación",
    icon: <FileText size={16} />,
  },
  {
    id: 5,
    title: "Vista previa",
    shortTitle: "Vista previa",
    description: "Revisa antes de enviar",
    icon: <Eye size={16} />,
  },
];

const initialForm: AgencyFormData = {
  agencyName: "",
  commercialName: "",
  businessType: "",
  description: "",

  email: "",
  phone: "",
  website: "",

  country: "Costa Rica",
  province: "",
  city: "",
  exactAddress: "",

  logoUrl: "",
  coverUrl: "",
  verificationDocumentUrl: "",

  instagramUrl: "",
  facebookUrl: "",
  whatsapp: "",

  categoryIds: [],
  languageIds: [],

  acceptedTerms: false,
};

function agencyToFormData(agency: Agency): AgencyFormData {
  return {
    agencyName: agency.agencyName,
    commercialName: agency.commercialName,
    businessType: agency.businessType,
    description: agency.description ?? "",

    email: agency.email ?? "",
    phone: agency.phone ?? "",
    website: agency.website ?? "",

    country: agency.country ?? "Costa Rica",
    province: agency.province ?? "",
    city: agency.city ?? "",
    exactAddress: agency.exactAddress ?? "",

    logoUrl: agency.logoUrl ?? "",
    coverUrl: agency.coverUrl ?? "",
    verificationDocumentUrl: agency.verificationDocumentUrl ?? "",

    instagramUrl: agency.instagramUrl ?? "",
    facebookUrl: agency.facebookUrl ?? "",
    whatsapp: agency.whatsapp ?? "",

    categoryIds: agency.categories.map((category) => category.id),
    languageIds: agency.languages.map((language) => language.id),

    acceptedTerms: agency.acceptedTerms,
  };
}

const businessTypes: Array<{
  value: BusinessType;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: "AGENCY",
    label: "Agencia",
    description: "Venta y organización de experiencias",
    icon: <Building2 size={16} />,
  },
  {
    value: "TOUR_OPERATOR",
    label: "Operador turístico",
    description: "Diseño y operación de tours",
    icon: <Mountain size={16} />,
  },
  {
    value: "TRANSPORT",
    label: "Transporte",
    description: "Servicios de transporte turístico",
    icon: <Bus size={16} />,
  },
  {
    value: "INDEPENDENT_GUIDE",
    label: "Guía independiente",
    description: "Servicios de guía turística",
    icon: <BadgeCheck size={16} />,
  },
];

const categories = [
  { id: 1, name: "Aventura", icon: Mountain },
  { id: 2, name: "Naturaleza", icon: Leaf },
  { id: 3, name: "Cultura", icon: Landmark },
  { id: 4, name: "Transporte", icon: Bus },
  { id: 5, name: "Playa", icon: Sun },
  { id: 6, name: "Bienestar", icon: Flower2 },
];

const languages = [
  { id: 1, name: "Español" },
  { id: 2, name: "Inglés" },
];

const provinces = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
];

export default function AgencyForm({
  onCancel,
  mode = "create",
  initialAgency = null,
}: AgencyFormProps) {
  const { t } = usePreferences();
  const router = useRouter();
  const { createAgency, updateAgency, saving, error } = useAgency();

  const [form, setForm] = useState<AgencyFormData>(
    initialAgency ? agencyToFormData(initialAgency) : initialForm,
  );
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [stepPhase, setStepPhase] = useState<"idle" | "exit" | "enter">("idle");
  const [stepDirection, setStepDirection] = useState<"forward" | "backward">(
    "forward",
  );
  const stepTransitionTimerRef = useRef<number | null>(null);
  const stepEnterFrameRef = useRef<number | null>(null);
  const [highestStep, setHighestStep] = useState<StepId>(1);
  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (stepTransitionTimerRef.current !== null) {
        window.clearTimeout(stepTransitionTimerRef.current);
      }

      if (stepEnterFrameRef.current !== null) {
        window.cancelAnimationFrame(stepEnterFrameRef.current);
      }
    };
  }, []);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [uploadingKinds, setUploadingKinds] = useState<AgencyUploadKind[]>([]);

  const isUploading = uploadingKinds.length > 0;
  const currentStatus = initialAgency?.status ?? "DRAFT";
  const isRejected = currentStatus === "REJECTED";

  const updateField = <K extends keyof AgencyFormData>(
    field: K,
    value: AgencyFormData[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (stepError) {
      setStepError(null);
    }
  };

  const handleUploadState = (kind: AgencyUploadKind, uploading: boolean) => {
    setUploadingKinds((previous) => {
      if (uploading) {
        if (previous.includes(kind)) {
          return previous;
        }

        return [...previous, kind];
      }

      return previous.filter((item) => item !== kind);
    });
  };

  const toggleCategory = (id: number) => {
    setForm((previous) => ({
      ...previous,
      categoryIds: previous.categoryIds.includes(id)
        ? previous.categoryIds.filter((item) => item !== id)
        : [...previous.categoryIds, id],
    }));

    if (stepError) {
      setStepError(null);
    }
  };

  const toggleLanguage = (id: number) => {
    setForm((previous) => ({
      ...previous,
      languageIds: previous.languageIds.includes(id)
        ? previous.languageIds.filter((item) => item !== id)
        : [...previous.languageIds, id],
    }));

    if (stepError) {
      setStepError(null);
    }
  };

  const selectedLanguageNames = useMemo(
    () =>
      languages
        .filter((language) => form.languageIds.includes(language.id))
        .map((language) => language.name),
    [form.languageIds],
  );

  const selectedCategoryNames = useMemo(
    () =>
      categories
        .filter((category) => form.categoryIds.includes(category.id))
        .map((category) => category.name),
    [form.categoryIds],
  );

  const selectedBusinessType = businessTypes.find(
    (type) => type.value === form.businessType,
  );

  const previewName =
    form.commercialName.trim() || form.agencyName.trim() || "Tu agencia";

  const previewLocation = useMemo(() => {
    const location = [form.city, form.province, form.country]
      .filter(Boolean)
      .join(", ");

    return location || "Costa Rica";
  }, [form.city, form.country, form.province]);

  const goToAgency = () => {
    router.push("/dashboard/my-agency");
    router.refresh();
  };

  const saveDraft = async () => {
    if (isUploading) {
      return;
    }

    try {
      setSuccessMessage(null);
      setStepError(null);

      const payload = {
        ...form,
        action: "DRAFT" as const,
      };

      if (mode === "edit") {
        await updateAgency(payload);

        if (currentStatus === "APPROVED" || currentStatus === "REJECTED") {
          goToAgency();
          return;
        }

        setSuccessMessage("Los cambios se guardaron correctamente.");
        return;
      }

      await createAgency(payload);
      setSuccessMessage("La agencia se guardó como borrador.");
    } catch {
      // useAgency maneja el error del backend.
    }
  };

  const submitAgency = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (currentStep !== 5) {
      handleNext();
      return;
    }

    if (isUploading) {
      return;
    }

    try {
      setSuccessMessage(null);
      setStepError(null);

      const payload = {
        ...form,
        action: "SUBMIT" as const,
      };

      if (mode === "edit") {
        await updateAgency(payload);
      } else {
        await createAgency(payload);
      }

      goToAgency();
    } catch {
      // useAgency maneja el error del backend.
    }
  };

  const validateStep = (step: StepId) => {
    if (step === 1) {
      if (!form.agencyName.trim()) {
        return "Ingresa el nombre de la agencia para continuar.";
      }

      if (!form.commercialName.trim()) {
        return "Ingresa el nombre comercial para continuar.";
      }

      if (!form.businessType) {
        return "Selecciona el tipo de negocio.";
      }

      if (!form.description.trim()) {
        return "Agrega una descripción de tu agencia.";
      }

      if (form.languageIds.length === 0) {
        return "Selecciona al menos un idioma.";
      }
    }

    if (step === 2) {
      if (!form.email.trim()) {
        return "Ingresa un correo electrónico.";
      }

      if (!form.phone.trim()) {
        return "Ingresa un número de teléfono.";
      }

      if (!form.country.trim()) {
        return "Selecciona el país.";
      }

      if (!form.province.trim()) {
        return "Selecciona la provincia.";
      }

      if (!form.city.trim()) {
        return "Ingresa la ciudad.";
      }

      if (!form.exactAddress.trim()) {
        return "Ingresa la dirección de la agencia.";
      }
    }

    if (step === 3 && form.categoryIds.length === 0) {
      return "Selecciona al menos una categoría de servicio.";
    }

    if (step === 4) {
      if (!form.logoUrl) {
        return "Sube el logo de la agencia para continuar.";
      }

      if (!form.coverUrl) {
        return "Sube una imagen de portada para continuar.";
      }

      if (!form.verificationDocumentUrl) {
        return "Sube el documento de verificación para continuar.";
      }

      if (!form.acceptedTerms) {
        return "Debes aceptar los términos y condiciones para continuar.";
      }
    }

    return null;
  };

  const changeStep = (nextStep: StepId) => {
    if (nextStep === currentStep) {
      return;
    }

    const direction = nextStep > currentStep ? "forward" : "backward";

    setLanguagesOpen(false);
    setStepDirection(direction);
    setStepPhase("exit");

    if (stepTransitionTimerRef.current !== null) {
      window.clearTimeout(stepTransitionTimerRef.current);
    }

    if (stepEnterFrameRef.current !== null) {
      window.cancelAnimationFrame(stepEnterFrameRef.current);
    }

    stepTransitionTimerRef.current = window.setTimeout(() => {
      setCurrentStep(nextStep);
      setStepPhase("enter");

      formTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      stepEnterFrameRef.current = window.requestAnimationFrame(() => {
        stepEnterFrameRef.current = window.requestAnimationFrame(() => {
          setStepPhase("idle");
        });
      });
    }, 120);
  };

  const handleNext = () => {
    const validationError = validateStep(currentStep);

    if (validationError) {
      setStepError(validationError);
      return;
    }

    setStepError(null);

    if (currentStep < 5) {
      const nextStep = (currentStep + 1) as StepId;
      setHighestStep((previous) =>
        Math.max(previous, nextStep) as StepId,
      );
      changeStep(nextStep);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setStepError(null);
      changeStep((currentStep - 1) as StepId);
    }
  };

  const handleStepClick = (step: StepId) => {
    if (step <= highestStep) {
      setStepError(null);
      changeStep(step);
    }
  };

  return (
    <form
      onSubmit={submitAgency}
      className="w-full"
    >
      <div ref={formTopRef} className="scroll-mt-16">
        <TopStepper
          currentStep={currentStep}
          highestStep={highestStep}
          onStepClick={handleStepClick}
        />
      </div>

      <section className="mt-3 overflow-hidden rounded-lg border bg-card shadow-[0_8px_28px_rgba(18,58,48,0.045)]">
        <div className="px-5 py-4 sm:px-6">
          <div
            key={currentStep}
            className={[
              "transition-[opacity,transform] duration-[190ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              "motion-reduce:transform-none motion-reduce:transition-none",
              stepPhase === "idle"
                ? "translate-x-0 opacity-100"
                : stepPhase === "exit"
                  ? stepDirection === "forward"
                    ? "-translate-x-2 opacity-0"
                    : "translate-x-2 opacity-0"
                  : stepDirection === "forward"
                    ? "translate-x-2 opacity-0"
                    : "-translate-x-2 opacity-0",
            ].join(" ")}
          >
            {currentStep === 1 && (
              <StepOne
                form={form}
                updateField={updateField}
                languagesOpen={languagesOpen}
                setLanguagesOpen={setLanguagesOpen}
                selectedLanguageNames={selectedLanguageNames}
                toggleLanguage={toggleLanguage}
              />
            )}

            {currentStep === 2 && (
              <StepTwo form={form} updateField={updateField} />
            )}

            {currentStep === 3 && (
              <StepThree
                form={form}
                toggleCategory={toggleCategory}
              />
            )}

            {currentStep === 4 && (
              <StepFour
                form={form}
                updateField={updateField}
                onUploadingChange={handleUploadState}
              />
            )}

            {currentStep === 5 && (
              <StepFive
                form={form}
                previewName={previewName}
                previewLocation={previewLocation}
                selectedCategoryNames={selectedCategoryNames}
                selectedLanguageNames={selectedLanguageNames}
                selectedBusinessType={selectedBusinessType?.label ?? "Sin definir"}
              />
            )}
          </div>

          <div className="mt-3 space-y-2">
            {isUploading && (
              <StatusMessage variant="info">
                <Loader2 size={14} className="animate-spin" />{t("Espera a que terminen de subir los archivos antes de continuar. ")}</StatusMessage>
            )}

            {stepError && (
              <StatusMessage variant="error">{stepError}</StatusMessage>
            )}

            {error && <StatusMessage variant="error">{t(error)}</StatusMessage>}

            {successMessage && (
              <StatusMessage variant="success">
                <CheckCircle2 size={14} />
                {successMessage}
              </StatusMessage>
            )}
          </div>
        </div>

        <FormFooter
          currentStep={currentStep}
          saving={saving}
          isUploading={isUploading}
          mode={mode}
          isRejected={isRejected}
          onCancel={onCancel}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSaveDraft={() => void saveDraft()}
        />
      </section>
    </form>
  );
}

function TopStepper({
  currentStep,
  highestStep,
  onStepClick,
}: {
  currentStep: StepId;
  highestStep: StepId;
  onStepClick: (step: StepId) => void;
}) {
  const { t } = usePreferences();
  return (
    <div className="rounded-lg border bg-card px-5 py-3 shadow-[0_4px_18px_rgba(18,58,48,0.035)] sm:px-6">
      <div className="flex items-start">
        {steps.map((step, index) => {
          const active = step.id === currentStep;
          const completed = step.id < currentStep;
          const accessible = step.id <= highestStep;

          return (
            <div key={step.id} className="flex min-w-0 flex-1 items-start">
              <button
                type="button"
                onClick={() => onStepClick(step.id)}
                disabled={!accessible}
                className="group flex min-w-0 flex-1 flex-col items-center text-center disabled:cursor-default"
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={[
                    "flex size-6 items-center justify-center rounded-full border !text-[10px] !font-semibold",
                    "transition-all duration-200 ease-out",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(7,94,54,0.16)]"
                      : completed
                        ? "border-primary/25 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground",
                  ].join(" ")}
                >
                  {completed ? <Check size={14} /> : step.id}
                </span>

                <span
                  className={[
                    "mt-1.5 hidden max-w-[125px] !text-[10.5px] !font-medium leading-4 sm:block",
                    "transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {t(step.shortTitle)}
                </span>
              </button>

              {index < steps.length - 1 && (
                <div
                  className={[
                    "mt-[11px] h-px flex-1 transition-colors duration-300",
                    step.id < currentStep ? "bg-primary/35" : "bg-border",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepOne({
  form,
  updateField,
  languagesOpen,
  setLanguagesOpen,
  selectedLanguageNames,
  toggleLanguage,
}: {
  form: AgencyFormData;
  updateField: <K extends keyof AgencyFormData>(
    field: K,
    value: AgencyFormData[K],
  ) => void;
  languagesOpen: boolean;
  setLanguagesOpen: (value: boolean | ((previous: boolean) => boolean)) => void;
  selectedLanguageNames: string[];
  toggleLanguage: (id: number) => void;
}) {
  const { t } = usePreferences();
  return (
    <div>
      <div>
        <h2 className="!m-0 !text-[15px] !font-semibold !leading-5 !tracking-[-0.01em]">{t("Datos generales ")}</h2>
        <p className="text-muted-foreground !m-0 mt-0.5 !text-[10.5px] !leading-4">{t("Información básica sobre tu agencia. ")}</p>
      </div>

      <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
        <Field label={t("Nombre de la agencia")} required>
          <input
            value={form.agencyName}
            onChange={(event) => updateField("agencyName", event.target.value)}
            className={inputClass}
            placeholder={t("Ej. Aventura Verde CR")}
          />
        </Field>

        <Field label={t("Nombre comercial")} required>
          <input
            value={form.commercialName}
            onChange={(event) =>
              updateField("commercialName", event.target.value)
            }
            className={inputClass}
            placeholder={t("Ej. Aventura Verde Costa Rica")}
          />
        </Field>
      </div>

      <div className="mt-2">
        <FieldLabel label={t("Tipo de negocio")} required />

        <div className="mt-1.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {businessTypes.map((type) => {
            const selected = form.businessType === type.value;

            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateField("businessType", type.value)}
                className={[
                  "grid min-h-[56px] grid-cols-[22px_minmax(0,1fr)_14px] items-start gap-2 rounded-[5px] border px-2.5 py-2 text-left",
                  "transition-all duration-200 ease-out",
                  selected
                    ? "border-primary bg-primary/5 shadow-[0_3px_10px_rgba(7,94,54,0.05)]"
                    : "border-border bg-background hover:border-primary/25 hover:bg-muted/20",
                ].join(" ")}
                aria-pressed={selected}
              >
                <span
                  className={[
                    "flex size-[22px] shrink-0 items-center justify-center rounded-[4px] transition-colors duration-200",
                    selected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {type.icon}
                </span>

                <span className="min-w-0 pt-px">
                  <span className="block truncate !text-[10.5px] !font-medium leading-[13px]">
                    {t(type.label)}
                  </span>

                  <span className="text-muted-foreground mt-0.5 block !text-[9px] leading-[11px]">
                    {t(type.description)}
                  </span>
                </span>

                <span
                  className={[
                    "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-transparent",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <Check size={9} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 grid items-start gap-3 md:grid-cols-[minmax(0,1.8fr)_minmax(220px,0.9fr)]">
        <Field label={t("Descripción")} required>
          <div className="relative">
            <textarea
              value={form.description}
              maxLength={600}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              className={`${textareaClass} min-h-[58px] pb-5`}
              placeholder={t("Describe brevemente tu agencia, sus servicios y lo que la hace especial.")}
            />
            <span className="text-muted-foreground absolute bottom-1.5 right-3 !text-[9px]">
              {form.description.length} / 600
            </span>
          </div>
        </Field>

        <Field label={t("Idiomas que atiendes")} required>
          <div className="relative">
            <button
              type="button"
              onClick={() => setLanguagesOpen((previous) => !previous)}
              className={`${inputClass} flex items-center justify-between text-left`}
              aria-expanded={languagesOpen}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Languages
                  size={14}
                  className="text-muted-foreground shrink-0"
                />
                <span
                  className={
                    selectedLanguageNames.length
                      ? "truncate"
                      : "text-muted-foreground/70 truncate"
                  }
                >
                  {selectedLanguageNames.length
                    ? selectedLanguageNames.join(", ")
                    : t("Selecciona idiomas")}
                </span>
              </span>

              <span
                className={[
                  "text-muted-foreground !text-[9px] transition-transform duration-200",
                  languagesOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden="true"
              >
                ▼
              </span>
            </button>

            {languagesOpen && (
              <div className="absolute left-0 right-0 top-[41px] z-30 rounded-[5px] border bg-background p-1.5 shadow-[0_10px_28px_rgba(18,58,48,0.10)]">
                {languages.map((language) => {
                  const selected = form.languageIds.includes(language.id);

                  return (
                    <button
                      key={language.id}
                      type="button"
                      onClick={() => toggleLanguage(language.id)}
                      className="hover:bg-muted/60 flex w-full items-center gap-2.5 rounded-[4px] px-2.5 py-2 text-left !text-[11px] transition-colors"
                    >
                      <span
                        className={[
                          "flex size-4 items-center justify-center rounded-[3px] border",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background",
                        ].join(" ")}
                      >
                        {selected && <Check size={10} />}
                      </span>
                      {language.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Field>
      </div>
    </div>
  );
}

function StepTwo({
  form,
  updateField,
}: {
  form: AgencyFormData;
  updateField: <K extends keyof AgencyFormData>(
    field: K,
    value: AgencyFormData[K],
  ) => void;
}) {
  const { t } = usePreferences();
  return (
    <div>
      <StepHeader
        icon={<MapPin size={21} />}
        title={t("Contacto y ubicación")}
        description={t("Agrega los medios por los que los viajeros podrán contactarte y localizarte.")}
      />

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label={t("Correo electrónico")} required>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClass}
            placeholder={t("ejemplo@aventuraverde.cr")}
          />
        </Field>

        <Field label={t("Teléfono")} required>
          <div className="bg-background focus-within:ring-ring flex h-9 overflow-hidden rounded-md border transition focus-within:ring-2">
            <div className="text-muted-foreground flex items-center gap-1.5 border-r px-3 !text-xs !font-medium">{t("CR ")}<span className="!text-[9px]">▼</span>
            </div>
            <input
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              className="bg-background min-w-0 flex-1 px-3 !text-sm outline-none placeholder:text-muted-foreground/60"
              placeholder={t("6000-0000")}
            />
          </div>
        </Field>

        <Field label={t("Sitio web (opcional)")}>
          <input
            value={form.website}
            onChange={(event) => updateField("website", event.target.value)}
            className={inputClass}
            placeholder={t("https://www.ejemplo.com")}
          />
        </Field>
      </div>

      <div className="my-3 border-t" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label={t("País")} required>
          <select
            value={form.country}
            onChange={(event) => updateField("country", event.target.value)}
            className={inputClass}
          >
            <option value="Costa Rica">{t("Costa Rica")}</option>
          </select>
        </Field>

        <Field label={t("Provincia / Estado")} required>
          <select
            value={form.province}
            onChange={(event) => updateField("province", event.target.value)}
            className={inputClass}
          >
            <option value="">{t("Selecciona")}</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("Ciudad")} required>
          <input
            value={form.city}
            onChange={(event) => updateField("city", event.target.value)}
            className={inputClass}
            placeholder={t("La Fortuna")}
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label={t("Dirección exacta")} required>
          <input
            value={form.exactAddress}
            onChange={(event) => updateField("exactAddress", event.target.value)}
            className={inputClass}
            placeholder={t("Ej. 200 metros norte del parque central")}
          />
        </Field>
      </div>

      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="!text-sm !font-medium">{t("Redes sociales ")}</p>
            <p className="text-muted-foreground mt-0.5 !text-xs leading-4">{t("Opcional. Agrega los canales que utilizas para comunicarte con tus clientes. ")}</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <SocialInput
            icon={<AtSign size={14} />}
            value={form.instagramUrl}
            placeholder={t("@aventuraverdecr")}
            onChange={(value) => updateField("instagramUrl", value)}
          />

          <SocialInput
            icon={<Globe2 size={14} />}
            value={form.facebookUrl}
            placeholder={t("/aventuraverdecr")}
            onChange={(value) => updateField("facebookUrl", value)}
          />

          <SocialInput
            icon={<MessageCircle size={14} />}
            value={form.whatsapp}
            placeholder={t("+506 6000 0000")}
            onChange={(value) => updateField("whatsapp", value)}
          />
        </div>
      </div>
    </div>
  );
}

function StepThree({
  form,
  toggleCategory,
}: {
  form: AgencyFormData;
  toggleCategory: (id: number) => void;
}) {
  const { t } = usePreferences();
  return (
    <div>
      <StepHeader
        icon={<Tags size={21} />}
        title={t("Categorías y servicios")}
        description={t("Selecciona las categorías que mejor representan los servicios y experiencias de tu agencia.")}
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {categories.map(({ id, name, icon: Icon }) => {
          const selected = form.categoryIds.includes(id);

          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleCategory(id)}
              className={[
                "relative min-h-[78px] rounded-md border p-3 text-left transition-all duration-200 ease-out",
                selected
                  ? "border-[#0A6A42] bg-[#F0F8F3] shadow-[0_8px_20px_rgba(7,94,54,0.06)]"
                  : "border-[#DDE4E0] bg-white hover:border-[#A9C6B6] hover:bg-[#FCFDFC]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={[
                    "flex size-7 items-center justify-center rounded-md",
                    selected
                      ? "bg-primary/10 text-primary"
                      : "bg-[#F3F6F4] text-[#5F6E67]",
                  ].join(" ")}
                >
                  <Icon size={19} strokeWidth={1.9} />
                </span>

                <span
                  className={[
                    "flex size-5 items-center justify-center rounded-full border",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-transparent",
                  ].join(" ")}
                >
                  <Check size={12} />
                </span>
              </div>

              <p className="mt-2 text-[11px] font-semibold text-[#20332B]">
                {name}
              </p>
              <p className="mt-0.5 text-[8px] leading-3.5 text-[#7C8781]">{t("Mostrar tu agencia dentro de experiencias relacionadas con ")}{name.toLowerCase()}.
              </p>
            </button>
          );
        })}
      </div>

    </div>
  );
}

function StepFour({
  form,
  updateField,
  onUploadingChange,
}: {
  form: AgencyFormData;
  updateField: <K extends keyof AgencyFormData>(
    field: K,
    value: AgencyFormData[K],
  ) => void;
  onUploadingChange: (kind: AgencyUploadKind, uploading: boolean) => void;
}) {
  const { t } = usePreferences();
  return (
    <div>
      <StepHeader
        icon={<FileText size={21} />}
        title={t("Información adicional")}
        description={t("Completa la identidad visual y agrega la documentación necesaria para verificar tu agencia.")}
      />

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <UploadBox
          kind="logo"
          title={t("Logo de la agencia")}
          subtitle="JPG, PNG o SVG. Máx. 2MB"
          accept="image/jpeg,image/png,image/svg+xml"
          allowedMimeTypes={["image/jpeg", "image/png", "image/svg+xml"]}
          maxSize={2 * 1024 * 1024}
          value={form.logoUrl}
          onChange={(value) => updateField("logoUrl", value)}
          onUploadingChange={onUploadingChange}
          preview={
            form.logoUrl ? (
              <img
                src={form.logoUrl}
                alt="Logo"
                className="size-16 rounded-2xl object-contain"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[#EAF5ED] text-[#075E36]">
                <Building2 size={24} />
              </div>
            )
          }
          text="Arrastra tu logo aquí"
        />

        <UploadBox
          kind="cover"
          title={t("Imagen de portada")}
          subtitle="JPG o PNG. Recomendado 1600x600px. Máx. 5MB"
          accept="image/jpeg,image/png"
          allowedMimeTypes={["image/jpeg", "image/png"]}
          maxSize={5 * 1024 * 1024}
          value={form.coverUrl}
          onChange={(value) => updateField("coverUrl", value)}
          onUploadingChange={onUploadingChange}
          preview={
            form.coverUrl ? (
              <img
                src={form.coverUrl}
                alt={t("Portada")}
                className="h-16 w-28 rounded-xl object-cover"
              />
            ) : (
              <ImageIcon size={30} className="text-[#6D8176]" />
            )
          }
          text="Arrastra una imagen aquí"
        />

        <UploadBox
          kind="verification"
          title={t("Documento de verificación")}
          subtitle="PDF, JPG o PNG. Máx. 5MB"
          accept="application/pdf,image/jpeg,image/png"
          allowedMimeTypes={["application/pdf", "image/jpeg", "image/png"]}
          maxSize={5 * 1024 * 1024}
          value={form.verificationDocumentUrl}
          onChange={(value) =>
            updateField("verificationDocumentUrl", value)
          }
          onUploadingChange={onUploadingChange}
          preview={
            <FileText
              size={30}
              className={
                form.verificationDocumentUrl
                  ? "text-[#075E36]"
                  : "text-[#718078]"
              }
            />
          }
          text="Arrastra tu archivo aquí"
          info
        />
      </div>

      <div className="mt-4 rounded-md border border-[#DDE7E1] bg-[#FBFDFC] p-3.5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={(event) =>
              updateField("acceptedTerms", event.target.checked)
            }
            className="mt-0.5 size-4 accent-[#075E36]"
          />

          <span className="text-[10px] leading-5 text-[#48564F]">{t("Confirmo que la información proporcionada es correcta y acepto los")}{t(" ")}
            <button
              type="button"
              className="font-semibold text-[#075E36] underline underline-offset-2"
            >{t("términos y condiciones ")}</button>
            . <Required />
          </span>
        </label>
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-md border border-[#D4E7DA] bg-[#F3FAF5] px-3.5 py-3">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#075E36]" />
        <div>
          <p className="text-[10px] font-semibold text-[#24533F]">{t("Verificación segura ")}</p>
          <p className="mt-0.5 text-[9px] leading-4 text-[#6E7C75]">{t("El documento de verificación se utiliza únicamente durante el proceso de revisión administrativa. ")}</p>
        </div>
      </div>
    </div>
  );
}

function StepFive({
  form,
  previewName,
  previewLocation,
  selectedCategoryNames,
  selectedLanguageNames,
  selectedBusinessType,
}: {
  form: AgencyFormData;
  previewName: string;
  previewLocation: string;
  selectedCategoryNames: string[];
  selectedLanguageNames: string[];
  selectedBusinessType: string;
}) {
  const { t } = usePreferences();
  return (
    <div>
      <StepHeader
        icon={<Eye size={21} />}
        title={t("Vista previa")}
        description={t("Revisa que toda la información esté correcta antes de enviarla a revisión.")}
      />

      <div className="bg-card mt-3 overflow-hidden rounded-xl border">
        <div className="relative h-[105px] overflow-hidden bg-[#EDF4F0] sm:h-[125px]">
          {form.coverUrl ? (
            <img
              src={form.coverUrl}
              alt={t("Portada de la agencia")}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon size={40} className="text-[#91A69A]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        </div>

        <div className="px-5 pb-6 sm:px-6">
          <div className="-mt-10 flex flex-col gap-4 rounded-md border border-[#E2EAE5] bg-white px-5 py-5 shadow-[0_10px_28px_rgba(18,58,48,0.08)] sm:flex-row sm:items-center">
            <div className="flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#E0E8E3] bg-white p-2 shadow-sm">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <Building2 size={28} className="text-[#075E36]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold tracking-[-0.02em] text-[#17372E]">
                  {previewName}
                </h3>
                <BadgeCheck size={17} className="text-[#075E36]" />
              </div>

              <p className="mt-1 text-[10px] text-[#66706B]">
                {selectedBusinessType} · {previewLocation}
              </p>

              {form.description && (
                <p className="mt-3 max-w-[720px] text-[10px] leading-5 text-[#5F6C66]">
                  {form.description}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <PreviewInfoCard title={t("Contacto")}>
              <PreviewRow label={t("Correo")} value={form.email || "Sin información"} />
              <PreviewRow label={t("Teléfono")} value={form.phone || "Sin información"} />
              <PreviewRow
                label="Sitio web"
                value={form.website || "No indicado"}
              />
            </PreviewInfoCard>

            <PreviewInfoCard title={t("Ubicación")}>
              <PreviewRow label={t("Ubicación")} value={previewLocation} />
              <PreviewRow
                label={t("Dirección")}
                value={form.exactAddress || "Sin información"}
              />
            </PreviewInfoCard>

            <PreviewInfoCard title={t("Categorías")}>
              <div className="flex flex-wrap gap-2">
                {selectedCategoryNames.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-[#CFE3D6] bg-[#EFF8F3] px-3 py-1.5 text-[9px] font-medium text-[#075E36]"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </PreviewInfoCard>

            <PreviewInfoCard title={t("Idiomas")}>
              <div className="flex flex-wrap gap-2">
                {selectedLanguageNames.map((language) => (
                  <span
                    key={language}
                    className="rounded-full border border-[#DEE5E1] bg-white px-3 py-1.5 text-[9px] font-medium text-[#52615B]"
                  >
                    {language}
                  </span>
                ))}
              </div>
            </PreviewInfoCard>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-md border border-[#D4E7DA] bg-[#F3FAF5] px-3.5 py-3">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#075E36]" />
        <div>
          <p className="text-[10px] font-semibold text-[#24533F]">{t("Lista para revisión ")}</p>
          <p className="mt-1 text-[9px] leading-4 text-[#6E7C75]">{t("Al enviar la agencia, administración revisará la información y los documentos. Durante ese proceso el perfil quedará en estado de revisión. ")}</p>
        </div>
      </div>
    </div>
  );
}

function FormFooter({
  currentStep,
  saving,
  isUploading,
  mode,
  isRejected,
  onCancel,
  onPrevious,
  onNext,
  onSaveDraft,
}: {
  currentStep: StepId;
  saving: boolean;
  isUploading: boolean;
  mode: "create" | "edit";
  isRejected: boolean;
  onCancel: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
}) {
  const { t } = usePreferences();
  return (
    <div className="border-t bg-muted/5 px-5 py-2.5 sm:flex sm:items-center sm:gap-2 sm:px-6">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving || isUploading}
        className="bg-background hover:bg-muted inline-flex h-[34px] items-center justify-center rounded-md border px-4 !text-sm !font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >{t("Cancelar ")}</button>

      <div className="mt-2 flex flex-col gap-2 sm:ml-auto sm:mt-0 sm:flex-row">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving || isUploading}
          className="bg-background text-primary hover:bg-primary/5 inline-flex h-[34px] items-center justify-center gap-2 rounded-md border px-4 !text-sm !font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          {t(saving
            ? "Guardando..."
            : mode === "edit"
              ? "Guardar cambios"
              : "Guardar borrador")}
        </button>

        {currentStep > 1 && (
          <button
            type="button"
            onClick={onPrevious}
            disabled={saving || isUploading}
            className="bg-background hover:bg-muted inline-flex h-[34px] items-center justify-center gap-2 rounded-md border px-4 !text-sm !font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft size={14} />{t("Anterior ")}</button>
        )}

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={onNext}
            disabled={saving || isUploading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-[34px] min-w-[145px] items-center justify-center gap-2 rounded-md px-5 !text-sm !font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >{t("Siguiente paso ")}<ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={saving || isUploading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-[34px] min-w-[175px] items-center justify-center gap-2 rounded-md px-5 !text-sm !font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            {t(saving
              ? "Guardando..."
              : isRejected
                ? "Reenviar para revisión"
                : "Enviar para revisión")}
          </button>
        )}
      </div>
    </div>
  );
}

function StepHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  const { t } = usePreferences();
  return (
    <div className="flex items-center gap-2">
      <div className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-[5px]">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="!m-0 !text-sm !font-semibold !leading-5 !tracking-normal">
          {t(title)}
        </h2>
        <p className="text-muted-foreground !m-0 mt-0.5 !text-[11px] !leading-4">
          {t(description)}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <div className="mt-1">{children}</div>
    </label>
  );
}

function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  const { t } = usePreferences();
  return (
    <span className="block !text-[12px] !font-medium leading-4">
      {t(label)}
      {required && <Required />}
    </span>
  );
}

function Required() {
  return <span className="ml-1 text-[#D94343]">*</span>;
}

function SocialInput({
  icon,
  value,
  placeholder,
  onChange,
}: {
  icon: ReactNode;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const { t } = usePreferences();
  return (
    <div className="bg-background focus-within:ring-ring flex h-9 overflow-hidden rounded-md border transition focus-within:ring-2">
      <span className="text-primary flex h-full w-9 shrink-0 items-center justify-center border-r">
        {icon}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ? t(placeholder) : undefined}
        className="min-w-0 flex-1 bg-transparent px-3 !text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}

function UploadBox({
  kind,
  title,
  subtitle,
  value,
  onChange,
  onUploadingChange,
  preview,
  text,
  accept,
  allowedMimeTypes,
  maxSize,
  info = false,
}: {
  kind: AgencyUploadKind;
  title: string;
  subtitle: string;
  value: string;
  onChange: (value: string) => void;
  onUploadingChange: (kind: AgencyUploadKind, uploading: boolean) => void;
  preview: ReactNode;
  text: string;
  accept: string;
  allowedMimeTypes: string[];
  maxSize: number;
  info?: boolean;
}) {
  const { t } = usePreferences();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploadError(null);

    if (!allowedMimeTypes.includes(file.type)) {
      setUploadError("El tipo de archivo seleccionado no está permitido.");
      return;
    }

    if (file.size > maxSize) {
      const maxMegabytes = maxSize / 1024 / 1024;
      setUploadError(`El archivo supera el límite de ${maxMegabytes} MB.`);
      return;
    }

    try {
      setUploading(true);
      onUploadingChange(kind, true);

      const result = await uploadAgencyFile(file, kind);
      onChange(result.value);
    } catch (cause) {
      setUploadError(
        cause instanceof Error ? cause.message : "No se pudo cargar el archivo.",
      );
    } finally {
      setUploading(false);
      onUploadingChange(kind, false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    if (uploading) {
      return;
    }

    const file = event.dataTransfer.files?.[0];

    if (file) {
      void handleFile(file);
    }
  };

  const openPicker = () => {
    if (!uploading) {
      inputRef.current?.click();
    }
  };

  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-semibold text-[#26352E]">
        {t(title)}
        <Required />
        {info && <Info size={11} className="text-[#66706B]" />}
      </p>

      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!uploading) setDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
        className={[
          "relative mt-2 flex min-h-[104px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-3 py-3 text-center transition-all duration-200",
          dragActive
            ? "border-[#075E36] bg-[#EFF8F3]"
            : "border-[#C9D3CE] bg-[#FCFDFC] hover:border-[#8AB5A0] hover:bg-[#FAFCFB]",
          uploading ? "cursor-wait opacity-80" : "",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
          className="sr-only"
        />

        <div className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-lg border border-[#DDE4E0] bg-white text-[#075E36]">
          {uploading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : value ? (
            <CheckCircle2 size={13} />
          ) : (
            <UploadCloud size={13} />
          )}
        </div>

        <div className="mb-2 flex min-h-12 items-center justify-center">
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-[#075E36]">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-[9px] font-medium">{t("Subiendo...")}</span>
            </div>
          ) : (
            preview
          )}
        </div>

        <p className="text-[10px] font-semibold text-[#2B3A33]">
          {value
            ? kind === "verification"
              ? t("Documento cargado")
              : t("Archivo cargado")
            : text}
        </p>

        <p className="mt-1 text-[9px] font-semibold text-[#075E36]">
          {t(value
            ? "Selecciona otro archivo para reemplazarlo"
            : "o selecciona un archivo")}
        </p>

        <p className="mt-1.5 text-[8px] leading-4 text-[#87908C]">{t(subtitle)}</p>

        {value && kind === "verification" && (
          <div className="mt-3 flex items-center gap-1.5 rounded-full bg-[#EAF5ED] px-2.5 py-1 text-[8px] font-medium text-[#075E36]">
            <ShieldCheck size={10} />{t("Documento almacenado de forma privada ")}</div>
        )}
      </div>

      {uploadError && (
        <p className="mt-1.5 text-[9px] leading-4 text-red-600">
          {uploadError && t(uploadError)}
        </p>
      )}
    </div>
  );
}

function PreviewInfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = usePreferences();
  return (
    <div className="rounded-md border border-[#E3E9E6] bg-[#FBFDFC] p-4">
      <p className="text-[10px] font-semibold text-[#263A31]">{t(title)}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  const { t } = usePreferences();
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-white px-3 py-2.5">
      <span className="text-[9px] text-[#7C8781]">{t(label)}</span>
      <span className="max-w-[65%] text-right text-[9px] font-medium text-[#38463F]">
        {value}
      </span>
    </div>
  );
}

function StatusMessage({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "info" | "error" | "success";
}) {
  const styles = {
    info: "border-[#CFE0D6] bg-[#F4FAF6] text-[#075E36]",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[variant];

  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3.5 py-2.5 text-[10px] ${styles}`}
    >
      {children}
    </div>
  );
}

const inputClass =
  "bg-background ring-offset-background placeholder:text-muted-foreground/60 focus-visible:border-primary/70 focus-visible:ring-primary/10 h-9 w-full rounded-[5px] border px-3 !text-[13px] outline-none transition-all duration-200 focus-visible:ring-2";

const textareaClass =
  "bg-background ring-offset-background placeholder:text-muted-foreground/60 focus-visible:border-primary/70 focus-visible:ring-primary/10 w-full resize-none rounded-[5px] border px-3 py-2 !text-[12.5px] leading-[18px] outline-none transition-all duration-200 focus-visible:ring-2";

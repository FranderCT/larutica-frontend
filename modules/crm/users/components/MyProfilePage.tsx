"use client";

<<<<<<< Updated upstream
import { useState } from "react";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserForm } from "./UserForm";
import { UserStatusBadge } from "./UserStatusBadge";
=======
import { useRef, useState } from "react";
import { Building2, Camera, Home, Mail, Phone, Shield, UserRound } from "lucide-react";
import { parsePhoneNumber } from "react-phone-number-input";
import { getInitials } from "@/components/app-sidebar/user-avatar-utils";
import type { DashboardRole } from "@/components/dashboard/dashboard-role-context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth/context/AuthContext";
import { AVATAR_ACCEPT, avatarFileError } from "@/modules/auth/utils/avatar";
import type { SystemUser, UserStatus } from "../models/User";
import { PasskeysPanel } from "./PasskeysPanel";
import { UserForm } from "./UserForm";

const roleBadgeClass: Record<DashboardRole, string> = {
  Admin: "bg-blue-100 text-blue-700 border-blue-200",
  Agencia: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Transporte: "bg-amber-100 text-amber-700 border-amber-200",
  Viajero: "bg-slate-100 text-slate-700 border-slate-200",
};

const statusBadgeClass: Record<UserStatus, string> = {
  Activo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Inactivo: "bg-slate-100 text-slate-600 border-slate-200",
};

type ProfileTab = "info" | "edit" | "password" | "passkeys";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "info", label: "Información" },
  { id: "edit", label: "Editar" },
  { id: "password", label: "Contraseña" },
  { id: "passkeys", label: "Passkeys" },
];

function formatPhone(phone: string): string {
  try {
    return parsePhoneNumber(phone)?.formatInternational() ?? phone;
  } catch {
    return phone;
  }
}

function RoleBadge({ role }: { role: DashboardRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 !text-xs !font-medium",
        roleBadgeClass[role],
      )}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 !text-xs !font-medium",
        statusBadgeClass[status],
      )}
    >
      {status}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="bg-muted text-muted-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground !text-xs !font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="mt-0.5 break-words !text-sm !font-medium">{value}</p>
      </div>
    </div>
  );
}

function ProfileAvatar({
  profile,
  onSuccess,
  onError,
}: {
  profile: SystemUser;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { uploadAvatar } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="group bg-primary/10 relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        aria-label={profile.avatarUrl ? "Cambiar foto de perfil" : "Agregar foto de perfil"}
        title={profile.avatarUrl ? "Cambiar foto de perfil" : "Agregar foto de perfil"}
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-primary !text-sm !font-semibold">
            {getInitials(profile.name, profile.email)}
          </span>
        )}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity",
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
        >
          <Camera className={cn("size-4", uploading && "animate-pulse")} aria-hidden="true" />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          const fileError = avatarFileError(file);
          if (fileError) {
            onError(fileError);
            return;
          }
          setUploading(true);
          try {
            await uploadAvatar(file);
            onSuccess("Foto de perfil actualizada.");
          } catch (error) {
            onError(error instanceof Error ? error.message : "No se pudo guardar la foto.");
          } finally {
            setUploading(false);
          }
        }}
      />
    </>
  );
}

function ProfileInfoPanel({
  profile,
  onSuccess,
  onError,
}: {
  profile: SystemUser;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <ProfileAvatar profile={profile} onSuccess={onSuccess} onError={onError} />
        <div className="min-w-0 flex-1">
          <p className="!m-0 truncate !text-base !font-semibold !leading-6">
            {profile.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RoleBadge role={profile.role} />
            <StatusBadge status={profile.status} />
          </div>
        </div>
      </div>

      <div className="divide-y">
        <InfoRow icon={Mail} label="Correo" value={profile.email || "—"} />
        <InfoRow
          icon={Phone}
          label="Teléfono"
          value={profile.phone ? formatPhone(profile.phone) : "—"}
        />
        <InfoRow icon={Shield} label="Rol" value={profile.role} />
        <InfoRow icon={UserRound} label="Estado" value={profile.status} />
        {(profile.role === "Agencia" || profile.role === "Transporte") && (
          <InfoRow
            icon={Building2}
            label={
              profile.role === "Agencia"
                ? "Nombre de la agencia"
                : "Nombre del servicio"
            }
            value={profile.businessName || "—"}
          />
        )}
      </div>
    </div>
  );
}

function ChangePasswordForm({
  onSuccess,
  onError,
}: {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const clearFields = () => {
    setCurrentPassword("");
    setPassword("");
    setConfirmation("");
  };

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!currentPassword) {
          onError("Escribe tu contraseña actual.");
          return;
        }
        if (password.length < 8) {
          onError("La contraseña debe tener al menos 8 caracteres.");
          return;
        }
        if (password === currentPassword) {
          onError("La nueva contraseña debe ser distinta a la actual.");
          return;
        }
        if (password !== confirmation) {
          onError("Las contraseñas no coinciden.");
          return;
        }

        setSubmitting(true);
        try {
          const response = await fetch("/api/auth/password", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ currentPassword, password }),
          });
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            onError(payload.error ?? "No se pudo actualizar la contraseña.");
            return;
          }
          clearFields();
          onSuccess("Contraseña actualizada correctamente.");
        } catch {
          onError("No se pudo actualizar la contraseña.");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="current-password" className="!text-sm">
            Contraseña actual
          </FieldLabel>
          <Input
            id="current-password"
            className="!h-9 !text-sm"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Tu contraseña actual"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-password" className="!text-sm">
            Nueva contraseña
          </FieldLabel>
          <Input
            id="new-password"
            className="!h-9 !text-sm"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password" className="!text-sm">
            Confirmar contraseña
          </FieldLabel>
          <Input
            id="confirm-password"
            className="!h-9 !text-sm"
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Repite la nueva contraseña"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="!text-sm"
          disabled={submitting}
          onClick={clearFields}
        >
          Limpiar
        </Button>
        <Button type="submit" className="!text-sm" disabled={submitting}>
          {submitting ? "Guardando…" : "Cambiar contraseña"}
        </Button>
      </div>
    </form>
  );
}
>>>>>>> Stashed changes

export function MyProfilePage() {
  const { user: profile, saveProfile } = useAuth();
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  if (!profile) return <p className="text-sm text-muted-foreground">Cargando perfil...</p>;
  const id = profile.id;
  const initialValue = {
    name: profile.name,
    email: profile.email,
    role: profile.role,
    phone: profile.phone,
    businessName: profile.businessName,
    status: profile.status,
  };

  return (
<<<<<<< Updated upstream
    <div className="mx-auto max-w-3xl space-y-6">
      <div><h1 className="text-xl font-semibold tracking-tight">Mi perfil</h1><p className="mt-1 text-sm text-muted-foreground">Los cambios se guardan en la cuenta compartida de LaRutica.</p></div>
      <Card className="shadow-xs"><CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0"><div><CardTitle className="text-base">{profile.name}</CardTitle><CardDescription>{profile.role}{profile.businessName ? ` · ${profile.businessName}` : ""}</CardDescription></div><UserStatusBadge status={profile.status} /></CardHeader><CardContent className="text-sm text-muted-foreground">{profile.email}</CardContent></Card>
      {message ? <p className="text-sm text-primary" role="status">{message}</p> : null}
      <UserForm
        key={`${id}-${formKey}`}
        initialValue={initialValue}
        submitLabel="Guardar perfil"
        lockRole
        lockEmail
        lockStatus
        onCancel={() => { setMessage(null); setFormKey((current) => current + 1); }}
        onSubmit={async (value) => {
          try {
            await saveProfile({ name: value.name, phone: value.phone, businessName: value.businessName });
            setMessage("Perfil actualizado en todos los módulos.");
            setFormKey((current) => current + 1);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
          }
        }}
      />
=======
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList className="!text-sm">
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/dashboard"
              className="flex items-center gap-1.5 !text-sm"
            >
              <Home className="size-3.5" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="!text-sm">Mi perfil</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="!m-0 !max-w-none !text-2xl !leading-8 !font-semibold !tracking-tight">
          Mi perfil
        </h1>
        <p className="text-muted-foreground mt-0.5 !text-sm !leading-5">
          Consulta tu cuenta, cambia tu foto, edita tus datos, cambia tu contraseña o administra tus passkeys.
        </p>
      </div>

      {message ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 !text-sm",
            isError
              ? "border-destructive/20 bg-destructive/5 text-destructive"
              : "border-primary/20 bg-primary/5 text-primary",
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="bg-card overflow-hidden rounded-xl">
        <div
          role="tablist"
          aria-label="Opciones de perfil"
          className="flex gap-1 overflow-x-auto border-b px-2 pt-2"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cn(
                "shrink-0 rounded-t-md px-4 py-2.5 !text-sm !font-medium transition-colors",
                tab === item.id
                  ? "text-foreground border-primary border-b-2"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setTab(item.id);
                clearMessage();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-5" role="tabpanel">
          {tab === "info" ? (
            <ProfileInfoPanel
              profile={profile}
              onSuccess={(next) => {
                setIsError(false);
                setMessage(next);
              }}
              onError={(next) => {
                setIsError(true);
                setMessage(next);
              }}
            />
          ) : null}

          {tab === "edit" ? (
            <UserForm
              key={`${profile.id}-${formKey}`}
              initialValue={initialValue}
              submitLabel="Guardar perfil"
              lockRole
              lockEmail
              lockStatus
              onCancel={() => {
                clearMessage();
                setFormKey((current) => current + 1);
                setTab("info");
              }}
              onSubmit={async (value) => {
                try {
                  await saveProfile({
                    name: value.name,
                    phone: value.phone,
                    businessName: value.businessName,
                  });
                  setIsError(false);
                  setMessage("Perfil actualizado correctamente.");
                  setFormKey((current) => current + 1);
                  setTab("info");
                } catch (error) {
                  setIsError(true);
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "No se pudo actualizar el perfil.",
                  );
                }
              }}
            />
          ) : null}

          {tab === "password" ? (
            <ChangePasswordForm
              onSuccess={(next) => {
                setIsError(false);
                setMessage(next);
              }}
              onError={(next) => {
                setIsError(true);
                setMessage(next);
              }}
            />
          ) : null}

          {tab === "passkeys" ? (
            <PasskeysPanel
              onSuccess={(next) => {
                setIsError(false);
                setMessage(next);
              }}
              onError={(next) => {
                setIsError(true);
                setMessage(next);
              }}
            />
          ) : null}
        </div>
      </div>
>>>>>>> Stashed changes
    </div>
  );
}

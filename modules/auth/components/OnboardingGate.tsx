"use client";

import { useEffect, useState } from "react";
import { Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SystemUser } from "@/modules/crm/users/models/User";
import { useAuth } from "../context/AuthContext";
import { useWebAuthnSupport } from "../hooks/useWebAuthnSupport";
import { listPasskeys, registerPasskey } from "../services/passkeys.service";
import { passkeyErrorMessage } from "../utils/passkeyErrors";
import { AvatarUploadCard } from "./AvatarUploadCard";

function PasskeySetupCard() {
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (created) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
        <Check className="size-4 shrink-0" aria-hidden="true" />
        Passkey registrada. Ya puedes usarla para iniciar sesión.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await registerPasskey();
            setCreated(true);
          } catch (nextError) {
            setError(passkeyErrorMessage(nextError, "No se pudo registrar la passkey."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <KeyRound aria-hidden="true" />
        {busy ? "Esperando al dispositivo…" : "Crear passkey"}
      </Button>
      <p className="text-muted-foreground text-xs">Se guardará con el nombre de este dispositivo.</p>
      {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}
    </div>
  );
}

// Bienvenida del primer inicio de sesión: bloquea el dashboard hasta que el
// usuario termina u omite los pasos, y no vuelve a mostrarse.
export function OnboardingGate({ user }: { user: SystemUser }) {
  const { completeOnboarding } = useAuth();
  const passkeySupported = useWebAuthnSupport();
  const [hasPasskey, setHasPasskey] = useState(false);
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quien ya tiene passkey (por ejemplo, entró con una) no necesita ese paso.
  useEffect(() => {
    if (!passkeySupported) return;
    listPasskeys()
      .then((passkeys) => setHasPasskey(passkeys.length > 0))
      .catch(() => setHasPasskey(false));
  }, [passkeySupported]);

  const firstName = user.name.split(" ")[0] || user.name;
  const steps = [
    {
      title: `¡Bienvenido a LaRutica, ${firstName}!`,
      description: "Agrega una foto de perfil para que agencias y viajeros te reconozcan.",
      content: <AvatarUploadCard user={user} />,
    },
    ...(passkeySupported && !hasPasskey
      ? [{
        title: "Ingresa más rápido la próxima vez",
        description: "Configura una passkey para iniciar sesión con tu huella, rostro o PIN, sin escribir tu contraseña.",
        content: <PasskeySetupCard />,
      }]
      : []),
  ];
  const current = steps[Math.min(step, steps.length - 1)];
  const isLastStep = step >= steps.length - 1;

  const handleNext = async () => {
    if (!isLastStep) {
      setStep((value) => value + 1);
      return;
    }
    setFinishing(true);
    setError(null);
    try {
      await completeOnboarding();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo finalizar la bienvenida.");
      setFinishing(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="max-h-[85vh] overflow-y-auto sm:max-w-lg"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          {steps.length > 1 ? (
            <p className="text-muted-foreground !m-0 !text-xs">Paso {step + 1} de {steps.length}</p>
          ) : null}
          <DialogTitle className="!text-2xl !leading-8">{current.title}</DialogTitle>
          <DialogDescription>{current.description}</DialogDescription>
        </DialogHeader>

        {current.content}

        {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <Button type="button" variant="ghost" disabled={finishing} onClick={handleNext}>
            Omitir
          </Button>
          <Button type="button" disabled={finishing} onClick={handleNext}>
            {finishing ? "Guardando…" : isLastStep ? "Finalizar" : "Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

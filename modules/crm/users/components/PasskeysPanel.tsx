"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebAuthnSupport } from "@/modules/auth/hooks/useWebAuthnSupport";
import {
  listPasskeys,
  passkeyRequest,
  registerPasskey,
  type Passkey,
} from "@/modules/auth/services/passkeys.service";
import { passkeyErrorMessage } from "@/modules/auth/utils/passkeyErrors";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PasskeysPanel({
  onSuccess,
  onError,
}: {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = useWebAuthnSupport();

  // El padre pasa callbacks nuevos en cada render; la carga inicial no debe repetirse.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    listPasskeys()
      .then(setPasskeys)
      .catch((error: unknown) => {
        setPasskeys([]);
        onErrorRef.current(error instanceof Error ? error.message : "No se pudieron cargar las passkeys.");
      });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="!m-0 !text-sm !font-medium">Passkeys</p>
        <p className="text-muted-foreground mt-0.5 !text-sm">
          Inicia sesión con la huella, el rostro o el PIN de tu dispositivo, sin escribir la contraseña.
        </p>
      </div>

      {passkeys === null ? (
        <Skeleton className="h-16 rounded-lg" />
      ) : passkeys.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center !text-sm">
          Aún no tienes passkeys registradas.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="flex items-center gap-3 px-3 py-3">
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
                <KeyRound className="size-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="!m-0 flex items-center gap-1.5 truncate !text-sm !font-medium">
                  {passkey.name}
                  {passkey.backedUp ? (
                    <Cloud className="text-muted-foreground size-3.5" aria-label="Sincronizada en la nube" />
                  ) : null}
                </p>
                <p className="text-muted-foreground !m-0 !text-xs">
                  Creada {formatDate(passkey.createdAt)}
                  {passkey.lastUsedAt ? ` · Último uso ${formatDate(passkey.lastUsedAt)}` : " · Sin usar"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label={`Eliminar passkey ${passkey.name}`}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await passkeyRequest<null>(`/api/auth/passkeys/${passkey.id}`, { method: "DELETE" });
                    setPasskeys((current) => current?.filter((item) => item.id !== passkey.id) ?? null);
                    onSuccess("Passkey eliminada. Recuerda borrarla también del gestor de contraseñas del dispositivo.");
                  } catch (error) {
                    onError(error instanceof Error ? error.message : "No se pudo eliminar la passkey.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {supported ? (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              const created = await registerPasskey();
              setPasskeys((current) => [...(current ?? []), created]);
              onSuccess("Passkey registrada. Ya puedes usarla para iniciar sesión.");
            } catch (error) {
              onError(passkeyErrorMessage(error, "No se pudo registrar la passkey."));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-muted-foreground !m-0 !text-xs">
            Se guardará con el nombre de este dispositivo.
          </p>
          <div className="flex justify-end">
            <Button type="submit" className="!text-sm" disabled={busy}>
              <KeyRound aria-hidden="true" />
              {busy ? "Esperando al dispositivo…" : "Agregar passkey"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-muted-foreground !text-sm">Este navegador no admite passkeys.</p>
      )}
    </div>
  );
}

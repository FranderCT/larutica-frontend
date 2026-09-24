import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";

export type Passkey = {
  id: string;
  name: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export async function passkeyRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: init.body ? { "content-type": "application/json" } : undefined,
  });
  // Un 404 del backend puede devolver HTML en lugar de JSON.
  const payload = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!response.ok) {
    throw new Error(
      payload.error
        ?? (response.status === 404
          ? "El servidor todavía no tiene habilitadas las passkeys."
          : "No se pudo completar la solicitud."),
    );
  }
  return payload.data as T;
}

export function listPasskeys() {
  return passkeyRequest<Passkey[]>("/api/auth/passkeys");
}

export async function registerPasskey() {
  const { flowId, options } = await passkeyRequest<{
    flowId: string;
    options: PublicKeyCredentialCreationOptionsJSON;
  }>("/api/auth/passkey/register/options", { method: "POST" });
  const response = await startRegistration({ optionsJSON: options });
  return passkeyRequest<Passkey>("/api/auth/passkey/register/verify", {
    method: "POST",
    body: JSON.stringify({ flowId, response }),
  });
}

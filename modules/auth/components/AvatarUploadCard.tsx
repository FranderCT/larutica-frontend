"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/app-sidebar/nav-user";
import { getInitials } from "@/components/app-sidebar/user-avatar-utils";
import { Button } from "@/components/ui/button";
import type { SystemUser } from "@/modules/crm/users/models/User";
import { useAuth } from "../context/AuthContext";
import { AVATAR_ACCEPT, avatarFileError } from "../utils/avatar";

export function AvatarUploadCard({ user }: { user: SystemUser }) {
  const { uploadAvatar } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar
            avatarUrl={user.avatarUrl || null}
            initials={getInitials(user.name, user.email)}
            className="size-20 rounded-full text-lg"
          />
          {uploading ? (
            <div className="bg-background/70 absolute inset-0 flex items-center justify-center rounded-full">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="hidden"
            disabled={uploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              const fileError = avatarFileError(file);
              setError(fileError);
              if (fileError) return;
              setUploading(true);
              try {
                await uploadAvatar(file);
              } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : "No se pudo guardar la foto.");
              } finally {
                setUploading(false);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera aria-hidden="true" />
            {uploading ? "Subiendo…" : user.avatarUrl ? "Cambiar foto" : "Subir foto"}
          </Button>
          <p className="text-muted-foreground text-xs">JPG, PNG o WebP · máximo 2 MB</p>
        </div>
      </div>

      {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}
    </div>
  );
}

import type { SystemUser } from "@/modules/crm/users/models/User";

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
  role: SystemUser["role"];
  phone: string | null;
  business_name: string | null;
  status: SystemUser["status"];
  avatar_url?: string | null;
  onboarding_completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export function profileRowToSystemUser(row: ProfileRow): SystemUser {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    phone: row.phone ?? "",
    businessName: row.business_name ?? "",
    status: row.status,
    avatarUrl: row.avatar_url ?? "",
    // Si el backend aún no tiene la columna, no se fuerza la bienvenida.
    onboardingCompleted: row.onboarding_completed_at !== null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

"use client";
import { useDashboardRole } from "@/components/dashboard/dashboard-role-context";
import { DashboardSectionPage } from "@/components/dashboard/DashboardSectionPage";
import { usePreferences } from "@/lib/preferences/Preferences";
import { AdminGraphics } from "@/modules/dashboard/components/AdminGraphics";

export default function Page() {
  const { t } = usePreferences();
  const { role } = useDashboardRole();
  if (role === "Admin") return <AdminGraphics />;
  return (
    <DashboardSectionPage
      title={t("Gráficas")}
      description={t("Solo los administradores pueden ver esta sección.")}
    />
  );
}

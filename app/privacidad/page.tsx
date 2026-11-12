import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyPolicyContent } from "@/components/legal/PrivacyPolicyContent";
import { PRIVACY_POLICY_UPDATED_AT, PRIVACY_POLICY_VERSION } from "@/lib/privacyPolicy";

export const metadata: Metadata = {
  title: "Política de privacidad | LaRutica",
  description: "Conoce qué datos utiliza LaRutica, para qué los utiliza y cómo puedes ejercer tus derechos sobre ellos.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page" lang="es">
      <div className="legal-content">
        <Link className="back-link" href="/">← Volver a LaRutica</Link>
        <p className="eyebrow">LaRutica · Costa Rica</p>
        <h1 className="detail-title lr-page-title">Política de privacidad</h1>
        <p className="detail-intro">Última actualización: {PRIVACY_POLICY_UPDATED_AT}. Versión: {PRIVACY_POLICY_VERSION}.</p>
        <PrivacyPolicyContent />
      </div>
    </main>
  );
}

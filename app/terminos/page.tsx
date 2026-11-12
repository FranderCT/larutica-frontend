import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y condiciones | LaRutica",
  description: "Términos de uso del prototipo académico LaRutica.",
};

export default function TermsPage() {
  return (
    <main className="legal-page" lang="es">
      <div className="legal-content">
        <Link className="back-link" href="/">← Volver a LaRutica</Link>
        <p className="eyebrow">LaRutica · Costa Rica</p>
        <h1 className="detail-title lr-page-title">Términos y condiciones</h1>
        <p className="detail-intro">
          Estas condiciones describen el uso de LaRutica, una plataforma demostrativa
          para explorar experiencias y servicios turísticos en Costa Rica.
        </p>
        <p className="legal-notice">
          <strong>Importante:</strong> LaRutica es un prototipo académico. Los contenidos,
          precios y flujos de reserva pueden ser ilustrativos y no constituyen una oferta
          comercial ni una confirmación de compra. Antes de operar como servicio real,
          estos términos deberán revisarse y adaptarse a la normativa aplicable.
        </p>

        <section>
          <h2>1. Aceptación y alcance</h2>
          <p>
            Al navegar o utilizar las funciones de LaRutica, aceptas estas condiciones.
            Si no estás de acuerdo, puedes dejar de utilizar la plataforma. Estas
            condiciones aplican a visitantes, viajeros y proveedores que accedan al
            prototipo.
          </p>
        </section>

        <section>
          <h2>2. Qué ofrece LaRutica</h2>
          <p>
            LaRutica permite consultar información de destinos, experiencias y transporte,
            y muestra interfaces de perfil, guardados y reservas. La plataforma funciona
            como un espacio de demostración y, en su versión actual, no garantiza que los
            servicios publicados estén disponibles ni que una reserva de prueba genere
            una contratación real.
          </p>
        </section>

        <section>
          <h2>3. Cuentas y uso responsable</h2>
          <p>
            Si utilizas una cuenta, debes proporcionar información correcta, mantener
            protegidas tus credenciales y avisar si detectas un uso no autorizado.
            Utiliza el sitio de forma lícita y respetuosa; no intentes acceder sin
            autorización a cuentas, datos o sistemas, ni interfieras con el funcionamiento
            de la plataforma.
          </p>
        </section>

        <section>
          <h2>4. Proveedores, experiencias y reservas</h2>
          <p>
            La información de las experiencias y los servicios es responsabilidad de sus
            respectivos proveedores. Antes de contratar, verifica directamente con el
            proveedor la disponibilidad, el itinerario, los requisitos, las condiciones
            de seguridad y cualquier restricción. Guardar una experiencia o completar
            un formulario demostrativo no confirma por sí mismo una reserva.
          </p>
        </section>

        <section>
          <h2>5. Precios, pagos y cancelaciones</h2>
          <p>
            Los precios, fechas y totales que aparecen en el prototipo pueden ser
            referenciales. No ingreses datos de pago: LaRutica no procesa pagos reales en
            estos flujos de demostración. Si una experiencia se ofrece fuera del
            prototipo, el proveedor deberá informar antes de la contratación el precio
            final, los medios de pago y sus políticas de cambios y cancelación.
          </p>
        </section>

        <section>
          <h2>6. Contenido y propiedad intelectual</h2>
          <p>
            Los nombres, diseños, textos y elementos gráficos de LaRutica pertenecen a
            sus titulares o se utilizan con fines demostrativos. No copies, distribuyas
            ni explotes materiales del sitio sin contar con los permisos correspondientes.
            Los proveedores son responsables de tener autorización para el contenido que
            aporten.
          </p>
        </section>

        <section>
          <h2>7. Disponibilidad y responsabilidad</h2>
          <p>
            El prototipo se ofrece «tal cual» para fines académicos y puede modificarse,
            interrumpirse o contener errores. En la medida permitida por la normativa
            aplicable, LaRutica no garantiza la disponibilidad de los servicios de
            terceros ni responde por la prestación de experiencias a cargo de sus
            proveedores. Esta sección no limita derechos que legalmente no puedan
            excluirse.
          </p>
        </section>

        <section>
          <h2>8. Privacidad</h2>
          <p>
            La recolección, el uso y la protección de tu información se describen en
            nuestra <Link href="/privacidad" className="underline underline-offset-4">Política de privacidad</Link>.
            Debes leerla y aceptarla antes de crear una cuenta. Evita introducir datos
            sensibles o información de pago en el prototipo.
          </p>
        </section>

        <section>
          <h2>9. Cambios y contacto</h2>
          <p>
            Estas condiciones pueden actualizarse junto con el prototipo. La versión
            publicada en esta página será la referencia para su uso demostrativo. Para
            consultas sobre una experiencia concreta, revisa la información y los medios
            de contacto indicados por su proveedor.
          </p>
        </section>
      </div>
    </main>
  );
}

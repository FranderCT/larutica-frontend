import Link from "next/link";

export function PrivacyPolicyContent() {
  return (
    <div className="legal-content" lang="es">
        <p className="legal-notice">Tu información permite crear tu cuenta y utilizar las funciones que eliges. Esta política explica qué datos recibimos, quién puede acceder a ellos y cómo puedes solicitar su corrección o eliminación.</p>

        <section>
          <h2>1. Alcance y responsable</h2>
          <p>Esta política corresponde al equipo responsable del proyecto LaRutica, un prototipo académico de turismo en Costa Rica. Se aplica a visitantes y a las cuentas de Viajero, Agencia y Transporte. También cubre las funciones de perfil, publicaciones, experiencias guardadas y solicitudes de reserva disponibles en la plataforma.</p>
        </section>
        <section>
          <h2>2. Información que recibimos</h2>
          <p>Al registrarte recibimos tu nombre, correo electrónico, tipo de cuenta y contraseña para autenticarte. Recibimos tu teléfono cuando lo proporcionas y, para Agencia y Transporte, el nombre de la empresa o servicio y un teléfono de contacto. Los campos con asterisco son necesarios para crear el tipo de cuenta seleccionado; sin ellos no podemos completar el registro.</p>
          <p className="mt-3!">Cuando utilizas otras funciones recibimos los datos que decides aportar: cambios de perfil, información e imágenes de servicios, documentos de verificación de proveedores, experiencias guardadas, solicitudes de reserva, fechas, cantidad de personas y valoraciones. Para proteger el acceso también tratamos identificadores de sesión y, si configuras una llave de acceso, su identificador y clave pública. La infraestructura puede registrar información técnica, como dirección IP, navegador, solicitudes y errores.</p>
        </section>
        <section>
          <h2>3. Para qué utilizamos tus datos</h2>
          <p>Utilizamos los datos para crear y autenticar tu cuenta, asignar las funciones de tu tipo de perfil, gestionar publicaciones y solicitudes, mostrar tus guardados y valoraciones, verificar proveedores y proteger la plataforma frente a accesos indebidos. Tu correo permite enviar comunicaciones de confirmación de cuenta y recuperación de contraseña. Registramos la fecha y la versión de la política que aceptas al crear la cuenta.</p>
        </section>
        <section>
          <h2>4. Quién puede consultar la información</h2>
          <p>Los administradores autorizados pueden consultar los datos necesarios para gestionar cuentas, servicios y reservas. El proveedor de una experiencia puede consultar la información de las solicitudes asociadas a su servicio para atenderlas. La información que publicas sobre una agencia, un transporte o una experiencia, incluidas sus imágenes y medios de contacto, puede ser visible para los visitantes. No incluyas información privada en campos destinados a publicaciones.</p>
          <p className="mt-3!">La plataforma utiliza Supabase para autenticación y almacenamiento de datos, y servicios de alojamiento y almacenamiento de archivos para operar el sitio. Estos proveedores reciben la información necesaria para sus funciones. También puede ser necesario facilitar información a una autoridad cuando exista una obligación legal aplicable.</p>
        </section>
        <section>
          <h2>5. Sesiones y almacenamiento en tu navegador</h2>
          <p>Utilizamos cookies de sesión para mantener tu acceso y comprobar tus permisos. Algunas funciones pueden guardar preferencias o datos temporales en el navegador para continuar una acción. Puedes borrar estos datos desde la configuración de tu navegador; hacerlo puede cerrar tu sesión o eliminar información temporal. La aceptación de esta política no constituye autorización para publicidad o seguimiento con fines de mercadeo.</p>
        </section>
        <section>
          <h2>6. Seguridad, conservación y alojamiento</h2>
          <p>Aplicamos controles de autenticación, permisos por rol y sesiones protegidas. Las contraseñas se gestionan mediante el servicio de autenticación y las llaves de acceso se verifican mediante claves públicas. Ningún sistema puede garantizar seguridad absoluta: protege tus credenciales y cierra la sesión en dispositivos compartidos.</p>
          <p className="mt-3!">Conservamos los datos mientras sean necesarios para tu cuenta y las funciones utilizadas. La eliminación puede estar sujeta a obligaciones legales, resolución de incidentes y ciclos de respaldo de los proveedores. El alojamiento y procesamiento de información pueden realizarse fuera de Costa Rica según la infraestructura utilizada.</p>
        </section>
        <section>
          <h2>7. Tus decisiones y derechos</h2>
          <p>Puedes revisar y actualizar los datos editables desde tu perfil. También puedes solicitar al equipo responsable información sobre tus datos, su rectificación o eliminación, y retirar el consentimiento para su tratamiento. La solicitud puede requerir verificar tu identidad. Retirar el consentimiento puede impedir mantener la cuenta o prestar las funciones que necesitan esos datos; no afecta el tratamiento realizado previamente ni las obligaciones legales de conservación que correspondan.</p>
          <p className="mt-3!">La normativa costarricense sobre protección de datos personales reconoce el derecho a controlar el tratamiento de tu información. Puedes consultar la <a href="https://www.pgrweb.go.cr/DOCS/NORMAS/1/VIGENTE/L/2010-2019/2010-2014/2011/1153F/DCEF7.HTML" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Ley N.º 8968</a> para conocer su alcance.</p>
        </section>
        <section>
          <h2>8. Información sensible y pagos</h2>
          <p>Las funciones de registro y reserva de este prototipo no solicitan datos de tarjetas ni procesan pagos reales. Evita aportar información de salud, datos biométricos u otra información sensible en textos, imágenes o archivos. Si un proveedor te dirige a otro sitio, consulta sus condiciones y su política antes de compartir datos.</p>
        </section>
        <section>
          <h2>9. Aceptación y cambios</h2>
          <p>Antes de crear una cuenta debes leer esta política y marcar expresamente la casilla de aceptación. Si no la aceptas, puedes consultar el contenido público, pero no completar el registro. La aceptación comprende el tratamiento descrito para las funciones de LaRutica; no incorpora permisos generales para otros fines. Publicaremos las actualizaciones con su fecha y versión y solicitaremos una nueva autorización cuando corresponda por cambios en las finalidades del tratamiento.</p>
        </section>
        <section>
          <h2>10. Consultas de privacidad</h2>
          <p>Para solicitar acceso, rectificación, eliminación de datos o retirar tu consentimiento, contacta al equipo responsable de LaRutica mediante el canal por el que recibiste acceso a este proyecto académico. Indica que se trata de una solicitud de privacidad y el correo asociado a tu cuenta. No compartas tu contraseña ni códigos de acceso.</p>
        </section>
        <p className="legal-notice">Puedes consultar también los <Link href="/terminos" className="underline underline-offset-4">Términos y condiciones</Link> de LaRutica.</p>
    </div>
  );
}

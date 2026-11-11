# QA de diseño, diálogos y consistencia del panel (`/dashboard`) — 2026-11-09

Complementa `docs/qa-panel-admin-2026-11-09.md` (errores funcionales). Aquí solo se compara la interfaz contra `docs/sistema-diseno.md` y `app/design-tokens.css`.

## Método

- Chrome real con sesión Admin (JS vía AppleScript), `http://localhost:3000`.
- Auditoría de estilos computados en 16 pantallas (escritorio 1440 px): tamaños de fuente, alturas y radios de botones/campos, encabezados, colores.
- Apertura (sin confirmar) de los diálogos alcanzables: Usuarios → Eliminar; Promociones → Reembolsar; Pagos → Ajuste y Comisión. Medición en escritorio y en móvil (364 px).
- Lectura estática del código del panel (`modules/**`, `components/**`, `app/dashboard/**`) con `grep`.
- Capturas de pantalla de Usuarios, Mi agencia, Mi perfil y Nueva publicación.
- `npm run design:check` → `DESIGN_OK`. **El script pasa aunque hay las violaciones de abajo** (ver D1).
- No se modificó ningún dato: ningún diálogo se confirmó.

## Resumen

| Severidad | Cantidad |
|---|---|
| Alta | 4 |
| Media | 8 |
| Baja | 6 |

## Diálogos

### Alta

**D1. Confirmaciones con `window.confirm` / `window.alert` nativos en el panel**
El sistema de diseño exige `Dialog` para confirmaciones (`docs/sistema-diseno.md`, tabla de componentes). Hoy hay diálogos nativos del navegador, sin tipografía ni estilo de marca y bloqueantes:

| Archivo | Línea | Acción |
|---|---|---|
| `modules/publications/components/admin/admin-publication-detail.tsx` | 64 | Aprobar/rechazar publicación |
| `modules/agency/components/admin/admin-agency-detail.tsx` | 238 | Aprobar agencia |
| `modules/crm/users/components/UserDetail.tsx` | 87 | Eliminar usuario |
| `modules/publications/components/PublicationDetail.tsx` | 131, 150 | Confirmar y `alert` |
| `modules/publications/components/PublicationsList.tsx` | 69, 80 | Confirmar y `alert` |
| `modules/transport/vehicles/components/VehiclesList.tsx`, `VehicleDetail.tsx` | 96, 64 | Eliminar vehículo |
| `modules/transport/routes/components/RoutesList.tsx`, `RouteDetail.tsx` | 96, 68 | Eliminar ruta |

Además es inconsistente con la propia lista de Usuarios, que sí usa un modal propio para el mismo «Eliminar usuario». No hay `AlertDialog` en `components/ui`: conviene crear uno (o una variante de `Dialog`) y sustituir todos.
Nota: no se probaron en el navegador para no disparar el diálogo nativo (bloquea Chrome); la evidencia es el código.

**D2. Modal de «Eliminar usuario» no es el `Dialog` compartido y difiere visualmente**
`modules/crm/users/components/UsersList.tsx:147`. Medido contra el `Dialog` de Promociones/Pagos:

| Propiedad | Eliminar usuario (propio) | Reembolsar / Ajuste / Comisión (`Dialog`) | Sistema |
|---|---|---|---|
| Radio | 16 px | 20 px | 20 px |
| Título | 16 px / 600 | 20 px / 600 | type-card 20 px |
| Fondo (overlay) | `slate-950/45` + blur | `black/50` | — |
| Botón cerrar | 40 px, píldora, «Cerrar confirmación» | 44 px, radio 10 px, «Cerrar» | — |
| `z-index` | 80 | 50 | — |
| Ancho | 448 px | 512 px | — |

Botones (Cancelar / destructivo) sí coinciden (44 px, píldora, `#9b271f`).

**D3. Foco no entra al modal «Eliminar usuario» al abrirlo**
Tras abrirlo desde el menú de fila, `document.activeElement` siguió siendo el botón «Acciones para …» (fuera del `role="alertdialog"`). En los `Dialog` Radix el foco sí pasa al diálogo (en Promociones al botón «Cancelar»). Con teclado/lector de pantalla el usuario no queda dentro del modal. Verificar con teclado real (la medición fue con eventos sintéticos) y, si se confirma, mover el foco al abrir y devolverlo al cerrar. Escape sí lo cierra.

### Media

**D4. Cinco implementaciones distintas de «modal/overlay»**
`Dialog` Radix (`z-50`), modal de usuarios (`z-[80]`), visor de documentos de verificación (`verification-document-viewer.tsx`, `z-[90]`, fondo `black/85`), lightbox de `admin-agency-detail.tsx` (`z-[90]`, `black/80` + blur) y panel/diálogo de eliminar cuenta en `components/dashboard/TravelerViews.tsx` (clases `.dialog`, `landing-filter-panel`). Distintos fondos, desenfoques y capas; los lightbox pueden quedar por encima de un `Dialog` sin control. Unificar en `Dialog`/`Sheet` y fijar una escala de `z-index`.

**D5. «Registrar ajuste» en móvil: botones de acción fuera de la vista**
A 364×585 px el diálogo (553 px) cabe, pero su contenido hace scroll interno y «Cancelar»/«Guardar movimiento» quedan en y = 834–878 px, es decir, hay que desplazar para guardar. En escritorio mide 707 px de alto en una ventana de 900 px. Propuesta: pie fijo (`sticky bottom`) en `DialogFooter` y reducir espacio vertical.

**D6. Botón «Cerrar» de `Dialog` con radio 10 px**
Todos los botones del sistema son píldora (`radius-pill`) salvo este botón de cierre (44 px de alto, radio 10 px). Revisar `components/ui/dialog.tsx` para que use la misma forma/tamaño que `Button size="icon"`.

### Baja

**D7. Revisión de agencias/publicaciones pendientes no verificable**
No existe ninguna agencia `PENDING` ni publicación en revisión en los datos, por lo que no se pudieron abrir el modal de rechazo de agencia ni los botones «Rechazar/Aprobar». En el código (`admin-publication-detail.tsx:221-227`) esos botones son `<button>` con `rounded-md`, `min-h-11` y colores `destructive/30`, no `Button`: forma rectangular frente a los píldora del resto del panel. Crear datos de prueba en estado pendiente para revisarlos.

**D8. Menú de acciones con un solo ítem**
En Agencias y Publicaciones el menú «⋯» solo ofrece «Ver detalle» (la fila ya podría ser enlace). Es un menú más para una sola acción.

## Tipografía y jerarquía

### Alta

**T1. Más de 100 ocurrencias de texto menor a 12 px (mínimo del sistema: `type-caption` 12 px)**
Clases arbitrarias en TSX: `text-[11px]` ×45, `text-[10px]` ×28, `text-[9px]` ×18, `text-[8px]` ×3, `text-[10.5px]` ×3. Archivos con más casos: `agency-form.tsx` (32), `PublicationForm.tsx` (13), `app/dashboard/my-agency/page.tsx` (12), `admin-agencies-table.tsx` (10), `my-agency/edit/page.tsx` (7), `PublicationDepartures.tsx` (5), `UsersList.tsx` (5), `app/dashboard/agencies/page.tsx` (5).
En pantalla, medido: encabezados de tabla en Usuarios/Agencias/Publicaciones = **11 px** mayúsculas; en Mi agencia el texto de los pasos y descripciones = **9–11 px**; en Nueva publicación los números de paso = **10 px** y descripciones = **11 px**. Ilegible para texto ampliado y por debajo de WCAG de lectura cómoda. El `Dialog`/`Input` compartidos sí cumplen.

### Media

**T2. Cuatro tamaños de H1 distintos en el panel**
Sistema: `type-page` 28–40 px / 700.

| Pantalla | H1 medido |
|---|---|
| Listas (Usuarios, Agencias, Publicaciones, Promociones, Pagos, Reservas, Gráficas, formularios) | 39,3 px / 700 |
| Detalles (Agencia, Publicación) y Mi agencia | 36 px / 700 |
| Resumen general | 28 px / 700 |
| **Mi perfil** | **24 px / 600** (fuera del rango) |

**T3. H2/H3 de tarjetas sin escala común**
Se midieron 14/500, 14/600, 16/600, 18/600, 20/700 y 24/700 para títulos de tarjeta/sección en pantallas equivalentes (p. ej. tarjetas del resumen 14/500; «Reservas registradas» 20/700; «Descripción» en detalle 16/600). `type-card` define 20 px; `SectionHeading` no se usa de forma consistente.

## Colores y tokens

### Alta

**C1. ~157 colores hexadecimales locales; `design:check` no los detecta**
`AGENTS.md`: «No añadir ... otra paleta de marca» y `sistema-diseno.md`: «No crear nuevas variantes de verdes mediante valores hexadecimales locales». Hallado en TSX: `app/dashboard/my-agency/page.tsx` (54), `agency-form.tsx` (48), `admin-agencies-table.tsx` (23), `my-agency/edit/page.tsx` (21), `admin-publication-detail.tsx` (5), `PublicationDepartures.tsx` (3), más `PublicationForm`, `CreatePublicationPage`, `PreferenceControls`.
Ejemplos: verdes `#075E36`, `#0A6A42`, `#EAF5ED`, `#EAF6EE`; grises `#DDE2DF`, `#F5F6F5`, `#59615D`, `#66706B`, `#7A837F`; rojo `#A63737` (el token es `#9b271f`); ámbar `#886617` (token `--warning` `#644a07`). Las insignias de estado de **agencias** y **publicaciones** están duplicadas con estos hex y difieren entre sí y de `Badge`.
Acción: sustituir por tokens (`text-primary`, `bg-muted`, `border-border`, `text-destructive`) y ampliar `scripts/check-design.mjs` para fallar con `#xxxxxx` y `text-[<12px]` en TSX.

## Controles y formularios

### Alta

**F1. Campos de formulario y buscadores con 36 px / 14 px en lugar de 48 px / 16 px**
Sistema: «Input, Select y PhoneNumberInput: 48 px»; «los campos mantienen 16 px también en móvil».

| Pantalla | Medido |
|---|---|
| Buscador de Usuarios, Agencias, Publicaciones | 36 px alto, 14 px, radio 12 |
| `users/new` y `users/[id]/edit` (nombre, correo, teléfono…) | 36 px / 14 px, **radio 10 px** en dos campos y 12 px en otros |
| Teléfono en `users/*` | 46 px alto, **radio 0**, 16 px |
| Reservas (filtros) | 49–51 px / 16 px (mezcla 49 y 51) |
| Nueva publicación y diálogos de Pagos | 48 px / 16 px (correcto) |

Los `<select>` y `<input>` nativos de `UserForm.tsx` (116, 140) y los ~20 de `agency-form.tsx` no usan `components/ui`. Con 14 px, iOS hace zoom automático al enfocar.

### Media

**F2. Botones de 36 px en listas y filtros**
Escala: default 44, sm 40, xs 32 (solo compactas). Los botones «Filtros» / acciones de tabla miden 36 px; los de «Crear Usuario», «Cancelar», etc. 44 px, y los de Pagos mezclan 40 y 44. Alturas vistas en una misma pantalla: 36, 40, 44, 46, 48, 50, 64.

**F3. Botones y pestañas hechos a mano en vez de `Button`/`Tabs`**
`agency-form.tsx` (≥15 `<button>`), `PublicationForm.tsx`, `PublicationDepartures.tsx`, `MyProfilePage.tsx:361`, `admin-publication-detail.tsx`. Resultado: radios `rounded-md`/`rounded-lg`/`rounded-[5px]`; en Mi perfil las pestañas miden 42 px con radio 10 px, distintas de las de detalle de agencia (48 px).

## Layout y navegación

### Media

**L1. Anchos de contenido y cabeceras distintos entre pantallas**
- Mi perfil usa una columna centrada más estrecha (el contenido empieza visiblemente más a la derecha que en Usuarios o Mi agencia) y su título es el más pequeño.
- Posición vertical del breadcrumb: ~127 px en listas, ~132 px en Mi agencia, ~168 px en Nueva publicación (hay un enlace «Volver a publicaciones» **encima** del breadcrumb: dos mecanismos de «volver» a la vez).
- Descripción bajo el H1 presente en unas pantallas (Mi agencia, Mi perfil, Nueva publicación) y como contador en otras («19 usuarios registrados»).

**L2. Mi agencia (`/dashboard/my-agency`) carece de sentido para el rol Admin**
Con una cuenta Admin muestra «Registra tu agencia en LaRutica / Registrar mi agencia» y el aviso de revisión; la ruta es accesible pero el menú no la enlaza. Redirigir o mostrar un estado apropiado al rol.

### Baja

**L3. Menú lateral**
- Orden: «Reservas» aparece antes que «Inicio» y «Gráficas» (Inicio debería ser primero).
- «Destinos» y «Pendientes» llevan a pantallas «En construcción» (ya en el informe funcional) y «Pendientes» tiene h1 «Pendientes» con contenido de «reseñas» (`/dashboard/reviews`).
- Mezcla de nombres: sección «Administración» incluye «Pagos»; «Contenido» incluye «Promociones».

**L4. Filas y tablas**
Encabezados de tabla en mayúsculas 11 px con letter-spacing; badges de rol/estado verde-claro idénticos para «Agencia» y «Activo» (el estado y el rol comparten color y forma, lo que impide distinguirlos de un vistazo).

**L5. Radios fuera de escala**
`rounded-[5px]` ×5, `rounded-[4px]` ×2, `rounded-[3px]`, `rounded-[2px]`, `rounded-[22px]` ×2 frente a los 12/16/20/999 px del sistema.

## Cosas verificadas que sí cumplen

- Poppins en todas las pantallas; sin segundas familias.
- `Dialog` Radix: radio 20 px, padding 24 px, título 20 px/600, `aria-labelledby` y `aria-describedby` presentes, foco inicial dentro, cierre con Escape, botones 44 px píldora, destructivo `#9b271f` con texto blanco.
- Menús desplegables: radio 12 px, ítems 14 px, «Eliminar»/«Reembolsar» en rojo destructivo.
- Foco visible: controles del encabezado con `outline` sólido; botones y campos con anillo `box-shadow` (patrón mixto pero visible).
- Tarjetas con radio 16 px y campos con 12 px donde se usa `components/ui`.
- Sin desplazamiento horizontal de página en escritorio ni móvil.

## Pendiente de revisar

- Toasts/notificaciones, estados de carga (skeleton) y de error de formulario (validación inválida).
- Modo oscuro (si existe), texto ampliado al 200 % y alto contraste.
- Estados `hover`/`disabled` de cada variante de botón.
- Foco con teclado real (Tab/Shift+Tab, trampa de foco en diálogos).
- Pantallas `my-agency/new` y `my-agency/edit` con datos, y los pasos 2–5 de «Nueva publicación» (bloqueados por el 403 del informe funcional).
- Diálogos nativos (D1): confirmar en el navegador en un entorno de prueba.
- Vistas de los roles Agencia, Transporte y Viajero.

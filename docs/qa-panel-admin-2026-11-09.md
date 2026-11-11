# QA del panel administrativo (`/dashboard`) — 2026-11-09

## Alcance y método

- Entorno: `http://localhost:3000`, Chrome real con la sesión del usuario (cuenta con rol Admin), controlado por JavaScript vía AppleScript.
- Se recorrieron 26 de las 35 rutas de `app/dashboard/**` (con sus variantes) que se pudieron abrir: listas, formularios de alta, detalle y edición (con IDs reales obtenidos por GET).
- Por cada página se midió: scroll horizontal, elementos fuera del viewport, imágenes rotas, controles sin nombre accesible, IDs duplicados, familia tipográfica, textos `undefined/NaN/null`, respuestas HTTP ≥ 400 y títulos vacíos.
- Se probó en escritorio (1869 px y 1440 px) y móvil (382 px). Se probó búsqueda sin resultados y apertura de filtros en Usuarios.
- **No se ejecutó ninguna acción que modifique datos** (no se creó, editó, eliminó, confirmó ni rechazó nada).
- Limitaciones: no se capturó la consola del navegador (los errores de consola previos a la carga no son accesibles con este método) y no se probaron flujos de escritura. Tampoco se comprobaron los roles Agencia y Transporte ni la vista de Viajero.

## Resumen

| Severidad | Cantidad |
|---|---|
| Alta | 3 |
| Media | 4 |
| Baja | 5 |

Sin hallazgos en: scroll horizontal de página, imágenes rotas, IDs duplicados, controles sin nombre accesible, `tabindex` positivo, atributo `alt` ausente, tipografía (solo Poppins) ni idioma (`lang="es"`).

## Hallazgos

### Alta

**A1. Rutas de administración que son pantallas «En construcción»**
Texto visible: «En construcción — Aquí irá el contenido de … Esta sección usa los componentes nativos de shadcn/ui.»

| Ruta | Efecto |
|---|---|
| `/dashboard/destinations` | Enlace «Destinos» del menú lateral lleva a un placeholder |
| `/dashboard/reviews` | Enlace «Pendientes» del menú lateral lleva a un placeholder (el h1 y el breadcrumb dicen «Pendientes», no «Reseñas») |
| `/dashboard/agencies/new` | Muestra h1 «Agencias» genérico en vez de un formulario |
| `/dashboard/agencies/[id]/edit` | Idem; el detalle de agencia no puede editarse |
| `/dashboard/promotions/[id]/pay` | Idem; no hay pantalla de pago de promoción |

Impacto: tres entradas visibles del menú (Destinos, Pendientes) y flujos CRUD de agencias/promociones quedan inoperantes. Hay que ocultar los enlaces o implementar las pantallas.

**A2. Un Admin recibe 403 al editar publicaciones y al abrir «Nueva publicación»**
- `GET /api/publications/me` → `403 {"error":"No tienes permisos para consultar publicaciones."}`.
- `/dashboard/publications/[id]/edit` muestra «No se pudo cargar la publicación — No tienes permisos para administrar publicaciones.» También se observó `403 /api/publications/[id]`.
- `/dashboard/publications/new` carga el formulario pero lanza el mismo 403 de fondo (puede romper el paso «Trayecto/Servicio» al continuar; no se probó).
- Desde la lista de Publicaciones (vista admin) se ofrece acceso a detalle y revisión, pero no se puede editar. Falta decidir si el Admin debe poder editar y, si no, ocultar los botones/rutas; si sí, el endpoint debe aceptar el rol.

**A3. Posible inconsistencia entre estado de la lista y datos reales de reservas**
El resumen (`/dashboard`) y `/dashboard/graficas` indican 4 reservas en el mes; `/dashboard/reservations` muestra «1 reservas» por defecto (vista «Solicitudes y reservas vigentes»). Es coherente con el filtro, pero la interfaz no lo explica en la cabecera. Verificar que las otras 3 aparecen en «Historial» / «Todas las reservas», y considerar mostrar el total junto al filtro activo.

### Media

**M1. La pestaña del navegador tiene el mismo título en todas las páginas**
`document.title` = «LaRutica | Explora Costa Rica» en todas las rutas probadas. Dificulta distinguir pestañas, el historial y la navegación con lector de pantalla (WCAG 2.4.2). Usar `metadata`/`generateMetadata` por módulo («Usuarios · Panel LaRutica», etc.).

**M2. Plurales incorrectos**
- `/dashboard/payments`: «Comisión 0% · **1 pagos**».
- `/dashboard/reservations`: «**1 reservas**».
Usar pluralización (`Intl.PluralRules` o la utilidad i18n del proyecto).

**M3. Variación porcentual engañosa en Gráficas**
`/dashboard/graficas` («Este mes»): Reservas 4 «**-85% vs. mes anterior**» y Viajeros 6 «**-79%**». Se compara un mes parcial (hasta el día 9) con el mes completo anterior. Comparar contra el mismo tramo del mes previo, o indicar «mes en curso».

**M4. Tablas en móvil (382 px) dependen de scroll horizontal interno**
Usuarios, Agencias, Publicaciones, Promociones y Pagos mantienen tablas más anchas que el viewport (`min-w-[640px]` en Publicaciones). La página no desborda (hay contenedor con scroll) pero no hay indicación visual de que se puede desplazar, y las acciones por fila quedan fuera de pantalla. Valorar tarjetas apiladas en móvil o sombra/gradiente de desplazamiento.

### Baja

**B1. Pestañas de detalle (Agencia, Publicación, Perfil) y la barra de pasos de «Nueva publicación» desbordan el ancho en móvil**
`BUTTON.min-h-12 shrink-0` y `BUTTON.relative … shrink-0` salen del viewport; funcionan como carrusel horizontal pero la pestaña activa puede quedar oculta. Asegurar `scrollIntoView` de la activa.

**B2. Gráfica de barras diaria usa `min-w-[30rem]`**
Con 382 px las barras de los días 20–30 solo se ven desplazando; no hay pista visual. Es un patrón correcto, pero conviene añadir indicador o reducir densidad en móvil.

**B3. Datos de prueba visibles en producción-like**
Publicaciones «rqewrq», «ADasx», «Nos vamos a heredia»; reserva con total «USD 0,01»; dos agencias llamadas «Tropical Dreams CR» (posible duplicado). No son errores de código, pero ensucian demos y capturas.

**B4. Ítems del menú lateral con altura 32 px**
Los enlaces del sidebar miden 239×32 px y los encabezados de grupo («General», «Administración», «Contenido») 24 px. Cumple WCAG 2.2 (mínimo 24×24, criterio 2.5.8) pero está por debajo de los 44 px recomendados para táctil.

**B5. Comisión mostrada como «0%» para todas las agencias en Pagos**
«Comisión de LaRutica USD 0,00» y «Por pagar a agencias USD 205,00» (= 100 % del cobrado). Confirmar que es la configuración deseada y no un valor por defecto sin cargar.

## Páginas sin hallazgos relevantes

`/dashboard` (resumen), `/dashboard/users`, `/dashboard/users/new`, `/dashboard/users/[id]`, `/dashboard/users/[id]/edit`, `/dashboard/agencies`, `/dashboard/agencies/[id]`, `/dashboard/publications`, `/dashboard/publications/[id]`, `/dashboard/promotions`, `/dashboard/payments` (salvo M2/B5), `/dashboard/graficas` (salvo M3), `/dashboard/profile`, `/dashboard/my-agency`.

La búsqueda sin resultados en Usuarios muestra el estado vacío correcto («No se encontraron usuarios — Prueba ajustando los filtros de búsqueda — Limpiar filtros»).

## Pendiente de probar

- Consola del navegador (errores/avisos de React, hidratación, `key` duplicadas).
- Acciones de escritura: crear/editar/eliminar usuario, confirmar/rechazar reserva, registrar pago, formularios de «Nueva publicación» completos y subida de imágenes.
- Menús de acciones por fila (el menú Radix no respondió a eventos sintéticos; requiere clic real).
- `/dashboard/my-agency/new` y `/dashboard/my-agency/edit`, `/dashboard/promotions` con acciones, y los roles Agencia y Transporte.
- Foco visible y navegación completa por teclado; texto ampliado al 200 %.
- Modo oscuro, si existe.

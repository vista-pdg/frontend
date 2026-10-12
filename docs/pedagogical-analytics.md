# HU-06 · Analítica pedagógica

`/analytics` admite TEACHER y ADMIN. El servidor decide qué cursos puede consultar cada cuenta
y vuelve a comprobar los permisos al solicitar JSON o CSV. El guard del navegador únicamente
controla la navegación. Administración y la barra lateral enlazan al tablero.

## Componentes y contrato

- `AnalyticsPage`: cursos autorizados, filtros de curso/fechas, periodo aplicado, estados de
  petición y descarga. Usa el cliente HTTP existente con JWT y refresco de sesión.
- `AnalyticsRanking`: vistas de estructuras, algoritmos y reintentos. Preserva el orden del
  servidor, presenta frecuencias/porcentajes/pasos y señala dificultad con texto además de color.
- `pedagogicalAnalyticsService`: GET `/api/analytics/courses`, `/report`, `/report.csv`.
  Solo envía `courseCode`, `from`, `to`; admite `AbortSignal` y no guarda reportes en localStorage.
- `types/analytics.ts` refleja el record backend `PedagogicalReport`. Los valores no publicados
  son `null`; `SUPPRESSED` se distingue de `UNAVAILABLE` para pasos históricos sin medición.

La estructura usa porcentajes 0–100; la tasa de reintento y su umbral usan valores 0–1.
Reintento: al menos tres solicitudes de una estructura en cualquier ventana de 120 segundos
dentro de la sesión. La configuración del umbral proviene del servidor; el valor predeterminado
es 0,30. Los pasos reflejan el máximo avance reportado por ejecución, no su duración ni una nota.

## Fechas, concurrencia y privacidad

El periodo inicial va desde el primer día del mes hasta hoy en `America/Bogota`. Ambas fechas
son inclusivas. Editar un filtro conserva el periodo aplicado identificado junto al reporte y
deshabilita exportación hasta aplicar los cambios. Aplicar limpia el reporte anterior; cancelar
una consulta impide que una respuesta atrasada sustituya las métricas actuales.

El CSV se descarga desde el servidor, con los filtros aplicados. Cambiar filtros o desmontar
la página cancela una descarga pendiente. Si el servidor revoca acceso, se retiran las métricas.

Nunca se solicita ni ofrece un filtro individual. Los segmentos suprimidos muestran exactamente
«Datos insuficientes para garantizar el anonimato», sin sustituir métricas por cero, recalcular
totales ni reconstruir porcentajes. La política backend protege también denominadores y
subgrupos de reintento. El frontend no permite bajar el mínimo de cinco estudiantes.

El backend solo agrega actividad cuyo rol STUDENT se acreditó al capturar. Los eventos
anteriores a este marcador se conservan pero no se publican en rankings; el rol actual de
una cuenta no permite afirmar cuál tenía en el pasado. No se realiza backfill de identidades.

La asignación docente–curso se administra mediante los endpoints existentes de esta HU en
`/api/admin/courses/{code}/teachers`; la configuración inicial se describe en la documentación
backend. Un docente sin asignaciones verá el estado sin cursos, no datos globales.

## Diseño y pruebas

Diseño versionado en `../dev-workflow/pen/vista_design.pen`: `ajLiE` (estructuras), `E0mja`
(algoritmos), `BUEgE` (móvil claro/reintentos), `UoDN4` (estados y navegación). Se conservan
los tokens de ambos temas, Geist, esquinas rectas y componentes existentes. Campos y botones
principales tienen altura mínima de 44 px, etiquetas, foco visible y validación junto al campo.

Vitest cubre renderizado/supresión, fechas civiles, filtros pendientes, respuestas fuera de
orden, fallos, permiso revocado, descarga y guard por rol. `npm run test:coverage` incluye los
cuatro módulos nuevos de analítica además del núcleo que ya se medía.

Cypress tiene un spec por CA (`hu-06-ca*.cy.ts`) con fixtures explícitas de UI. Estas pruebas
no acreditan permisos SQL ni el umbral backend. `hu-06-integracion-real.cy.ts` usa APIs reales,
cinco registros con verificación de correo, generación, algoritmos, reporte y CSV; requiere
backend `dev,e2e`, Postgres, Redis y Mailpit locales aislados. Crea cuentas y asigna el docente
sembrado a CEDI-G1: no ejecutar sobre datos reales.

```bash
npm run test:coverage
npm run build
npm run lint
npm exec -- cypress run --browser chrome --spec 'cypress/e2e/hu-06-*.cy.ts'
npm exec -- cypress run --browser firefox --spec 'cypress/e2e/hu-06-*.cy.ts'
# Desde dev-workflow, con sus dependencias instaladas:
npm exec -- playwright test tests/ui/analytics.spec.mjs --workers=1
```

La evidencia y las restricciones reales de la sesión están en
`../dev-workflow/hus/HU-06-pedagogical-analytics.md`. Pruebas escritas, capturas de diseño o una
vista local con fixtures no sustituyen E2E, inspección visual completa ni validación en CI.

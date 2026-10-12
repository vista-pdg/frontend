# HU-33 · Gestión de cursos desde Administración

En **Administración → Cursos**, un administrador puede crear un grupo en un periodo existente,
asignar o retirar docentes responsables y vincular, mover o desmatricular estudiantes activos.
El selector de curso mantiene el contexto de las listas de docentes y estudiantes. La misma
pestaña conserva el control de cuota del asistente de HU-17.

La lista de personas y periodos viene de la API administrativa. Al crear un grupo, se actualiza
la lista de cursos sin recargar la página. Las bajas de docentes y matrículas requieren
confirmación; un error conserva el diálogo abierto y muestra el problema. Al seleccionar un
estudiante ya matriculado, la interfaz muestra el curso de origen y aclara que los eventos
anteriores conservan su atribución. Los controles informan carga, listas vacías y errores.

Un docente asignado ve el nuevo curso en **Analítica** al abrir el tablero. Allí elige un curso
autorizado y un rango de fechas, aplica los filtros y ve sólo métricas agregadas. Revocar su
asignación retira el curso de la lista y la API impide leer su reporte. El administrador puede
elegir cualquiera de los cursos. El umbral de anonimato de cinco estudiantes permanece en el
servidor y también se aplica a la exportación CSV.

Validación local: `npm run build`, `npm run lint`, `npm run test:coverage` y el spec Cypress
`hu-33-gestion-cursos-y-asignaciones.cy.ts` en Chrome y Firefox. El componente
`CourseManagementSection` tiene pruebas de creación, asignaciones, validación y confirmaciones.
La evidencia de los criterios y la revisión responsive se registran en
`../dev-workflow/hus/HU-33-gestion-cursos-y-asignaciones.md`.

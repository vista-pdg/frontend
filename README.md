# VISTA · frontend

Interfaz de VISTA, el visualizador de estructuras discretas (Proyecto de Grado, Universidad Icesi).
React 19 · Vite 8 · TypeScript · Tailwind v4 · react-three-fiber · Zustand.

## Arranque

```bash
npm install
npm run dev        # http://localhost:5173 — proxea /api al backend en :8080
```

El backend debe estar levantado (`backend/README.md`). Para trabajar sin clave de Gemini arráncalo
con el perfil `e2e`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Vite con recarga en caliente |
| `npm run build` | `tsc -b` + build de producción |
| `npm run lint` | ESLint |
| `npm test` | pruebas unitarias (Vitest) |
| `npm run test:coverage` | unitarias con la puerta de cobertura del núcleo (≥ 80 %) |
| `npx cypress run --browser chrome` | E2E contra el sistema levantado (también `firefox`) |

## Estructura

```
src/
  core/         núcleo de visualización: motor, contrato de renderizado, layouts 2D (ver core/README.md)
  renderers/    adaptadores: three/ (3D) y svg/ (2D), más la composición en appEngine.ts
  components/   shell de la app, overlay del lienzo, paneles de chat y algoritmo, primitivos ui/
  pages/        bienvenida (login/registro), administración, panel del docente
  store/        graphStore (Zustand): refleja el motor y guarda el estado de la interfaz
  services/     llamadas a la API; lib/http.ts es el único cliente axios
  contexts/     AuthContext; lib/session.ts guarda la sesión
  types/        tipos de las respuestas del backend
cypress/e2e/    un spec por criterio de aceptación, nombrado por HU y CA
```

## Modos de visualización

El lienzo tiene dos adaptadores intercambiables, **3D** (three.js) y **2D** (SVG), detrás de un
contrato único. Cambiar de modo conserva la estructura, el paso de la ejecución y el resaltado; la
preferencia se guarda en `localStorage` (`vista_visualization_mode`) y, si el navegador no tiene
WebGL, el lienzo abre en 2D con un aviso. Toda petición al backend lleva la cabecera
`X-Visualization-Mode` con el modo activo, que la telemetría registra. Detalles en
[`src/core/README.md`](src/core/README.md).

El 2D cubre las cuatro familias del syllabus —grafos (fuerzas deterministas), árboles (jerárquico
que conserva el lado de los hijos), pilas (columna con base y tope) y colas (fila con frente y
final)— con la misma paleta que el 3D y etiquetas negras o blancas según el relleno (AA). Cada nodo
y arista lleva texto alterno.

## Algoritmos paso a paso

El panel de algoritmos lista el catálogo que sirve `GET /api/algorithm/catalog`, agrupado por
familia; el mismo en 2D y 3D. Los que construyen su estructura (AVL, pop, dequeue) reciben valores;
BFS recorre el grafo que haya en el lienzo desde el nodo elegido. Los pasos los produce el backend y
los reproduce el motor en cualquiera de los dos adaptadores.

Los algoritmos instrumentados (inorden, BFS, pop, dequeue) traen su pseudocódigo, la línea que
ejecuta cada paso, las variables vigentes y —en los recursivos— la pila de llamadas: el **panel de
código** (`CodePanel`) resalta esa línea a la vez que el lienzo resalta el nodo, muestra las
variables y los marcos, en 2D y en 3D, y «Anterior» devuelve todo al paso previo.

## Diseño

Sistema de diseño Icesi: `DESIGN.md` y los tokens de `src/index.css`. La app fuerza modo oscuro. Las
pantallas se diseñan primero en pen (documento de VISTA) y luego se implementan.

## CI

`.github/workflows/ci.yml`: typecheck → Vitest con cobertura → build → lint (informativo) → E2E
compartido (`vista-pdg/dev-workflow/.github/workflows/e2e.yml`) en Chromium y Firefox contra el
backend de la rama pareja o `main`.

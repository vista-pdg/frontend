# Núcleo de visualización (`src/core`)

Frontera entre **qué** se muestra y **cómo** se dibuja (HU-18). Este paquete es TypeScript puro:
no importa React ni three, y su suite (`__tests__/`) corre en Node **sin ningún adaptador de
renderizado registrado**. Si un cambio aquí necesita React o un adaptador, está en el sitio
equivocado.

```
core/
  model.ts        StructureState, Highlight, ExecutionStep, RenderFrame, EngineState, VisualizationMode
  renderer.ts     contrato Renderer + RendererRegistry
  engine.ts       VisualizationEngine (estado, rastro, paso, modo) y frameOf()
  layout2d.ts     disposiciones 2D: árbol ordenado, circular, lineal; boundsOf, overlappingPairs
  webgl.ts        detectWebGL()
  preferences.ts  loadPreferredMode / savePreferredMode (localStorage: vista_visualization_mode)
```

## El contrato

```ts
interface Renderer {
  readonly id: '2D' | '3D';
  readonly label: string;
  render(structure: StructureState): void;      // pinta una estructura completa
  animateStep(step: ExecutionStep): void;       // pasa al cuadro de un paso del rastro
  highlight(ids: string[], type: HighlightType | null): void;
  clear(): void;
  snapshot(): RendererSnapshot;                 // lo que hay dibujado: ids, aristas, etiquetas
}
```

Un adaptador **sólo dibuja**. No decide qué paso sigue, no calcula el algoritmo, no lee el store.
`snapshot()` existe para que se pueda afirmar desde fuera que dos adaptadores muestran lo mismo y
que cambiar de modo no deja huérfanos.

## El motor

`VisualizationEngine` es el único dueño del estado visualizable. Cada mutación produce un
`RenderFrame` y, si hay adaptador para el modo activo, se lo reenvía por el contrato:

| Llamada | Estado | Adaptador activo |
|---|---|---|
| `loadStructure(nodes, edges, meta)` | estructura nueva, sin rastro | `render` + `highlight` |
| `loadTrace(steps)` | rastro cargado, cuadro 0 | `render` + `highlight` |
| `goTo(i)` / `next()` / `prev()` | cuadro `i` | `animateStep` + `highlight` |
| `highlight(ids, type)` | resaltado | `highlight` |
| `clear()` | vacío | `clear` |
| `setMode(mode)` | sólo cambia `mode` | saliente `clear`, entrante `render` + `highlight` |

Sin adaptador el estado evoluciona exactamente igual: `engine.test.ts` compara el rastro de estados
emitido con y sin adaptador y exige que sea idéntico (CA-4 de la HU-18). `frames()` devuelve los
cuadros que produciría el rastro cargado sin tocar el estado.

`setMode('3D')` devuelve `false` y no cambia nada si el motor se creó con `webglAvailable: false`.

## Dónde se conectan los adaptadores

En `src/renderers/appEngine.ts`, y sólo ahí: registra `ThreeRenderer` y `SvgRenderer`, detecta
WebGL una vez, arranca en la preferencia guardada y persiste la que el estudiante elija
(`chooseMode`). También fija la fuente de la cabecera `X-Visualization-Mode` de `lib/http.ts` y
expone `window.__vista` para diagnóstico y para las pruebas E2E.

El store (`graphStore`) **refleja** el estado del motor por suscripción y delega en él; los
componentes siguen leyendo `nodes`, `steps`, `currentStepIndex`, `mode`… con `useGraphStore`.

## Añadir un adaptador

1. Extiende `ModelBackedRenderer` (`src/renderers/sceneModel.ts`) o implementa `Renderer` a mano.
2. Escribe su vista React leyendo **su** modelo con `useModel(renderer.model)`.
3. Regístralo en `appEngine.ts` y móntalo en `components/VisualizationCanvas.tsx` según `mode`.
4. Si dibuja de verdad en algo inspeccionable (DOM, escena), sobrescribe `snapshot()` para leer de
   ahí.

## Pruebas

```bash
npm test               # Vitest
npm run test:coverage  # con umbral: 80 % líneas/sentencias/funciones, 75 % ramas sobre src/core
```

La cobertura sólo se mide sobre `src/core`; los adaptadores se validan de extremo a extremo con
Cypress (`cypress/e2e/hu-18-*.cy.ts`).

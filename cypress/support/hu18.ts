/// <reference types="cypress" />

/**
 * Utilidades de la HU-18. El motor y los adaptadores quedan expuestos en `window.__vista` para que
 * los specs puedan afirmar sobre lo *dibujado* (snapshot del adaptador) y no sólo sobre el DOM.
 */
export interface RendererSnapshot {
  nodeIds: string[];
  edgeIds: string[];
  highlightedIds: string[];
  labels: Record<string, string>;
}

interface VistaWindow extends Window {
  __vista?: {
    engine: {
      getState(): { mode: '2D' | '3D'; stepIndex: number; trace: unknown[]; structure: { nodes: unknown[] } };
    };
    registry: { get(id: '2D' | '3D'): { snapshot(): RendererSnapshot } | undefined };
    webglAvailable: boolean;
  };
}

export function snapshotOf(win: Window, mode: '2D' | '3D'): RendererSnapshot {
  const v = (win as VistaWindow).__vista;
  expect(v, 'window.__vista expuesto').to.exist;
  const r = v!.registry.get(mode);
  expect(r, `adaptador ${mode} registrado`).to.exist;
  return r!.snapshot();
}

export function engineState(win: Window) {
  return (win as VistaWindow).__vista!.engine.getState();
}

/** Abre la demo AVL desde la barra lateral y genera el rastro con los valores dados. */
export function loadAvlDemo(values: string) {
  cy.get('[data-cy=demo-tree-avl]').click();
  cy.get('[data-cy=algo-values]').should('be.visible').clear().type(values);
  cy.intercept('POST', '/api/algorithm/steps').as('steps');
  cy.get('[data-cy=algo-generate]').click();
  cy.wait('@steps').its('response.statusCode').should('eq', 200);
  cy.get('[data-cy=step-counter]').should('be.visible');
}

/** Anula WebGL en la página que se va a cargar (CA-6). */
export function withoutWebGL(win: Window) {
  const proto = (win as unknown as { HTMLCanvasElement: typeof HTMLCanvasElement }).HTMLCanvasElement.prototype;
  const original = proto.getContext;
  proto.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
    if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
    return (original as (...a: unknown[]) => unknown).call(this, kind, ...rest);
  } as typeof proto.getContext;
}

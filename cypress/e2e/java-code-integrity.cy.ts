import { SEEDED } from '../support/commands';
import { openSidebar } from '../support/navigation';
import { verifyJavaCode } from '../support/javaCode';
import { goToLastStep, runDemo } from '../support/hu19';
import { dragPanel } from '../support/codePanel';
import type { Edge3D, Node3D, StepsResponse } from '../../src/types/graph';

const node = (id: string, label: string, parent: string | null, properties: Record<string, unknown>): Node3D =>
  ({ id, label, parent, properties, x: 0, y: 0, z: 0, depth: parent ? 1 : 0 });
const buckets = Array.from({ length: 7 }, (_, i) => node(`b${i}`, `[${i}]`, null, { bucket: true }));
const hashNodes = [...buckets, node('key10', '10', 'b3', { hashBucket: 3 }), node('key17', '17', 'key10', { hashBucket: 3 })];
const hashEdges: Edge3D[] = [
  { id: 'b3-key10', from: 'b3', to: 'key10', directed: true, weight: null },
  { id: 'key10-key17', from: 'key10', to: 'key17', directed: true, weight: null },
];

// Dedicated local screenshots are evidence; these do not rewrite any visual baselines.
describe('Java íntegro · API real, descarga y legibilidad', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.visit('/', { onBeforeLoad: w => w.localStorage.setItem('vista_visualization_mode', '2D') });
  });

  for (const width of [1440, 768, 390]) it(`hash: Java visible, copiable y descargable a ${width}px`, () => {
    cy.viewport(width, 900);
    openSidebar(); cy.get('[data-cy=nav-hash-table]').click();
    cy.window().then(w => w.__vista!.engine.loadStructure(hashNodes, hashEdges,
      { type: 'hash-table', subtype: 'chaining', nodeCount: hashNodes.length, edgeCount: hashEdges.length, computedProperties: {} }));
    cy.get('[data-cy=algorithm-toggle]').click();
    cy.get('[data-cy=algo-item-hash-table-chaining-search]').click();
    cy.get('[data-cy=algo-argument]').clear().type('17');
    cy.intercept('POST', '/api/algorithm/steps').as('javaHash');
    cy.get('[data-cy=algo-generate]').click();
    cy.wait('@javaHash').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      cy.get('[data-cy=algorithm-panel] button[aria-label="Cerrar panel"]').click();
      // Mobile initially collapses the floating panel by design.
      cy.get('[data-cy=code-toggle]').then(button => {
        if (button.attr('aria-expanded') === 'false') cy.wrap(button).click();
      });
      verifyJavaCode(response!.body as StepsResponse);
    });
    cy.window().then(w => cy.wrap(cy.stub(w.navigator.clipboard, 'writeText').resolves()).as('copyJava'));
    cy.get('[data-cy=code-copy]').click();
    cy.get('@copyJava').should('have.been.calledWithMatch', 'public class VistaHashSearch');
    cy.get('[data-cy=code-download]').click();
    cy.readFile('cypress/downloads/VistaHashSearch.java').should('contain', 'Math.abs(valor % tabla.size())');
    cy.get('[data-cy=step-next]').click();
    cy.get('[data-cy=code-lines] [data-active=true]').should('contain', 'cadena.get(i) == valor');
    cy.window().should(w => expect(w.document.documentElement.scrollWidth).to.be.at.most(w.innerWidth));
    if (width === 1440) {
      dragPanel('code-move', 0, -120);
      dragPanel('code-resize', 300, 120);
    }
    cy.screenshot(`java-hash-${width}`, { capture: 'viewport', scale: true });
  });

  it('la demo de desencolar conserva Java y completa el orden FIFO', () => {
    runDemo('demo-queue-simple', '3, 7, 9');
    cy.get<{ response: { body: StepsResponse } }>('@steps').then(({ response: { body } }) => {
      expect(body.representations?.[0].fileName).to.eq('VistaQueueDequeue.java');
      expect(body.steps!.at(-1)!.nodes).to.have.length(0);
      cy.get('[data-cy=algorithm-panel] button[aria-label="Cerrar panel"]').click();
      verifyJavaCode(body);
    });
    goToLastStep();
    cy.get('[data-cy=code-panel]').should('have.attr', 'data-language', 'java');
    cy.get('[data-cy=var-atendidos-value]').should('have.text', '[3, 7, 9]');
  });

  it('un heap válido de cuatro nodos se puede construir y extraer sobre su lienzo', () => {
    openSidebar(); cy.get('[data-cy=nav-heap]').click();
    cy.get('[data-cy=algorithm-toggle]').click();
    cy.get('[data-cy=algo-item-tree-heap-heapify]').click();
    cy.get('[data-cy=algo-source-values]').check();
    cy.get('[data-cy=algo-values]').clear().type('3, 9, 9, -1');
    cy.intercept('POST', '/api/algorithm/steps').as('heap');
    cy.get('[data-cy=algo-generate]').click(); cy.wait('@heap').its('response.body.error').should('eq', false);
    cy.get('[data-cy=algorithm-panel] button[aria-label="Cerrar panel"]').click();
    goToLastStep();
    cy.get('[data-cy=algorithm-toggle]').click();
    cy.get('[data-cy=algo-item-tree-heap-extract]').click();
    cy.get('[data-cy=algo-generate]').click();
    cy.wait('@heap').then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      const body = response!.body as StepsResponse;
      expect(body.steps!.at(-1)!.nodes).to.have.length(3);
      expect(body.steps!.at(-1)!.variables?.extraído).to.eq('9');
      cy.get('[data-cy=algorithm-panel] button[aria-label="Cerrar panel"]').click();
      verifyJavaCode(body);
    });
    goToLastStep();
    cy.screenshot('java-heap-extract', { capture: 'viewport', scale: true });
  });
});

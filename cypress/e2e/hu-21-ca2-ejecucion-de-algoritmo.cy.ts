/// <reference types="cypress" />
import { openSidebar } from '../support/navigation';
import { generateByChat, goToLastStep } from '../support/hu19';

// La propiedad/deduplicación de la ejecución se verifica también en PedagogicalAnalyticsTest.
describe('HU-21 · CA-2 / HU-06 · Pasos correlacionados por ejecución', () => {
  beforeEach(() => {
    cy.clearLocalStorage(); cy.registerStudentByApi('analitica.ca2'); cy.visit('/');
    cy.get('[data-cy=canvas-3d]').should('exist'); generateByChat('grafo ciclo de 6 nodos', 6);
    openSidebar(); cy.get('[data-cy=demo-graph-simple]').click();
    cy.get('[data-cy=algo-start]').should('exist').select('V1');
  });
  it('reporta progreso con la correlación del servidor y no duplica un replay', () => {
    const sent: Array<{ executionId: string; stepCount: number; event: string }> = [];
    cy.intercept('POST', '/api/assistant/events', (req) => { sent.push(req.body); req.continue(); });
    cy.intercept('POST', '/api/algorithm/steps').as('steps');
    cy.get('[data-cy=algo-generate]').should('not.be.disabled').click();
    cy.wait('@steps').then(({ response }) => {
      expect(response?.body.error).to.eq(false);
      const executionId = response?.headers['x-analytics-execution'];
      const total = response?.body.steps.length as number;
      expect(executionId).to.be.a('string').and.not.be.empty;
      cy.wrap(null).should(() => expect(sent.some(e => e.executionId === executionId && e.stepCount === 1)).to.eq(true));
      goToLastStep();
      cy.wrap(null).should(() => {
        expect(sent.some(e => e.executionId === executionId && e.stepCount === total)).to.eq(true);
        for (const event of sent) expect(Object.keys(event).sort()).to.deep.eq(['event', 'executionId', 'stepCount']);
      });
      cy.then(() => {
        const count = sent.length;
        cy.get('[data-cy=step-prev]').click(); cy.get('[data-cy=step-next]').click();
        cy.then(() => expect(sent.length).to.eq(count));
      });
    });
  });
});

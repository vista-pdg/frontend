import { generateByChat, goToLastStep } from '../support/hu19';
import { openSidebar } from '../support/navigation';
import { engineState } from '../support/hu18';

describe('CA-2 · Elegir lienzo o valores', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then(win => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.loginByApi('estudiante@u.icesi.edu.co', 'estudiante123');
    cy.visit('/');
    openSidebar(); cy.get('[data-cy=nav-stack]').click();
    generateByChat('pila con valores 3, 42, 8', 3);
  });

  it('abrir pop conserva la pila del chat y ejecuta sobre sus nodos', () => {
    cy.window().then(win => {
      const original = engineState(win).structure;
      openSidebar(); cy.get('[data-cy=demo-stack-simple]').click();
      cy.get('[data-cy=algo-source-canvas]').should('be.checked');
      cy.get('[data-cy=algo-values]').should('not.exist');
      cy.window().then(after => expect(engineState(after).structure).to.deep.equal(original));
      cy.intercept('POST', '/api/algorithm/steps').as('run');
      cy.get('[data-cy=algo-generate]').click();
      cy.wait('@run').then(({ request, response }) => {
        expect(request.body.nodes).to.deep.equal(original.nodes);
        expect(request.body).not.to.have.property('values');
        expect(response?.body.steps[0].nodes.map((n: {id: string}) => n.id)).to.deep.equal(original.nodes.map(n => (n as {id: string}).id));
        expect(response?.body.steps.at(-1).nodes).to.have.length(0);
      });
    });
  });

  it('crear con valores reemplaza solo al ejecutar y permite volver al lienzo', () => {
    cy.get('[data-cy=algorithm-toggle]').click();
    cy.get('[data-cy=algo-item-stack-simple-pop]').click();
    cy.get('[data-cy=algo-source-values]').check();
    cy.get('[data-cy=algo-values]').clear().type('91, 92');
    cy.get('[data-cy=algo-source-canvas]').check();
    cy.get('[data-cy=algo-source-values]').check();
    cy.get('[data-cy=algo-values]').should('have.value', '91, 92');
    cy.window().then(win => expect(engineState(win).structure.nodes).to.have.length(3));
    cy.intercept('POST', '/api/algorithm/steps').as('run');
    cy.get('[data-cy=algo-generate]').click();
    cy.wait('@run').then(({ request, response }) => {
      expect(request.body.values).to.deep.equal([91,92]);
      expect(request.body).not.to.have.property('nodes');
      expect(response?.body.steps[0].nodes.map((n: {label: string}) => n.label)).to.deep.equal(['91','92']);
    });
    goToLastStep();
  });

  it('un lienzo incompatible no se puede usar ni se borra al seleccionar el algoritmo', () => {
    openSidebar(); cy.get('[data-cy=nav-tree-avl]').click();
    cy.get('[data-cy=algorithm-toggle]').click();
    cy.get('[data-cy=algo-item-tree-avl-insert]').click();
    cy.get('[data-cy=algo-source-canvas]').should('be.disabled');
    cy.get('[data-cy=algo-source-values]').should('be.checked');
    cy.window().then(win => expect(engineState(win).structure.nodes).to.have.length(3));
  });
});

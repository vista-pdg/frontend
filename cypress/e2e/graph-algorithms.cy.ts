/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import type { StepsResponse } from '../../src/types/graph';
import { goToLastStep } from '../support/hu19';

const nodes = ['a', 'b', 'c', 'd'].map((id, i) => ({id, label: id.toUpperCase(), x: i * 2, y: i % 2, z: 0, depth: 0, parent: null, properties: {}}));
const edges = [
  {id:'ab',from:'a',to:'b',weight:4,directed:false},
  {id:'ac',from:'a',to:'c',weight:1,directed:false},
  {id:'cb',from:'c',to:'b',weight:2,directed:false},
  {id:'bd',from:'b',to:'d',weight:1,directed:false},
];

// Real backend and seeded account in an isolated e2e database. Only the canvas input is fixed.
describe('Graph algorithms through the real API and player', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.visit('/');
    cy.get('[data-cy=nav-graph]').click();
    cy.window().then(win => win.__vista!.engine.loadStructure(nodes, edges, null));
    cy.get('[data-cy=algorithm-toggle]').click();
  });
  for (const op of ['bfs','dfs','dijkstra','floyd','prim','kruskal']) {
    it(`${op}: runs, exposes its result and preserves the step across 2D/3D`, () => {
      cy.get(`[data-cy=algo-item-graph-simple-${op}]`).click();
      if (op==='floyd'||op==='kruskal') cy.get('[data-cy=algo-start]').should('not.exist');
      else cy.get('[data-cy=algo-start]').select('a');
      cy.intercept('POST','/api/algorithm/steps').as('steps');
      cy.get('[data-cy=algo-generate]').click();
      cy.wait('@steps').then(({request,response})=>{
        expect(response?.statusCode).to.eq(200);
        const body=response!.body as StepsResponse;
        expect(body.error).to.eq(false);
        expect(body.steps!.length).to.be.greaterThan(1);
        expect(request.body.nodes).to.have.length(4);
        if(op==='floyd'||op==='kruskal') expect(request.body).not.to.have.property('start');
        const result=body.steps!.at(-1)!;
        if(op==='dijkstra') expect(result.variables?.distancias).to.eq('A: 0, B: 3, C: 1, D: 4');
        if(op==='prim'||op==='kruskal') expect(result.variables?.costo).to.eq('4');
        if(op==='floyd') expect(result.variables?.['D[a] · A']).to.eq('[0, 3, 1, 4]');
      });
      cy.get('[data-cy=step-counter]').should('be.visible');
      cy.get('[data-cy=algorithm-panel]').find('button[aria-label="Cerrar panel"]').click();
      goToLastStep();
      cy.window().then(win=>{
        const before=win.__vista!.engine.getState();
        const expected=JSON.stringify(before.trace);
        const index=before.stepIndex;
        cy.get('[data-cy=mode-2d]').click();
        cy.get('[data-cy=canvas-2d]').should('exist');
        cy.get('[data-cy=mode-3d]').click();
        cy.get('[data-cy=canvas-3d]').should('exist');
        cy.window().should(w=>{
          expect(JSON.stringify(w.__vista!.engine.getState().trace)).to.eq(expected);
          expect(w.__vista!.engine.getState().stepIndex).to.eq(index);
        });
      });
    });
  }
});

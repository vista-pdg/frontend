/// <reference types="cypress" />

/** Utilidades de la HU-19: geometría del lienzo 2D leída del DOM del SVG. */
export interface NodeBox {
  id: string;
  label: string;
  x: number;
  y: number;
  role?: string;
  highlighted: boolean;
}

const TRANSLATE = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\)/;

export function nodeBoxes(svg: JQuery<HTMLElement>): NodeBox[] {
  return svg
    .find('[data-node-id]')
    .toArray()
    .map((el) => {
      const m = TRANSLATE.exec(el.getAttribute('style') ?? '');
      return {
        id: el.getAttribute('data-node-id')!,
        label: el.getAttribute('data-label') ?? '',
        x: m ? Number(m[1]) : NaN,
        y: m ? Number(m[2]) : NaN,
        role: el.getAttribute('data-role') ?? undefined,
        highlighted: el.getAttribute('data-highlighted') === 'true',
      };
    });
}

/** Ningún par de nodos a menos de un diámetro (radio 22 en unidades del viewBox). */
export function expectNoOverlaps(boxes: NodeBox[], radius = 22) {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const d = Math.hypot(boxes[i].x - boxes[j].x, boxes[i].y - boxes[j].y);
      expect(d, `${boxes[i].label} vs ${boxes[j].label}`).to.be.at.least(2 * radius);
    }
  }
}

export function generateByChat(prompt: string, expectedNodes?: number) {
  cy.intercept('POST', '/api/generate').as('generate');
  cy.get('[data-cy=chat-toggle]').click();
  cy.get('[data-cy=chat-input]').clear().type(prompt);
  cy.get('[data-cy=chat-send]').click();
  cy.wait('@generate').then(({ response }) => {
    expect(response?.statusCode).to.eq(200);
    if (expectedNodes !== undefined) expect(response?.body.nodes).to.have.length(expectedNodes);
  });
  cy.get('[data-cy=chat-toggle]').click();
}

/** Abre la demo de una familia desde la barra lateral y la ejecuta con los valores dados. */
export function runDemo(demoCy: string, values?: string) {
  cy.get(`[data-cy=${demoCy}]`).click();
  cy.get('[data-cy=algo-form]').should('be.visible');
  if (values !== undefined) cy.get('[data-cy=algo-values]').clear().type(values);
  cy.intercept('POST', '/api/algorithm/steps').as('steps');
  cy.get('[data-cy=algo-generate]').should('not.be.disabled').click();
  cy.wait('@steps').its('response.body.error').should('eq', false);
  cy.get('[data-cy=step-counter]').should('be.visible');
}

export function goToLastStep() {
  cy.get('[data-cy=step-counter]')
    .invoke('text')
    .then((t) => {
      const [cur, total] = t.split('/').map((x) => Number(x.trim()));
      for (let i = cur; i < total; i++) cy.get('[data-cy=step-next]').click();
    });
}

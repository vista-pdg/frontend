/// <reference types="cypress" />
import { adminHeaders } from './hu34';

/**
 * Ayudas de la HU-36. El perfil e2e lee los enlaces de `material.vista.invalid` sin red (libro de
 * tres páginas, notas y cuaderno) y rechaza las direcciones privadas igual que la guardia real.
 */
export const MATERIAL = 'https://material.vista.invalid';

export function fillDraftBank(quizId: number): Cypress.Chainable {
  return adminHeaders().then(headers => {
    const step = (guard: number): Cypress.Chainable =>
      cy.request({ method: 'POST', url: `/api/quizzes/manage/${quizId}/bank/generate`, headers })
        .then(({ body }) => (body.complete || guard > 40 ? cy.wrap(null) : step(guard + 1)));
    return step(0);
  });
}

/** El estudiante en sesión presenta el quiz por la API: acierta las `right` primeras preguntas. */
export function presentByApi(quizId: number, right: number): Cypress.Chainable {
  return cy.storedSession().then(({ accessToken }) => {
    const headers = { Authorization: `Bearer ${accessToken}` };
    return adminHeaders().then(admin =>
      cy.request({ url: `/api/quizzes/manage/${quizId}`, headers: admin }).then(({ body: detail }) =>
        cy.request({ method: 'POST', url: `/api/quizzes/${quizId}/attempt`, headers }).then(({ body: attempt }) => {
          (attempt.questions as { position: number; statement: string; scenario: string; options: string[] }[]).forEach((question, index) => {
            const source = detail.questions.find((q: { statement: string; scenario: string }) => q.statement === question.statement && q.scenario === question.scenario);
            const correct = source.options[source.correctIndex];
            const option = question.options.findIndex(o => (o === correct) === (index < right));
            cy.request({ method: 'PUT', url: `/api/quizzes/${quizId}/attempt/answers/${question.position}`, headers, body: { selectedOption: option, elapsedMs: 20_000 } });
          });
          return cy.request({ method: 'POST', url: `/api/quizzes/${quizId}/attempt/submit`, headers });
        })));
  });
}

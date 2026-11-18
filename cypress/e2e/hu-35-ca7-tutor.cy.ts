/// <reference types="cypress" />
import { AVL, by } from '../support/hu34';
import { createStudyQuizByApi, remainingQuota } from '../support/hu35';

// HU-35 · CA-7: tutor IA sobre la pregunta en curso, con la cuota del asistente.
describe('HU-35 · Tutor IA del quiz de estudio', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('q35tutor');
  });

  it('responde sobre la pregunta y descuenta la cuota diaria', () => {
    createStudyQuizByApi([AVL], 1).then(id => remainingQuota().then(before => {
      cy.visit(`/quizzes/estudio/${id}`);
      by('study-tutor-quota').should('contain', `quedan ${before}`);
      cy.intercept('POST', `/api/study-quizzes/${id}/questions/1/tutor`).as('tutor');
      by('study-tutor-input').type('¿Qué paso del algoritmo debo mirar?{enter}');
      cy.wait('@tutor').then(({ request }) => {
        expect(request.body.message).to.eq('¿Qué paso del algoritmo debo mirar?');
        expect(request.body.history).to.deep.eq([]);
      });
      by('study-tutor-student').should('contain', '¿Qué paso del algoritmo debo mirar?');
      by('study-tutor-tutor').should('contain', 'Tutor de prueba sobre').and('contain', 'AVL');
      by('study-tutor-quota').should('contain', `quedan ${before - 1}`);
      by('study-tutor-input').should('have.value', '');

      // El segundo mensaje lleva la conversación como contexto.
      by('study-tutor-input').type('¿Y después?');
      by('study-tutor-send').click();
      cy.wait('@tutor').its('request.body.history').should('have.length', 2);
    }));
  });

  it('si el tutor falla, lo escrito vuelve al campo; sin cuota, el campo se bloquea', () => {
    createStudyQuizByApi([AVL], 1).then(id => {
      cy.visit(`/quizzes/estudio/${id}`);
      cy.intercept('POST', `/api/study-quizzes/${id}/questions/1/tutor`, { statusCode: 503, body: { code: 'TUTOR_UNAVAILABLE', message: 'El tutor no respondió. Intenta de nuevo.' } }).as('down');
      by('study-tutor-input').type('¿Por qué rota?{enter}');
      cy.wait('@down');
      by('study-tutor-error').should('contain', 'Tu mensaje sigue en el campo');
      by('study-tutor-input').should('have.value', '¿Por qué rota?');
      cy.get('[data-cy=study-tutor-student]').should('not.exist');

      cy.intercept('POST', `/api/study-quizzes/${id}/questions/1/tutor`, { statusCode: 429, body: { code: 'DAILY_QUOTA_EXCEEDED', message: 'Cuota agotada' } }).as('quota');
      by('study-tutor-send').click();
      cy.wait('@quota');
      by('study-tutor-error').should('contain', 'límite diario');
      by('study-tutor-input').should('be.disabled');
      by('study-tutor-quota').should('contain', 'quedan 0');
      // La pista y la solución siguen disponibles.
      by('study-hint-button').should('be.enabled');
    });
  });
});

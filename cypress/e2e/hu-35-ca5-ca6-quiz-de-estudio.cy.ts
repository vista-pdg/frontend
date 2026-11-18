/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { AVL, BFS, by } from '../support/hu34';
import { createStudyQuizByApi } from '../support/hu35';

// HU-35 · CA-5 y CA-6: quizzes de estudio con el generador de los de curso, solo para su autor.
describe('HU-35 · Quizzes de estudio', () => {
  it('el estudiante lo crea, lo resuelve con pista y solución, y lo elimina', () => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('q35study');
    cy.visit('/quizzes');
    by('study-empty').should('contain', 'Aún no tienes quizzes de estudio');
    by('study-new').click();

    // Mismo catálogo que el docente, sin los temas que VISTA no reproduce.
    by(`quiz-topic-${AVL}`).check();
    by(`quiz-topic-${BFS}`).check();
    cy.get('[data-cy="quiz-topic-tree/btree/search"]').should('not.exist');
    by('study-count').clear().type('3');
    by('study-cost').should('contain', '3 preguntas en 2 lotes').and('contain', 'te quedan');
    by('study-submit').click();
    by('bank-progress').should('have.attr', 'data-status', 'complete');
    by('bank-complete').should('contain', 'Tu quiz de estudio está listo: 3 preguntas');
    by('study-title').should('be.disabled');
    by('bank-review').should('contain', 'Empezar').click();

    // Pregunta 1: pista y respuesta.
    by('study-question').should('have.attr', 'data-resolved', 'false');
    cy.get('[data-cy=study-hint]').should('not.exist');
    by('study-hint-button').click();
    by('study-hint').should('contain', 'Observa en VISTA');
    by('study-hint-button').should('be.disabled').and('contain', 'Pista vista');
    by('study-check').should('be.disabled');
    by('study-option-0').find('input').check();
    by('study-check').click();
    by('study-result').should('have.attr', 'data-outcome').and('match', /correct|wrong/);
    by('study-explanation').should('not.be.empty');
    by('study-options').find('input').should('not.exist');
    by('study-options').find('[data-mark=chosen-correct], [data-mark=correct]').should('have.length.at.least', 1);

    // Pregunta 2: ver la solución sin responder.
    by('study-next').click();
    by('study-solution').click();
    by('study-result').should('have.attr', 'data-outcome', 'solution');
    by('study-options').find('[data-mark=correct]').should('have.length', 1);

    // El escenario también llega al chat en modo estudio.
    by('scenario-insert-chat').click();
    by('chat-input').invoke('val').should('match', /^Construye desde cero/);

    // Pregunta 3 y resumen.
    by('study-next').click();
    by('study-option-1').find('input').check();
    by('study-check').click();
    by('study-done').should('contain', 'de 3 aciertos').and('contain', '1 pista').and('contain', '1 solución vista');
    by('study-summary-line').should('contain', 'Respondidas 2 de 3');

    // Persistente: recargar conserva lo hecho.
    cy.reload();
    by('study-done').should('be.visible');
    by('study-exit').click();
    cy.get('[data-cy^=study-row-]').should('have.length', 1).first().should('have.attr', 'data-state', 'COMPLETE')
      .and('contain', '2 de 3 respondidas');

    cy.get('[data-cy^=study-delete-]').click();
    by('confirmation-submit').click();
    by('study-empty').should('be.visible');
  });

  it('solo su autor lo ve; docentes y administradores no tienen quizzes de estudio', () => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('q35owner');
    createStudyQuizByApi([AVL], 1, 'Quiz privado').then(id => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q35other');
      cy.visit(`/quizzes/estudio/${id}`);
      by('study-page-error').should('contain', 'no existe o no es tuyo');
      cy.visit('/quizzes');
      by('study-empty').should('be.visible');

      for (const staff of [SEEDED.teacher, SEEDED.admin]) {
        cy.clearLocalStorage();
        cy.loginByApi(staff.email, staff.password);
        cy.visit('/quizzes/estudio/nuevo');
        cy.location('pathname').should('not.contain', '/estudio');
        cy.storedSession().then(session => cy.request({ url: `/api/study-quizzes/${id}`, headers: { Authorization: `Bearer ${session.accessToken}` }, failOnStatusCode: false })
          .its('status').should('eq', 403));
      }
    });
  });

  it('un quiz a medias se completa desde su página', () => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('q35partial');
    cy.storedSession().then(session => {
      const headers = { Authorization: `Bearer ${session.accessToken}` };
      cy.request({ method: 'POST', url: '/api/study-quizzes', headers, body: { title: 'A medias', topics: [AVL, BFS], questionCount: 5 } }).then(({ body }) => {
        cy.request({ method: 'POST', url: `/api/study-quizzes/${body.id}/generate`, headers });
        cy.visit('/quizzes');
        by(`study-row-${body.id}`).should('have.attr', 'data-state', 'INCOMPLETE');
        by(`study-open-${body.id}`).should('contain', 'Completar').click();
        by('study-incomplete').should('contain', 'de 5 preguntas');
        by('study-complete').click();
        by('bank-progress').should('have.attr', 'data-status', 'complete');
        by('study-nav-5').should('exist');
      });
    });
  });
});

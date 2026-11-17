/// <reference types="cypress" />
import { answerCurrent, bankOf, beginQuiz, by, createPublishedQuiz, newCourse } from '../support/hu34';

// HU-34 · CA-5: la ventana decide cuándo se puede iniciar y el plazo cierra el intento solo.
describe('HU-34 · Ventana y tiempo límite', () => {
  it('no deja iniciar antes de la apertura', () => {
    newCourse().then(course => createPublishedQuiz(course, { title: 'Quiz futuro', opensInSeconds: 3600, closesInSeconds: 7200 }).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34up', course);
      cy.visit('/quizzes');
      by(`quiz-row-${quizId}`).should('have.attr', 'data-state', 'UPCOMING');
      by(`quiz-upcoming-${quizId}`).should('be.disabled');
      cy.visit('/');
      by('application-area').should('be.visible');
      cy.get('[data-cy=quiz-notice]').should('not.exist');
      cy.visit(`/quizzes/${quizId}/presentar`);
      by('quiz-exam-unavailable-message').should('contain', 'Este quiz abre el');
      cy.storedSession().then(session => {
        cy.request({ method: 'POST', url: `/api/quizzes/${quizId}/attempt`, failOnStatusCode: false,
          headers: { Authorization: `Bearer ${session.accessToken}` } })
          .then(({ status, body }) => { expect(status).to.eq(409); expect(body.code).to.eq('QUIZ_NOT_OPEN'); });
      });
    }));
  });

  it('al vencer el plazo cierra el intento y califica lo respondido', () => {
    // El plazo es min(inicio + límite, cierre): un cierre a 25 s acota el intento sin esperar minutos.
    newCourse().then(course => createPublishedQuiz(course, { title: 'Quiz que vence', closesInSeconds: 25 }).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34exp', course);
      beginQuiz(quizId);
      by('quiz-timer').invoke('text').should('match', /^00:[0-2]\d$/);
      by('quiz-timer').should('have.attr', 'data-critical', 'true');
      bankOf(quizId).then(bank => answerCurrent(bank, true));

      cy.get('[data-cy=quiz-result-title]', { timeout: 40000 }).should('contain', 'Se acabó el tiempo');
      by('quiz-result-grade').should('contain', '2,5').and('contain', '1 de 2 respuestas correctas');
      cy.storedSession().then(session => {
        const headers = { Authorization: `Bearer ${session.accessToken}` };
        cy.request({ url: `/api/quizzes/${quizId}/attempt`, headers }).its('body.status').should('eq', 'EXPIRED');
        cy.request({ method: 'PUT', url: `/api/quizzes/${quizId}/attempt/answers/2`, headers, body: { selectedOption: 0 }, failOnStatusCode: false })
          .then(({ status, body }) => { expect(status).to.eq(409); expect(body.code).to.eq('ATTEMPT_CLOSED'); });
      });
      // Cerrado sin presentar para quien llega tarde.
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34late', course);
      cy.visit('/quizzes');
      by(`quiz-row-${quizId}`).should('have.attr', 'data-state', 'MISSED').and('contain', 'Cerrado');
    }));
  });
});

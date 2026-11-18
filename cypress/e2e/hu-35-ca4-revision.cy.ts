/// <reference types="cypress" />
import { adminHeaders, answerCurrent, bankOf, beginQuiz, by, createPublishedQuiz, newCourse } from '../support/hu34';

// HU-35 · CA-4: revisión de solo lectura cuando el quiz cerró y la nota es visible.
describe('HU-35 · Revisión de quizzes presentados', () => {
  it('se habilita al cerrar el quiz y muestra qué acertó, sin dejar cambiar nada', () => {
    const windowSeconds = 40;
    const created = Date.now();
    newCourse().then(course => createPublishedQuiz(course, { title: 'Quiz para revisar', questionsPerStudent: 2, closesInSeconds: windowSeconds }).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q35review', course);
      beginQuiz(quizId);
      bankOf(quizId).then(bank => {
        answerCurrent(bank, true);
        by('quiz-next').click();
        by('quiz-nav-2').should('have.attr', 'aria-current', 'step');
        answerCurrent(bank, false);
      });
      by('quiz-submit').click();
      by('quiz-confirm-submit').click();
      by('quiz-result-back').click();

      // Entregado pero abierto para otros: todavía no se revela nada.
      by(`quiz-review-pending-${quizId}`).should('contain', 'Revisión desde el cierre');
      cy.get(`[data-cy=quiz-review-${quizId}]`).should('not.exist');
      cy.storedSession().then(session => cy.request({ url: `/api/quizzes/${quizId}/attempt/review`, headers: { Authorization: `Bearer ${session.accessToken}` }, failOnStatusCode: false })
        .then(({ status, body }) => { expect(status).to.eq(409); expect(body.code).to.eq('REVIEW_NOT_YET'); }));

      cy.then(() => {
        const left = created + (windowSeconds + 2) * 1000 - Date.now();
        if (left > 0) cy.wait(left);
      });
      cy.reload();
      by(`quiz-review-${quizId}`).should('contain', 'Revisar').click();
      cy.location('pathname').should('eq', `/quizzes/${quizId}/revision`);
      by('quiz-review-title').should('contain', 'Quiz para revisar');
      by('quiz-review-summary').should('contain', '1 de 2 aciertos').and('contain', 'Solo lectura');
      by('review-outcome-1').should('contain', 'Correcta');
      by('review-outcome-2').should('contain', 'Incorrecta');
      by('review-question-1').find('[data-mark=chosen-correct]').should('have.length', 1);
      by('review-question-2').find('[data-mark=chosen-wrong]').should('have.length', 1);
      by('review-question-2').find('[data-mark=correct]').should('have.length', 1);
      by('review-explanation-1').should('not.be.empty');
      // Solo lectura: no hay controles para responder.
      by('quiz-review-page').find('input, textarea, select').should('not.exist');
      by('quiz-review-back').click();
      cy.location('pathname').should('eq', '/quizzes');
    }));
  });

  it('con la nota oculta no hay revisión, ni en la lista ni por la ruta', () => {
    newCourse().then(course => createPublishedQuiz(course, { title: 'Quiz con nota oculta', questionsPerStudent: 1, showGrade: false }).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q35hidden', course);
      beginQuiz(quizId);
      by('quiz-submit').click();
      by('quiz-confirm-submit').click();
      by('quiz-result-back').click();
      by(`quiz-grade-hidden-${quizId}`).should('contain', 'aún no publica la nota').and('contain', 'la revisión se habilita');
      cy.visit(`/quizzes/${quizId}/revision`);
      by('quiz-review-error').should('contain', 'publique la nota');
      // El docente la publica: con el quiz aún abierto, sigue sin revelarse.
      adminHeaders().then(headers => cy.request({ method: 'PUT', url: `/api/quizzes/manage/${quizId}/grade-visibility`, headers, body: { showGrade: true } }));
      cy.reload();
      by('quiz-review-error').should('contain', 'cierre el quiz');
    }));
  });
});

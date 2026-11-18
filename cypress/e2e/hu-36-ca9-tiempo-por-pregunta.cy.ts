/// <reference types="cypress" />
import { by, createPublishedQuiz, newCourse } from '../support/hu34';

// HU-36 · CA-9: el modo de prueba envía el tiempo que la pregunta estuvo visible.
describe('HU-36 · Tiempo por pregunta', () => {
  it('cada respuesta lleva el tiempo visible de su pregunta', () => {
    newCourse('Q36T').then(course => {
      cy.registerStudentByApi('q36t', course);
      return createPublishedQuiz(course, { questionsPerStudent: 2, studentCount: 1 });
    }).then(quizId => {
      cy.visit(`/quizzes/${quizId}/presentar`);
      by('quiz-start').click();
      by('quiz-question-panel').should('be.visible');
      cy.intercept('PUT', '**/attempt/answers/1').as('first');
      cy.wait(1200);
      cy.get('[data-cy^="quiz-option-"]').first().find('input').check();
      cy.wait('@first').its('request.body').should(body => {
        expect(body.selectedOption).to.be.a('number');
        expect(body.elapsedMs).to.be.at.least(1000).and.below(60_000);
      });
    });
  });
});

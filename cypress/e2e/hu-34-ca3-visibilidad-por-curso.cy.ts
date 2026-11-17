/// <reference types="cypress" />
import { adminHeaders, by, createDraftQuiz, createPublishedQuiz, newCourse } from '../support/hu34';

// HU-34 · CA-3: solo los matriculados del curso ven y pueden iniciar un quiz publicado.
describe('HU-34 · Visibilidad del quiz por curso', () => {
  it('lo muestra al estudiante del curso y lo oculta al de otro curso, también por API', () => {
    newCourse().then(course => newCourse('Q34X').then(other => {
      createDraftQuiz(course, { title: 'Borrador invisible' });
      createPublishedQuiz(course, { title: 'Quiz visible del curso' }).then(quizId => {
        cy.clearLocalStorage();
        cy.registerStudentByApi('q34in', course);
        cy.visit('/');
        by('quiz-notice').should('contain', 'Quiz visible del curso');
        by('quiz-notice-link').click();
        by('quiz-list-course').should('contain', course);
        by('quiz-list').find('li').should('have.length', 1);
        by(`quiz-row-${quizId}`).should('have.attr', 'data-state', 'OPEN').and('contain', 'Quiz visible del curso');
        by(`quiz-open-${quizId}`).should('contain', 'Iniciar quiz');
        by('quiz-list-page').should('not.contain', 'Borrador invisible');

        cy.clearLocalStorage();
        cy.registerStudentByApi('q34out', other);
        cy.visit('/');
        by('application-area').should('be.visible');
        cy.get('[data-cy=quiz-notice]').should('not.exist');
        by('sidebar-quizzes').click({ force: true });
        by('quiz-list-course').should('contain', other);
        by('quiz-list-empty').should('be.visible');

        cy.storedSession().then(session => {
          const headers = { Authorization: `Bearer ${session.accessToken}` };
          cy.request({ url: '/api/quizzes', headers }).its('body.quizzes').should('have.length', 0);
          for (const [method, path] of [['POST', 'attempt'], ['GET', 'attempt'], ['POST', 'attempt/submit']]) {
            cy.request({ method, url: `/api/quizzes/${quizId}/${path}`, headers, failOnStatusCode: false })
              .its('status').should('eq', 404);
          }
        });
        cy.visit(`/quizzes/${quizId}/presentar`);
        by('quiz-exam-unavailable-message').should('contain', 'no está disponible para tu curso');
      });
    }));
  });

  it('una cuenta sin curso ve la explicación en lugar de una lista vacía', () => {
    newCourse().then(course => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34nc', course).then(email => {
        adminHeaders().then(headers => cy.request({ url: '/api/admin/students', headers }).then(({ body }) => {
          const student = body.find((entry: { email: string }) => entry.email === email);
          cy.request({ method: 'DELETE', url: `/api/admin/students/${student.id}/course`, headers });
        }));
      });
      cy.visit('/quizzes');
      by('quiz-list-no-course').should('be.visible');
    });
  });
});

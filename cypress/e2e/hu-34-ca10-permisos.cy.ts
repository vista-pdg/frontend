/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { by, createPublishedQuiz, newCourse } from '../support/hu34';

// HU-34 · CA-10: la gestión es del docente del curso o del administrador; el servidor lo decide.
describe('HU-34 · Permisos de gestión', () => {
  it('el estudiante no entra a la gestión ni obtiene datos por API', () => {
    newCourse().then(course => createPublishedQuiz(course).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34perm', course);
      cy.visit('/docencia/quizzes');
      cy.location('pathname').should('eq', '/');
      cy.visit(`/docencia/quizzes/${quizId}`);
      cy.location('pathname').should('eq', '/');
      by('sidebar-quizzes').should('have.attr', 'href', '/quizzes');
      cy.storedSession().then(session => {
        const headers = { Authorization: `Bearer ${session.accessToken}` };
        for (const path of ['', '/courses', `/${quizId}`, `/${quizId}/results`, `/${quizId}/results.csv`, `/${quizId}/results.xlsx`]) {
          cy.request({ url: `/api/quizzes/manage${path}`, headers, failOnStatusCode: false }).its('status').should('eq', 403);
        }
      });
      cy.request({ url: '/api/quizzes', failOnStatusCode: false }).its('status').should('eq', 401);
      cy.request({ url: `/api/quizzes/manage/${quizId}/results`, failOnStatusCode: false }).its('status').should('eq', 401);
    }));
  });

  it('el docente solo gestiona los cursos que tiene asignados; el administrador, todos', () => {
    newCourse().then(course => createPublishedQuiz(course, { title: 'Quiz de curso ajeno' }).then(quizId => {
      cy.clearLocalStorage();
      cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
      cy.visit('/');
      by('sidebar-quizzes').should('have.attr', 'href', '/docencia/quizzes');
      cy.visit('/docencia/quizzes');
      by('quiz-management-page').should('be.visible');
      cy.get('[data-cy=quiz-manage-loading]').should('not.exist');
      cy.get(`[data-cy=quiz-course-filter] option[value="${course}"]`).should('not.exist');
      cy.visit(`/docencia/quizzes/${quizId}`);
      by('quiz-detail-error').should('contain', 'No tienes acceso a este quiz');
      cy.get('[data-cy=quiz-detail-title]').should('not.exist');

      cy.clearLocalStorage();
      cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
      cy.visit(`/docencia/quizzes/${quizId}`);
      by('quiz-detail-title').should('contain', 'Quiz de curso ajeno');
      by('quiz-results').should('be.visible');
    }));
  });
});

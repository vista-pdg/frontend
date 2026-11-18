/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { adminHeaders, assignSeededTeacher, by, createPublishedQuiz, newCourse } from '../support/hu34';

// El administrador elimina un quiz aunque tenga entregas; el docente, solo si nadie lo ha empezado.
describe('Quizzes · eliminar un quiz con entregas', () => {
  it('solo el administrador lo elimina, con una confirmación que cuenta los intentos', () => {
    let quiz = 0;
    newCourse('QDEL').then(course => {
      assignSeededTeacher(course);
      createPublishedQuiz(course, { questionsPerStudent: 1, studentCount: 1 }).then(id => { quiz = id; });
      cy.registerStudentByApi('qdel', course);
      cy.storedSession().then(({ accessToken }) => {
        const headers = { Authorization: `Bearer ${accessToken}` };
        cy.then(() => cy.request({ method: 'POST', url: `/api/quizzes/${quiz}/attempt`, headers }));
        cy.then(() => cy.request({ method: 'POST', url: `/api/quizzes/${quiz}/attempt/submit`, headers }));
      });
    });

    // El docente no ve la acción y la API se lo impide.
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.then(() => cy.visit(`/docencia/quizzes/${quiz}`));
    by('quiz-detail-title').should('be.visible');
    by('quiz-delete').should('not.exist');
    cy.storedSession().then(({ accessToken }) =>
      cy.request({ method: 'DELETE', url: `/api/quizzes/manage/${quiz}`, headers: { Authorization: `Bearer ${accessToken}` }, failOnStatusCode: false })
        .then(({ status, body }) => {
          expect(status).to.eq(409);
          expect(body.message).to.contain('solo un administrador');
        }));

    // El administrador confirma y el quiz desaparece con sus intentos.
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
    cy.then(() => cy.visit(`/docencia/quizzes/${quiz}`));
    by('quiz-delete').click();
    by('confirmation-dialog').should('contain', 'Eliminar quiz con entregas').and('contain', '1 intento de estudiantes');
    by('confirmation-submit').should('contain', 'Eliminar quiz y resultados').click();
    cy.location('pathname').should('eq', '/docencia/quizzes');
    adminHeaders().then(headers =>
      cy.request({ url: `/api/quizzes/manage/${quiz}`, headers, failOnStatusCode: false }).its('status').should('eq', 404));
  });
});

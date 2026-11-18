/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { AVL, BFS, adminHeaders, by, newCourse } from '../support/hu34';

// HU-35 · CA-3: validación con los paneles existentes. El administrador asigna y retira docentes en
// Administración; solo el docente asignado (y el administrador) crea quizzes para ese curso.
describe('HU-35 · Docentes por curso y quizzes', () => {
  function quizBody(course: string) {
    const now = Date.now();
    return {
      courseCode: course, title: 'Quiz del docente asignado', topics: [AVL, BFS], questionsPerStudent: 1, studentCount: 1,
      timeLimitMinutes: 20, opensAt: new Date(now - 3_600_000).toISOString(), closesAt: new Date(now + 86_400_000).toISOString(), showGrade: true,
    };
  }

  function teacherCreates(course: string, status: number) {
    cy.request('POST', '/api/auth/login', SEEDED.teacher).then(({ body }) =>
      cy.request({ method: 'POST', url: '/api/quizzes/manage', headers: { Authorization: `Bearer ${body.accessToken}` }, body: quizBody(course), failOnStatusCode: false })
        .its('status').should('eq', status));
  }

  function openCourseAdmin(course: string) {
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
    cy.visit('/admin');
    by('admin-tab-courses').click();
    by('managed-course').select(course);
  }

  it('el docente gestiona el curso solo mientras el administrador lo tenga asignado', () => {
    newCourse('Q35T').then(course => {
      // Sin asignación: ni lo ve ni puede crear.
      teacherCreates(course, 403);

      openCourseAdmin(course);
      cy.get('[data-cy=teacher-candidate] option').contains(SEEDED.teacher.email).then(option => {
        by('teacher-candidate').select(option.val() as string);
      });
      by('assign-teacher').click();
      by('course-teachers').should('contain', SEEDED.teacher.email);

      // Asignado: el curso aparece en Quizzes y puede crear quizzes para él.
      cy.clearLocalStorage();
      cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
      cy.visit('/docencia/quizzes');
      cy.get('[data-cy=quiz-manage-loading]').should('not.exist');
      cy.get(`[data-cy=quiz-course-filter] option[value="${course}"]`).should('exist');
      teacherCreates(course, 201);

      // Retirado desde Administración: pierde el curso de inmediato.
      openCourseAdmin(course);
      cy.get('[data-cy=course-teachers] li').filter(`:contains(${SEEDED.teacher.email})`).find('button').click();
      by('confirmation-submit').click();
      by('no-course-teachers').should('exist');
      cy.clearLocalStorage();
      cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
      cy.visit('/docencia/quizzes');
      cy.get('[data-cy=quiz-manage-loading]').should('not.exist');
      cy.get(`[data-cy=quiz-course-filter] option[value="${course}"]`).should('not.exist');
      teacherCreates(course, 403);

      // El administrador gestiona cualquier curso.
      adminHeaders().then(headers =>
        cy.request({ method: 'POST', url: '/api/quizzes/manage', headers, body: quizBody(course) }).its('status').should('eq', 201));
    });
  });
});

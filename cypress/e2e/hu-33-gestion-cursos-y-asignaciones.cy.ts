/// <reference types="cypress" />
import { SEEDED } from '../support/commands';

describe('HU-33 · Gestión de cursos, docentes y matrícula', () => {
  let code: string;

  after(() => {
    cy.request('POST', '/api/auth/login', SEEDED.admin).then(({ body: login }) => {
      const headers = { Authorization: `Bearer ${login.accessToken}` };
      cy.request({ url: '/api/admin/students', headers }).then(({ body }) => {
        const student = body.find((entry: { email: string }) => entry.email === SEEDED.student.email);
        if (student) cy.request({ method: 'PUT', url: `/api/admin/students/${student.id}/course`, headers,
          body: { courseCode: 'CEDI-G1' } });
      });
    });
  });

  beforeEach(() => {
    code = `HU33-${Date.now()}`;
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
    cy.visit('/admin');
    cy.get('[data-cy=admin-tab-courses]').click();
    cy.get('[data-cy=course-management]').should('be.visible');
  });

  it('crea un grupo, lo publica en el registro y gestiona responsables y matrícula', () => {
    cy.storedSession().then(session => {
      const headers = { Authorization: `Bearer ${session.accessToken}` };
      cy.request({ url: '/api/admin/students', headers }).then(({ body }) => {
        const student = body.find((entry: { email: string }) => entry.email === SEEDED.student.email);
        cy.request({ method: 'PUT', url: `/api/admin/students/${student.id}/course`, headers,
          body: { courseCode: 'CEDI-G1' } });
      });
    });
    cy.reload();
    cy.get('[data-cy=admin-tab-courses]').click();
    cy.get('[data-cy=course-management]').should('be.visible');
    cy.get('[data-cy=new-course-code]').type(code);
    cy.get('[data-cy=new-course-name]').type('Grupo de validación HU-33');
    cy.get('[data-cy=new-course-term]').should('have.value', '2026-1');
    cy.get('[data-cy=new-course-submit]').click();
    cy.get('[data-cy=course-management-notice]').should('contain', code);
    cy.get('[data-cy=managed-course]').should('have.value', code);
    cy.request('/api/courses').its('body').should('deep.include', {
      code, name: 'Grupo de validación HU-33', termCode: '2026-1',
    });

    cy.get('[data-cy=teacher-candidate] option').contains(SEEDED.teacher.email).then(option => {
      cy.get('[data-cy=teacher-candidate]').select(option.val() as string);
    });
    cy.get('[data-cy=assign-teacher]').click();
    cy.get('[data-cy=course-teachers]').should('contain', SEEDED.teacher.email);
    cy.get('[data-cy=student-candidate] option').contains(SEEDED.student.email).then(option => {
      cy.get('[data-cy=student-candidate]').select(option.val() as string);
    });
    cy.get('[data-cy=student-move-warning]').should('contain', 'CEDI-G1');
    cy.get('[data-cy=assign-student]').click();
    cy.get('[data-cy=course-students]').should('contain', SEEDED.student.email);

    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.visit('/analytics');
    cy.get('[data-cy=analytics-course]').find('option').contains(code).should('exist');
    cy.get('[data-cy=analytics-course]').select(code);
    cy.get('[data-cy=analytics-apply]').click();
    cy.get('[data-cy=analytics-applied]').should('contain', code);
    cy.get('[data-cy=analytics-ranking]').should('exist');

    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
    cy.visit('/admin');
    cy.get('[data-cy=admin-tab-courses]').click();
    cy.get('[data-cy=managed-course]').select(code);
    cy.get('[data-cy=course-teachers] li').filter(`:contains(${SEEDED.teacher.email})`).find('button').click();
    cy.get('[data-cy=confirmation-submit]').click();
    cy.get('[data-cy=no-course-teachers]').should('exist');
    cy.get('[data-cy=course-students] li').filter(`:contains(${SEEDED.student.email})`).find('button').click();
    cy.get('[data-cy=confirmation-submit]').click();
    cy.get('[data-cy=no-course-students]').should('exist');

    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.visit('/analytics');
    cy.get('[data-cy=analytics-course]').find('option').contains(code).should('not.exist');
  });

  it('impide a docentes y estudiantes gestionar grupos por pantalla y por API', () => {
    for (const actor of [SEEDED.teacher, SEEDED.student]) {
      cy.clearLocalStorage();
      cy.loginByApi(actor.email, actor.password);
      cy.visit('/admin');
      cy.location('pathname').should('not.eq', '/admin');
      cy.request('POST', '/api/auth/login', actor).then(({ body: session }) => {
        cy.request({ method: 'POST', url: '/api/admin/courses',
          headers: { Authorization: `Bearer ${session.accessToken}` },
          body: { code: `${code}-DENIED`, name: 'Sin permiso', termCode: '2026-1' },
          failOnStatusCode: false }).its('status').should('eq', 403);
      });
    }
  });

  it('mantiene visibles los controles de gestión en escritorio, tableta y móvil', () => {
    for (const width of [1440, 768, 390]) {
      cy.viewport(width, 900);
      cy.get('[data-cy=new-course-submit]').should('be.visible');
      cy.get('[data-cy=managed-course]').should('be.visible');
      cy.get('[data-cy=assign-teacher]').should('be.visible');
      cy.get('[data-cy=assign-student]').should('be.visible');
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(width + 1));
      cy.screenshot(`hu33-admin-${width}`, { capture: 'fullPage' });
    }
  });
});

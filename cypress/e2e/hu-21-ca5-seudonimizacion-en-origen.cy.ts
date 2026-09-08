/// <reference types="cypress" />
import { ask, teacherEvents } from '../support/hu21';
import { SEEDED } from '../support/commands';

/**
 * HU-21 · CA-5 — Seudonimización en origen.
 *
 *   Dado que se registra cualquier evento de interacción
 *   Cuando se almacena en la base analítica
 *   Entonces el campo de usuario es un identificador irreversible sin la sal del sistema
 *   Y no se guarda correo ni nombre en texto plano
 *
 * Que la fila cruda no lleve correo lo demuestra la prueba de integración sobre la tabla; desde el
 * navegador lo comprobable es que nada de lo que el docente puede leer identifica a nadie, ni por
 * los eventos ni por el resumen agregado.
 */
describe('HU-21 · CA-5 Seudonimización en origen', () => {
  it('ni los eventos ni el resumen del docente contienen datos identificables', () => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('analitica.ca5').then((email) => {
      cy.visit('/');
      cy.get('[data-cy=chat-toggle]').click();
      ask('crea un grafo no dirigido con 4 nodos', 'gen');

      teacherEvents().then((events) => {
        const crudo = JSON.stringify(events);
        expect(crudo).to.not.contain(email);
        expect(crudo).to.not.contain('@u.icesi.edu.co');
        expect(crudo).to.not.contain(SEEDED.student.email);
      });

      cy.request('POST', '/api/auth/login', {
        email: SEEDED.teacher.email,
        password: SEEDED.teacher.password,
      }).then(({ body }) => {
        cy.request({
          url: '/api/analytics/summary',
          headers: { Authorization: `Bearer ${body.accessToken}` },
        }).then((res) => {
          const crudo = JSON.stringify(res.body);
          expect(crudo).to.not.contain(email);
          expect(crudo).to.not.contain('@u.icesi.edu.co');
          expect(crudo).to.not.contain('E2E analitica.ca5');
        });
      });
    });
  });
});

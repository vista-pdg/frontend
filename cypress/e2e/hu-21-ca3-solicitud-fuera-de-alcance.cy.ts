/// <reference types="cypress" />
import { ask, teacherEvents } from '../support/hu21';

/**
 * HU-21 · CA-3 — Solicitud fallida o fuera de alcance.
 *
 *   Dado que un estudiante solicita una estructura no contemplada en el syllabus
 *   Cuando el asistente rechaza la petición
 *   Entonces se registra un evento con resultado "fuera_de_alcance"
 *   Y el texto del prompt queda almacenado para revisión docente
 */
describe('HU-21 · CA-3 Solicitud fallida o fuera de alcance', () => {
  const PROMPT = 'dibuja un árbol rojinegro con rotaciones';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('analitica.ca3');
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
  });

  it('el rechazo se registra con su resultado y con el prompt que lo provocó', () => {
    ask(PROMPT, 'rechazo', 400);
    cy.get('[data-cy=chat-message-error]').should('be.visible');

    teacherEvents('fuera_de_alcance').then((events) => {
      const ultimo = events[0];
      expect(ultimo.outcome).to.eq('fuera_de_alcance');
      expect(ultimo.source).to.eq('asistente_nlp');
      expect(ultimo.promptText, 'el docente ve qué se pidió').to.eq(PROMPT);
    });
  });

  it('la vista de revisión no expone el seudónimo de nadie', () => {
    ask(PROMPT, 'rechazo2', 400);

    teacherEvents('fuera_de_alcance').then((events) => {
      const crudo = JSON.stringify(events);
      expect(crudo).to.not.contain('pseudonym');
      expect(crudo).to.not.contain('@u.icesi.edu.co');
      expect(events[0]).to.not.have.property('pseudonym');
    });
  });

  it('el estudiante no puede leer los eventos de revisión docente', () => {
    cy.storedSession().then((s) => {
      cy.request({
        url: '/api/analytics/events',
        headers: { Authorization: `Bearer ${s.accessToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(403);
        expect(JSON.stringify(res.body ?? '')).to.not.contain('promptText');
      });
    });
  });
});

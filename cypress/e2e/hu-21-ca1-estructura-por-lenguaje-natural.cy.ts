/// <reference types="cypress" />
import { ask, teacherEvents } from '../support/hu21';

/**
 * HU-21 · CA-1 — Estructura generada por lenguaje natural.
 *
 *   Dado que un estudiante autenticado solicita "crea un grafo no dirigido con 6 nodos"
 *   Cuando la estructura se genera y se renderiza correctamente
 *   Entonces se registra un evento con tipo_estructura "grafo_no_dirigido"
 *   Y origen_interaccion "asistente_nlp"
 *   Y resultado "exito"
 */
describe('HU-21 · CA-1 Estructura generada por lenguaje natural', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('analitica.ca1');
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
  });

  it('generar por chat deja un evento de éxito con el tipo detallado y su origen', () => {
    ask('crea un grafo no dirigido con 6 nodos', 'gen');
    cy.get('[data-cy=svg-scene], [data-cy=canvas-3d]').should('exist');
    cy.get('[data-cy=chat-message-error]').should('not.exist');

    teacherEvents().then((events) => {
      const ultimo = events[0];
      expect(ultimo.structureType, 'tipo detallado, no «graph»').to.eq('grafo_no_dirigido');
      expect(ultimo.source).to.eq('asistente_nlp');
      expect(ultimo.outcome).to.eq('exito');
      expect(ultimo.sessionId, 'el evento se puede agrupar por sesión').to.be.a('string').and.not.be
        .empty;
      expect(ultimo.promptText, 'en los éxitos no se guarda el texto del estudiante').to.be.null;
    });
  });

  it('una pila también se registra con su tipo detallado', () => {
    ask('crea una pila con 3, 42, 8, 17', 'pila');

    teacherEvents().then((events) => {
      expect(events[0].structureType).to.eq('pila');
      expect(events[0].outcome).to.eq('exito');
    });
  });
});

/// <reference types="cypress" />
import { chat, sessionStatus } from '../support/hu32';

/**
 * HU-32 · CA-4 y CA-5 — Caducidad y renovación de la sesión.
 *
 *   Escenario: La sesión caduca por inactividad
 *   Escenario: Cada mensaje renueva la caducidad
 *
 * La caducidad de verdad (30 minutos) no se puede esperar en el navegador y no se abre ningún
 * atajo de tiempo en la API: la prueba `AssistantSessionTest#sessionExpires` la demuestra contra un
 * Redis real con un TTL de un segundo. Aquí se verifica lo observable: que la sesión anuncia cuánto
 * le queda, que ese margen se consume con el tiempo y que cada mensaje lo devuelve al máximo.
 */
describe('HU-32 · CA-4/CA-5 Caducidad y renovación', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.window().then((win) => win.localStorage.setItem('vista_visualization_mode', '2D'));
    cy.registerStudentByApi('memoria.ca4');
    cy.visit('/');
  });

  it('el panel anuncia la caducidad y cada mensaje la renueva', () => {
    chat('arbol con insercion de 1, 2, 3');
    // 30 minutos justos o 29 si el reloj ya avanzó unos segundos: lo que importa es que lo anuncie.
    cy.get('[data-cy=session-indicator]').invoke('text').should('match', /caduca en (29|30) min/);

    let afterFirst = 0;
    sessionStatus().then((s: { secondsRemaining: number }) => {
      expect(s.secondsRemaining).to.be.within(1750, 1800);
      afterFirst = s.secondsRemaining;
    });

    // Con el tiempo el margen se consume…
    cy.wait(2100);
    sessionStatus().should((s: { secondsRemaining: number }) => {
      expect(s.secondsRemaining, 'la sesión envejece').to.be.lessThan(afterFirst);
    });

    // …y el mensaje siguiente lo devuelve al máximo.
    chat('ahora inserta el 5', 'refine');
    sessionStatus().should((s: { secondsRemaining: number }) => {
      expect(s.secondsRemaining, 'renovada').to.be.at.least(afterFirst);
    });
    cy.get('[data-cy=session-indicator]').invoke('text').should('match', /caduca en (29|30) min/);
  });

  it('sin sesión no se anuncia nada y el estado lo dice', () => {
    sessionStatus().should((s: { available: boolean; active: boolean }) => {
      expect(s.available).to.eq(true);
      expect(s.active).to.eq(false);
    });
    cy.get('[data-cy=chat-toggle]').click();
    cy.get('[data-cy=session-indicator]').should('not.exist');
  });
});

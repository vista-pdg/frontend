/// <reference types="cypress" />
import { ask, teacherEvents, teacherRetries } from '../support/hu21';

/**
 * HU-21 · CA-4 — Patrones de reintento.
 *
 *   Dado que un estudiante reformula tres veces la misma solicitud en menos de dos minutos
 *   Cuando los eventos quedan registrados
 *   Entonces comparten el mismo id_sesion
 *   Y son identificables como una secuencia de reintento
 *
 * La secuencia no se marca al escribir el evento —cuando ocurre el primer intento nadie sabe aún
 * que habrá un tercero— sino que se detecta al consultarla, que es lo que hace el docente aquí.
 */
describe('HU-21 · CA-4 Patrones de reintento', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.registerStudentByApi('analitica.ca4');
    cy.visit('/');
    cy.get('[data-cy=chat-toggle]').click();
  });

  it('tres reformulaciones seguidas comparten sesión y se leen como una secuencia', () => {
    ask('quiero un árbol rojinegro', 'r1', 400);
    ask('bueno, hazme un rojo-negro entonces', 'r2', 400);
    ask('vale, un trie con las palabras del curso', 'r3', 400);

    teacherEvents('fuera_de_alcance').then((events) => {
      const tres = events.slice(0, 3);
      const sesiones = new Set(tres.map((e) => e.sessionId));
      expect(sesiones.size, 'los tres intentos son de la misma sesión de trabajo').to.eq(1);

      const sesion = tres[0].sessionId;
      teacherRetries().then((secuencias) => {
        const mia = secuencias.find((s) => s.sessionId === sesion);
        expect(mia, 'la sesión aparece como secuencia de reintento').to.not.be.undefined;
        expect(mia!.attempts).to.be.at.least(3);
        const ventana = new Date(mia!.lastAt).getTime() - new Date(mia!.firstAt).getTime();
        expect(ventana, 'dentro de la ventana de dos minutos').to.be.lessThan(120_000);
      });
    });
  });

  it('quien acierta a la primera no aparece como reintento', () => {
    ask('crea un grafo no dirigido con 5 nodos', 'unico');

    teacherEvents().then((events) => {
      const sesion = events[0].sessionId;
      teacherRetries().then((secuencias) => {
        expect(secuencias.map((s) => s.sessionId)).to.not.include(sesion);
      });
    });
  });
});

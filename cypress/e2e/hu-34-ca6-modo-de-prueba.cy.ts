/// <reference types="cypress" />
import { adminHeaders, by, createPublishedQuiz, newCourse } from '../support/hu34';

// HU-34 · CA-6: el modo de prueba bloquea portapapeles e impresión, oculta al perder el foco y
// deja cada incidente registrado para el docente.
describe('HU-34 · Protecciones del modo de prueba', () => {
  it('bloquea copiar, pegar y atajos, oculta el quiz al salir y registra los incidentes', () => {
    newCourse().then(course => createPublishedQuiz(course, { title: 'Quiz protegido' }).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34guard', course).then(email => {
        // Antes de comenzar no hay protecciones: la compuerta explica las reglas.
        cy.visit(`/quizzes/${quizId}/presentar`);
        by('quiz-gate').should('contain', 'Copiar, pegar, imprimir y salir de la pestaña están bloqueados');
        cy.document().its('documentElement.className').should('not.contain', 'exam-mode');
        by('quiz-start').click();
        by('quiz-question-panel').should('be.visible');

        cy.document().its('documentElement.className').should('contain', 'exam-mode');
        by('quiz-watermark').should('contain', email);
        // Se comprueba en la raíz: Firefox informa «auto» en los descendientes aunque hereden el bloqueo.
        cy.get('html').should('have.css', 'user-select', 'none');
        by('quiz-incidents').should('contain', 'Incidentes: 0');

        // Portapapeles: el evento se cancela y cuenta como incidente.
        for (const [type, expected] of [['copy', 1], ['cut', 2], ['paste', 3]] as const) {
          cy.document().then(doc => {
            const event = new Event(type, { bubbles: true, cancelable: true });
            doc.querySelector('[data-cy=quiz-statement]')!.dispatchEvent(event);
            expect(event.defaultPrevented, `${type} cancelado`).to.eq(true);
          });
          by('quiz-incidents').should('contain', `Incidentes: ${expected}`);
        }
        // Menú contextual y arrastre se cancelan sin contarse: no sacan contenido por sí solos.
        cy.document().then(doc => {
          for (const type of ['contextmenu', 'dragstart']) {
            const event = new Event(type, { bubbles: true, cancelable: true });
            doc.querySelector('[data-cy=quiz-statement]')!.dispatchEvent(event);
            expect(event.defaultPrevented, `${type} cancelado`).to.eq(true);
          }
          const print = new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true, cancelable: true });
          doc.body.dispatchEvent(print);
          expect(print.defaultPrevented, 'Ctrl+P cancelado').to.eq(true);
          const typing = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
          doc.body.dispatchEvent(typing);
          expect(typing.defaultPrevented, 'escribir sigue permitido').to.eq(false);
        });
        by('quiz-incidents').should('contain', 'Incidentes: 4');

        // Perder el foco oculta la pregunta hasta que el estudiante vuelve.
        cy.window().then(win => win.dispatchEvent(new Event('blur')));
        by('quiz-obscured').should('be.visible').and('contain', 'Saliste del quiz').and('contain', '5 en total');
        by('quiz-resume').should('be.focused').click();
        cy.get('[data-cy=quiz-obscured]').should('not.exist');
        by('quiz-statement').should('be.visible');

        // El conteo vive en el servidor: sobrevive a una recarga y llega al panel docente.
        cy.reload();
        by('quiz-start').click();
        by('quiz-incidents').should('contain', 'Incidentes: 5');
        by('quiz-submit').click();
        by('quiz-confirm-submit').click();
        by('quiz-result').should('be.visible');
        cy.document().its('documentElement.className').should('not.contain', 'exam-mode');
        adminHeaders().then(headers => cy.request({ url: `/api/quizzes/manage/${quizId}/results`, headers }).then(({ body }) => {
          const row = body.rows.find((entry: { email: string }) => entry.email === email);
          expect(row.integrityEvents).to.eq(5);
        }));
      });
    }));
  });
});

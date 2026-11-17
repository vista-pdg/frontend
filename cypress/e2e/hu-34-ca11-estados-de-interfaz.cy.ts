/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { beginQuiz, by, createDraftQuiz, createPublishedQuiz, newCourse } from '../support/hu34';

// HU-34 · CA-11: error con reintento, generación reanudable, teclado y disposición móvil.
describe('HU-34 · Estados de interfaz', () => {
  it('la lista del estudiante informa el error y se recupera al reintentar', () => {
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.intercept('GET', '/api/quizzes', { statusCode: 500, body: {} }).as('fail');
    cy.visit('/quizzes');
    cy.wait('@fail');
    by('quiz-list-error').should('contain', 'No se pudieron cargar los quizzes');
    cy.intercept('GET', '/api/quizzes', req => req.continue()).as('ok');
    by('quiz-list-retry').click();
    cy.wait('@ok');
    cy.get('[data-cy=quiz-list-error]').should('not.exist');
    by('quiz-list-course').should('contain', 'CEDI-G1');
  });

  // El fallo se controla con un interruptor y no contando peticiones: tras un corte de conexión
  // Chrome y Firefox reenvían el POST por su cuenta un número distinto de veces.
  it('un corte de red pasajero se reintenta solo y el banco se completa', () => {
    newCourse().then(course => createDraftQuiz(course, { title: 'Borrador con cortes', questionsPerStudent: 3, studentCount: 2 }).then(quizId => {
      cy.clearLocalStorage();
      cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
      const network = { served: 0, down: false };
      cy.intercept('POST', `/api/quizzes/manage/${quizId}/bank/generate`, req => {
        if (network.down) return req.reply({ forceNetworkError: true });
        network.served += 1;
        // Tras el primer lote la conexión cae, como al cambiar de red a mitad de la generación.
        if (network.served === 1) req.on('response', () => { network.down = true; });
        req.continue();
      });
      cy.visit(`/docencia/quizzes/${quizId}`);
      by('bank-generate').should('contain', 'Generar 6 faltantes').click();
      by('bank-retrying').should('contain', 'Reintentando el lote (1 de 3)');
      cy.then(() => { network.down = false; });
      cy.get('[data-cy=bank-progress]', { timeout: 20000 }).should('have.attr', 'data-status', 'complete');
      cy.get('[data-cy=bank-error]').should('not.exist');
      cy.get('[data-cy=bank-retrying]').should('not.exist');
      by('bank-question').should('have.length', 6);
    }));
  });

  it('si el corte persiste muestra la causa y la generación se reanuda a mano', () => {
    newCourse().then(course => createDraftQuiz(course, { title: 'Borrador sin red', questionsPerStudent: 3, studentCount: 2 }).then(quizId => {
      cy.clearLocalStorage();
      cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
      const network = { served: 0, down: false };
      cy.intercept('POST', `/api/quizzes/manage/${quizId}/bank/generate`, req => {
        if (network.down) return req.reply({ forceNetworkError: true });
        network.served += 1;
        if (network.served === 1) req.on('response', () => { network.down = true; });
        req.continue();
      });
      cy.clock(Date.now(), ['setTimeout']);
      cy.visit(`/docencia/quizzes/${quizId}`);
      by('quiz-bank-empty').should('be.visible');
      by('quiz-results-draft').should('not.exist');
      by('quiz-publish').should('be.disabled');
      by('bank-generate').click();
      for (const attempt of [1, 2, 3]) {
        by('bank-retrying').should('contain', `(${attempt} de 3)`);
        cy.tick(10_000);
      }
      by('bank-error').should('contain', 'Se perdió la conexión').and('contain', 'El banco conserva lo generado');
      by('bank-progress-count').should('contain', '3 de 6 preguntas');
      by('bank-question').should('have.length', 3);
      cy.clock().invoke('restore');
      cy.then(() => { network.down = false; });
      by('bank-resume').click();
      by('bank-progress').should('have.attr', 'data-status', 'complete');
      by('bank-question').should('have.length', 6);
      by('quiz-publish').should('be.enabled');
      by('quiz-detail-tab-results').click();
      by('quiz-results-draft').should('be.visible');
    }));
  });

  it('las opciones son un grupo de radio nativo, enfocable y etiquetado', () => {
    newCourse().then(course => createPublishedQuiz(course).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34kbd', course);
      beginQuiz(quizId);
      by('quiz-options').should('have.attr', 'role', 'radiogroup').and('have.attr', 'aria-labelledby', 'quiz-statement');
      // Cypress no reproduce la acción nativa de Espacio sobre un radio: se comprueba que el control
      // real recibe el foco y es un radio del mismo grupo, que es lo que el navegador necesita.
      by('quiz-option-0').find('input').should('have.attr', 'type', 'radio').focus().should('be.focused').check();
      cy.get('[data-cy^="quiz-option-"] input').then($inputs => expect(new Set([...$inputs].map(i => i.getAttribute('name'))).size).to.eq(1));
      by('quiz-option-0').should('have.attr', 'data-selected', 'true');
      by('quiz-saved').should('contain', 'Guardado');
      by('quiz-nav-1').should('have.attr', 'aria-current', 'step').and('have.attr', 'aria-label', 'Pregunta 1, respondida');
      by('quiz-prev').should('be.disabled');
      by('quiz-timer').should('have.attr', 'role', 'timer');
    }));
  });

  it('en móvil alterna entre la pregunta y VISTA sin desbordar la pantalla', () => {
    newCourse().then(course => createPublishedQuiz(course).then(quizId => {
      cy.viewport(390, 844);
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34mob', course);
      cy.visit('/quizzes');
      by(`quiz-open-${quizId}`).should('be.visible');
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(390));
      beginQuiz(quizId);
      by('quiz-tab-question').should('have.attr', 'aria-pressed', 'true');
      by('quiz-workspace').should('not.be.visible');
      by('quiz-tab-vista').click();
      by('quiz-question-panel').should('not.be.visible');
      by('quiz-workspace').should('be.visible').find('[data-cy=activity-selector]').should('be.visible');
      by('quiz-timer').should('be.visible');
      by('quiz-tab-question').click();
      by('quiz-statement').should('be.visible');
      cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(390));
    }));
  });
});

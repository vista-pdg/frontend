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

  it('un fallo del modelo conserva el banco y la generación se reanuda', () => {
    newCourse().then(course => createDraftQuiz(course, { title: 'Borrador con fallo', questionsPerStudent: 3, studentCount: 2 }).then(quizId => {
      cy.clearLocalStorage();
      cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);
      let calls = 0;
      cy.intercept('POST', `/api/quizzes/manage/${quizId}/bank/generate`, req => {
        calls += 1;
        if (calls === 2) req.reply({ statusCode: 503, body: { code: 'QUIZ_GENERATION_UNAVAILABLE', message: 'El servicio del modelo no está disponible en este momento (503).' } });
        else req.continue();
      });
      cy.visit(`/docencia/quizzes/${quizId}`);
      by('quiz-bank-empty').should('be.visible');
      by('quiz-results-draft').should('not.exist');
      by('quiz-publish').should('be.disabled');
      by('bank-generate').should('contain', 'Generar 6 faltantes').click();
      by('bank-error').should('contain', 'no está disponible').and('contain', 'El banco conserva lo generado');
      by('bank-progress-count').should('contain', '3 de 6 preguntas');
      by('bank-question').should('have.length', 3);
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

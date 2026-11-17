/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { assignSeededTeacher, AVL, BFS, by, newCourse } from '../support/hu34';

// HU-34 · CA-1 y CA-2: el docente crea el quiz, la plataforma genera el banco y él lo revisa.
describe('HU-34 · Creación del quiz y banco generado', () => {
  let course: string;

  beforeEach(() => {
    newCourse().then(code => { course = code; return assignSeededTeacher(code); });
    cy.then(() => cy.registerStudentByApi('q34a', course));
    cy.then(() => cy.registerStudentByApi('q34b', course));
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.visit('/docencia/quizzes');
    by('quiz-management-page').should('be.visible');
  });

  it('valida el formulario, calcula el banco y lo genera hasta completarlo', () => {
    by('quiz-course-filter').select(course);
    by('quiz-table-empty').should('be.visible');
    by('quiz-new').click();

    // El curso elegido en la lista llega al formulario con sus matriculados.
    by('quiz-courseCode').should('have.value', course);
    by('quiz-studentCount').should('have.value', '2');
    by('quiz-bank-size').should('contain', '6 preguntas (3 × 2)');

    by('quiz-create').click();
    by('quiz-title-error').should('contain', 'Escribe un título');
    by('quiz-topics-error').should('contain', 'al menos un tema');
    by('quiz-title').should('be.focused');
    cy.get('[data-cy=bank-progress]').should('not.exist');

    by('quiz-title').type('Quiz 1 · AVL y recorridos en grafos');
    by(`quiz-topic-${AVL}`).check();
    by(`quiz-topic-${BFS}`).check();
    by('quiz-questionsPerStudent').clear().type('2');
    by('quiz-studentCount').clear().type('3');
    by('quiz-bank-size').should('contain', '6 preguntas (2 × 3)');
    by('quiz-closesAt').clear().type('2020-01-01T00:00');
    by('quiz-create').click();
    by('quiz-closesAt-error').should('contain', 'posterior a la apertura');
    by('quiz-closesAt').clear().type('2099-01-01T00:00');

    by('quiz-create').click();
    by('bank-progress').should('have.attr', 'data-status', 'complete');
    by('bank-progress-count').should('contain', '6 de 6 preguntas');
    by('bank-complete').should('be.visible');
    by('quiz-create').should('be.disabled');
    by('bank-review').click();

    // Revisión: cada pregunta trae escenario, cuatro opciones y una sola marcada como correcta.
    by('quiz-detail-phase').should('contain', 'Borrador');
    by('bank-question').should('have.length', 6).each($question => {
      cy.wrap($question).find('li').should('have.length', 4);
      cy.wrap($question).find('li[data-correct=true]').should('have.length', 1);
      cy.wrap($question).should('contain', 'Escenario:').and('contain', 'Justificación:');
    });
    by('quiz-bank').should('contain', 'Árbol AVL').and('contain', 'Grafo no dirigido');

    // Descartar una pregunta deja el banco incompleto: no se publica hasta generar el reemplazo.
    by('quiz-publish').should('be.enabled');
    by('bank-question-delete').first().click();
    by('confirmation-submit').click();
    by('bank-question').should('have.length', 5);
    by('quiz-publish').should('be.disabled');
    by('bank-generate').should('contain', 'Generar 1 faltante').click();
    by('bank-question').should('have.length', 6);

    by('quiz-publish').should('be.enabled').click();
    by('quiz-detail-notice').should('contain', 'Quiz publicado');
    by('quiz-detail-phase').should('contain', 'Programado');
    by('quiz-detail-tab-bank').click();
    cy.get('[data-cy=bank-question-delete]').should('not.exist');
    cy.get('[data-cy=quiz-publish]').should('not.exist');

    by('quiz-detail-back').click();
    by('quiz-course-filter').select(course);
    by('quiz-table').should('contain', 'Quiz 1 · AVL y recorridos en grafos').and('contain', '6 / 6');
  });

  it('elimina un borrador sin intentos y deja la lista vacía', () => {
    by('quiz-course-filter').select(course);
    by('quiz-new').click();
    by('quiz-title').type('Borrador descartable');
    by(`quiz-topic-${AVL}`).check();
    by('quiz-create').click();
    by('bank-review').click();
    by('quiz-delete').click();
    by('confirmation-dialog').should('contain', 'Borrador descartable');
    by('confirmation-submit').click();
    by('quiz-management-page').should('be.visible');
    by('quiz-course-filter').select(course);
    by('quiz-table-empty').should('be.visible');
  });
});

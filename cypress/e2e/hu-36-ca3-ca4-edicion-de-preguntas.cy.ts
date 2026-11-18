/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { assignSeededTeacher, by, createDraftQuiz, createPublishedQuiz, newCourse } from '../support/hu34';
import { fillDraftBank } from '../support/hu36';

// HU-36 · CA-3 y CA-4: editar preguntas del banco a mano o con una propuesta de la IA.
describe('HU-36 · Edición manual y con IA de las preguntas del banco', () => {
  let course: string;

  beforeEach(() => {
    newCourse('Q36E').then(code => { course = code; return assignSeededTeacher(code); });
    cy.clearLocalStorage();
  });

  it('edita a mano con validación por campo y aplica o ajusta propuestas de la IA', () => {
    cy.then(() => createDraftQuiz(course, { questionsPerStudent: 1, studentCount: 3 })).then(quizId => {
      fillDraftBank(quizId);
      cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
      cy.visit(`/docencia/quizzes/${quizId}`);
    });
    by('bank-question').should('have.length', 3);

    // Edición manual: errores junto al campo y la pregunta queda marcada.
    by('bank-question').eq(0).within(() => {
      by('bank-question-edit').click();
      by('question-editor').should('contain', 'Lo validó VISTA y no se edita');
      by('question-statement').clear().type('¿Qué pasa?');
      by('question-option-3').clear().type('Variante repetida');
      by('question-option-2').clear().type('Variante repetida');
      by('question-save').click();
      cy.get('[role=alert]').should('contain', 'al menos 20 caracteres');
      by('question-statement').should('have.focus');
      by('question-statement').clear().type('Tras insertar los valores del escenario, ¿qué rotación ocurre y por qué?');
      by('question-save').click();
      by('question-option-3-error').should('contain', 'repite otra');
      by('question-option-3').clear().type('No hay rotación porque ningún factor sale de [-1, 1]');
      by('question-correct-3').check();
      by('question-hint').clear().type('Observa el factor de balance del abuelo del nodo insertado.');
      by('question-save').click();
    });
    by('quiz-detail-notice').should('contain', 'Pregunta 1 actualizada');
    by('bank-question').eq(0).should('have.attr', 'data-mode', 'view')
      .and('contain', 'Tras insertar los valores del escenario')
      .and('contain', 'Pista: Observa el factor de balance');
    by('bank-question').eq(0).find('[data-cy=bank-question-edited]').should('contain', 'Editada');
    by('bank-question').eq(0).find('li[data-correct=true]').should('contain', 'No hay rotación');

    // Propuesta de la IA: no se guarda hasta aplicarla.
    by('bank-question').eq(1).within(() => {
      by('bank-question-statement').invoke('text').as('original');
      by('bank-question-ai').click();
      by('ai-propose').click();
      by('ai-instruction').should('have.attr', 'aria-invalid', 'true');
      by('ai-instruction').type('Haz los distractores más sutiles');
      by('ai-propose').click();
      by('ai-proposal').should('contain', 'Versión revisada').and('contain', 'Haz los distractores más sutiles');
      by('ai-discard').click();
      by('ai-proposal').should('not.exist');
      by('ai-propose').click();
      by('ai-apply').click();
    });
    by('bank-question').eq(1).find('[data-cy=bank-question-edited]').should('contain', 'Editada con IA');
    by('bank-question').eq(1).find('[data-cy=bank-question-statement]').should('contain', 'Versión revisada');

    // «Ajustar a mano» abre el editor con la propuesta.
    by('bank-question').eq(2).within(() => {
      by('bank-question-ai').click();
      by('ai-instruction').type('Pregunta por el costo');
      by('ai-propose').click();
      by('ai-adjust').click();
      by('question-statement').should('contain.value', 'Versión revisada');
      by('question-cancel').click();
    });
    by('bank-question').eq(2).find('[data-cy=bank-question-edited]').should('not.exist');
  });

  it('en un quiz publicado solo se editan las preguntas que no se han asignado', () => {
    cy.then(() => createPublishedQuiz(course, { questionsPerStudent: 1, studentCount: 3 })).then(quizId => {
      cy.registerStudentByApi('q36p', course);
      cy.storedSession().then(({ accessToken }) =>
        cy.request({ method: 'POST', url: `/api/quizzes/${quizId}/attempt`, headers: { Authorization: `Bearer ${accessToken}` } }));
      cy.clearLocalStorage();
      cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
      cy.visit(`/docencia/quizzes/${quizId}`);
    });
    by('quiz-detail-tab-bank').click();
    by('bank-question').should('have.length', 3);
    by('bank-question-delete').should('not.exist');
    by('bank-question-locked').should('have.length', 1).and('contain', 'Ya se asignó');
    by('bank-question').filter(':has([data-cy=bank-question-locked])').find('[data-cy=bank-question-edit]').should('be.disabled');
    by('bank-question').not(':has([data-cy=bank-question-locked])').first().within(() => {
      by('bank-question-edit').should('not.be.disabled').click();
      by('question-hint').clear().type('Pista corregida tras publicar.');
      by('question-save').click();
    });
    by('quiz-detail-notice').should('contain', 'actualizada');
    by('guidance-panel').should('not.exist');
  });
});

/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { assignSeededTeacher, AVL, BFS, by, newCourse } from '../support/hu34';
import { MATERIAL } from '../support/hu36';

// HU-36 · CA-1 y CA-2: instrucciones y material del curso al crear el quiz y en su banco.
describe('HU-36 · Instrucciones y material para la IA', () => {
  let course: string;

  beforeEach(() => {
    newCourse('Q36').then(code => { course = code; return assignSeededTeacher(code); });
    cy.then(() => cy.registerStudentByApi('q36m', course));
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.visit('/docencia/quizzes');
    by('quiz-course-filter').select(course);
    by('quiz-new').click();
  });

  it('lee el material al crear el quiz, explica las fuentes que fallan y genera sin ellas', () => {
    by('quiz-title').type('Quiz 3 · con material del curso');
    by(`quiz-topic-${AVL}`).check();
    by(`quiz-topic-${BFS}`).check();
    by('quiz-studentCount').clear().type('1');
    by('quiz-instructions').type('Usa la notación del libro del curso y pregunta por el factor de balance.');

    // Validaciones del navegador: esquema del enlace y formato del archivo.
    by('material-url').type('ftp://servidor/notas.md');
    by('material-add-link').click();
    by('quiz-url-error').should('contain', 'http:// o https://');
    by('material-url').clear().type(`${MATERIAL}/libro/`);
    by('material-crawl').check();
    by('material-add-link').click();
    by('material-file-input').selectFile({ contents: Cypress.Buffer.from('x'), fileName: 'presentacion.pptx' }, { force: true });
    by('material-file-error').should('contain', 'formato no admitido');
    by('material-file-input').selectFile({ contents: Cypress.Buffer.from('# Notas de AVL\n\nEl factor de balance decide la rotación.'), fileName: 'notas-avl.md', mimeType: 'text/markdown' }, { force: true });
    by('material-url').type(`${MATERIAL}/falta`);
    by('material-add-link').click();
    by('material-source').should('have.length', 3).each($row => cy.wrap($row).should('have.attr', 'data-state', 'pending'));
    by('material-count').should('contain', '3 de 5 fuentes');

    by('quiz-create').click();
    by('material-problem').should('contain', 'Una fuente no se pudo leer').and('contain', '404');
    by('material-source').eq(0).should('have.attr', 'data-state', 'ready').and('contain', 'Sitio').and('contain', '3 páginas');
    by('material-source').eq(1).should('have.attr', 'data-state', 'ready').and('contain', 'Markdown');
    by('material-source').eq(2).should('have.attr', 'data-state', 'error');
    cy.get('[data-cy=bank-progress]').should('not.exist');
    by('material-generate-anyway').click();
    by('bank-progress').should('have.attr', 'data-status', 'complete');
    by('bank-review').click();

    by('guidance-panel').should('contain', 'Usa la notación del libro del curso');
    by('guidance-panel').find('[data-cy=material-source]').should('have.length', 2);
  });

  it('en el banco edita instrucciones, añade y quita fuentes y rechaza direcciones privadas', () => {
    by('quiz-title').type('Quiz 4 · material desde el banco');
    by(`quiz-topic-${AVL}`).check();
    by('quiz-studentCount').clear().type('1');
    by('quiz-questionsPerStudent').clear().type('1');
    by('quiz-create').click();
    by('bank-progress').should('have.attr', 'data-status', 'complete');
    by('bank-review').click();

    by('guidance-instructions').should('contain', 'Sin instrucciones');
    by('guidance-edit').click();
    by('guidance-textarea').type('Prioriza preguntas de invariantes.');
    by('guidance-save').click();
    by('guidance-instructions').should('contain', 'Prioriza preguntas de invariantes.');

    by('material-url').type('http://192.168.0.10/notas');
    by('material-add-link').click();
    by('guidance-url-error').should('contain', 'dirección privada o local');
    by('material-url').clear().type(`${MATERIAL}/cuaderno.ipynb`);
    by('material-add-link').click();
    by('material-source').should('have.length', 1).and('have.attr', 'data-state', 'ready').and('contain', 'Cuaderno');
    by('material-remove').click();
    by('material-source').should('not.exist');
    by('material-count').should('contain', '0 de 5 fuentes');
  });
});

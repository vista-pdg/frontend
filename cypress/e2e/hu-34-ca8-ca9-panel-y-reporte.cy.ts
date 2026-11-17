/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { answerCurrent, assignSeededTeacher, bankOf, beginQuiz, by, createPublishedQuiz, newCourse } from '../support/hu34';

// HU-34 · CA-8 y CA-9: el docente ve resultados y estadísticas y descarga el reporte CSV y XLSX.
describe('HU-34 · Panel de resultados y reportes', () => {
  it('muestra notas, estadísticas e incidentes por estudiante y exporta el reporte', () => {
    newCourse().then(course => {
      assignSeededTeacher(course);
      createPublishedQuiz(course, { title: 'Quiz con resultados', questionsPerStudent: 2, studentCount: 3 }).then(quizId => {
        bankOf(quizId).then(bank => {
          // Tres matriculados: uno acierta todo, otro falla todo y el tercero no presenta.
          cy.clearLocalStorage();
          cy.registerStudentByApi('q34top', course).as('top');
          beginQuiz(quizId);
          answerCurrent(bank, true);
          by('quiz-next').click();
          answerCurrent(bank, true);
          by('quiz-submit').click();
          by('quiz-confirm-submit').click();
          by('quiz-result-grade').should('contain', '5,0');

          cy.clearLocalStorage();
          cy.registerStudentByApi('q34low', course).as('low');
          beginQuiz(quizId);
          answerCurrent(bank, false);
          cy.window().then(win => win.dispatchEvent(new Event('blur')));
          by('quiz-resume').click();
          by('quiz-submit').click();
          by('quiz-confirm-submit').click();
          by('quiz-result').should('be.visible');

          cy.clearLocalStorage();
          cy.registerStudentByApi('q34absent', course).as('absent');
        });

        cy.clearLocalStorage();
        cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
        cy.visit('/docencia/quizzes');
        by('quiz-course-filter').select(course);
        by(`quiz-manage-row-${quizId}`).should('contain', 'Abierto').and('contain', '2 / 3');
        by(`quiz-manage-open-${quizId}`).should('contain', 'Ver resultados').click();

        by('quiz-detail-title').should('contain', 'Quiz con resultados');
        by('quiz-stat-0').should('have.text', '2,5');
        by('quiz-stat-1').should('have.text', '5,0');
        by('quiz-stat-2').should('have.text', '0,0');
        by('quiz-stat-3').should('have.text', '2 / 3');
        by('quiz-result-row').should('have.length', 3);

        cy.get<string>('@top').then(email => {
          cy.get(`[data-cy=quiz-result-row][data-email="${email}"]`).within(() => {
            cy.contains('Entregado');
            by('quiz-result-score').should('have.text', '2 / 2');
            by('quiz-result-grade').should('have.text', '5,0');
            by('quiz-result-incidents').should('have.text', '0');
            cy.contains('.sr-only', 'Correcta');
          });
        });
        cy.get<string>('@low').then(email => {
          cy.get(`[data-cy=quiz-result-row][data-email="${email}"]`).within(() => {
            by('quiz-result-score').should('have.text', '0 / 2');
            by('quiz-result-grade').should('have.text', '0,0');
            by('quiz-result-incidents').should('have.text', '1');
            cy.contains('.sr-only', 'Incorrecta');
            cy.contains('.sr-only', 'Sin responder');
          });
        });
        cy.get<string>('@absent').then(email => {
          cy.get(`[data-cy=quiz-result-row][data-email="${email}"]`).should('have.attr', 'data-status', 'NOT_STARTED').and('contain', 'Sin presentar');
        });

        // El docente decide cuándo se ve la nota.
        by('quiz-grade-visibility').should('be.checked').uncheck();
        by('quiz-results-notice').should('contain', 'quedó oculta');
        by('quiz-grade-visibility').check();
        by('quiz-results-notice').should('contain', 'ya pueden ver su nota');

        by('quiz-export-csv').click();
        by('quiz-results-notice').should('contain', 'Reporte CSV descargado');
        cy.get<string>('@top').then(top => cy.get<string>('@low').then(low => cy.get<string>('@absent').then(absent => {
          cy.readFile(`cypress/downloads/vista-quiz-${quizId}-resultados.csv`).then((csv: string) => {
            expect(csv).to.contain('"Nombre","Correo","Estado","Aciertos","Total","Nota (0-5)","Incidentes","Inicio","Entrega","P1","P2"');
            expect(csv).to.contain(`"${top}","Entregado",2,2,5.0,0,`);
            expect(csv).to.contain('"Correcta","Correcta"');
            expect(csv).to.contain(`"${low}","Entregado",0,2,0.0,1,`);
            expect(csv).to.contain('"Incorrecta","Sin responder"');
            expect(csv).to.contain(`"${absent}","Sin presentar"`);
          });
        })));

        by('quiz-export-xlsx').click();
        by('quiz-results-notice').should('contain', 'Reporte XLSX descargado');
        cy.readFile(`cypress/downloads/vista-quiz-${quizId}-resultados.xlsx`, 'binary').then((xlsx: string) => {
          expect(xlsx.slice(0, 2), 'contenedor ZIP').to.eq('PK');
          expect(xlsx).to.contain('xl/worksheets/sheet1.xml');
        });

        // Publicado: el banco se consulta pero ya no se edita.
        by('quiz-detail-tab-bank').click();
        by('bank-question').should('have.length', 6);
        cy.get('[data-cy=bank-question-delete]').should('not.exist');
        cy.get('[data-cy=quiz-delete]').should('not.exist');
      });
    });
  });
});

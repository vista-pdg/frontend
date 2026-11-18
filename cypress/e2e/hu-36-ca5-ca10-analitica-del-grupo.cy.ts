/// <reference types="cypress" />
import { SEEDED } from '../support/commands';
import { assignSeededTeacher, by, createPublishedQuiz, newCourse } from '../support/hu34';
import { presentByApi } from '../support/hu36';

// HU-36 · CA-5 a CA-8 y CA-10: la analítica del grupo con quizzes reales, sin fechas por defecto.
describe('HU-36 · Analítica pedagógica del grupo', () => {
  it('muestra temas, preguntas y quizzes del grupo y explica el umbral del periodo', () => {
    let quiz = 0;
    newCourse('Q36A').then(course => {
      assignSeededTeacher(course);
      // Banco de 2 preguntas: cada una recibe las 5 respuestas y entra al ranking (mínimo 3).
      createPublishedQuiz(course, { title: 'Quiz analítica', questionsPerStudent: 2, studentCount: 1 }).then(id => {
        quiz = id;
        for (let i = 0; i < 5; i++) {
          cy.registerStudentByApi(`q36a${i}`, course);
          presentByApi(id, i % 2 === 0 ? 1 : 2);
        }
      });
      cy.clearLocalStorage();
      cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
      cy.intercept('GET', '/api/analytics/report?*').as('report');
      cy.visit('/analytics');
      cy.wait('@report');
      by('analytics-course').select(course);
      by('analytics-apply').click();
      cy.wait('@report').then(({ request, response }) => {
        expect(Object.fromEntries(new URL(request.url).searchParams)).to.deep.eq({ courseCode: course });
        expect(response?.body.status).to.eq('AVAILABLE');
      });
    });
    by('analytics-applied').should('contain', 'Todo el periodo');
    by('analytics-kpi-active').should('have.text', '5');
    by('analytics-kpi-accuracy').should('contain', '%');
    by('analytics-summary').should('contain', 'Temas que más cuestan').and('contain', 'Mejor dominados');

    by('analytics-tab-topics').click();
    by('analytics-topic-row').should('have.length.at.least', 2).first().should('have.attr', 'data-level');
    by('analytics-tab-questions').click();
    by('analytics-hard-question').should('have.length.at.least', 1).first().should('contain', '5 respuestas');
    by('analytics-tab-quizzes').click();
    by('analytics-quiz-row').should('have.length', 1).and('contain', 'Quiz analítica').and('contain', '5 / 5');

    // Filtro opcional de quiz.
    cy.then(() => by('analytics-quiz').select(String(quiz)));
    by('analytics-apply').click();
    cy.wait('@report').then(({ request }) => expect(request.url).to.contain(`quizId=${quiz}`));
    by('analytics-applied').should('contain', 'Quiz analítica');

    // Un periodo sin actividad no alcanza el umbral: un único aviso y «Quitar fechas».
    by('analytics-from').type('2020-01-01');
    by('analytics-to').type('2020-01-31');
    by('analytics-apply').click();
    by('analytics-suppressed').should('contain', 'Datos insuficientes para garantizar el anonimato').and('contain', 'Amplía el periodo');
    by('analytics-tab-summary').should('not.exist');
    by('analytics-clear-dates').click();
    // La pestaña elegida se conserva al recalcular.
    by('analytics-tab-quizzes').should('have.attr', 'aria-pressed', 'true');
    by('analytics-tab-summary').click();
    by('analytics-kpi-active').should('have.text', '5');

    cy.intercept('GET', '/api/analytics/report.csv?*').as('csv');
    by('analytics-clear').click();
    cy.wait('@report');
    by('analytics-export').click();
    cy.wait('@csv').its('response.statusCode').should('eq', 200);
    by('analytics-course').invoke('val').then(course =>
      cy.readFile(`cypress/downloads/vista-analitica-${course}-2026-1.csv`).should('contain', '"Temas"').and('contain', '"Quizzes"'));
  });
});

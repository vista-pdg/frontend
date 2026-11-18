/// <reference types="cypress" />
import { adminHeaders, answerCurrent, bankOf, beginQuiz, by, createPublishedQuiz, newCourse } from '../support/hu34';

// HU-34 · CA-4 y CA-7: un intento, sin respuestas a la vista, retomable, y nota según el docente.
describe('HU-34 · Intento del estudiante y nota', () => {
  it('responde con VISTA al lado, retoma tras recargar y ve su nota al entregar', () => {
    newCourse().then(course => createPublishedQuiz(course, { title: 'Quiz con nota visible', questionsPerStudent: 2 }).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34flow', course);
      cy.intercept('POST', `/api/quizzes/${quizId}/attempt`).as('start');
      beginQuiz(quizId);
      // El intento llega sin la respuesta correcta ni la justificación.
      cy.wait('@start').then(({ response }) => {
        const raw = JSON.stringify(response!.body);
        expect(raw).not.to.contain('correctIndex');
        expect(raw).not.to.contain('explanation');
        expect(response!.body.questions).to.have.length(2);
      });

      // La pregunta convive con el espacio de trabajo de VISTA y con su chat.
      by('quiz-exam-title').should('contain', 'Quiz con nota visible');
      by('quiz-workspace').find('[data-cy=activity-selector]').should('be.visible');
      by('quiz-workspace').find('[data-cy=app-sidebar]').should('be.visible');
      cy.get('[data-cy=sidebar-quizzes]').should('not.exist');
      cy.get('[data-cy=tutorial-open]').should('not.exist');
      by('quiz-timer').invoke('text').should('match', /^(29|30):\d\d$/);
      by('quiz-answered').should('contain', 'Respondidas 0 de 2');
      cy.get('[data-cy^="quiz-option-"]').should('have.length', 4);

      bankOf(quizId).then(bank => {
        answerCurrent(bank, false);
        answerCurrent(bank, true); // cambia de opinión antes de entregar
        by('quiz-answered').should('contain', 'Respondidas 1 de 2');

        // Recargar no pierde el intento: vuelve a la compuerta y retoma con lo respondido.
        cy.reload();
        by('quiz-gate').should('contain', 'Retomar el quiz');
        by('quiz-start').should('contain', 'continuar').click();
        by('quiz-answered').should('contain', 'Respondidas 1 de 2');
        by('quiz-nav-1').click();
        cy.get('[data-cy^="quiz-option-"][data-selected=true]').should('have.length', 1);

        by('quiz-submit').click();
        by('quiz-confirm-message').should('contain', 'Tienes 1 pregunta sin responder');
        by('quiz-confirm-cancel').click();
        by('quiz-next').click();
        answerCurrent(bank, false);
        by('quiz-submit').click();
        by('quiz-confirm-message').should('contain', 'Respondiste todas las preguntas');
        by('quiz-confirm-submit').click();
      });

      by('quiz-result-title').should('contain', 'Quiz entregado');
      by('quiz-result-grade').should('contain', '2,5').and('contain', '1 de 2 respuestas correctas');
      by('quiz-result-back').click();
      by(`quiz-row-${quizId}`).should('have.attr', 'data-state', 'FINISHED');
      by(`quiz-grade-${quizId}`).should('contain', '2,5 / 5,0');
      // Un solo intento: volver a entrar muestra el resultado, no otra oportunidad.
      cy.visit(`/quizzes/${quizId}/presentar`);
      by('quiz-result').should('be.visible');
      cy.get('[data-cy=quiz-start]').should('not.exist');
    }));
  });

  it('al entregar enseguida, espera a que se guarde la última respuesta y la califica', () => {
    newCourse().then(course => createPublishedQuiz(course, { title: 'Quiz entregado al instante', questionsPerStudent: 1 }).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34fast', course);
      beginQuiz(quizId);
      // La respuesta tarda en llegar al servidor: si la entrega no la esperara, se calificaría sin ella.
      cy.intercept('PUT', `/api/quizzes/${quizId}/attempt/answers/*`, req => new Promise<void>(resolve => {
        setTimeout(() => { req.continue(); resolve(); }, 1500);
      })).as('save');
      cy.intercept('POST', `/api/quizzes/${quizId}/attempt/submit`).as('submit');
      bankOf(quizId).then(bank => {
        by('quiz-scenario').invoke('text').then(scenario => by('quiz-statement').invoke('text').then(statement => {
          const question = bank.find(q => q.scenario === scenario && q.statement === statement)!;
          cy.contains('[data-cy^="quiz-option-"]', question.options[question.correctIndex]).find('input').check();
        }));
      });
      by('quiz-saved').should('contain', 'Guardando');
      by('quiz-submit').click();
      by('quiz-confirm-submit').click();
      by('quiz-confirm-submit').should('contain', 'Entregando');
      cy.wait('@save');
      cy.wait('@submit');
      by('quiz-result-grade').should('contain', '5,0').and('contain', '1 de 1 respuestas correctas');
    }));
  });

  it('oculta la nota hasta que el docente la habilita', () => {
    newCourse().then(course => createPublishedQuiz(course, { title: 'Quiz con nota oculta', showGrade: false }).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi('q34hide', course);
      beginQuiz(quizId);
      by('quiz-submit').click();
      by('quiz-confirm-submit').click();
      by('quiz-result-title').should('contain', 'Quiz entregado');
      by('quiz-result-hidden').should('be.visible');
      cy.get('[data-cy=quiz-result-grade]').should('not.exist');
      by('quiz-result-back').click();
      by(`quiz-grade-hidden-${quizId}`).should('contain', 'aún no publica la nota');

      adminHeaders().then(headers => cy.request({ method: 'PUT', url: `/api/quizzes/manage/${quizId}/grade-visibility`, headers, body: { showGrade: true } }));
      cy.reload();
      by(`quiz-grade-${quizId}`).should('contain', '0,0 / 5,0').and('contain', '0 de 2 aciertos');
    }));
  });
});

/// <reference types="cypress" />
import { beginQuiz, by, createPublishedQuiz, newCourse } from '../support/hu34';
import type { SetupQuestion } from '../support/hu35';

// HU-35 · CA-1: en el modo de prueba no se puede pegar; el escenario llega al chat con un clic.
describe('HU-35 · Escenario de la pregunta al chat', () => {
  function startQuiz(prefix: string): Cypress.Chainable<SetupQuestion[]> {
    return newCourse().then(course => createPublishedQuiz(course, { title: 'Quiz con escenario al chat', questionsPerStudent: 2 }).then(quizId => {
      cy.clearLocalStorage();
      cy.registerStudentByApi(prefix, course);
      cy.intercept('POST', `/api/quizzes/${quizId}/attempt`).as('start');
      beginQuiz(quizId);
      return cy.wait('@start').then(({ response }) => response!.body.questions as SetupQuestion[]);
    }));
  }

  it('escribe la instrucción validada sin enviarla, el chat la construye y el algoritmo queda listo', () => {
    startQuiz('q35chat').then(questions => {
      const avl = questions.find(q => q.setup.algorithm === 'tree/avl/insert')!;
      const bfs = questions.find(q => q.setup.algorithm === 'graph/simple/bfs')!;
      expect(avl.setup.chatPrompt).to.match(/^Construye desde cero un árbol AVL insertando, en este orden, los valores /);
      expect(bfs.setup.chatPrompt).to.match(/^Construye desde cero un grafo no dirigido y ponderado/);
      let sent = 0;
      cy.intercept('POST', '/api/generate', () => { sent += 1; }).as('generate');

      // AVL: insertar en el chat escribe, abre el chat con la estructura elegida y no envía nada.
      by(`quiz-nav-${avl.position}`).click();
      by('scenario-insert-chat').click();
      by('chat-toggle').should('have.attr', 'aria-pressed', 'true');
      by('chat-input').should('have.value', avl.setup.chatPrompt).and('have.focus');
      by('chat-draft-note').should('contain', `pregunta ${avl.position}`);
      by('work-mode').should('contain', 'Árbol AVL');
      cy.wait(400).then(() => expect(sent, 'nada se envía solo').to.eq(0));
      by('chat-send').click();
      cy.wait('@generate').then(({ request, response }) => {
        expect(request.body).to.include({ prompt: avl.setup.chatPrompt, type: 'tree', subtype: 'avl' });
        expect(response!.statusCode).to.eq(200);
        expect(response!.body.meta.nodeCount).to.eq(avl.setup.values!.length);
      });
      by('chat-draft-note').should('not.exist');

      // Cargar en Algoritmos deja el algoritmo y los valores, listo para ejecutar.
      by('scenario-load-algorithm').click();
      by('algorithm-toggle').should('have.attr', 'aria-pressed', 'true');
      by('algo-values').should('have.value', avl.setup.values!.join(', '));
      by('algo-draft-note').should('contain', `Cargado desde la pregunta ${avl.position}`);
      by('algo-generate').click();
      by('step-card').should('be.visible');

      // BFS: sobre el lienzo. Solo hay chat, y el algoritmo queda preparado para «Usar lienzo».
      by(`quiz-nav-${bfs.position}`).click();
      by('scenario-load-algorithm').should('not.exist');
      by('scenario-insert-chat').click();
      by('chat-input').should('have.value', bfs.setup.chatPrompt);
      by('chat-send').click();
      cy.wait('@generate').then(({ request, response }) => {
        expect(request.body).to.include({ type: 'graph' });
        expect(response!.body.meta.type).to.eq('graph');
        expect(response!.body.meta.nodeCount).to.eq(6);
      });
      by('algorithm-toggle').click();
      by('algo-draft-note').should('contain', `Preparado desde la pregunta ${bfs.position}`);
      by('algo-start').find('option:selected').should('have.text', bfs.setup.start);
      by('algo-generate').click();
      by('step-card').should('be.visible');
    });
  });

  it('en móvil, insertar cambia a la pestaña VISTA con el chat ya escrito', () => {
    cy.viewport(390, 844);
    startQuiz('q35mobile').then(questions => {
      const first = questions.find(q => q.position === 1)!;
      by('scenario-insert-chat').should('be.visible').click();
      by('quiz-tab-vista').should('have.attr', 'aria-pressed', 'true');
      by('quiz-question-panel').should('not.be.visible');
      by('chat-input').should('be.visible').and('have.value', first.setup.chatPrompt);
    });
  });
});

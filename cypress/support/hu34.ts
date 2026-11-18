/// <reference types="cypress" />
import { SEEDED } from './commands';

/**
 * Ayudas de la HU-34 (quizzes). Preparan datos por la API real —curso propio, quiz con banco del
 * sustituto determinista del perfil e2e— para que cada spec ejercite la interfaz sobre el backend
 * de verdad y no dependa de lo que dejaron otras pruebas.
 */

export const by = (id: string) => cy.get(`[data-cy="${id}"]`);
export const AVL = 'tree/avl/insert';
export const BFS = 'graph/simple/bfs';

type Headers = { Authorization: string };
export interface BankQuestion { id: number; scenario: string; statement: string; options: string[]; correctIndex: number }
export interface QuizOverrides {
  title?: string;
  questionsPerStudent?: number;
  studentCount?: number;
  timeLimitMinutes?: number;
  opensInSeconds?: number;
  closesInSeconds?: number;
  showGrade?: boolean;
}

export function adminHeaders(): Cypress.Chainable<Headers> {
  return cy.request('POST', '/api/auth/login', SEEDED.admin)
    .then(({ body }) => ({ Authorization: `Bearer ${body.accessToken}` }));
}

/** Curso nuevo del periodo activo; devuelve su código. */
export function newCourse(prefix = 'Q34'): Cypress.Chainable<string> {
  const code = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  return adminHeaders().then(headers =>
    cy.request({ method: 'POST', url: '/api/admin/courses', headers, body: { code, name: `Curso ${code}`, termCode: '2026-1' } })
      .then(() => code));
}

export function assignSeededTeacher(course: string): Cypress.Chainable {
  return adminHeaders().then(headers =>
    cy.request({ url: '/api/admin/users', headers }).then(({ body }) => {
      const teacher = body.find((user: { email: string }) => user.email === SEEDED.teacher.email);
      return cy.request({ method: 'PUT', url: `/api/admin/courses/${course}/teachers/${teacher.id}`, headers });
    }));
}

function fillBank(quizId: number, headers: Headers): Cypress.Chainable {
  return cy.request({ method: 'POST', url: `/api/quizzes/manage/${quizId}/bank/generate`, headers })
    .then(({ body }) => (body.complete ? cy.wrap(null) : fillBank(quizId, headers)));
}

export function createDraftQuiz(course: string, overrides: QuizOverrides = {}): Cypress.Chainable<number> {
  const now = Date.now();
  return adminHeaders().then(headers =>
    cy.request({
      method: 'POST', url: '/api/quizzes/manage', headers,
      body: {
        courseCode: course,
        title: overrides.title ?? 'Quiz E2E · AVL y BFS',
        topics: [AVL, BFS],
        questionsPerStudent: overrides.questionsPerStudent ?? 2,
        studentCount: overrides.studentCount ?? 2,
        timeLimitMinutes: overrides.timeLimitMinutes ?? 30,
        opensAt: new Date(now + (overrides.opensInSeconds ?? -3600) * 1000).toISOString(),
        closesAt: new Date(now + (overrides.closesInSeconds ?? 172800) * 1000).toISOString(),
        showGrade: overrides.showGrade ?? true,
      },
    }).then(({ body }) => body.id as number));
}

/** Quiz publicado con el banco completo. */
export function createPublishedQuiz(course: string, overrides: QuizOverrides = {}): Cypress.Chainable<number> {
  return createDraftQuiz(course, overrides).then(quizId =>
    adminHeaders().then(headers =>
      fillBank(quizId, headers)
        .then(() => cy.request({ method: 'POST', url: `/api/quizzes/manage/${quizId}/publish`, headers }))
        .then(() => quizId)));
}

export function bankOf(quizId: number): Cypress.Chainable<BankQuestion[]> {
  return adminHeaders().then(headers =>
    cy.request({ url: `/api/quizzes/manage/${quizId}`, headers }).then(({ body }) => body.questions as BankQuestion[]));
}

/** Entra al modo de prueba desde la compuerta. */
export function beginQuiz(quizId: number) {
  cy.visit(`/quizzes/${quizId}/presentar`);
  by('quiz-gate').should('be.visible');
  by('quiz-start').click();
  by('quiz-question-panel').should('be.visible');
}

/**
 * Elige, en la pregunta visible, la opción correcta (o una incorrecta) según el banco, y espera a
 * que el servidor confirme esa respuesta: el indicador «Guardado» puede venir de la pregunta anterior.
 */
export function answerCurrent(bank: BankQuestion[], correct: boolean) {
  cy.get('[data-cy^="quiz-nav-"][aria-current="step"]').invoke('attr', 'data-cy').then(nav => {
    const position = Number(nav!.replace('quiz-nav-', ''));
    cy.intercept('PUT', `**/attempt/answers/${position}`).as(`answer-${position}`);
    by('quiz-scenario').invoke('text').then(scenario => {
      by('quiz-statement').invoke('text').then(statement => {
        const question = bank.find(q => q.scenario === scenario && q.statement === statement);
        expect(question, 'la pregunta visible está en el banco').to.not.equal(undefined);
        const right = question!.options[question!.correctIndex];
        cy.get('[data-cy^="quiz-option-"]').then($options => {
          const target = [...$options].find(option => (option.textContent === right) === correct);
          expect(target, 'opción a elegir').to.not.equal(undefined);
          cy.wrap(target!).find('input').check();
          cy.wrap(target!).should('have.attr', 'data-selected', 'true');
        });
      });
    });
    cy.wait(`@answer-${position}`).then(({ response }) => {
      expect(response?.statusCode, `guardado de la pregunta ${position}`).to.eq(200);
      const saved = response!.body.questions.find((q: { position: number }) => q.position === position);
      expect(saved.selectedOption, `respuesta ${position} en el servidor`).to.not.equal(null);
    });
  });
  by('quiz-saved').should('contain', 'Guardado');
}

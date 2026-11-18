import type { StepsResponse } from '../../src/types/graph';

/** Real API Java must be usable in the same player, not just present in its JSON. */
export function verifyJavaCode(body: StepsResponse) {
  const java = body.representations?.find(r => r.language === 'java');
  expect(java, 'Java del algoritmo').to.exist;
  expect(java!.fileName).to.match(/\.java$/);
  expect(java!.code.length).to.be.greaterThan(0);
  for (const step of body.steps!) {
    if (step.line == null) continue;
    const mapped = java!.lineMap[step.line];
    expect(mapped, `Java del paso ${step.index}`).to.have.length.greaterThan(0);
    for (const line of mapped) {
      expect(line).to.be.within(1, java!.code.length);
      expect(java!.code[line - 1].trim()).not.to.eq('');
    }
  }
  cy.window().then(win => {
    const before = JSON.stringify(win.__vista!.engine.getState());
    cy.get('[data-cy=code-view-java]').click();
    cy.get('[data-cy=code-panel]').should('have.attr', 'data-language', 'java');
    const logical = body.steps![0].line;
    if (logical != null) for (const line of java!.lineMap[logical]) {
      cy.get(`[data-cy=code-line-${line}]`).should('have.attr', 'data-active', 'true')
        .and('contain', java!.code[line - 1].trim());
    }
    cy.get('[data-cy=code-view-pseudocode]').click();
    cy.get('[data-cy=code-panel]').should('have.attr', 'data-language', 'pseudocode');
    cy.get('[data-cy=code-view-java]').click();
    cy.window().should(after => expect(JSON.stringify(after.__vista!.engine.getState())).to.eq(before));
  });
}

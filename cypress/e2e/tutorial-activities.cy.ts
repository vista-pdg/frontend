describe('CA-6 · Puente entre Chat y Algoritmos en la guía', () => {
  it('explica ambos botones antes de abrir el área de escritura', () => {
    cy.loginByApi('estudiante@u.icesi.edu.co','estudiante123'); cy.visit('/');
    cy.get('[data-cy=tutorial-open]').click();
    cy.get('[data-cy=tutorial-next]').click();
    cy.get('[data-cy=tutorial-highlight]').should('have.attr','data-target','[data-cy=activity-selector]');
    cy.get('[data-cy=tutorial-callout]').should('contain','Chat y algoritmos').and('contain','Usar lienzo').and('contain','Crear con valores');
    cy.get('[data-cy=chat-panel]').should('not.be.visible');
    cy.get('[data-cy=algorithm-panel]').should('not.be.visible');
    cy.get('[data-cy=tutorial-next]').click();
    cy.get('[data-cy=tutorial-highlight]').should('have.attr','data-target','[data-cy=chat-compose]');
    cy.get('[data-cy=tutorial-next]').click();
    cy.get('[data-cy=tutorial-callout]').should('contain','Ejecuta un algoritmo');
    cy.get('[data-cy=tutorial-close]').click();
    cy.get('[data-cy=tutorial-open]').should('have.focus');
  });
});

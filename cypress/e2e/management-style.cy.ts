describe('CA-4 · Marco visual de administración y analítica', () => {
  it('comparte cabecera institucional, escala de título y espaciados', () => {
    cy.loginByApi('admin@vista.com','admin123');
    const styles: Record<string,string> = {};
    for (const route of ['/admin','/analytics']) {
      cy.visit(route);
      cy.get('header [data-cy=icesi-brand]').should('have.css','width','32px');
      cy.get('main h1').should('have.css','font-size','20px');
      cy.get('header > div').then($el => {
        const value = getComputedStyle($el[0]).padding;
        if (route === '/admin') styles.padding = value;
        else expect(value).to.eq(styles.padding);
      });
    }
  });
});

describe('CA-3 · Grupos de discretas 3 y 5', () => {
  it('los grupos están disponibles y se puede registrar en cada uno', () => {
    cy.request('/api/courses').then(({body}) => {
      for (const code of ['CEDI-G3','CEDI-G5']) {
        const matches = body.filter((c: {code: string}) => c.code === code);
        expect(matches).to.have.length(1);
        expect(matches[0]).to.include({name:'Computación y Estructuras Discretas I',termCode:'2026-1'});
        cy.registerStudentByApi('canvas.groups', code).then(email => {
          cy.request('POST','/api/auth/login',{email,password:'clave12345'}).its('body.courseCode').should('eq',code);
        });
      }
    });
  });
});

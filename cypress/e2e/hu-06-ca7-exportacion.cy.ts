/// <reference types="cypress" />
import { openAnalyticsFixture, by, protectedFixture } from '../support/hu06';

// Prueba funcional de UI con fixtures; no sustituye la integración contra Postgres.
it('descarga el CSV del servidor conservando curso, fechas y supresión', () => {
  openAnalyticsFixture(protectedFixture());
  cy.intercept('GET', '/api/analytics/report.csv?*', { headers: { 'content-type': 'text/csv' }, body: '\ufeff"estado"\r\n"Datos insuficientes para garantizar el anonimato"\r\n' }).as('csv');
  by('analytics-from').clear().type('2026-04-01'); by('analytics-to').clear().type('2026-04-30'); by('analytics-apply').click(); cy.wait('@report');
  by('analytics-export').click();
  cy.wait('@csv').then(({ request }) => expect(Object.fromEntries(new URL(request.url).searchParams)).to.deep.eq({ courseCode: 'CEDI-G1', from: '2026-04-01', to: '2026-04-30' }));
  cy.readFile('cypress/downloads/vista-analitica-2026-04-01-2026-04-30.csv').should('contain', 'Datos insuficientes para garantizar el anonimato');
});

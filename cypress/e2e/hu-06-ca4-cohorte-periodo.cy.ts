/// <reference types="cypress" />
import { openAnalyticsFixture, by } from '../support/hu06';

// Prueba funcional de UI con fixtures; no sustituye la integración contra Postgres.
it('recalcula con los filtros aplicados y deshabilita exportación mientras están pendientes', () => {
  openAnalyticsFixture(); by('analytics-course').find('option').should('have.length', 2);
  by('analytics-course').select('CEDI-G2'); by('analytics-from').clear().type('2026-04-01'); by('analytics-to').clear().type('2026-04-30');
  by('analytics-export').should('be.disabled'); by('analytics-apply').click();
  cy.wait('@report').then(({ request }) => {
    const q = new URL(request.url).searchParams;
    expect(Object.fromEntries(q)).to.deep.eq({ courseCode: 'CEDI-G2', from: '2026-04-01', to: '2026-04-30' });
  });
  by('analytics-applied').should('contain', 'CEDI-G2').and('contain', '01/04/2026').and('contain', '30/04/2026');
  by('analytics-export').should('not.be.disabled');
});

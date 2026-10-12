/// <reference types="cypress" />
import { openAnalyticsFixture, by } from '../support/hu06';

// Prueba funcional de UI con fixtures; no sustituye la integración contra Postgres.
it('no ofrece controles de filtrado ni acceso por estudiante en ninguna vista', () => {
  openAnalyticsFixture(undefined, 'ADMIN');
  for (const view of ['structures', 'algorithms', 'retries']) {
    by(`analytics-view-${view}`).click();
    by('analytics-page').find('input,select').then(fields => expect([...fields].map(f => f.getAttribute('name'))).to.deep.eq(['courseCode', 'from', 'to']));
    by('analytics-ranking').find('a,input,select,button').should('not.exist');
  }
});

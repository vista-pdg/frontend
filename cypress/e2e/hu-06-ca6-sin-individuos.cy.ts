/// <reference types="cypress" />
import { openAnalyticsFixture, by, openUsage } from '../support/hu06';

// Prueba funcional de UI con fixtures; no sustituye la integración contra Postgres.
it('no ofrece controles de filtrado ni acceso por estudiante en ninguna vista', () => {
  openAnalyticsFixture(undefined, 'ADMIN');
  const fields = () => by('analytics-page').find('input,select').then(found => expect([...found].map(f => f.getAttribute('name'))).to.deep.eq(['courseCode', 'from', 'to', 'quizId']));
  for (const tab of ['summary', 'topics', 'questions', 'quizzes']) {
    by(`analytics-tab-${tab}`).click(); fields();
    by('analytics-page').find('main a').should('not.exist');
  }
  openUsage();
  for (const view of ['structures', 'algorithms', 'retries']) {
    by(`analytics-view-${view}`).click(); fields();
    by('analytics-ranking').find('a,input,select,button').should('not.exist');
  }
});

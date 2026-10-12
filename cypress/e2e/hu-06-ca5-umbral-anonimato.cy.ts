/// <reference types="cypress" />
import { openAnalyticsFixture, by, protectedFixture } from '../support/hu06';

// Prueba funcional de UI con fixtures; no sustituye la integración contra Postgres.
it('oculta todas las métricas de los segmentos suprimidos', () => {
  openAnalyticsFixture(protectedFixture());
  for (const view of ['structures', 'algorithms', 'retries']) {
    by(`analytics-view-${view}`).click(); by('analytics-suppressed').first().should('contain', 'Datos insuficientes para garantizar el anonimato');
    by('analytics-ranking').find('dd').should('not.exist');
  }
});

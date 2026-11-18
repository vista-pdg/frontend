/// <reference types="cypress" />
import { openAnalyticsFixture, by, protectedFixture } from '../support/hu06';

// Prueba funcional de UI con fixtures; no sustituye la integración contra Postgres.
// HU-36 · CA-5: el umbral es del grupo; por debajo, un único aviso y ninguna métrica.
it('oculta todas las métricas cuando el grupo no alcanza el umbral', () => {
  openAnalyticsFixture(protectedFixture());
  by('analytics-suppressed').should('contain', 'Datos insuficientes para garantizar el anonimato').and('contain', 'menos de 5 estudiantes');
  by('analytics-tab-summary').should('not.exist');
  by('analytics-ranking').should('not.exist');
  by('analytics-page').find('dd').should('not.exist');
});

/// <reference types="cypress" />
import { openAnalyticsFixture, by, openUsage } from '../support/hu06';

// Prueba funcional de UI con fixtures; no sustituye la integración contra Postgres.
it('cambia de vista y presenta ejecuciones y pasos completados', () => {
  openAnalyticsFixture(); openUsage(); by('analytics-view-algorithms').click().should('have.attr', 'aria-pressed', 'true');
  by('analytics-algorithm-row').should('contain', 'BFS').and('contain', '80').and('contain', '6,5');
});

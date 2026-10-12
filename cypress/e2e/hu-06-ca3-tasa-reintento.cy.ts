/// <reference types="cypress" />
import { openAnalyticsFixture, by } from '../support/hu06';

// Prueba funcional de UI con fixtures; no sustituye la integración contra Postgres.
it('destaca la dificultad con texto además de color', () => {
  openAnalyticsFixture(); by('analytics-view-retries').click();
  by('analytics-retry-row').should('have.attr', 'data-highlighted', 'true').and('contain', '50 %').and('contain', 'Supera el umbral');
  by('analytics-retry-rule').should('contain', '30 %');
});

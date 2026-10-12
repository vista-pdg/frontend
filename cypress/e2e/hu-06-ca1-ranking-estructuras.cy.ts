/// <reference types="cypress" />
import { openAnalyticsFixture, by } from '../support/hu06';

// Prueba funcional de UI con fixtures; no sustituye la integración contra Postgres.
it('muestra el orden, las frecuencias y los porcentajes recibidos', () => {
  openAnalyticsFixture();
  by('analytics-structure-row').should('have.length', 2).first().should('contain', 'Árbol AVL').and('contain', '120').and('contain', '60 %');
  by('analytics-structure-row').last().should('contain', 'Pila').and('contain', '80').and('contain', '40 %');
});

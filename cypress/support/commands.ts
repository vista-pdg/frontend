/// <reference types="cypress" />

/**
 * Comandos compartidos por los specs de la HU-08.
 *
 * <p>Las pruebas hablan con el backend real a traves del proxy de Vite, igual que la aplicacion. No
 * se usan interceptores simulados: lo que estas pruebas deben demostrar —que el par de tokens rota,
 * que el reuso cierra la sesion, que el rol decide la redireccion— vive en el backend, y con
 * respuestas falsas pasarian sin probar nada.
 */

export const SEEDED = {
  teacher: { email: 'docente@u.icesi.edu.co', password: 'docente123' },
  student: { email: 'estudiante@u.icesi.edu.co', password: 'estudiante123' },
  admin: { email: 'admin@vista.com', password: 'admin123' },
};

const ACCESS_KEY = 'vista_access_token';
const REFRESH_KEY = 'vista_refresh_token';
const USER_KEY = 'vista_user';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Correo institucional unico, para que cada prueba cree su propia cuenta. */
      uniqueEmail(prefix?: string): Chainable<string>;
      /** Autentica por API y deja la sesion lista, sin pasar por el formulario. */
      loginByApi(email: string, password: string): Chainable<void>;
      storedSession(): Chainable<{
        accessToken: string | null;
        refreshToken: string | null;
        user: { email: string; displayName: string; roles: string[] } | null;
      }>;
    }
  }
}

Cypress.Commands.add('uniqueEmail', (prefix = 'e2e') => {
  return cy.wrap(`${prefix}.${Date.now()}.${Math.floor(Math.random() * 1000)}@u.icesi.edu.co`);
});

Cypress.Commands.add('loginByApi', (email: string, password: string) => {
  cy.request('POST', '/api/auth/login', { email, password }).then(({ body }) => {
    cy.window().then((win) => {
      win.localStorage.setItem(ACCESS_KEY, body.accessToken);
      win.localStorage.setItem(REFRESH_KEY, body.refreshToken);
      win.localStorage.setItem(
        USER_KEY,
        JSON.stringify({
          email: body.email,
          displayName: body.displayName,
          roles: body.roles,
        })
      );
    });
  });
});

Cypress.Commands.add('storedSession', () => {
  return cy.window().then((win) => {
    const raw = win.localStorage.getItem(USER_KEY);
    return {
      accessToken: win.localStorage.getItem(ACCESS_KEY),
      refreshToken: win.localStorage.getItem(REFRESH_KEY),
      user: raw ? JSON.parse(raw) : null,
    };
  });
});

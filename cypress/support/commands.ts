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
      /** Registra un estudiante nuevo por API, deja la sesion lista y devuelve su correo. */
      registerStudentByApi(prefix?: string, courseCode?: string): Chainable<string>;
      /** Cambia la cuota diaria de un curso como administrador (HU-17). */
      adminSetQuota(courseCode: string, dailyQuota: number): Chainable<void>;
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

Cypress.Commands.add('registerStudentByApi', (prefix = 'e2e', courseCode = 'CEDI-G1') => {
  const email = `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1000)}@u.icesi.edu.co`;
  return cy
    .request('POST', '/api/auth/register', {
      displayName: `E2E ${prefix}`,
      email,
      password: 'clave12345',
      confirmPassword: 'clave12345',
      courseCode,
    })
    .then(({ body }) =>
      cy.window().then((win) => {
        win.localStorage.setItem(ACCESS_KEY, body.accessToken);
        win.localStorage.setItem(REFRESH_KEY, body.refreshToken);
        win.localStorage.setItem(
          USER_KEY,
          JSON.stringify({ email: body.email, displayName: body.displayName, roles: body.roles })
        );
        return email;
      })
    );
});

Cypress.Commands.add('adminSetQuota', (courseCode: string, dailyQuota: number) => {
  cy.request('POST', '/api/auth/login', SEEDED.admin).then(({ body }) => {
    cy.request({
      method: 'PUT',
      url: `/api/admin/courses/${courseCode}/quota`,
      headers: { Authorization: `Bearer ${body.accessToken}` },
      body: { dailyQuota },
    })
      .its('status')
      .should('eq', 200);
  });
});

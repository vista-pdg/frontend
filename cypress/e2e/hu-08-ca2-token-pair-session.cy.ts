/// <reference types="cypress" />
import { SEEDED } from '../support/commands';

/**
 * CA-2 — «JWT con token pair de acceso y refresco con deteccion de reuso».
 *
 * <p>Las pruebas del backend ya cubren la mecanica de rotacion contra la base. Lo que solo se puede
 * comprobar aqui es la mitad del cliente: que el refresco ocurra de forma silenciosa sin sacar al
 * usuario de donde esta, y que cuando el backend corta la familia la aplicacion reaccione cerrando
 * la sesion en lugar de quedarse mostrando una pantalla muerta.
 */
describe('CA-2 · Par de tokens, refresco silencioso y deteccion de reuso', () => {
  const ACCESS = 'vista_access_token';
  const REFRESH = 'vista_refresh_token';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/login');
  });

  it('el login guarda un par de tokens distintos entre si', () => {
    cy.get('[data-cy=input-email]').type(SEEDED.student.email);
    cy.get('[data-cy=input-password]').type(SEEDED.student.password);
    cy.get('[data-cy=submit]').click();
    cy.location('pathname').should('eq', '/');

    cy.storedSession().then((s) => {
      expect(s.accessToken, 'token de acceso').to.be.a('string').and.not.be.empty;
      expect(s.refreshToken, 'token de refresco').to.be.a('string').and.not.be.empty;
      expect(s.accessToken).to.not.eq(s.refreshToken);
      // El de acceso es un JWT (tres segmentos); el de refresco es opaco y no debe serlo.
      expect(s.accessToken!.split('.')).to.have.length(3);
      expect(s.refreshToken!.split('.')).to.have.length(1);
    });
  });

  it('un token de acceso caducado se refresca solo y la peticion se reintenta sin que el usuario lo note', () => {
    cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);

    cy.storedSession().then((before) => {
      // Se invalida el token de acceso conservando el de refresco: es el estado exacto en que
      // queda una sesion tras 15 minutos de inactividad.
      cy.window().then((win) => win.localStorage.setItem(ACCESS, 'token.de.acceso.invalido'));

      // /admin pide la lista de usuarios nada mas montar: el 401 dispara el refresco.
      cy.visit('/admin');

      cy.contains(SEEDED.admin.email).should('be.visible');
      cy.location('pathname').should('eq', '/admin');

      cy.storedSession().then((after) => {
        expect(after.accessToken, 'el acceso se renovo').to.not.eq('token.de.acceso.invalido');
        expect(after.refreshToken, 'el refresco tambien rota').to.not.eq(before.refreshToken);
      });
    });
  });

  it('reusar un token de refresco ya rotado cierra la sesion y devuelve a la bienvenida', () => {
    cy.loginByApi(SEEDED.admin.email, SEEDED.admin.password);

    cy.storedSession().then((s) => {
      // Alguien mas rota el token: a partir de aqui el que guarda el navegador esta consumido.
      cy.request('POST', '/api/auth/refresh', { refreshToken: s.refreshToken });

      // Se fuerza el 401 para que el interceptor intente refrescar con el token ya consumido.
      cy.window().then((win) => win.localStorage.setItem(ACCESS, 'token.de.acceso.invalido'));
      cy.visit('/admin');

      // El backend detecta el reuso, revoca la familia y responde 401. La aplicacion limpia la
      // sesion y el guard devuelve al login en vez de dejar una pantalla vacia.
      cy.location('pathname', { timeout: 10000 }).should('eq', '/login');
      cy.get('[data-cy=welcome-screen]').should('be.visible');
      cy.storedSession().then((after) => {
        expect(after.accessToken, 'la sesion quedo limpia').to.be.null;
        expect(after.refreshToken).to.be.null;
        expect(after.user).to.be.null;
      });
    });
  });

  it('el token de refresco robado deja de servir tras la deteccion', () => {
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);

    cy.storedSession().then((s) => {
      const robado = s.refreshToken!;
      // El legitimo rota primero.
      cy.request('POST', '/api/auth/refresh', { refreshToken: robado }).then(({ body }) => {
        const vigente = body.refreshToken;

        // El atacante presenta el viejo: se corta la familia entera.
        cy.request({
          method: 'POST',
          url: '/api/auth/refresh',
          body: { refreshToken: robado },
          failOnStatusCode: false,
        }).then((reuse) => {
          expect(reuse.status).to.eq(401);
          expect(reuse.body.code).to.eq('TOKEN_REUSE_DETECTED');
        });

        // Y el que era valido hasta hace un instante tampoco sirve ya.
        cy.request({
          method: 'POST',
          url: '/api/auth/refresh',
          body: { refreshToken: vigente },
          failOnStatusCode: false,
        }).then((after) => {
          expect(after.status, 'la familia quedo revocada de verdad').to.eq(401);
        });
      });
    });
  });

  it('cerrar sesion limpia el almacenamiento y revoca el refresco en el servidor', () => {
    cy.loginByApi(SEEDED.teacher.email, SEEDED.teacher.password);
    cy.visit('/analytics');

    cy.storedSession().then((s) => {
      const refreshToken = s.refreshToken!;

      cy.get('[data-cy=logout]').click();
      cy.location('pathname').should('eq', '/login');
      cy.storedSession().then((after) => {
        expect(after.accessToken).to.be.null;
        expect(after.user).to.be.null;
      });

      cy.request({
        method: 'POST',
        url: '/api/auth/refresh',
        body: { refreshToken },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status, 'el refresco quedo revocado en el servidor').to.eq(401);
      });
    });
  });

  it('una sesion manipulada a mano no abre nada: el backend no se fia del navegador', () => {
    cy.window().then((win) => {
      win.localStorage.setItem(ACCESS, 'token.inventado.porelusuario');
      win.localStorage.setItem(REFRESH, 'refresco-inventado');
      win.localStorage.setItem(
        'vista_user',
        JSON.stringify({ email: 'falso@u.icesi.edu.co', displayName: 'Falso', roles: ['ADMIN'] })
      );
    });

    // El guard cree la sesion y pinta la pantalla, pero los datos nunca llegan.
    cy.request({
      method: 'GET',
      url: '/api/admin/users',
      headers: { Authorization: 'Bearer token.inventado.porelusuario' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.be.oneOf([401, 403]);
    });
  });
});

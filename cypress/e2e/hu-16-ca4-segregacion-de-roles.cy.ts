/// <reference types="cypress" />
import { SEEDED } from '../support/commands';

/**
 * HU-16 · CA-4 — Segregacion de roles.
 *
 *   Dado que inicio sesion con el rol "Estudiante"
 *   Cuando intento acceder a la ruta del panel analitico
 *   Entonces el sistema deniega el acceso con codigo 403
 *   Y no se expone ninguna metrica agregada
 *
 * El 403 es del backend (/api/analytics/summary). En la interfaz se conserva la redireccion al
 * lienzo aprobada en HU-08: el guard es navegacion, la barrera es el servidor.
 */
describe('HU-16 · CA-4 Segregacion de roles en el panel analitico', () => {
  const SUMMARY = '/api/analytics/summary';
  const METRICAS = ['totalGenerations', 'distinctUsers', 'generationsByCourse', 'generationsByStructureType'];

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('el estudiante recibe 403 y ninguna metrica en la respuesta', () => {
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.storedSession().then((s) => {
      cy.request({
        url: SUMMARY,
        headers: { Authorization: `Bearer ${s.accessToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(403);
        const raw = JSON.stringify(res.body);
        for (const m of METRICAS) expect(raw, `sin ${m}`).to.not.contain(m);
      });
    });
  });

  it('el estudiante que escribe la ruta del panel es devuelto al lienzo', () => {
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.visit('/analytics');
    cy.location('pathname').should('eq', '/');
    cy.get('[data-cy=analytics-page]').should('not.exist');
  });

  it('el docente si recibe los agregados, y sin datos de personas', () => {
    cy.request('POST', '/api/auth/login', {
      email: SEEDED.teacher.email,
      password: SEEDED.teacher.password,
    }).then(({ body }) => {
      cy.request({ url: SUMMARY, headers: { Authorization: `Bearer ${body.accessToken}` } }).then(
        (res) => {
          expect(res.status).to.eq(200);
          expect(res.body.totalGenerations).to.be.a('number');
          expect(res.body.generationsByCourse).to.be.an('object');
          const raw = JSON.stringify(res.body);
          expect(raw).to.not.contain('@');
          expect(raw).to.not.contain('pseudonym');
        }
      );
    });
  });

  it('el administrador tambien recibe 403: la analitica es solo del docente', () => {
    cy.request('POST', '/api/auth/login', {
      email: SEEDED.admin.email,
      password: SEEDED.admin.password,
    }).then(({ body }) => {
      cy.request({
        url: SUMMARY,
        headers: { Authorization: `Bearer ${body.accessToken}` },
        failOnStatusCode: false,
      })
        .its('status')
        .should('eq', 403);
    });
  });

  it('sin sesion la analitica responde 401', () => {
    cy.request({ url: SUMMARY, failOnStatusCode: false }).its('status').should('eq', 401);
  });
});

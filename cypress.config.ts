import { defineConfig } from 'cypress';

export default defineConfig({
  env: { mailpitUrl: 'http://127.0.0.1:8025' },
  e2e: {
    setupNodeEvents(on) {
      // Opt-in software WebGL for machines/CI without a GPU; normal launches stay unchanged.
      on('before:browser:launch', (browser, options) => {
        if (process.env.VISTA_E2E_SOFTWARE_GL === '1' && browser.family === 'chromium') {
          options.args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader');
        }
        return options;
      });
    },
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    // El backend es el mismo que usa el navegador; las pruebas hablan con el a traves del proxy
    // de Vite, igual que la aplicacion.
    viewportWidth: 1440,
    viewportHeight: 900,
    video: false,
    screenshotOnRunFailure: true,
    retries: { runMode: 1, openMode: 0 },
    // Las cabeceras son "sticky": si Cypress desplaza el objetivo al borde superior antes de un
    // clic, la cabecera lo cubre. Centrarlo evita el "covered by another element" en Chromium.
    scrollBehavior: 'center',
  },
});

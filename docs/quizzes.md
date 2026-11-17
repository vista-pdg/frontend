# Quizzes interactivos (HU-34)

| Ruta | Rol | Pantalla |
|---|---|---|
| `/quizzes` | Estudiante | `QuizListPage`: quizzes del curso con estado y nota. |
| `/quizzes/:quizId/presentar` | Estudiante | `QuizExamPage`: modo de prueba. |
| `/docencia/quizzes` | Docente, administrador | `QuizManagementPage`: lista por curso y creación. |
| `/docencia/quizzes/:quizId` | Docente, administrador | `QuizDetailPage`: banco y resultados. |

La barra lateral enlaza «Quizzes» según el rol y `QuizNotice` avisa en el visualizador cuando el
estudiante tiene un quiz disponible o en curso. Los guards solo deciden la navegación; cada dato lo
autoriza el backend.

## Modo de prueba

`QuizExamPage` muestra la pregunta junto a `Workspace` (lienzo, chat y algoritmos, el mismo
componente que usa `App`) y a `AppSidebar` en `examMode`, que oculta todo lo que saca del quiz.
`useExamGuard` está activo solo mientras el intento corre:

- cancela copiar, cortar, pegar, menú contextual, arrastre y los atajos de imprimir, guardar, ver
  código y captura (`blockedShortcut` en `lib/quiz.ts`);
- añade `exam-mode` al documento: sin selección de texto (los campos de texto la conservan) y sin
  impresión;
- al perder el foco, ocultar la pestaña o salir de pantalla completa oculta el contenido hasta que
  el estudiante vuelve;
- informa cada incidente al servidor, que lleva el conteo que ve el docente.

Un navegador no puede impedir una captura del sistema operativo ni una foto con otro dispositivo:
esto disuade y deja rastro. El temporizador usa el desfase con `serverTime`; el plazo real lo decide
el servidor, y al llegar a cero el cliente entrega y muestra el resultado.

## Generación del banco

`useBankGeneration` pide lotes a `POST /quizzes/manage/{id}/bank/generate` hasta completar el
banco. El avance vive en el servidor: pausar, cerrar la página o un 503 del modelo conservan lo
generado y la generación se reanuda. Tres lotes seguidos sin preguntas válidas detienen el ciclo.

## Código

`types/quiz.ts` (contratos de los records Java), `services/quizService.ts`, `lib/quiz.ts`
(formato, validación del formulario, reloj), `hooks/useExamGuard.ts`, `hooks/useBankGeneration.ts`
y `components/quiz/`. Pruebas unitarias en `lib/quiz.test.ts` y `services/quizService.test.ts`;
funcionales en `cypress/e2e/hu-34-*.cy.ts`, con ayudas en `cypress/support/hu34.ts`.

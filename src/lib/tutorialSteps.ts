import type { Role } from '@/types/auth';

export interface TutorialStep {
  title: string;
  description: string;
  /** Primer selector visible: el recuadro de la guía lo enmarca. */
  targets: readonly string[];
  /** La barra lateral se expande mientras el paso señala algo dentro de ella. */
  sidebar?: boolean;
}

/** Pasos comunes de la guía de VISTA. Los índices 2 y 3 abren el chat y los algoritmos (Workspace). */
const BASE: readonly TutorialStep[] = [
  { title: 'Elige una estructura', description: 'La selección de esta barra define el contexto del chat y los algoritmos. Abre «Árboles» para elegir AVL o BST.', targets: ['[data-cy=nav-family-tree]'], sidebar: true },
  { title: 'Chat y algoritmos', description: 'Chat genera y modifica estructuras. Algoritmos aplica operaciones paso a paso. Puedes crear una figura en el chat, cambiar a Algoritmos y elegir «Usar lienzo» si es compatible, o «Crear con valores» para generar otra desde ese panel.', targets: ['[data-cy=activity-selector]'] },
  { title: 'Describe desde el chat', description: 'Escribe aquí valores u operaciones de la estructura seleccionada. VISTA atiende consultas de estructuras y algoritmos.', targets: ['[data-cy=chat-compose]'] },
  { title: 'Ejecuta un algoritmo', description: 'Elige una operación compatible. «Usar lienzo» procesa tu figura actual; «Crear con valores» construye otra al ejecutar. Después recorre los pasos con Anterior, Siguiente o Reproducir.', targets: ['[data-cy=algo-form]', '[data-cy=algo-catalog]'] },
  { title: 'Lee el código del paso', description: 'La línea resaltada corresponde al paso visual. Alterna Java y pseudocódigo y recorre los pasos para ver la relación. Si aún no hay código en tu sesión, aquí aparece un ejemplo de pila. También puedes copiar o descargar el código de tus demos.', targets: ['[data-cy=code-panel]', '[data-cy=tutorial-demo-area]'] },
  { title: 'Cambia la vista', description: 'Estos controles alternan 2D y 3D conservando la estructura y el paso. El tema claro u oscuro está en la barra lateral.', targets: ['[data-cy=mode-selector]'] },
];

const QUIZZES = '[data-cy=sidebar-quizzes]';

/** HU-35 · CA-8: lo nuevo de quizzes, contado al estudiante. */
const STUDENT_QUIZZES: readonly TutorialStep[] = [
  { title: 'Quizzes de tu curso', description: 'Presenta los quizzes de tu curso y, cuando cierren, revísalos para ver qué acertaste. En cada pregunta, «Insertar en el chat» lleva el escenario a VISTA sin teclearlo y «Cargar en Algoritmos» deja listos sus valores.', targets: [QUIZZES], sidebar: true },
  { title: 'Quizzes de estudio', description: 'Crea quizzes solo para ti sobre los temas que elijas, con pista, solución y un tutor IA que responde sobre la pregunta en curso. Cada lote de preguntas y cada mensaje al tutor usan tu cuota diaria.', targets: [QUIZZES], sidebar: true },
];

/** HU-35 · CA-8: docentes y administradores gestionan los quizzes de sus cursos. */
const STAFF_QUIZZES: readonly TutorialStep[] = [
  { title: 'Quizzes de tus cursos', description: 'Crea y publica quizzes para los cursos que el administrador te asignó; solo ves esos cursos y el administrador ve todos. Cada pregunta trae su escenario listo para que el estudiante lo inserte en el chat.', targets: [QUIZZES], sidebar: true },
];

export function tutorialSteps(roles: readonly Role[]): readonly TutorialStep[] {
  const staff = roles.includes('TEACHER') || roles.includes('ADMIN');
  return [...BASE, ...(staff ? STAFF_QUIZZES : STUDENT_QUIZZES)];
}

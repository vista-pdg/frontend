import type { PedagogicalReport, TopicInsight } from '../types/analytics';

function topic(partial: Partial<TopicInsight> & Pick<TopicInsight, 'topicKey' | 'topicLabel' | 'level'>): TopicInsight {
  return {
    smallSample: false, quizAnswers: 0, quizAccuracy: null, unansweredRate: null, medianSeconds: null, studyAnswers: 0,
    studyAccuracy: null, hintRate: null, solutionRate: null, practiceExecutions: 0, practicedAccuracy: null,
    unpracticedAccuracy: null, commonMistake: null, commonMistakeShare: null, ...partial,
  };
}

/** Reporte de ejemplo de un grupo con actividad suficiente (HU-06 y HU-36). */
export function analyticsFixture(): PedagogicalReport {
  return {
    course: { code: 'CEDI-G1', name: 'Estructuras discretas', termCode: '2026-1' },
    from: null, to: null, wholeTerm: true, quiz: null, timezone: 'America/Bogota', minimumParticipants: 5,
    status: 'AVAILABLE', activeStudents: 27, enrolledStudents: 30,
    retryThreshold: .3, retryMinAttempts: 3, retryWindowSeconds: 120, totalRequests: 200,
    overview: {
      structureRequests: 200, algorithmExecutions: 80, quizAnswers: 120, quizAccuracy: .64, unansweredRate: .06,
      quizzesWithAnswers: 2, finishedAttempts: 40, studyAnswers: 30, studyAccuracy: .7, medianSeconds: 48, timedShare: .92,
    },
    topics: [
      topic({ topicKey: 'tree/avl/insert', topicLabel: 'Árbol AVL — AVL · Inserción', level: 'DIFICIL', quizAnswers: 60, quizAccuracy: .38,
        unansweredRate: .09, medianSeconds: 72, studyAnswers: 20, studyAccuracy: .46, hintRate: .31, solutionRate: .22, practiceExecutions: 40,
        practicedAccuracy: .71, unpracticedAccuracy: .32, commonMistake: 'Rotación doble izquierda-derecha con pivote en 29', commonMistakeShare: .41 }),
      topic({ topicKey: 'graph/simple/bfs', topicLabel: 'Grafo — BFS · Recorrido en anchura', level: 'EN_PROGRESO', quizAnswers: 40, quizAccuracy: .6,
        unansweredRate: .02, medianSeconds: 55, practiceExecutions: 30 }),
      topic({ topicKey: 'stack/simple/pop', topicLabel: 'Pila — Pop · Retiro del tope', level: 'DOMINADO', smallSample: true, quizAnswers: 4,
        quizAccuracy: .91, medianSeconds: 24, practiceExecutions: 10 }),
      topic({ topicKey: 'graph/simple/dfs', topicLabel: 'Grafo — DFS · Recorrido en profundidad', level: 'SIN_DATOS', practiceExecutions: 3 }),
    ],
    hardestQuestions: [{
      quizId: 4, quizTitle: 'Quiz 2 · Árboles AVL', topicKey: 'tree/avl/insert', topicLabel: 'Árbol AVL — AVL · Inserción',
      statement: '¿Qué efecto tiene insertar 23 sobre la estructura del árbol?', answers: 18, accuracy: .22, unansweredRate: .05,
      medianSeconds: 72, correctOption: 'Rotación simple a la derecha con pivote en 29', commonWrongOption: 'Rotación doble izquierda-derecha con pivote en 29', commonWrongShare: .45,
    }],
    easiestQuestions: [{
      quizId: 3, quizTitle: 'Quiz 1 · Pilas', topicKey: 'stack/simple/pop', topicLabel: 'Pila — Pop · Retiro del tope',
      statement: '¿Qué elemento queda en el tope tras tres pop?', answers: 20, accuracy: .97, unansweredRate: 0,
      medianSeconds: 19, correctOption: 'El 4', commonWrongOption: null, commonWrongShare: null,
    }],
    quizzes: [
      { id: 3, title: 'Quiz 1 · Pilas', phase: 'CLOSED', finished: 28, enrolled: 30, averageGrade: 4.4, accuracy: .88, medianSeconds: 26, weakestTopic: 'Cola — Dequeue', strongestTopic: 'Pila — Pop · Retiro del tope' },
      { id: 4, title: 'Quiz 2 · Árboles AVL', phase: 'OPEN', finished: 12, enrolled: 30, averageGrade: 3.1, accuracy: .57, medianSeconds: 58, weakestTopic: 'Árbol AVL — AVL · Inserción', strongestTopic: null },
    ],
    structures: [
      { structure: 'arbol_avl', status: 'AVAILABLE', frequency: 120, percentage: 60 },
      { structure: 'pila', status: 'AVAILABLE', frequency: 80, percentage: 40 },
    ],
    algorithms: [{ algorithm: 'BFS', status: 'AVAILABLE', executions: 80, stepsStatus: 'AVAILABLE', averageCompletedSteps: 6.5 }],
    retries: [{ structure: 'arbol_avl', status: 'AVAILABLE', sessions: 20, sessionsWithRetries: 10, retryRate: .5, highlighted: true }],
  };
}

/** HU-36 · CA-5: grupo por debajo del umbral; no se publica ninguna métrica. */
export function suppressedFixture(): PedagogicalReport {
  return {
    ...analyticsFixture(), status: 'SUPPRESSED', activeStudents: null, enrolledStudents: null, totalRequests: null, overview: null,
    topics: [], hardestQuestions: [], easiestQuestions: [], quizzes: [], structures: [], algorithms: [], retries: [],
  };
}

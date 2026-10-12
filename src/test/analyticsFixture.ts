import type { PedagogicalReport } from '../types/analytics';
export function analyticsFixture(): PedagogicalReport {
  return {
    course: { code: 'CEDI-G1', name: 'Estructuras discretas', termCode: '2026-1' },
    from: '2026-04-01', to: '2026-04-30', timezone: 'America/Bogota', minimumParticipants: 5,
    retryThreshold: .3, retryMinAttempts: 3, retryWindowSeconds: 120, totalRequests: 200,
    structures: [
      { structure: 'arbol_avl', status: 'AVAILABLE', frequency: 120, percentage: 60 },
      { structure: 'pila', status: 'AVAILABLE', frequency: 80, percentage: 40 },
    ],
    algorithms: [{ algorithm: 'BFS', status: 'AVAILABLE', executions: 80, stepsStatus: 'AVAILABLE', averageCompletedSteps: 6.5 }],
    retries: [{ structure: 'arbol_avl', status: 'AVAILABLE', sessions: 20, sessionsWithRetries: 10, retryRate: .5, highlighted: true }],
  };
}

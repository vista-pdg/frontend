import { describe, expect, it } from 'vitest';
import { tutorialSteps } from './tutorialSteps';

describe('guía de VISTA por rol (HU-35 · CA-8)', () => {
  it('el estudiante ve los quizzes de su curso y los de estudio al final', () => {
    const steps = tutorialSteps(['STUDENT']);
    expect(steps).toHaveLength(8);
    expect(steps.slice(-2).map(step => step.title)).toEqual(['Quizzes de tu curso', 'Quizzes de estudio']);
    expect(steps[6].description).toContain('Insertar en el chat');
    expect(steps[7].description).toContain('tutor IA');
    expect(steps.slice(-2).every(step => step.sidebar && step.targets[0] === '[data-cy=sidebar-quizzes]')).toBe(true);
  });

  it('docentes y administradores ven la gestión por cursos asignados y la analítica (HU-36 · CA-11)', () => {
    for (const roles of [['TEACHER'], ['ADMIN']] as const) {
      const steps = tutorialSteps(roles);
      expect(steps).toHaveLength(8);
      expect(steps[6].title).toBe('Quizzes de tus cursos');
      expect(steps[6].description).toContain('asignó');
      expect(steps[6].description).toContain('material');
      expect(steps[6].description).toContain('con IA');
      expect(steps[7].title).toBe('Analítica pedagógica');
      expect(steps[7].targets).toEqual(['[data-cy=sidebar-analytics]']);
      expect(steps[7].sidebar).toBe(true);
    }
  });

  it('conserva los pasos que abren el chat y los algoritmos', () => {
    const steps = tutorialSteps(['STUDENT']);
    expect(steps[0].sidebar).toBe(true);
    expect(steps[2].targets).toContain('[data-cy=chat-compose]');
    expect(steps[3].targets).toContain('[data-cy=algo-form]');
  });
});

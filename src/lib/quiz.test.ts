import { describe, expect, it } from 'vitest';
import {
  answeredCount, bankSize, blockedShortcut, clockOffset, formatDateTime, formatGrade, formatRemaining, groupTopics,
  phaseLabel, remainingMs, resultStatusLabel, studentStateLabel, toCreateRequest, toLocalInput, validateQuizForm,
  answerMark, generationFailure, GENERATION_RETRY_DELAYS_MS, type QuizFormValues,
  estimatedBatches, fieldDescribedBy, KEEPS_STUDY, optionMark, studyProgressLine, studyState, studySummary, validateStudyForm,
} from './quiz';

const NOW = new Date('2026-11-17T12:00:00');
const valid: QuizFormValues = {
  courseCode: 'CEDI-G1', title: ' Quiz 2 ', topics: ['tree/avl/insert'], questionsPerStudent: '3', studentCount: '30',
  timeLimitMinutes: '30', opensAt: '2026-11-17T08:00', closesAt: '2026-11-19T23:59', showGrade: true, instructions: '',
};

describe('formato', () => {
  it('muestra la nota con coma y un decimal, y un guion cuando no hay nota', () => {
    expect(formatGrade(4.2)).toBe('4,2');
    expect(formatGrade(5)).toBe('5,0');
    expect(formatGrade(0)).toBe('0,0');
    expect(formatGrade(null)).toBe('—');
    expect(formatGrade(undefined)).toBe('—');
  });

  it('pinta el tiempo restante sin negativos y con horas cuando hace falta', () => {
    expect(formatRemaining(24 * 60_000 + 35_000)).toBe('24:35');
    expect(formatRemaining(999)).toBe('00:01');
    expect(formatRemaining(0)).toBe('00:00');
    expect(formatRemaining(-5000)).toBe('00:00');
    expect(formatRemaining(3_725_000)).toBe('1:02:05');
  });

  it('formatea fechas en hora de Bogotá y tolera valores ausentes o inválidos', () => {
    expect(formatDateTime('2026-11-17T13:00:00Z')).toMatch(/17.*nov.*08:00/);
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('no es fecha')).toBe('—');
  });

  it('tiene etiqueta y tono para cada estado', () => {
    expect(studentStateLabel.OPEN.label).toBe('Disponible');
    expect(studentStateLabel.MISSED.tone).toBe('danger');
    expect(phaseLabel.DRAFT.label).toBe('Borrador');
    expect(resultStatusLabel.EXPIRED.label).toBe('Tiempo agotado');
    expect(answerMark.UNANSWERED.label).toBe('Sin responder');
  });
});

describe('reloj del intento', () => {
  it('usa el reloj del servidor aunque el del navegador esté desfasado', () => {
    const localNow = Date.parse('2026-11-17T12:10:00Z'); // el equipo va 10 minutos adelantado
    const offset = clockOffset('2026-11-17T12:00:00Z', localNow);
    expect(offset).toBe(-600_000);
    expect(remainingMs({ deadline: '2026-11-17T12:30:00Z' }, offset, localNow)).toBe(30 * 60_000);
    expect(remainingMs({ deadline: '2026-11-17T11:00:00Z' }, offset, localNow)).toBe(0);
    expect(clockOffset('basura', localNow)).toBe(0);
  });

  it('cuenta solo las preguntas respondidas', () => {
    const question = { position: 1, topicLabel: '', scenario: '', statement: '', options: [], setup: null };
    expect(answeredCount({ questions: [{ ...question, selectedOption: 0 }, { ...question, selectedOption: null }] })).toBe(1);
  });
});

describe('formulario de quiz', () => {
  it('acepta un formulario válido y lo convierte a instantes UTC', () => {
    expect(validateQuizForm(valid, NOW)).toEqual({});
    const request = toCreateRequest(valid);
    expect(request).toMatchObject({ courseCode: 'CEDI-G1', title: 'Quiz 2', questionsPerStudent: 3, studentCount: 30, timeLimitMinutes: 30, showGrade: true });
    expect(request.opensAt).toBe(new Date('2026-11-17T08:00').toISOString());
    expect(bankSize(valid)).toBe(90);
  });

  it('señala cada campo inválido', () => {
    const errors = validateQuizForm({
      ...valid, courseCode: '', title: '  ', topics: [], questionsPerStudent: '0', studentCount: 'treinta', timeLimitMinutes: '500',
      opensAt: '', closesAt: '',
    }, NOW);
    expect(Object.keys(errors).sort()).toEqual(['closesAt', 'courseCode', 'opensAt', 'questionsPerStudent', 'studentCount', 'timeLimitMinutes', 'title', 'topics']);
    expect(bankSize({ questionsPerStudent: '3', studentCount: '' })).toBeNull();
    expect(bankSize({ questionsPerStudent: 'x', studentCount: '3' })).toBeNull();
  });

  it('exige una ventana coherente y un banco acotado', () => {
    expect(validateQuizForm({ ...valid, closesAt: '2026-11-17T07:00' }, NOW).closesAt).toBe('El cierre debe ser posterior a la apertura.');
    expect(validateQuizForm({ ...valid, opensAt: '2026-11-10T08:00', closesAt: '2026-11-11T08:00' }, NOW).closesAt).toBe('El cierre debe estar en el futuro.');
    expect(validateQuizForm({ ...valid, questionsPerStudent: '20', studentCount: '300' }, NOW).studentCount).toMatch(/600/);
    expect(validateQuizForm({ ...valid, title: 'x'.repeat(161) }, NOW).title).toMatch(/160/);
    expect(validateQuizForm({ ...valid, studentCount: '301' }, NOW).studentCount).toMatch(/300/);
    expect(Object.keys(validateQuizForm({ ...valid, closesAt: '2099-01-01T00:00' }))).toEqual([]);
  });

  it('agrupa los temas por familia conservando el orden y arma el valor del selector de fecha', () => {
    const topic = (key: string, family: string) => ({ key, label: key, family, familyLabel: family.toUpperCase(), description: '' });
    const groups = groupTopics([topic('a', 'tree'), topic('b', 'graph'), topic('c', 'tree')]);
    expect(groups.map(g => [g.label, g.topics.map(t => t.key)])).toEqual([['TREE', ['a', 'c']], ['GRAPH', ['b']]]);
    expect(toLocalInput(new Date(2026, 10, 7, 8, 5))).toBe('2026-11-07T08:05');
  });
});

describe('atajos bloqueados en modo de prueba', () => {
  const key = (k: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }> = {}) =>
    blockedShortcut({ key: k, ctrlKey: false, metaKey: false, shiftKey: false, ...mods });

  it('intercepta portapapeles, impresión, guardado y captura', () => {
    expect(key('c', { ctrlKey: true })).toBe('COPY');
    expect(key('C', { metaKey: true })).toBe('COPY');
    expect(key('x', { ctrlKey: true })).toBe('CUT');
    expect(key('v', { metaKey: true })).toBe('PASTE');
    expect(key('p', { ctrlKey: true })).toBe('PRINT');
    expect(key('PrintScreen')).toBe('PRINT');
    expect(key('s', { ctrlKey: true })).toBe('SHORTCUT');
    expect(key('u', { ctrlKey: true })).toBe('SHORTCUT');
    expect(key('F12')).toBe('SHORTCUT');
    expect(key('i', { ctrlKey: true, shiftKey: true })).toBe('SHORTCUT');
    expect(key('c', { ctrlKey: true, shiftKey: true })).toBe('SHORTCUT');
    expect(key('s', { metaKey: true, shiftKey: true })).toBe('SHORTCUT');
  });

  it('deja pasar la escritura normal', () => {
    expect(key('c')).toBeNull();
    expect(key('a', { ctrlKey: true })).toBeNull();
    expect(key('Enter')).toBeNull();
    expect(key('z', { ctrlKey: true, shiftKey: true })).toBeNull();
  });
});

describe('fallos al generar un lote', () => {
  it('reintenta lo transitorio y explica la causa', () => {
    const lost = generationFailure(undefined);
    expect(lost.retryable).toBe(true);
    expect(lost.message).toContain('Se perdió la conexión');
    expect(lost.message).toContain('El banco conserva lo generado');
    expect(generationFailure(0).retryable).toBe(true);
    expect(generationFailure(503, 'El modelo no está disponible (503).')).toEqual({
      retryable: true, message: 'El modelo no está disponible (503). El banco conserva lo generado.',
    });
    expect(generationFailure(503).message).toContain('El servicio del modelo no está disponible.');
    for (const status of [429, 502, 504]) {
      expect(generationFailure(status)).toMatchObject({ retryable: true, message: expect.stringContaining(`(${status})`) });
    }
    expect(GENERATION_RETRY_DELAYS_MS).toHaveLength(3);
  });

  it('no reintenta lo que otra petición no va a arreglar', () => {
    expect(generationFailure(401)).toMatchObject({ retryable: false, message: expect.stringContaining('sesión expiró') });
    expect(generationFailure(403).message).toBe('Ya no tienes acceso a este curso.');
    expect(generationFailure(404).message).toBe('Este quiz ya no existe.');
    expect(generationFailure(409, 'Un quiz publicado ya no admite cambios en su banco')).toEqual({
      retryable: false, message: 'Un quiz publicado ya no admite cambios en su banco',
    });
    expect(generationFailure(409).message).toContain('(error 409)');
    expect(generationFailure(500)).toEqual({ retryable: false, message: 'No se pudo generar el lote (error 500). El banco conserva lo generado.' });
  });
});

describe('quizzes de estudio y revisión (HU-35)', () => {
  it('cuenta los lotes con el mismo reparto por tema que el servidor', () => {
    expect(estimatedBatches(5, 2)).toBe(2);
    expect(estimatedBatches(10, 1)).toBe(3);
    expect(estimatedBatches(1, 3)).toBe(1);
    expect(estimatedBatches(6, 3)).toBe(3);
    expect(estimatedBatches(0, 2)).toBe(0);
    expect(estimatedBatches(4, 0)).toBe(0);
  });

  it('valida el formulario con las reglas del servidor', () => {
    expect(validateStudyForm({ title: '', topics: ['a'], questionCount: '5' })).toEqual({});
    expect(validateStudyForm({ title: 'x'.repeat(161), topics: [], questionCount: '11' })).toEqual({
      title: 'El título admite hasta 160 caracteres.',
      topics: 'Selecciona al menos un tema.',
      questionCount: 'Elige de 1 a 10 preguntas.',
    });
    expect(validateStudyForm({ title: '', topics: ['a'], questionCount: '2.5' }).questionCount).toBeDefined();
  });

  it('resume el avance de un quiz de estudio', () => {
    const base = { questionCount: 5, generated: 5, answered: 3, correct: 1, hintsUsed: 1, solutionsShown: 2 };
    expect(studyProgressLine(base)).toBe('3 de 5 respondidas · 1 acierto · 1 pista · 2 soluciones vistas');
    expect(studyProgressLine({ ...base, correct: 2, hintsUsed: 0, solutionsShown: 1 })).toBe('3 de 5 respondidas · 2 aciertos · 1 solución vista');
    expect(studyProgressLine({ ...base, generated: 2 })).toBe('2 de 5 generadas · la generación no ha terminado');
    expect(studyState({ ...base, generated: 2 })).toBe('INCOMPLETE');
    expect(studyState(base)).toBe('COMPLETE');
    expect(studyState({ ...base, solutionsShown: 0 })).toBe('IN_PROGRESS');
  });

  it('calcula el resumen desde las preguntas', () => {
    const q = { selectedOption: null, correctOption: null, hintShown: false, solutionShown: false };
    expect(studySummary([
      { ...q, selectedOption: 1, correctOption: 1, hintShown: true },
      { ...q, selectedOption: 0, correctOption: 2 },
      { ...q, solutionShown: true, correctOption: 3 },
      q,
    ])).toEqual({ answered: 2, correct: 1, hints: 1, solutions: 1, resolved: 3 });
  });

  it('marca la opción elegida y la correcta sin depender solo del color', () => {
    expect(optionMark(1, 1, 1)).toBe('chosen-correct');
    expect(optionMark(1, 1, 2)).toBe('chosen-wrong');
    expect(optionMark(2, 1, 2)).toBe('correct');
    expect(optionMark(0, 1, 2)).toBe('none');
    expect(optionMark(0, null, null)).toBe('none');
  });

  it('una cuota agotada no se reintenta y dice qué se conserva', () => {
    expect(generationFailure(429, 'cuota', 'DAILY_QUOTA_EXCEEDED', KEEPS_STUDY)).toEqual({
      retryable: false,
      message: 'Alcanzaste tu límite diario del asistente. Tu quiz conserva lo generado. Podrás completarlo después de medianoche.',
    });
    expect(generationFailure(503, undefined, undefined, KEEPS_STUDY).message).toContain('Tu quiz conserva lo generado.');
    expect(generationFailure(401, undefined, undefined, KEEPS_STUDY).message).toContain('tu quiz conserva lo generado.');
    expect(generationFailure(403, undefined, undefined, KEEPS_STUDY).message).toBe('No tienes acceso a este quiz.');
    expect(fieldDescribedBy('x', 'e')).toBe('x-error');
    expect(fieldDescribedBy('x', undefined, 'h')).toBe('x-hint');
    expect(fieldDescribedBy('x')).toBeUndefined();
  });
});

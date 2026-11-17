import { describe, expect, it } from 'vitest';
import {
  answeredCount, bankSize, blockedShortcut, clockOffset, formatDateTime, formatGrade, formatRemaining, groupTopics,
  phaseLabel, remainingMs, resultStatusLabel, studentStateLabel, toCreateRequest, toLocalInput, validateQuizForm,
  answerMark, type QuizFormValues,
} from './quiz';

const NOW = new Date('2026-11-17T12:00:00');
const valid: QuizFormValues = {
  courseCode: 'CEDI-G1', title: ' Quiz 2 ', topics: ['tree/avl/insert'], questionsPerStudent: '3', studentCount: '30',
  timeLimitMinutes: '30', opensAt: '2026-11-17T08:00', closesAt: '2026-11-19T23:59', showGrade: true,
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
    const question = { position: 1, topicLabel: '', scenario: '', statement: '', options: [] };
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

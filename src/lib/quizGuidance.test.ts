import { describe, expect, it } from 'vitest';
import {
  editKindLabel, formatBytes, longCorrectWarning, materialDetail, pendingDetail, questionDraft, toCreateRequest,
  validateMaterialFile, validateMaterialLink, validateQuestionDraft, validateQuizForm, type QuizFormValues,
} from './quiz';
import type { MaterialDto } from '@/types/quiz';

const form: QuizFormValues = {
  courseCode: 'CEDI-G1', title: 'Quiz 2', topics: ['tree/avl/insert'], questionsPerStudent: '3', studentCount: '30',
  timeLimitMinutes: '30', opensAt: '2026-11-17T08:00', closesAt: '2026-11-19T23:59', showGrade: true, instructions: '',
};
const material = (partial: Partial<MaterialDto>): MaterialDto => ({
  id: 1, kind: 'LINK', name: 'CyED1', source: 'https://cyedbooks.github.io/CyED1/', format: 'SITE', formatLabel: 'Sitio',
  pages: 24, characters: 386_400, truncated: false, createdAt: '2026-11-18T10:00:00Z', ...partial,
});
const options = ['Rota a la derecha', 'Rota a la izquierda', 'No rota', 'Rota dos veces'];

describe('instrucciones para la IA (HU-36 · CA-1)', () => {
  it('son opcionales, se recortan y tienen un máximo de 2000 caracteres', () => {
    const now = new Date('2026-11-17T06:00:00');
    expect(validateQuizForm(form, now)).toEqual({});
    expect(toCreateRequest(form).instructions).toBeNull();
    expect(toCreateRequest({ ...form, instructions: '  Usa la notación del libro.  ' }).instructions).toBe('Usa la notación del libro.');
    expect(validateQuizForm({ ...form, instructions: 'x'.repeat(2001) }, now).instructions).toContain('2000');
  });
});

describe('material de referencia (HU-36 · CA-2)', () => {
  it('acepta solo enlaces http(s) válidos', () => {
    expect(validateMaterialLink('https://cyedbooks.github.io/CyED1/')).toBeNull();
    expect(validateMaterialLink(' http://example.com/notas.md ')).toBeNull();
    for (const bad of ['', 'ftp://x/y', 'javascript:alert(1)', 'cyedbooks.github.io', 'https://a b']) {
      expect(validateMaterialLink(bad)).toBeTruthy();
    }
  });
  it('acepta PDF, Markdown, TXT, DOCX y cuadernos de hasta 10 MB', () => {
    for (const name of ['a.pdf', 'b.MD', 'c.markdown', 'd.txt', 'e.docx', 'f.ipynb']) expect(validateMaterialFile({ name, size: 10 })).toBeNull();
    expect(validateMaterialFile({ name: 'x.pptx', size: 10 })).toContain('formato no admitido');
    expect(validateMaterialFile({ name: 'x.pdf', size: 0 })).toContain('vacío');
    expect(validateMaterialFile({ name: 'x.pdf', size: 14 * 1024 * 1024 })).toContain('14 MB');
  });
  it('describe cada fuente sin el texto completo', () => {
    expect(materialDetail(material({}))).toBe('Sitio · 24 páginas · 386 mil caracteres');
    expect(materialDetail(material({ pages: 30, truncated: true, characters: 400_000 }))).toBe('Sitio · 30 páginas (límite) · 400 mil caracteres (recortado)');
    expect(materialDetail(material({ format: 'PDF', formatLabel: 'PDF', pages: 1 }))).toContain('1 página ');
    expect(materialDetail(material({ format: 'MARKDOWN', formatLabel: 'Markdown', characters: 420 }))).toBe('Markdown · 420 caracteres');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(2.1 * 1024 * 1024)).toBe('2,1 MB');
    const file = new File(['x'.repeat(2048)], 'taller.pdf');
    expect(pendingDetail({ key: 'a', kind: 'file', file })).toBe('PDF · 2 KB · se leerá al crear el quiz');
    expect(pendingDetail({ key: 'b', kind: 'link', url: 'https://x', crawl: true })).toBe('Sitio · se leerá al crear el quiz');
  });
});

describe('edición de preguntas (HU-36 · CA-3)', () => {
  const draft = { statement: '¿Qué rotación ocurre al insertar 23 en el escenario?', options, correctIndex: 0, explanation: '', hint: '' };
  it('aplica las mismas reglas de forma que el servidor', () => {
    expect(validateQuestionDraft(draft)).toEqual({});
    expect(validateQuestionDraft({ ...draft, statement: '¿Qué pasa?' }).statement).toBeTruthy();
    expect(validateQuestionDraft({ ...draft, statement: 'x'.repeat(1201) }).statement).toContain('1200');
    expect(validateQuestionDraft({ ...draft, options: [...options.slice(0, 3), ''] })['options.3']).toContain('opción 4');
    expect(validateQuestionDraft({ ...draft, options: [...options.slice(0, 3), 'ROTA a la derecha'] })['options.3']).toContain('repite');
    expect(validateQuestionDraft({ ...draft, options: [...options.slice(0, 3), 'Ninguna de las anteriores'] })['options.3']).toContain('barajan');
    expect(validateQuestionDraft({ ...draft, options: [...options.slice(0, 3), 'x'.repeat(321)] })['options.3']).toContain('320');
    expect(validateQuestionDraft({ ...draft, correctIndex: -1 }).correctIndex).toBeTruthy();
    expect(validateQuestionDraft({ ...draft, hint: 'x'.repeat(201) }).hint).toContain('200');
    expect(validateQuestionDraft({ ...draft, explanation: 'x'.repeat(2001) }).explanation).toContain('2000');
  });
  it('advierte, sin bloquear, cuando la correcta delata la respuesta por su largo', () => {
    expect(longCorrectWarning({ options, correctIndex: 0 })).toBe(false);
    expect(longCorrectWarning({ options: ['Rota a la derecha porque el factor de balance de 29 llega a +2 y su hijo izquierdo queda en +1', 'No', 'Sí', 'Doble'], correctIndex: 0 })).toBe(true);
  });
  it('parte de la pregunta guardada y nombra el tipo de edición', () => {
    expect(questionDraft({ statement: 'S', options, correctIndex: 2, explanation: null, hint: null }))
      .toEqual({ statement: 'S', options, correctIndex: 2, explanation: '', hint: '' });
    expect(editKindLabel.AI).toBe('Editada con IA');
    expect(editKindLabel.MANUAL).toBe('Editada');
  });
});

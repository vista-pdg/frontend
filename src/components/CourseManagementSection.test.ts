// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { CourseManagementSection } from './CourseManagementSection';
import {
  assignCourseTeacher, assignStudentCourse, createCourse, fetchAcademicTerms,
  fetchAdminStudents, fetchCourseTeachers, fetchUsers, revokeCourseTeacher, revokeStudentCourse,
} from '@/services/adminService';
import type { CourseDto, CourseQuotaDto } from '@/types/auth';

vi.mock('@/services/adminService', () => ({
  assignCourseTeacher: vi.fn(), assignStudentCourse: vi.fn(), createCourse: vi.fn(),
  fetchAcademicTerms: vi.fn(), fetchAdminStudents: vi.fn(), fetchCourseTeachers: vi.fn(),
  fetchUsers: vi.fn(), revokeCourseTeacher: vi.fn(), revokeStudentCourse: vi.fn(),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const course: CourseQuotaDto = { code: 'CEDI-G1', name: 'Grupo uno', termCode: '2026-1', dailyQuota: null, effectiveDailyQuota: 40 };
let root: Root;
let container: HTMLDivElement;
let created: ReturnType<typeof vi.fn<(course: CourseDto) => Promise<void>>>;
function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = container.querySelector<T>(`[data-cy="${id}"]`);
  if (!found) throw new Error(`Missing ${id}: ${container.textContent}`);
  return found;
}
async function change(id: string, value: string) {
  await act(async () => {
    const node = el<HTMLInputElement | HTMLSelectElement>(id);
    Object.getOwnPropertyDescriptor(node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value')!.set!.call(node, value);
    node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
async function click(id: string) { await act(async () => el<HTMLButtonElement>(id).click()); }
async function mount(courses = [course]) {
  await act(async () => root.render(createElement(MemoryRouter, {}, createElement(CourseManagementSection, { courses, onCourseCreated: created }))));
}

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  created = vi.fn<(course: CourseDto) => Promise<void>>().mockResolvedValue(undefined);
  vi.mocked(fetchAcademicTerms).mockResolvedValue([{ code: '2026-1', active: true }]);
  vi.mocked(fetchUsers).mockResolvedValue([{ id: 21, displayName: 'Docente Uno', email: 'docente@u.icesi.edu.co', enabled: true, roles: ['TEACHER'] }]);
  vi.mocked(fetchAdminStudents).mockResolvedValue([
    { id: 31, displayName: 'Estudiante Uno', email: 'uno@u.icesi.edu.co', courseCode: 'CEDI-G1' },
    { id: 32, displayName: 'Estudiante Dos', email: 'dos@u.icesi.edu.co', courseCode: null },
  ]);
  vi.mocked(fetchCourseTeachers).mockResolvedValue([]);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

it('creates a course in an existing term and updates the selected group', async () => {
  vi.mocked(createCourse).mockResolvedValue({ code: 'CEDI-G3', name: 'Grupo tres', termCode: '2026-1' });
  await mount();
  await change('new-course-code', 'cedi-g3'); await change('new-course-name', 'Grupo tres');
  await act(async () => el<HTMLFormElement>('new-course-code').closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(createCourse).toHaveBeenCalledWith({ code: 'CEDI-G3', name: 'Grupo tres', termCode: '2026-1' });
  expect(created).toHaveBeenCalledWith({ code: 'CEDI-G3', name: 'Grupo tres', termCode: '2026-1' });
  expect(el('course-management-notice').textContent).toContain('CEDI-G3');
});

it('assigns a teacher and a student to the selected group', async () => {
  await mount();
  await change('teacher-candidate', '21'); await click('assign-teacher');
  expect(assignCourseTeacher).toHaveBeenCalledWith('CEDI-G1', 21);
  await change('student-candidate', '32'); await click('assign-student');
  expect(assignStudentCourse).toHaveBeenCalledWith(32, 'CEDI-G1');
});

it('requires confirmation before revoking a teacher', async () => {
  vi.mocked(fetchCourseTeachers).mockResolvedValue([{ id: 21, displayName: 'Docente Uno', email: 'docente@u.icesi.edu.co' }]);
  await mount(); await click('remove-teacher-21');
  expect(revokeCourseTeacher).not.toHaveBeenCalled();
  await act(async () => document.querySelector<HTMLButtonElement>('[data-cy="confirmation-submit"]')!.click());
  expect(revokeCourseTeacher).toHaveBeenCalledWith('CEDI-G1', 21);
});

it('validates the new course and confirms withdrawal of a student', async () => {
  await mount();
  await change('new-course-code', 'x'); await change('new-course-name', 'A');
  await act(async () => el<HTMLFormElement>('new-course-code').closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(el('course-management-error').textContent).toContain('código válido');
  expect(createCourse).not.toHaveBeenCalled();
  await click('remove-student-31');
  expect(revokeStudentCourse).not.toHaveBeenCalled();
  await act(async () => document.querySelector<HTMLButtonElement>('[data-cy="confirmation-submit"]')!.click());
  expect(revokeStudentCourse).toHaveBeenCalledWith(31);
});

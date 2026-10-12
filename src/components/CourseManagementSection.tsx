import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  assignCourseTeacher,
  assignStudentCourse,
  createCourse,
  fetchAcademicTerms,
  fetchAdminStudents,
  fetchCourseTeachers,
  fetchUsers,
  revokeCourseTeacher,
  revokeStudentCourse,
} from '@/services/adminService';
import type {
  AcademicTermDto,
  AssignedTeacherDto,
  CourseDto,
  CourseQuotaDto,
  StudentEnrollmentDto,
  UserDto,
} from '@/types/auth';

const inputClass = 'min-h-11 w-full border border-border bg-shell px-3 py-2 text-[13px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const actionClass = 'min-h-11 border border-border px-3 py-2 text-[12px] font-semibold text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50';
const primaryClass = 'min-h-11 bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50';

type Removal = { type: 'teacher' | 'student'; id: number; name: string };

export function CourseManagementSection({ courses, onCourseCreated }: {
  courses: CourseQuotaDto[];
  onCourseCreated: (course: CourseDto) => Promise<void>;
}) {
  const [terms, setTerms] = useState<AcademicTermDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [students, setStudents] = useState<StudentEnrollmentDto[]>([]);
  const [teachers, setTeachers] = useState<AssignedTeacherDto[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const selected = courses.some(c => c.code === selectedCode) ? selectedCode : courses[0]?.code || '';
  const [teacherId, setTeacherId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [draft, setDraft] = useState({ code: '', name: '', termCode: '' });
  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const removeTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([fetchAcademicTerms(), fetchUsers(), fetchAdminStudents()])
      .then(([termList, userList, studentList]) => {
        if (!live) return;
        setTerms(termList);
        setUsers(userList);
        setStudents(studentList);
        setDraft(d => ({ ...d, termCode: d.termCode || termList.find(t => t.active)?.code || termList[0]?.code || '' }));
      })
      .catch((err: unknown) => { if (live) setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos académicos.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let live = true;
    fetchCourseTeachers(selected)
      .then(list => { if (live) setTeachers(list); })
      .catch((err: unknown) => { if (live) setError(err instanceof Error ? err.message : 'No se pudieron cargar los docentes.'); })
      .finally(() => { if (live) setLoadingTeachers(false); });
    return () => { live = false; };
  }, [selected]);

  const activeTeachers = users.filter(u => u.enabled && u.roles.includes('TEACHER'));
  const availableTeachers = activeTeachers.filter(u => !teachers.some(t => t.id === u.id));
  const enrolled = students.filter(s => s.courseCode === selected);
  const chosenStudent = students.find(s => String(s.id) === studentId);

  function failure(err: unknown, fallback: string) {
    setError(err instanceof Error ? err.message : fallback);
    setNotice(null);
  }

  async function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const code = draft.code.trim().toUpperCase();
    const name = draft.name.trim();
    if (!/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(code) || name.length < 2 || !draft.termCode) {
      setError('Indica un código válido, un nombre y un periodo existente.');
      return;
    }
    setBusy(true);
    try {
      const created = await createCourse({ code, name, termCode: draft.termCode });
      await onCourseCreated(created);
      setLoadingTeachers(true);
      setTeachers([]);
      setSelectedCode(created.code);
      setDraft(d => ({ ...d, code: '', name: '' }));
      setNotice(`Curso ${created.code} creado. Ya puedes asignar docentes y estudiantes.`);
    } catch (err) { failure(err, 'No se pudo crear el curso.'); }
    finally { setBusy(false); }
  }

  async function assignTeacher() {
    if (!selected || !teacherId) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await assignCourseTeacher(selected, Number(teacherId));
      setTeachers(await fetchCourseTeachers(selected));
      setTeacherId('');
      setNotice(`Docente asignado a ${selected}. Ya puede consultar sus métricas.`);
    } catch (err) { failure(err, 'No se pudo asignar el docente.'); }
    finally { setBusy(false); }
  }

  async function assignStudent() {
    if (!selected || !studentId) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await assignStudentCourse(Number(studentId), selected);
      setStudents(await fetchAdminStudents());
      setStudentId('');
      setNotice(`Matrícula actualizada para ${selected}. Los eventos previos conservan su curso original.`);
    } catch (err) { failure(err, 'No se pudo actualizar la matrícula.'); }
    finally { setBusy(false); }
  }

  async function confirmRemoval() {
    if (!removal || !selected) return;
    if (removal.type === 'teacher') {
      await revokeCourseTeacher(selected, removal.id);
      setTeachers(await fetchCourseTeachers(selected));
      setNotice(`${removal.name} ya no tiene acceso a las métricas de ${selected}.`);
    } else {
      await revokeStudentCourse(removal.id);
      setStudents(await fetchAdminStudents());
      setNotice(`Matrícula de ${removal.name} retirada.`);
    }
    setRemoval(null);
  }

  return (
    <div className="space-y-5" data-cy="course-management">
      {error && <Alert><span data-cy="course-management-error">{error}</span></Alert>}
      {notice && <Alert tone="success"><span data-cy="course-management-notice">{notice}</span></Alert>}

      <section className="border border-border bg-background p-4 sm:p-5" aria-labelledby="create-course-title">
        <h2 id="create-course-title" className="text-[15px] font-semibold">Nuevo curso</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">El código identifica al grupo y debe ser único. Los estudiantes solo pueden ingresar a cursos del periodo activo.</p>
        <form onSubmit={e => void submitCourse(e)} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_12rem_auto] lg:items-end">
          <label className="block text-[12px] font-medium">Código
            <input data-cy="new-course-code" className={inputClass} value={draft.code} maxLength={32} onChange={e => setDraft(d => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="CEDI-G3" required />
          </label>
          <label className="block text-[12px] font-medium">Nombre
            <input data-cy="new-course-name" className={inputClass} value={draft.name} maxLength={160} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Computación y Estructuras Discretas I" required />
          </label>
          <label className="block text-[12px] font-medium">Periodo
            <select data-cy="new-course-term" className={inputClass} value={draft.termCode} onChange={e => setDraft(d => ({ ...d, termCode: e.target.value }))} required>
              <option value="">Selecciona un periodo</option>
              {terms.map(term => <option key={term.code} value={term.code}>{term.code}{term.active ? ' · activo' : ''}</option>)}
            </select>
          </label>
          <button data-cy="new-course-submit" type="submit" className={primaryClass} disabled={loading || busy || terms.length === 0}>Crear curso</button>
        </form>
        {loading && <p role="status" className="mt-3 text-[12px] text-muted-foreground">Cargando periodos y personas…</p>}
        {!loading && terms.length === 0 && <p className="mt-3 text-[12px] text-muted-foreground">No hay periodos disponibles para crear cursos.</p>}
      </section>

      <section className="border border-border bg-background p-4 sm:p-5" aria-labelledby="group-assignment-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="group-assignment-title" className="text-[15px] font-semibold">Docentes y matrícula</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">Selecciona un grupo para gestionar sus responsables y estudiantes.</p>
          </div>
          {courses.length > 0 && <label className="block min-w-[12rem] text-[12px] font-medium">Curso
            <select data-cy="managed-course" className={inputClass} value={selected} disabled={busy} onChange={e => { setLoadingTeachers(true); setTeachers([]); setSelectedCode(e.target.value); setTeacherId(''); setStudentId(''); setError(null); setNotice(null); }}>
              {courses.map(c => <option key={c.code} value={c.code}>{c.code} · {c.termCode}</option>)}
            </select>
          </label>}
        </div>
        {courses.length === 0 ? <p className="mt-5 text-[13px] text-muted-foreground" data-cy="no-managed-courses">Crea un curso para comenzar.</p> : <>
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-[13px] font-semibold">Docentes responsables</h3>
            {loadingTeachers ? <p role="status" className="mt-2 text-[12px] text-muted-foreground">Cargando docentes…</p> : teachers.length === 0 ? <p className="mt-2 text-[12px] text-muted-foreground" data-cy="no-course-teachers">Este curso aún no tiene docentes asignados.</p> :
              <ul className="mt-2 divide-y divide-border" data-cy="course-teachers">{teachers.map(t => <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[12px]">
                <span>{t.displayName} <span className="text-muted-foreground">· {t.email}</span></span>
                <button type="button" className={actionClass} data-cy={`remove-teacher-${t.id}`} onClick={e => { removeTrigger.current = e.currentTarget; setRemoval({ type: 'teacher', id: t.id, name: t.displayName }); }}>Retirar</button>
              </li>)}</ul>}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="min-w-0 flex-1 text-[12px] font-medium">Asignar docente activo
                <select data-cy="teacher-candidate" className={inputClass} value={teacherId} onChange={e => setTeacherId(e.target.value)} disabled={busy || loading}>
                  <option value="">Selecciona un docente</option>
                  {availableTeachers.map(t => <option key={t.id} value={t.id}>{t.displayName} · {t.email}</option>)}
                </select>
              </label>
              <button type="button" className={`${primaryClass} sm:self-end`} data-cy="assign-teacher" disabled={!teacherId || busy} onClick={() => void assignTeacher()}>Asignar docente</button>
            </div>
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="text-[13px] font-semibold">Estudiantes matriculados</h3>
            {enrolled.length === 0 ? <p className="mt-2 text-[12px] text-muted-foreground" data-cy="no-course-students">Este curso aún no tiene estudiantes matriculados.</p> :
              <ul className="mt-2 divide-y divide-border" data-cy="course-students">{enrolled.map(s => <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[12px]">
                <span>{s.displayName} <span className="text-muted-foreground">· {s.email}</span></span>
                <button type="button" className={actionClass} data-cy={`remove-student-${s.id}`} onClick={e => { removeTrigger.current = e.currentTarget; setRemoval({ type: 'student', id: s.id, name: s.displayName }); }}>Quitar matrícula</button>
              </li>)}</ul>}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="min-w-0 flex-1 text-[12px] font-medium">Vincular o cambiar estudiante de curso
                <select data-cy="student-candidate" className={inputClass} value={studentId} onChange={e => setStudentId(e.target.value)} disabled={busy || loading}>
                  <option value="">Selecciona un estudiante registrado</option>
                  {students.filter(s => s.courseCode !== selected).map(s => <option key={s.id} value={s.id}>{s.displayName} · {s.email}{s.courseCode ? ` · actualmente ${s.courseCode}` : ' · sin curso'}</option>)}
                </select>
              </label>
              <button type="button" className={`${primaryClass} sm:self-end`} data-cy="assign-student" disabled={!studentId || busy} onClick={() => void assignStudent()}>Vincular estudiante</button>
            </div>
            {chosenStudent?.courseCode && <p className="mt-2 text-[12px] text-muted-foreground" data-cy="student-move-warning">Este cambio moverá a {chosenStudent.displayName} de {chosenStudent.courseCode} a {selected}. Sus eventos anteriores conservan el curso original.</p>}
          </div>
          <p className="mt-5 border-t border-border pt-4 text-[12px] text-muted-foreground">Los docentes asignados podrán elegir este curso en <Link to="/analytics" className="text-primary-light underline focus-visible:outline-2 focus-visible:outline-ring">Analítica</Link>. El reporte mantiene la supresión de grupos pequeños.</p>
        </>}
      </section>

      <ConfirmationDialog open={removal !== null} title={removal?.type === 'teacher' ? 'Retirar docente del curso' : 'Quitar matrícula'}
        description={removal?.type === 'teacher' ? 'El docente perderá inmediatamente el acceso a las métricas de este curso.' : 'El estudiante dejará de pertenecer a este curso. Los eventos anteriores conservarán su atribución.'}
        target={removal && { name: removal.name, detail: selected }} confirmLabel="Confirmar retiro"
        onConfirm={confirmRemoval} onClose={() => setRemoval(null)} restoreFocus={() => removeTrigger.current} />
    </div>
  );
}

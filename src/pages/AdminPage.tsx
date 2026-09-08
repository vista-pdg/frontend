import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Network,
  Users,
  Shield,
  Lock,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ChevronLeft,
  LogOut,
  GraduationCap,
  History,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchRoles,
  createRole,
  updateRole,
  deleteRole,
  fetchPermissions,
  fetchAdminCourses,
  updateCourseQuota,
  fetchQuotaHistory,
} from '@/services/adminService';
import { ApiError } from '@/lib/http';
import type {
  UserDto,
  RoleDto,
  PermissionDto,
  CreateUserRequest,
  CreateRoleRequest,
  CourseQuotaDto,
  QuotaChangeDto,
} from '@/types/auth';

type Tab = 'users' | 'roles' | 'permissions' | 'courses';

// ─── Small reusable components ───────────────────────────────────────────────

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block px-1.5 py-0.5 text-[10px] font-bold tracking-wider uppercase',
        className
      )}
    >
      {children}
    </span>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black-main/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md border border-border bg-card/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-[13px] font-semibold text-white tracking-wide">{title}</p>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors duration-150 p-1"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full bg-black-main border border-border text-white placeholder:text-muted-foreground text-[13px] px-3 py-2 focus:outline-none focus:border-primary/70 transition-colors duration-150',
        props.className
      )}
    />
  );
}

// ─── Users section ────────────────────────────────────────────────────────────

function UsersSection({ roles }: { roles: RoleDto[] }) {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateUserRequest>({
    displayName: '',
    email: '',
    password: '',
    roleIds: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // El .catch importa: sin el, un fallo de carga se convierte en un rechazo de promesa sin
    // manejar que ni el usuario ve ni la consola explica.
    fetchUsers()
      .then(setUsers)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los usuarios')
      )
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setForm({ displayName: '', email: '', password: '', roleIds: [] });
    setEditing(null);
    setCreating(true);
    setError(null);
  }

  function openEdit(u: UserDto) {
    const roleIds = roles.filter((r) => u.roles.includes(r.name)).map((r) => r.id);
    setForm({ displayName: u.displayName, email: u.email, password: '', roleIds });
    setEditing(u);
    setCreating(true);
    setError(null);
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function toggleRole(id: number) {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(id) ? f.roleIds.filter((r) => r !== id) : [...f.roleIds, id],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const updated = await updateUser(editing.id, form);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        const created = await createUser(form);
        setUsers((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar usuario?')) return;
    await deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
          {users.length} usuarios registrados
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-[12px] font-semibold px-3 py-1.5 transition-colors duration-150"
        >
          <Plus className="size-3.5" />
          Nuevo usuario
        </button>
      </div>

      {loading ? (
        <p className="text-[13px] text-muted-foreground">Cargando…</p>
      ) : (
        <div className="border border-border overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-white/3">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Nombre
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Email
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Roles
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Estado
                </th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{u.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <Badge key={r} className="bg-primary/15 text-primary-light">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={u.enabled ? 'bg-secondary/15 text-secondary' : 'bg-border text-muted-foreground'}
                    >
                      {u.enabled ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-muted-foreground hover:text-white p-1 transition-colors duration-150"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-muted-foreground hover:text-destructive p-1 transition-colors duration-150"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title={editing ? 'Editar usuario' : 'Nuevo usuario'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre">
              <Input
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Juan Pérez"
                required
              />
            </Field>
            <Field label="Correo electrónico">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="juan@example.com"
                required
              />
            </Field>
            <Field label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required={!editing}
              />
            </Field>
            <Field label="Roles">
              <div className="flex flex-wrap gap-2 pt-1">
                {roles.map((r) => {
                  const active = form.roleIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border transition-colors duration-150',
                        active
                          ? 'bg-primary/20 border-primary/60 text-primary-light'
                          : 'bg-transparent border-border text-muted-foreground hover:border-primary/40 hover:text-white'
                      )}
                    >
                      {active && <Check className="size-3" />}
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </Field>
            {error && (
              <p className="text-[12px] text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 border border-border text-muted-foreground hover:text-white text-[12px] py-2 transition-colors duration-150"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-[12px] font-semibold py-2 transition-colors duration-150"
              >
                {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Roles section ─────────────────────────────────────────────────────────

function RolesSection({ permissions }: { permissions: PermissionDto[] }) {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RoleDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateRoleRequest>({ name: '', permissionIds: [] });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles()
      .then(setRoles)
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setForm({ name: '', permissionIds: [] });
    setEditing(null);
    setCreating(true);
    setError(null);
  }

  function openEdit(r: RoleDto) {
    const permissionIds = permissions.filter((p) => r.permissions.includes(p.name)).map((p) => p.id);
    setForm({ name: r.name, permissionIds });
    setEditing(r);
    setCreating(true);
    setError(null);
  }

  function closeModal() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function togglePerm(id: number) {
    setForm((f) => ({
      ...f,
      permissionIds: f.permissionIds.includes(id)
        ? f.permissionIds.filter((p) => p !== id)
        : [...f.permissionIds, id],
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const updated = await updateRole(editing.id, form);
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createRole(form);
        setRoles((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar rol?')) return;
    await deleteRole(id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
          {roles.length} roles registrados
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-[12px] font-semibold px-3 py-1.5 transition-colors duration-150"
        >
          <Plus className="size-3.5" />
          Nuevo rol
        </button>
      </div>

      {loading ? (
        <p className="text-[13px] text-muted-foreground">Cargando…</p>
      ) : (
        <div className="border border-border overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-white/3">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Rol
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Permisos asociados
                </th>
                <th className="px-4 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-white font-semibold tracking-wider">{r.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.permissions.length === 0 ? (
                        <span className="text-muted-foreground text-[11px]">Sin permisos</span>
                      ) : (
                        r.permissions.map((p) => (
                          <Badge key={p} className="bg-secondary/10 text-secondary border border-secondary/20">
                            {p}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-muted-foreground hover:text-white p-1 transition-colors duration-150"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-muted-foreground hover:text-destructive p-1 transition-colors duration-150"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title={editing ? 'Editar rol' : 'Nuevo rol'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nombre del rol">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))}
                placeholder="NOMBRE_ROL"
                required
              />
            </Field>
            <Field label="Permisos">
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-custom">
                {permissions.map((p) => {
                  const active = form.permissionIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePerm(p.id)}
                      className={cn(
                        'flex items-start gap-2.5 text-left px-3 py-2 border transition-colors duration-150',
                        active
                          ? 'bg-secondary/10 border-secondary/40 text-white'
                          : 'bg-transparent border-border text-muted-foreground hover:border-secondary/30 hover:text-white'
                      )}
                    >
                      <div
                        className={cn(
                          'size-3.5 border shrink-0 mt-0.5 flex items-center justify-center transition-colors duration-150',
                          active ? 'bg-secondary border-secondary' : 'border-border'
                        )}
                      >
                        {active && <Check className="size-2.5 text-black-main" />}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Field>
            {error && (
              <p className="text-[12px] text-destructive border border-destructive/30 bg-destructive/10 px-3 py-2">
                {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 border border-border text-muted-foreground hover:text-white text-[12px] py-2 transition-colors duration-150"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white text-[12px] font-semibold py-2 transition-colors duration-150"
              >
                {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Permissions section ───────────────────────────────────────────────────

function PermissionsSection() {
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPermissions()
      .then(setPermissions)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase mb-4">
        {permissions.length} permisos del sistema
      </p>
      {loading ? (
        <p className="text-[13px] text-muted-foreground">Cargando…</p>
      ) : (
        <div className="border border-border overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-white/3">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Permiso
                </th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                  Descripción
                </th>
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <Badge className="bg-secondary/10 text-secondary border border-secondary/20">
                      {p.name}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Courses & assistant quota (HU-17) ────────────────────────────────────

function CoursesSection() {
  const [courses, setCourses] = useState<CourseQuotaDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<QuotaChangeDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchAdminCourses()
      .then((cs) => {
        setCourses(cs);
        setDrafts(Object.fromEntries(cs.map((c) => [c.code, c.dailyQuota?.toString() ?? ''])));
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los cursos')
      )
      .finally(() => setLoading(false));
  }, []);

  function parsed(code: string): number | null {
    const raw = drafts[code]?.trim() ?? '';
    if (!/^\d+$/.test(raw)) return null;
    const n = Number(raw);
    return n >= 1 && n <= 1000 ? n : null;
  }

  function isDirty(c: CourseQuotaDto): boolean {
    const raw = drafts[c.code]?.trim() ?? '';
    return raw !== (c.dailyQuota?.toString() ?? '');
  }

  async function save(c: CourseQuotaDto) {
    const value = parsed(c.code);
    if (value === null) return;
    setSaving(c.code);
    setError(null);
    try {
      const updated = await updateCourseQuota(c.code, value);
      setCourses((cs) => cs.map((x) => (x.code === c.code ? updated : x)));
      setSavedCode(c.code);
      window.setTimeout(() => setSavedCode((s) => (s === c.code ? null : s)), 2500);
      if (historyFor === c.code) void loadHistory(c.code);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la cuota');
    } finally {
      setSaving(null);
    }
  }

  async function loadHistory(code: string) {
    setHistoryFor(code);
    setHistoryLoading(true);
    try {
      setHistory(await fetchQuotaHistory(code));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial');
    } finally {
      setHistoryLoading(false);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <>
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
            {courses.length} cursos
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Cuota diaria de mensajes al asistente por curso. En blanco aplica la cuota por defecto.
          </p>
        </div>
      </div>

      {error && (
        <p data-cy="courses-error" className="text-[12px] text-red-400 border border-destructive/30 bg-destructive/10 px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-[13px] text-muted-foreground">Cargando…</p>
      ) : (
        <div className="border border-border overflow-hidden" data-cy="courses-table">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border bg-white/3">
                {['Código', 'Curso', 'Periodo', 'Cuota diaria', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const valid = parsed(c.code) !== null;
                const dirty = isDirty(c);
                return (
                  <tr key={c.code} className="border-b border-border/50 hover:bg-white/3 transition-colors" data-cy={`course-row-${c.code}`}>
                    <td className="px-4 py-3 font-mono text-white">{c.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.termCode}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          inputMode="numeric"
                          value={drafts[c.code] ?? ''}
                          placeholder={String(c.effectiveDailyQuota)}
                          onChange={(e) => setDrafts((d) => ({ ...d, [c.code]: e.target.value }))}
                          data-cy={`quota-input-${c.code}`}
                          aria-label={`Cuota diaria de ${c.code}`}
                          aria-invalid={dirty && !valid}
                          className={cn(
                            'w-24 bg-black-main border px-2.5 py-1.5 text-[13px] text-white placeholder:text-muted-foreground focus:outline-none transition-colors',
                            dirty && !valid ? 'border-destructive' : dirty ? 'border-primary-light' : 'border-border'
                          )}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {c.dailyQuota === null ? 'por defecto' : 'msg/día'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {savedCode === c.code && (
                          <span data-cy={`quota-saved-${c.code}`} className="text-[11px] text-secondary flex items-center gap-1">
                            <Check className="size-3" /> Guardado
                          </span>
                        )}
                        <button
                          onClick={() => save(c)}
                          disabled={!dirty || !valid || saving === c.code}
                          data-cy={`quota-save-${c.code}`}
                          className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Save className="size-3.5" /> Guardar
                        </button>
                        <button
                          onClick={() => (historyFor === c.code ? setHistoryFor(null) : void loadHistory(c.code))}
                          data-cy={`quota-history-${c.code}`}
                          className={cn(
                            'flex items-center gap-1.5 border px-3 py-1.5 text-[12px] transition-colors',
                            historyFor === c.code
                              ? 'border-primary-light text-primary-light'
                              : 'border-border text-muted-foreground hover:text-white hover:border-primary/40'
                          )}
                        >
                          <History className="size-3.5" /> Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {historyFor && (
        <div className="border border-border mt-4" data-cy="quota-history-list">
          <div className="flex items-center gap-2 border-b border-border bg-white/3 px-4 py-2.5">
            <History className="size-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
              Historial de cambios de cuota · {historyFor}
            </span>
          </div>
          {historyLoading ? (
            <p className="px-4 py-3 text-[12px] text-muted-foreground">Cargando…</p>
          ) : history.length === 0 ? (
            <p className="px-4 py-3 text-[12px] text-muted-foreground">Sin cambios registrados.</p>
          ) : (
            <ul>
              {history.map((h, i) => (
                <li
                  key={`${h.changedAt}-${i}`}
                  data-cy="quota-history-row"
                  className="flex items-center gap-6 border-b border-border/50 px-4 py-2.5 text-[12px] last:border-b-0"
                >
                  <span className="w-40 text-muted-foreground">{fmt(h.changedAt)}</span>
                  <span className="w-32 flex items-center gap-2">
                    <span className="text-muted-foreground">{h.previousQuota ?? '—'}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-semibold text-white">{h.newQuota}</span>
                  </span>
                  <span className="text-muted-foreground">{h.changedBy}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export function AdminPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);

  useEffect(() => {
    fetchRoles().then(setRoles).catch(() => {});
    fetchPermissions().then(setPermissions).catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'permissions', label: 'Permisos', icon: Lock },
    { id: 'courses', label: 'Cursos', icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen w-screen bg-black-main text-white">
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-primary" />

      {/* Header */}
      <header className="border-b border-border bg-black-main/90 backdrop-blur-md sticky top-[2px] z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-primary flex items-center justify-center shrink-0">
              <Network className="size-4 text-white" />
            </div>
            <div>
              <span className="text-[13px] font-bold tracking-[0.25em] text-white uppercase">VISTA</span>
              <span className="text-muted-foreground mx-2 text-[13px]">/</span>
              <span className="text-[13px] text-primary-light">Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-white transition-colors duration-150"
            >
              <ChevronLeft className="size-3.5" />
              Volver al visualizador
            </Link>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <div className="size-6 bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-bold text-primary-light">
                {user?.displayName?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <span className="text-[12px] text-muted-foreground hidden sm:block">{user?.displayName}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-destructive transition-colors duration-150 p-1"
              title="Cerrar sesión"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-[20px] font-bold text-white tracking-tight">
            Administración
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Gestión de usuarios, roles y permisos del sistema
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              data-cy={`admin-tab-${id}`}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-[12px] font-semibold border-b-2 -mb-px transition-colors duration-150',
                tab === id
                  ? 'border-primary text-white'
                  : 'border-transparent text-muted-foreground hover:text-white'
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {tab === 'users' && <UsersSection roles={roles} />}
          {tab === 'roles' && <RolesSection permissions={permissions} />}
          {tab === 'permissions' && <PermissionsSection />}
          {tab === 'courses' && <CoursesSection />}
        </div>
      </main>
    </div>
  );
}

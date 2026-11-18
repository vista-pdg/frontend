import { useState } from 'react';
import { Pencil, Sparkles } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MaterialSources, type SourceRow } from '@/components/quiz/MaterialSources';
import { MicroLabel, quizControlClass } from '@/components/quiz/QuizPageShell';
import { QuizField } from '@/components/quiz/QuizField';
import { ApiError } from '@/lib/http';
import { MAX_INSTRUCTIONS, fieldDescribedBy, materialDetail } from '@/lib/quiz';
import { addMaterialFile, addMaterialLink, deleteMaterial, updateGuidance } from '@/services/quizService';
import type { MaterialDto } from '@/types/quiz';

function failure(error: unknown, field: 'url' | 'file'): string {
  if (error instanceof ApiError) return error.fieldErrors[field] ?? error.message;
  return 'No se pudo leer la fuente. Revisa tu conexión e intenta de nuevo.';
}

/**
 * HU-36 · CA-1 y CA-2: instrucciones y material del quiz en el banco. Editables en borrador; en un
 * quiz publicado quedan en solo lectura porque ya no se generan lotes.
 */
export function GuidancePanel({ quizId, editable, instructions, materials, onChange }: {
  quizId: number;
  editable: boolean;
  instructions: string | null;
  materials: MaterialDto[];
  onChange: (next: { instructions: string | null; materials: MaterialDto[] }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(instructions ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState<SourceRow | null>(null);
  const [removeError, setRemoveError] = useState('');

  if (!editable && !instructions && materials.length === 0) return null;

  async function save() {
    if (text.trim().length > MAX_INSTRUCTIONS) return setError(`Las instrucciones admiten hasta ${MAX_INSTRUCTIONS} caracteres.`);
    setSaving(true);
    setError('');
    try {
      const saved = await updateGuidance(quizId, text.trim());
      onChange(saved);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.fieldErrors.instructions ?? err.message : 'No se pudieron guardar las instrucciones.');
    } finally {
      setSaving(false);
    }
  }
  async function read(row: SourceRow, request: () => Promise<MaterialDto>, field: 'url' | 'file'): Promise<string | null> {
    setReading(row);
    try {
      const material = await request();
      onChange({ instructions, materials: [...materials, material] });
      return null;
    } catch (err) {
      return failure(err, field);
    } finally {
      setReading(null);
    }
  }
  async function remove(key: string) {
    setRemoveError('');
    try {
      await deleteMaterial(quizId, Number(key));
      onChange({ instructions, materials: materials.filter(m => String(m.id) !== key) });
    } catch {
      setRemoveError('No se pudo quitar la fuente. Intenta de nuevo.');
    }
  }

  const rows: SourceRow[] = materials.map(m => ({
    key: String(m.id), kind: m.kind === 'LINK' ? 'link' : 'file', title: m.name, detail: materialDetail(m), state: 'ready', format: m.format,
  }));
  if (reading) rows.push(reading);

  return (
    <section className="space-y-3 border border-border bg-card p-4" data-cy="guidance-panel" aria-labelledby="guidance-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="guidance-title" className="flex items-center gap-2"><Sparkles className="size-3.5 text-primary-light" aria-hidden="true" /><MicroLabel>Instrucciones y material para la IA</MicroLabel></h2>
        {editable && !editing && (
          <Button variant="outline" className="min-h-11 px-3 text-xs" data-cy="guidance-edit" onClick={() => { setText(instructions ?? ''); setEditing(true); }}>
            <Pencil aria-hidden="true" />Editar instrucciones
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <QuizField id="guidance-instructions" label="Instrucciones para la IA" error={error} hint={`${text.trim().length} / ${MAX_INSTRUCTIONS} · Se suman a las reglas de VISTA.`}>
            <textarea id="guidance-instructions" data-cy="guidance-textarea" rows={4} className={`${quizControlClass} py-2.5 leading-relaxed`} value={text}
              onChange={e => { setText(e.target.value); setError(''); }} aria-invalid={!!error}
              aria-describedby={fieldDescribedBy('guidance-instructions', error, 'x')} />
          </QuizField>
          <div className="flex flex-wrap gap-3">
            <Button className="min-h-11 px-4" data-cy="guidance-save" disabled={saving} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar instrucciones'}</Button>
            <Button variant="outline" className="min-h-11 px-4" data-cy="guidance-cancel" disabled={saving} onClick={() => { setEditing(false); setError(''); }}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] leading-relaxed break-words whitespace-pre-line" data-cy="guidance-instructions">
          {instructions ?? <span className="text-muted-foreground">Sin instrucciones: la IA usa solo las reglas de VISTA.</span>}
        </p>
      )}
      {editable ? (
        <MaterialSources idPrefix="guidance" rows={rows} adding={reading !== null}
          onAddLink={(url, crawl) => read({ key: 'reading', kind: 'link', title: url, detail: crawl ? 'Recorriendo el sitio… puede tardar hasta un minuto.' : 'Leyendo…', state: 'reading' }, () => addMaterialLink(quizId, url, crawl), 'url')}
          onAddFile={file => read({ key: 'reading', kind: 'file', title: file.name, detail: 'Leyendo…', state: 'reading' }, () => addMaterialFile(quizId, file), 'file')}
          onRemove={key => void remove(key)} />
      ) : materials.length > 0 && (
        <ul className="border border-border" data-cy="material-list" aria-label="Fuentes de material">
          {materials.map(m => (
            <li key={m.id} data-cy="material-source" data-state="ready" className="border-b border-border px-3 py-2.5 last:border-b-0">
              <p className="truncate text-[13px] font-medium">{m.name}</p>
              <p className="text-[11px] text-muted-foreground">{materialDetail(m)}</p>
            </li>
          ))}
        </ul>
      )}
      {removeError && <Alert><span data-cy="material-remove-error">{removeError}</span></Alert>}
      <p className="text-[11px] text-muted-foreground">
        {editable
          ? 'Se aplican a los próximos lotes y a la edición con IA.'
          : 'Solo lectura: el quiz ya está publicado y no se generan más lotes.'}
      </p>
    </section>
  );
}

import { useRef, useState } from 'react';
import { CircleCheck, CircleX, FileText, FileUp, Globe, Link2, Loader2, NotebookText, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuizField } from '@/components/quiz/QuizField';
import { quizControlClass } from '@/components/quiz/QuizPageShell';
import { MATERIAL_ACCEPT, MAX_SOURCES, fieldDescribedBy, validateMaterialFile, validateMaterialLink } from '@/lib/quiz';
import { cn } from '@/lib/utils';

export interface SourceRow {
  key: string;
  kind: 'link' | 'file';
  title: string;
  detail: string;
  state: 'pending' | 'reading' | 'ready' | 'error';
  /** Formato leído o archivo, para el icono. */
  format?: string;
}

function SourceIcon({ row }: { row: SourceRow }) {
  const className = cn('size-4 shrink-0', row.state === 'ready' ? 'text-annotation-green' : row.state === 'error' ? 'text-destructive' : 'text-muted-foreground');
  if (row.state === 'reading') return <Loader2 className="size-4 shrink-0 animate-spin text-primary-light motion-reduce:animate-none" aria-hidden="true" />;
  if (row.state === 'error') return <CircleX className={className} aria-hidden="true" />;
  if (row.format === 'NOTEBOOK' || row.title.toLowerCase().endsWith('.ipynb')) return <NotebookText className={className} aria-hidden="true" />;
  if (row.kind === 'link') return <Globe className={className} aria-hidden="true" />;
  return <FileText className={className} aria-hidden="true" />;
}

/**
 * HU-36 · CA-2: añadir y quitar material de referencia. El componente valida en el navegador lo
 * que puede (esquema, extensión, tamaño, cupo); el padre decide si la fuente se lee ahora (banco) o
 * al crear el quiz (formulario nuevo).
 */
export function MaterialSources({ idPrefix, rows, disabled, adding, onAddLink, onAddFile, onRemove }: {
  idPrefix: string;
  rows: SourceRow[];
  disabled?: boolean;
  /** Una fuente se está leyendo: no se aceptan más hasta que termine. */
  adding?: boolean;
  onAddLink: (url: string, crawl: boolean) => Promise<string | null> | string | null;
  onAddFile: (file: File) => Promise<string | null> | string | null;
  onRemove: (key: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [crawl, setCrawl] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [fileError, setFileError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const full = rows.length >= MAX_SOURCES;
  const locked = disabled || adding || full;

  async function addLink(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (locked) return;
    const invalid = validateMaterialLink(url);
    if (invalid) return setLinkError(invalid);
    setLinkError('');
    const failure = await onAddLink(url.trim(), crawl);
    if (failure) setLinkError(failure);
    else { setUrl(''); setCrawl(false); }
  }
  async function addFile(file: File | undefined) {
    if (!file || locked) return;
    const invalid = validateMaterialFile(file);
    if (invalid) return setFileError(invalid);
    setFileError('');
    const failure = await onAddFile(file);
    if (failure) setFileError(failure);
  }

  return (
    <div className="space-y-3" data-cy={`${idPrefix}-material`}>
      <div className="space-y-1">
        <p className="text-xs font-medium">Material de referencia</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Hasta {MAX_SOURCES} fuentes. En cada lote la IA recibe solo los fragmentos relacionados con el tema; lo que diga el material no son órdenes para ella.
        </p>
      </div>
      {/* Formulario anidado imposible en HTML: el botón envía con su propio manejador. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end" onKeyDown={event => { if (event.key === 'Enter' && (event.target as HTMLElement).id === `${idPrefix}-url`) void addLink(event); }}>
        <div className="min-w-0 flex-1">
          <QuizField id={`${idPrefix}-url`} label="Enlace público" error={linkError}>
            <input id={`${idPrefix}-url`} data-cy="material-url" type="url" inputMode="url" autoComplete="off" spellCheck={false}
              placeholder="https://cyedbooks.github.io/CyED1/" className={quizControlClass} value={url} disabled={locked}
              onChange={e => { setUrl(e.target.value); setLinkError(''); }}
              aria-invalid={!!linkError} aria-describedby={fieldDescribedBy(`${idPrefix}-url`, linkError)} />
          </QuizField>
        </div>
        <Button type="button" variant="outline" className={cn('min-h-11 px-4', linkError && 'sm:mb-7')} data-cy="material-add-link" disabled={locked} onClick={event => void addLink(event)}>
          {adding ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          {adding ? 'Leyendo…' : 'Añadir enlace'}
        </Button>
      </div>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-[13px] leading-relaxed">
        <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" data-cy="material-crawl" checked={crawl} disabled={locked}
          onChange={e => setCrawl(e.target.checked)} />
        <span>Recorrer el sitio: leer también las páginas enlazadas de la misma sección (hasta 30). Útil para un libro o documentación completa.</span>
      </label>
      <div className="flex flex-col gap-3 border border-border bg-card p-4 sm:flex-row sm:items-center">
        <Upload className="hidden size-5 shrink-0 text-primary-light sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">Sube un archivo</p>
          <p id={`${idPrefix}-file-hint`} className="text-[11px] text-muted-foreground">PDF, Markdown, TXT, DOCX o cuaderno .ipynb · hasta 10 MB</p>
        </div>
        <input ref={fileInput} id={`${idPrefix}-file`} data-cy="material-file-input" type="file" accept={MATERIAL_ACCEPT} className="sr-only" tabIndex={-1}
          aria-describedby={`${idPrefix}-file-hint`} disabled={locked}
          onChange={e => { void addFile(e.target.files?.[0]); e.target.value = ''; }} />
        <Button type="button" variant="outline" className="min-h-11 px-4" data-cy="material-pick-file" disabled={locked} onClick={() => fileInput.current?.click()}>
          <FileUp aria-hidden="true" />Elegir archivo
        </Button>
      </div>
      {fileError && <p role="alert" data-cy="material-file-error" className="text-xs text-foreground">{fileError}</p>}
      {rows.length > 0 && (
        <ul className="border border-border" data-cy="material-list" aria-label="Fuentes de material">
          {rows.map(row => (
            <li key={row.key} data-cy="material-source" data-state={row.state} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
              <SourceIcon row={row} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium" title={row.title}>{row.title}</p>
                <p className={cn('text-[11px] leading-relaxed break-words', row.state === 'error' ? 'text-foreground' : 'text-muted-foreground')} data-cy="material-detail">
                  {row.state === 'ready' && <CircleCheck className="mr-1 inline size-3 text-annotation-green" aria-hidden="true" />}{row.detail}
                </p>
              </div>
              {row.state !== 'reading' && (
                <Button type="button" variant="ghost" className="min-h-11 shrink-0 px-2.5 text-xs" data-cy="material-remove" disabled={disabled}
                  aria-label={`Quitar ${row.title}`} onClick={() => onRemove(row.key)}>
                  <X aria-hidden="true" />Quitar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground" data-cy="material-count">
        {full ? `Ya hay ${MAX_SOURCES} fuentes. Quita una para añadir otra.` : `${rows.length} de ${MAX_SOURCES} fuentes`}
      </p>
    </div>
  );
}

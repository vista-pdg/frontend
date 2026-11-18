import { groupTopics } from '@/lib/quiz';
import { cn } from '@/lib/utils';
import { MicroLabel } from './QuizPageShell';
import type { QuizTopicDto } from '@/types/quiz';

/**
 * Temas del catálogo agrupados por familia, como casillas. Lo comparten el quiz de curso (HU-34) y
 * el de estudio (HU-35); cada formulario pone su leyenda y su ayuda.
 */
export function TopicPicker({ topics, selected, onToggle, legend, hint, error, disabled = false }: {
  topics: QuizTopicDto[];
  selected: string[];
  onToggle: (key: string) => void;
  legend: string;
  hint: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className="min-w-0 space-y-3" aria-describedby={error ? 'quiz-topics-error' : 'quiz-topics-hint'}>
      <legend className="text-xs font-medium">{legend}</legend>
      <p id="quiz-topics-hint" className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      {groupTopics(topics).map(group => (
        <div key={group.family} className="space-y-2 border border-border p-3">
          <MicroLabel>{group.label}</MicroLabel>
          <div className="flex flex-wrap gap-2">
            {group.topics.map(topic => {
              const checked = selected.includes(topic.key);
              return (
                <label key={topic.key} title={topic.description}
                  className={cn('flex min-h-11 cursor-pointer items-center gap-2 border px-2.5 text-xs has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                    checked ? 'border-primary bg-primary/12' : 'border-border hover:bg-muted', disabled && 'cursor-default opacity-60')}>
                  <input type="checkbox" className="size-4 accent-primary" data-cy={`quiz-topic-${topic.key}`} checked={checked} disabled={disabled} onChange={() => onToggle(topic.key)} />
                  {topic.label}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {error && <p id="quiz-topics-error" role="alert" data-cy="quiz-topics-error" className="text-xs text-foreground">{error}</p>}
    </fieldset>
  );
}

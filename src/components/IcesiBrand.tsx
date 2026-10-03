import { cn } from '@/lib/utils';

/** Uses the unmodified institutional SVG; the rail crops only its original symbol. */
export function IcesiBrand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span role="img" aria-label="Universidad Icesi" data-cy="icesi-brand" translate="no"
      className={cn('block h-8 shrink-0 overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none', collapsed ? 'w-8' : 'w-[87px]')}>
      <span className="block h-8 w-[87px] bg-primary dark:bg-white [mask-image:url('/brand/logo-icesi.svg')] [mask-repeat:no-repeat] [mask-size:87px_32px]" />
    </span>
  );
}

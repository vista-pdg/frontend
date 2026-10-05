import { useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { COLLAPSED_PANEL_HEIGHT, defaultPanel, fitPanel, panelBounds } from '@/lib/floatingPanel';
import type { PanelBounds, PanelRect } from '@/lib/floatingPanel';

type Action = 'move' | 'resize';
interface Gesture { action: Action; pointerId: number; x: number; y: number; rect: PanelRect; moved: boolean }

export function useFloatingPanel(enabled: boolean, collapsed: boolean) {
  const panelRef = useRef<HTMLDivElement>(null);
  const boundsRef = useRef<PanelBounds | null>(null);
  const rectRef = useRef<PanelRect | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [rect, setRect] = useState<PanelRect | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [announcement, setAnnouncement] = useState('');

  function commit(next: PanelRect) {
    rectRef.current = next;
    setRect(previous => previous && Object.keys(next).every(key =>
      previous[key as keyof PanelRect] === next[key as keyof PanelRect]) ? previous : next);
  }

  useLayoutEffect(() => {
    const parent = panelRef.current?.parentElement;
    if (!enabled || !parent) return;
    let frame = 0;
    function measure() {
      const compact = window.matchMedia('(max-width: 639px)').matches;
      const bounds = panelBounds(parent!.clientWidth, parent!.clientHeight, compact);
      boundsRef.current = bounds;
      commit(fitPanel(rectRef.current ?? defaultPanel(bounds, compact, collapsed), bounds, collapsed));
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); }
    const observer = new ResizeObserver(schedule);
    observer.observe(parent);
    window.addEventListener('resize', schedule);
    schedule();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', schedule); };
  }, [enabled, collapsed]);

  function announce(next: PanelRect) {
    setAnnouncement(`Panel: ${Math.round(next.width)} por ${Math.round(next.height)} píxeles. Posición: ${Math.round(next.x)}, ${Math.round(next.y)}.`);
  }

  function adjust(kind: Action, dx: number, dy: number) {
    const current = rectRef.current;
    const bounds = boundsRef.current;
    if (!current || !bounds) return;
    // Growing near a boundary moves the panel inward instead of silently discarding the size.
    const next = fitPanel(kind === 'move'
      ? { ...current, x: current.x + dx, y: current.y + dy }
      : { ...current, width: current.width + dx, height: current.height + dy }, bounds, collapsed);
    commit(next);
    announce(next);
  }

  function reset() {
    const bounds = boundsRef.current;
    if (!bounds) return;
    const next = defaultPanel(bounds, window.matchMedia('(max-width: 639px)').matches, collapsed);
    commit(next);
    setAnnouncement('Posición y tamaño del panel restablecidos.');
  }

  function cancel() {
    const gesture = gestureRef.current;
    if (!gesture || !boundsRef.current) return;
    commit(fitPanel(gesture.rect, boundsRef.current, collapsed));
    gestureRef.current = null;
    suppressClick.current = true;
    setAction(null);
    setAnnouncement('Ajuste cancelado.');
  }

  function keyboard(event: KeyboardEvent<HTMLButtonElement>, kind: Action) {
    if (event.key === 'Escape') { event.stopPropagation(); cancel(); return; }
    if (event.key === 'Home') { event.preventDefault(); event.stopPropagation(); reset(); return; }
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation(); // Canvas arrow shortcuts must not advance the algorithm.
    const distance = event.shiftKey ? 32 : 8;
    adjust(kind, direction[0] * distance, direction[1] * distance);
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, kind: Action) {
    if (!event.isPrimary || event.button !== 0 || !rectRef.current) return;
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    suppressClick.current = false;
    gestureRef.current = { action: kind, pointerId: event.pointerId, x: event.clientX, y: event.clientY, rect: rectRef.current, moved: false };
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    const bounds = boundsRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !bounds) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.moved && Math.hypot(dx, dy) < 4) return;
    gesture.moved = true;
    event.preventDefault();
    event.stopPropagation();
    setAction(gesture.action);
    commit(fitPanel(gesture.action === 'move'
      ? { ...gesture.rect, x: gesture.rect.x + dx, y: gesture.rect.y + dy }
      : { ...gesture.rect, width: gesture.rect.width + dx, height: gesture.rect.height + dy }, bounds, collapsed));
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    suppressClick.current = gesture.moved;
    gestureRef.current = null;
    setAction(null);
    if (gesture.moved && rectRef.current) announce(rectRef.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function allowClick(detail: number) {
    // Touch dragging can suppress the native click entirely. Its flag must never consume a
    // subsequent keyboard/assistive activation (detail=0), which has no pointer-down reset.
    if (detail === 0) { suppressClick.current = false; return true; }
    if (!suppressClick.current) return true;
    suppressClick.current = false;
    return false;
  }

  return { panelRef, action, announcement, adjust, reset, pointerDown, pointerMove, pointerUp, keyboard, cancel, allowClick,
    style: rect ? { left: rect.x, top: rect.y, width: rect.width,
      height: collapsed ? Math.min(COLLAPSED_PANEL_HEIGHT, rect.height) : rect.height, bottom: 'auto' } : undefined };
}

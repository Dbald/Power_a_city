/**
 * Pointer-based drag and drop for the connection exercise. Pointer events
 * cover mouse, touch and pen with one code path (HTML5 drag-and-drop does not
 * work with touch). Dragging is an extra: a press that doesn't move still
 * becomes a normal click, so tap-to-select and keyboard use are unchanged.
 *
 * Markup contract (delegated, so it survives re-renders):
 *   [data-drag-card="<id>"]  something that can be picked up
 *   [data-drop="<n>"]        step n (0-based) accepts a card
 *   [data-drop="tray"]       returns the card to the tray
 */
const THRESHOLD = 8;

export type DropTarget = number | 'tray';

export function enableDrag(onDrop: (card: string, to: DropTarget) => void) {
  let pending: { el: HTMLElement; card: string; x: number; y: number; pointerId: number } | null = null;
  let ghost: HTMLElement | null = null;
  let over: HTMLElement | null = null;

  const targetAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]') ?? null;

  const setOver = (el: HTMLElement | null) => {
    if (el === over) return;
    over?.classList.remove('is-drop-target');
    over = el;
    over?.classList.add('is-drop-target');
  };

  const end = () => {
    ghost?.remove();
    ghost = null;
    setOver(null);
    pending?.el.classList.remove('is-drag-source');
    document.body.classList.remove('is-dragging');
    pending = null;
  };

  // A completed drag must not also count as a click on the card it started from.
  const swallowClick = () => {
    const stop = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('click', stop, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0);
  };

  document.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-drag-card]');
    if (!el || (el as HTMLButtonElement).disabled) return;
    pending = { el, card: el.dataset.dragCard!, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
  });

  document.addEventListener('pointermove', (e) => {
    if (!pending || e.pointerId !== pending.pointerId) return;
    if (!ghost) {
      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) < THRESHOLD) return;
      const rect = pending.el.getBoundingClientRect();
      ghost = pending.el.cloneNode(true) as HTMLElement;
      ghost.removeAttribute('data-key');
      ghost.removeAttribute('id');
      ghost.classList.add('drag-ghost');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      document.body.appendChild(ghost);
      pending.el.classList.add('is-drag-source');
      document.body.classList.add('is-dragging');
    }
    e.preventDefault();
    ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) rotate(-2deg)`;
    setOver(targetAt(e.clientX, e.clientY));
  });

  document.addEventListener('pointerup', (e) => {
    if (!pending || e.pointerId !== pending.pointerId) return;
    if (!ghost) {
      pending = null; // no movement: let the click through as a normal tap
      return;
    }
    const target = targetAt(e.clientX, e.clientY);
    const card = pending.card;
    end();
    swallowClick();
    if (target) {
      const to = target.dataset.drop === 'tray' ? 'tray' : Number(target.dataset.drop);
      onDrop(card, to);
    }
  });

  document.addEventListener('pointercancel', end);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ghost) end();
  });
}

/**
 * Hotspot buttons double as scene labels and as the keyboard/touch route into
 * the scene: the canvas itself is aria-hidden, so every selectable part is a
 * real <button>. Both presentations share this layer.
 */
import type { InfrastructureId } from '../content/types.ts';
import { esc } from '../ui/html.ts';
import { SELECTABLE } from './view.ts';

export class HotspotLayer {
  readonly el: HTMLDivElement;
  private buttons = new Map<InfrastructureId, HTMLButtonElement>();
  private labels: Record<InfrastructureId, string>;

  constructor(parent: HTMLElement, labels: Record<InfrastructureId, string>, onSelect: (id: InfrastructureId) => void) {
    this.labels = labels;
    this.el = document.createElement('div');
    this.el.className = 'hotspots';
    this.el.setAttribute('role', 'group');
    this.el.setAttribute('aria-label', 'Neighborhood parts');
    for (const id of SELECTABLE) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hotspot';
      b.dataset.select = id;
      b.dataset.key = `hotspot:${id}`;
      b.innerHTML = `<span class="hotspot-check" aria-hidden="true">✓</span><span>${esc(labels[id])}</span>`;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => onSelect(id));
      this.buttons.set(id, b);
      this.el.appendChild(b);
    }
    parent.appendChild(this.el);
  }

  update(visible: InfrastructureId[], visited: InfrastructureId[], selected: InfrastructureId | null) {
    for (const [id, b] of this.buttons) {
      b.hidden = !visible.includes(id);
      b.classList.toggle('is-visited', visited.includes(id));
      b.setAttribute('aria-pressed', String(selected === id));
      b.setAttribute('aria-label', `${this.labels[id]}${visited.includes(id) ? ' (inspected)' : ''}`);
    }
  }

  /** Positions in CSS pixels relative to the layer; `null` hides a label that is off screen. */
  place(id: InfrastructureId, pos: { x: number; y: number } | null) {
    const b = this.buttons.get(id);
    if (!b) return;
    b.classList.toggle('is-offscreen', pos === null);
    if (pos) b.style.transform = `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px) translate(-50%, -100%)`;
  }

  placePercent(id: InfrastructureId, x: number, y: number) {
    const b = this.buttons.get(id);
    if (!b) return;
    b.style.left = `${x}%`;
    b.style.top = `${y}%`;
    b.style.transform = 'translate(-50%, -100%)';
  }

  dispose() {
    this.el.remove();
  }
}

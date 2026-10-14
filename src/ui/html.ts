import { photoFor, photoSrc, type ReferencePhoto } from '../content/photos.ts';

/** Escapes text for safe interpolation into HTML templates. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Builds a button wired to the app's delegated action handler. */
export function btn(
  label: string,
  action: string,
  opts: { arg?: string; cls?: string; key?: string; pressed?: boolean; current?: boolean; disabled?: boolean; aria?: string; icon?: string; data?: Record<string, string> } = {},
): string {
  const attrs = [
    `type="button"`,
    `class="btn ${opts.cls ?? ''}"`,
    `data-action="${esc(action)}"`,
    opts.arg !== undefined ? `data-arg="${esc(opts.arg)}"` : '',
    `data-key="${esc(opts.key ?? `${action}:${opts.arg ?? ''}`)}"`,
    opts.pressed !== undefined ? `aria-pressed="${opts.pressed}"` : '',
    opts.current ? 'aria-current="step"' : '',
    opts.disabled ? 'disabled' : '',
    opts.aria ? `aria-label="${esc(opts.aria)}"` : '',
    ...Object.entries(opts.data ?? {}).map(([k, v]) => `data-${k}="${esc(v)}"`),
  ]
    .filter(Boolean)
    .join(' ');
  const icon = opts.icon ? `<span class="btn-icon" aria-hidden="true">${opts.icon}</span>` : '';
  return `<button ${attrs}>${icon}<span>${esc(label)}</span></button>`;
}

/**
 * A real reference photo with its credit and licence, or nothing if the subject has none.
 * It sits inside a panel, never over the scene; if the file fails to load it hides itself.
 */
export function refPhoto(subject: string, opts: { caption?: string; list?: ReferencePhoto[] } = {}): string {
  const p = photoFor(subject, opts.list);
  if (!p) return '';
  return `<figure class="ref-photo" data-photo="${esc(subject)}">
  <div class="ref-photo-frame"><img src="${esc(photoSrc(p))}" alt="${esc(p.alt)}" decoding="async" onerror="this.closest('figure').hidden=true"><span class="ref-badge">Real photo</span></div>
  <figcaption>${opts.caption ? `<span>${esc(opts.caption)}</span> ` : ''}<span class="ref-credit">${esc(p.credit)} · <a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener">${esc(p.license)}</a></span></figcaption>
</figure>`;
}

/**
 * FlatScene — the 2D presentation (PC-11). An SVG schematic of the same
 * neighborhood, showing exactly the same ViewState the 3D scene receives, with
 * the same hotspot buttons. Used when WebGL is unavailable or by choice.
 */
import type { InfrastructureId } from '../content/types.ts';
import { HotspotLayer } from './hotspots.ts';
import type { Bookmark, CityView, ViewOptions, ViewState } from './view.ts';

/** Hotspot anchor positions as percentages of the 1600×900 drawing. */
const ANCHORS: Record<InfrastructureId, [number, number]> = {
  generation: [8, 38],
  transmission: [27, 18],
  substation: [47, 44],
  solar: [47, 76],
  battery: [62, 76],
  distribution: [66, 30],
  buildings: [85, 46],
};

const ROUTE: string[] = [
  'M 190 440 L 260 440 L 340 230', // generation → transmission
  'M 340 230 L 560 230 L 740 410', // transmission → substation
  'M 790 410 L 900 330 L 1060 330 L 1220 330 L 1380 330 L 1520 330', // substation → distribution
  'M 1060 330 L 1110 520 M 1220 330 L 1270 520 M 1380 330 L 1430 520 M 1220 330 L 1230 260', // service drops
];

export class FlatScene implements CityView {
  private root: HTMLDivElement;
  private svg: SVGSVGElement;
  private hotspots: HotspotLayer;
  private state: ViewState | null = null;

  constructor(container: HTMLElement, opts: ViewOptions) {
    this.root = document.createElement('div');
    this.root.className = 'flat-scene';
    const frame = document.createElement('div');
    frame.className = 'flat-frame';
    frame.innerHTML = this.drawing();
    this.root.appendChild(frame);
    container.appendChild(this.root);
    this.svg = frame.querySelector('svg')!;
    this.hotspots = new HotspotLayer(frame, opts.labels, opts.onSelect);
    for (const [id, [x, y]] of Object.entries(ANCHORS) as [InfrastructureId, [number, number]][]) this.hotspots.placePercent(id, x, y);
  }

  private drawing(): string {
    const houses = [1110, 1270, 1430]
      .map((x, i) => {
        const fill = ['#f0d9a8', '#bcd7e8', '#e8c1c1'][i];
        return `<g><rect x="${x - 50}" y="540" width="100" height="80" fill="${fill}" stroke="#333" stroke-width="3"/><path d="M ${x - 62} 540 L ${x} 490 L ${x + 62} 540 Z" fill="#8a4b3c" stroke="#333" stroke-width="3"/><rect class="win" x="${x - 32}" y="560" width="26" height="24"/><rect class="win" x="${x + 8}" y="560" width="26" height="24"/></g>`;
      })
      .join('');
    const poles = [900, 1060, 1220, 1380, 1520].map((x) => `<line x1="${x}" y1="320" x2="${x}" y2="470" stroke="#7a5a3c" stroke-width="8"/>`).join('');
    const lamps = [1030, 1190, 1350, 1510]
      .map((x) => `<g><line x1="${x}" y1="700" x2="${x}" y2="620" stroke="#5f6670" stroke-width="6"/><circle class="lamp" cx="${x}" cy="615" r="12"/><path class="lamp-glow" d="M ${x - 40} 700 L ${x} 620 L ${x + 40} 700 Z"/></g>`)
      .join('');
    const panels = [0, 1, 2].map((i) => `<rect class="panel" x="${690 + i * 70}" y="720" width="60" height="40" transform="skewX(-15)"/>`).join('');
    return `<svg viewBox="0 0 1600 900" role="img" aria-labelledby="flat-title flat-desc">
  <title id="flat-title">Neighborhood map</title>
  <desc id="flat-desc">From left to right: a power plant, two transmission towers, a fenced substation with solar panels and a battery below it, then street poles leading to three homes, a school, a shop and streetlights.</desc>
  <rect class="sky" width="1600" height="900"/>
  <rect y="470" width="1600" height="430" fill="#8fbf73"/>
  <rect x="860" y="640" width="720" height="70" fill="#5d6470"/>
  <g><rect x="60" y="370" width="130" height="100" fill="#c9c3b8" stroke="#333" stroke-width="3"/><rect x="80" y="280" width="26" height="90" fill="#a49d92" stroke="#333" stroke-width="3"/><rect x="230" y="420" width="44" height="50" fill="#7b8794" stroke="#333" stroke-width="3"/></g>
  <g stroke="#9aa3ad" stroke-width="8"><path d="M 320 470 L 340 220 L 360 470" fill="none"/><path d="M 540 470 L 560 220 L 580 470" fill="none"/><line x1="300" y1="230" x2="380" y2="230"/><line x1="520" y1="230" x2="600" y2="230"/></g>
  <g><rect x="690" y="400" width="140" height="80" fill="#b5b0a3" stroke="#8d969e" stroke-width="6" stroke-dasharray="10 6"/><rect x="710" y="420" width="40" height="44" fill="#6f7c88"/><rect x="770" y="420" width="40" height="44" fill="#6f7c88"/></g>
  ${panels}
  <g><rect x="930" y="700" width="100" height="70" fill="#e6e8eb" stroke="#333" stroke-width="3"/><rect x="1040" y="700" width="22" height="70" fill="#2b3440"/><rect class="battery-fill" x="1044" y="766" width="14" height="0" fill="#3ad17a"/></g>
  ${poles}
  <g class="route" fill="none" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">${ROUTE.map((d, i) => `<path class="seg" data-seg="${i}" d="${d}"/>`).join('')}</g>
  <g class="flow" fill="none" stroke-width="5" stroke-dasharray="4 26" stroke-linecap="round">${ROUTE.slice(0, 3).map((d) => `<path d="${d}"/>`).join('')}</g>
  <g><rect x="1110" y="160" width="230" height="100" fill="#d9a066" stroke="#333" stroke-width="3"/>${[0, 1, 2, 3].map((i) => `<rect class="win" x="${1130 + i * 52}" y="190" width="30" height="30"/>`).join('')}</g>
  <g><rect x="1400" y="180" width="150" height="80" fill="#9cc59a" stroke="#333" stroke-width="3"/><rect x="1395" y="170" width="160" height="16" fill="#c0504d"/><rect class="win" x="1420" y="205" width="40" height="30"/><rect class="win" x="1490" y="205" width="40" height="30"/></g>
  ${houses}
  ${lamps}
</svg>`;
  }

  setState(state: ViewState) {
    this.state = state;
    const s = this.svg;
    s.classList.toggle('is-evening', state.period === 'evening');
    s.classList.toggle('flow-on', state.flow && state.routeLit >= 5 && state.supply !== 'off');
    s.dataset.supply = state.supply;
    s.querySelectorAll<SVGPathElement>('.seg').forEach((p) => p.classList.toggle('is-lit', state.routeLit >= Number(p.dataset.seg) + 2));
    const fill = s.querySelector<SVGRectElement>('.battery-fill')!;
    const h = state.capacity ? (62 * state.stored) / state.capacity : 0;
    fill.setAttribute('height', String(h));
    fill.setAttribute('y', String(766 - h));
    this.hotspots.update(state.visible, state.visited, null);
  }

  setSelected(id: InfrastructureId | null) {
    if (this.state) this.hotspots.update(this.state.visible, this.state.visited, id);
  }

  // The schematic always shows the whole neighborhood, so bookmarks need no camera move.
  frame(_bookmark: Bookmark) {}
  resetView() {}
  setFreeCamera(_on: boolean) {}
  setReducedMotion(on: boolean) {
    this.root.classList.toggle('reduced-motion', on);
  }

  dispose() {
    this.hotspots.dispose();
    this.root.remove();
  }
}

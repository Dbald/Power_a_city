/**
 * CityScene — the authored neighborhood in three.js, built from placeholder
 * geometry (PRD §13: no asset pack yet). It frames camera bookmarks, handles
 * picking and shows the state the app hands it. No lesson rules live here.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { InfrastructureId } from '../content/types.ts';
import { HotspotLayer } from './hotspots.ts';
import { SELECTABLE, type Bookmark, type CityView, type ViewOptions, type ViewState } from './view.ts';

interface CamView {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Bookmarks are framed for a 16:9 stage; narrower stages pull the camera back (see `fit`). */
const BOOKMARKS: Record<Bookmark, CamView> = {
  overview: { position: v(1.5, 19, 24), target: v(1.5, 0, -1) },
  generation: { position: v(-11, 7, 11), target: v(-15, 2, -1) },
  transmission: { position: v(-6, 9, 15), target: v(-7, 4, -1) },
  substation: { position: v(5, 8, 11), target: v(3.5, 1, -3) },
  street: { position: v(13, 8, 16), target: v(13, 1, 3) },
  /** Solar, battery and the homes together, so each run's effect is visible. */
  experiment: { position: v(10.5, 12, 15.5), target: v(10.5, 0, 0) },
};

/** Where each hotspot label floats, in world space. */
const ANCHORS: Record<InfrastructureId, THREE.Vector3> = {
  generation: v(-17, 5.6, -1),
  transmission: v(-7, 7.8, -1),
  substation: v(1, 3.2, -1),
  solar: v(3.5, 1.9, -6.5),
  battery: v(8, 2.8, -6),
  distribution: v(8, 4.2, 2.2),
  buildings: v(13, 4.4, 7),
};

/** Ground position and radius of the selection ring for each part. */
const RINGS: Record<InfrastructureId, [number, number, number]> = {
  generation: [-16.5, -1, 3.6],
  transmission: [-7, -1, 4.4],
  substation: [1, -1, 3.2],
  solar: [3.5, -6.5, 2.8],
  battery: [8, -6, 1.6],
  distribution: [12, 2.2, 8.5],
  buildings: [14, 5.5, 7.5],
};

const COLORS = {
  daySky: new THREE.Color('#a9d8f2'),
  eveningSky: new THREE.Color('#1d2747'),
  lineOff: new THREE.Color('#4c5563'),
  lineOn: new THREE.Color('#ffc93c'),
  windowOff: new THREE.Color('#2f3a4a'),
  windowOn: new THREE.Color('#ffd27a'),
};

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

export class CityScene implements CityView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 200);
  private controls: OrbitControls;
  private hotspots: HotspotLayer;
  private container: HTMLElement;
  private opts: ViewOptions;
  private pickables: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private ring: THREE.Mesh;
  private hemi = new THREE.HemisphereLight('#ffffff', '#6b7f5a', 1.6);
  private sun = new THREE.DirectionalLight('#fff2d6', 2.2);
  /** Route segments: 0 plant→towers, 1 towers→substation, 2 substation→street poles, 3 service drops. */
  private segments: THREE.MeshStandardMaterial[] = [];
  private segmentPaths: THREE.Vector3[][] = [];
  private pulses: THREE.Mesh[] = [];
  private windowMat = new THREE.MeshStandardMaterial({ color: COLORS.windowOff, emissive: COLORS.windowOn, emissiveIntensity: 0 });
  private lampMat = new THREE.MeshStandardMaterial({ color: '#e8e2cf', emissive: '#fff1b8', emissiveIntensity: 0 });
  private glows: THREE.Mesh[] = [];
  private solarMat = new THREE.MeshStandardMaterial({ color: '#2c4f8a', metalness: 0.4, roughness: 0.35, emissive: '#1a3a7a', emissiveIntensity: 0.15 });
  private batteryFill: THREE.Mesh;
  private state: ViewState | null = null;
  private selected: InfrastructureId | null = null;
  private reducedMotion: boolean;
  private camFrom: CamView = { position: v(0, 0, 0), target: v(0, 0, 0) };
  private camTo: CamView = BOOKMARKS.overview;
  private bookmark: Bookmark = 'overview';
  private camT = 1;
  private raf = 0;
  private clock = new THREE.Timer();
  private flowT = 0;
  /** Screen-space shift (fractions of the stage) that keeps the selected part clear of the info card. */
  private shift = new THREE.Vector2();
  private shiftTo = new THREE.Vector2();
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement, opts: ViewOptions) {
    this.container = container;
    this.opts = opts;
    this.reducedMotion = opts.reducedMotion;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = this.renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.tabIndex = -1;
    container.appendChild(canvas);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enabled = false;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 42;
    this.controls.maxPolarAngle = 1.32;
    this.controls.addEventListener('start', () => (this.camT = 1));

    this.hotspots = new HotspotLayer(container, opts.labels, opts.onSelect);

    this.scene.background = COLORS.daySky.clone();
    this.sun.position.set(-8, 18, 10);
    this.scene.add(this.hemi, this.sun);

    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffe066' }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.scene.add(this.ring);

    this.batteryFill = this.buildWorld();

    canvas.addEventListener('click', (e) => this.pick(e));
    canvas.addEventListener('pointermove', (e) => {
      canvas.style.cursor = this.hit(e) ? 'pointer' : '';
    });
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.loop();
  }

  // ── World ────────────────────────────────────────────────────────────────

  private mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
  }

  private box(w: number, h: number, d: number, color: string | THREE.Material, x: number, y: number, z: number) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? this.mat(color) : color);
    m.position.set(x, y, z);
    return m;
  }

  private cyl(rTop: number, rBottom: number, h: number, color: string, x: number, y: number, z: number, seg = 12) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), this.mat(color));
    m.position.set(x, y, z);
    return m;
  }

  private group(id: InfrastructureId, ...children: THREE.Object3D[]) {
    const g = new THREE.Group();
    g.add(...children);
    g.userData.pick = id;
    this.pickables.push(g);
    this.scene.add(g);
    return g;
  }

  /** A wire between points, drawn as thin cylinders sharing one material. */
  private wire(points: THREE.Vector3[], material: THREE.Material, radius = 0.06) {
    const g = new THREE.Group();
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), material);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.add(m);
    }
    this.scene.add(g);
    return g;
  }

  private window(x: number, y: number, z: number, facing: 1 | -1) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.06), this.windowMat);
    w.position.set(x, y, z + facing * 0.02);
    return w;
  }

  private house(x: number, z: number, color: string) {
    const body = this.box(2.4, 1.8, 2.2, color, x, 0.9, z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.95, 1.2, 4), this.mat('#8a4b3c'));
    roof.position.set(x, 2.4, z);
    roof.rotation.y = Math.PI / 4;
    const door = this.box(0.5, 0.9, 0.06, '#5a3b2a', x + 0.6, 0.45, z - 1.12);
    return [body, roof, door, this.window(x - 0.5, 1.15, z - 1.12, -1)];
  }

  private buildWorld(): THREE.Mesh {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), this.mat('#8fbf73'));
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
    const street = this.box(21, 0.04, 2, '#5d6470', 12.5, 0.02, 3.8);
    const stripe = this.box(21, 0.05, 0.12, '#e9e2c6', 12.5, 0.03, 3.8);
    this.scene.add(street, stripe);

    // Generation: plant, stack and step-up transformer.
    const plant = this.box(3.6, 2.6, 3, '#c9c3b8', -17.5, 1.3, -1);
    const stack = this.cyl(0.35, 0.5, 4.4, '#a49d92', -18.7, 2.2, -1.6);
    const stepUp = this.box(1.2, 1.4, 1, '#7b8794', -14.3, 0.7, -1);
    this.group('generation', plant, stack, stepUp);

    // Transmission: two tall towers.
    const towers: THREE.Object3D[] = [];
    for (const x of [-10, -4]) {
      towers.push(this.cyl(0.08, 0.6, 6.6, '#9aa3ad', x, 3.3, -1, 4), this.box(2.6, 0.14, 0.14, '#9aa3ad', x, 6.4, -1));
    }
    this.group('transmission', ...towers);

    // Substation: fenced yard with step-down transformers and a gantry.
    const yard: THREE.Object3D[] = [this.box(4.6, 0.04, 3.6, '#b5b0a3', 1, 0.03, -1)];
    for (const [w, d, x, z] of [
      [4.6, 0.06, 1, -2.8],
      [4.6, 0.06, 1, 0.8],
      [0.06, 3.6, -1.3, -1],
      [0.06, 3.6, 3.3, -1],
    ] as const) {
      yard.push(this.box(w, 1, d, '#8d969e', x, 0.5, z));
    }
    yard.push(this.box(0.9, 1.1, 0.8, '#6f7c88', 0.2, 0.55, -1.6), this.box(0.9, 1.1, 0.8, '#6f7c88', 1.8, 0.55, -1.6));
    yard.push(this.cyl(0.08, 0.08, 2.8, '#9aa3ad', -0.6, 1.4, -0.2), this.cyl(0.08, 0.08, 2.8, '#9aa3ad', 2.6, 1.4, -0.2), this.box(3.3, 0.12, 0.12, '#9aa3ad', 1, 2.8, -0.2));
    this.group('substation', ...yard);

    // Solar panels and battery.
    const panels: THREE.Object3D[] = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.9), this.solarMat);
        p.position.set(1.8 + i * 1.6, 0.7, -7.3 + j * 1.3);
        p.rotation.x = -0.5;
        panels.push(p, this.cyl(0.05, 0.05, 0.6, '#7a7f86', 1.8 + i * 1.6, 0.3, -7.3 + j * 1.3, 6));
      }
    }
    this.group('solar', ...panels);
    const battery = this.box(2.4, 1.6, 1.4, '#e6e8eb', 8, 0.8, -6);
    const meterBack = this.box(0.4, 1.2, 0.05, '#2b3440', 8.7, 0.85, -5.27);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.06), new THREE.MeshStandardMaterial({ color: '#3ad17a', emissive: '#3ad17a', emissiveIntensity: 0.4 }));
    fill.position.set(8.7, 0.3, -5.24);
    this.group('battery', battery, meterBack, fill);

    // Distribution: street poles.
    const poleXs = [4, 8, 12, 16, 20];
    const poles: THREE.Object3D[] = [];
    for (const x of poleXs) poles.push(this.cyl(0.1, 0.13, 3.3, '#7a5a3c', x, 1.65, 2.2, 8), this.box(1.1, 0.1, 0.1, '#7a5a3c', x, 3.1, 2.2));
    poles.push(this.cyl(0.22, 0.22, 0.45, '#7b8794', 12, 2.6, 2.45, 10));
    this.group('distribution', ...poles);

    // Buildings: three homes, a school, a shop and streetlights.
    const houses = [...this.house(9, 6.4, '#f0d9a8'), ...this.house(13, 6.4, '#bcd7e8'), ...this.house(17, 6.4, '#e8c1c1')];
    const school = this.box(5, 2.4, 2.6, '#d9a066', 12, 1.2, -1.6);
    const schoolWin = [10.5, 11.5, 12.5, 13.5].map((x) => this.window(x, 1.4, -0.28, 1));
    const shop = this.box(3, 2, 2.4, '#9cc59a', 18, 1, -1.4);
    const awning = this.box(3.1, 0.12, 0.7, '#c0504d', 18, 1.9, -0.05);
    const shopWin = [this.window(17.3, 1, -0.17, 1), this.window(18.7, 1, -0.17, 1)];
    const lamps: THREE.Object3D[] = [];
    for (const x of [6, 10, 14, 18]) {
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), this.lampMat);
      head.position.set(x, 2.6, 5.0);
      const glow = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: 0, depthWrite: false }));
      glow.position.set(x, 1.3, 5.0);
      this.glows.push(glow);
      lamps.push(this.cyl(0.06, 0.08, 2.6, '#5f6670', x, 1.3, 5.0, 8), head, glow);
    }
    this.group('buildings', ...houses, school, ...schoolWin, shop, awning, ...shopWin, ...lamps);

    // Route segments.
    const top = (x: number, z: number, y = 6.4) => v(x, y, z);
    this.segmentPaths = [
      [v(-15.7, 2.3, -1), v(-14.3, 1.5, -1), top(-10, -1)],
      [top(-10, -1), top(-4, -1), v(-0.6, 2.8, -0.2)],
      [v(2.6, 2.8, -0.2), v(4, 3.1, 2.2), ...poleXs.slice(1).map((x) => v(x, 3.1, 2.2))],
      [v(8, 3.0, 2.2), v(9, 1.9, 5.3), v(12, 3.0, 2.2), v(12, 2.0, -0.3), v(16, 3.0, 2.2), v(17, 1.9, 5.3), v(18, 1.8, -0.2)],
    ];
    this.segments = this.segmentPaths.map((path, i) => {
      const m = new THREE.MeshStandardMaterial({ color: COLORS.lineOff, emissive: COLORS.lineOn, emissiveIntensity: 0 });
      this.wire(path, m, i < 2 ? 0.07 : 0.045);
      return m;
    });

    const pulseMat = new THREE.MeshBasicMaterial({ color: '#fff7c2' });
    for (let i = 0; i < 24; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), pulseMat);
      p.visible = false;
      this.scene.add(p);
      this.pulses.push(p);
    }
    return fill;
  }

  // ── State ────────────────────────────────────────────────────────────────

  setState(state: ViewState) {
    this.state = state;
    const evening = state.period === 'evening';
    (this.scene.background as THREE.Color).copy(evening ? COLORS.eveningSky : COLORS.daySky);
    this.hemi.intensity = evening ? 0.55 : 1.6;
    this.sun.intensity = evening ? 0.25 : 2.2;
    this.sun.color.set(evening ? '#9fb3ff' : '#fff2d6');
    this.solarMat.emissiveIntensity = evening ? 0 : 0.35;
    this.solarMat.color.set(evening ? '#1c2c47' : '#2c4f8a');

    this.segments.forEach((m, k) => {
      const lit = state.routeLit >= k + 2;
      m.color.copy(lit ? COLORS.lineOn : COLORS.lineOff);
      m.emissiveIntensity = lit ? (evening ? 0.9 : 0.5) : 0;
    });

    // Illustrative only: a shortfall dims the whole neighborhood evenly rather
    // than predicting which real buildings would lose power (PRD §5).
    const level = state.supply === 'full' || state.supply === 'ready' ? 1 : state.supply === 'short' ? 0.4 : 0;
    this.windowMat.emissiveIntensity = level * (evening ? 1.6 : 0.6);
    this.windowMat.color.copy(level > 0 ? COLORS.windowOn : COLORS.windowOff).multiplyScalar(level > 0 ? 0.6 : 1);
    const lamp = evening ? level : 0;
    this.lampMat.emissiveIntensity = lamp * 2;
    this.glows.forEach((g) => ((g.material as THREE.MeshBasicMaterial).opacity = lamp * 0.22));

    const frac = state.capacity ? state.stored / state.capacity : 0;
    this.batteryFill.scale.y = Math.max(0.001, frac);
    this.batteryFill.position.y = 0.3 + (1.1 * frac) / 2;
    this.updatePulses();
    this.hotspots.update(state.visible, state.visited, this.selected);
  }

  setSelected(id: InfrastructureId | null) {
    this.selected = id;
    if (id) {
      const [x, z, r] = RINGS[id];
      this.ring.position.set(x, 0.06, z);
      this.ring.scale.setScalar(r);
    }
    this.ring.visible = id !== null;
    // The card sits bottom-left; nudge the picture up and, on wide stages, to the right.
    const wide = this.container.clientWidth > 700;
    this.shiftTo.set(id && wide ? 0.2 : 0, id ? 0.14 : 0);
    if (this.reducedMotion) this.shift.copy(this.shiftTo);
    if (this.state) this.hotspots.update(this.state.visible, this.state.visited, id);
  }

  frame(bookmark: Bookmark) {
    this.camFrom = { position: this.camera.position.clone(), target: this.controls.target.clone() };
    this.bookmark = bookmark;
    this.camTo = this.fit(BOOKMARKS[bookmark]);
    this.camT = this.reducedMotion ? 1 : 0;
    if (this.reducedMotion) this.applyCamera(this.camTo);
  }

  resetView() {
    this.frame('overview');
  }

  setFreeCamera(on: boolean) {
    this.controls.enabled = on;
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on;
    this.updatePulses();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.hotspots.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  // ── Internals ────────────────────────────────────────────────────────────

  /** Keeps the same width of the neighborhood in view when the stage is narrower than 16:9. */
  private fit(view: CamView): CamView {
    const k = Math.min(2.4, Math.max(1, 16 / 9 / this.camera.aspect));
    return { position: view.target.clone().add(view.position.clone().sub(view.target).multiplyScalar(k)), target: view.target.clone() };
  }

  private applyCamera(view: CamView) {
    this.camera.position.copy(view.position);
    this.controls.target.copy(view.target);
    this.camera.lookAt(view.target);
  }

  private flowOn() {
    const s = this.state;
    return !!s && s.flow && s.routeLit >= 5 && s.supply !== 'off';
  }

  /** Spreads pulses evenly along the whole route; with reduced motion they stay still as markers. */
  private updatePulses() {
    const on = this.flowOn();
    const paths = this.segmentPaths.slice(0, 3);
    const lengths = paths.map((p) => p.slice(1).reduce((sum, b, i) => sum + b.distanceTo(p[i]), 0));
    const total = lengths.reduce((a, b) => a + b, 0);
    this.pulses.forEach((pulse, i) => {
      pulse.visible = on;
      if (!on) return;
      let d = (((i / this.pulses.length + (this.reducedMotion ? 0 : this.flowT)) % 1) + 1) % 1;
      d *= total;
      for (let s = 0; s < paths.length; s++) {
        if (d <= lengths[s] || s === paths.length - 1) {
          const path = paths[s];
          for (let j = 0; j < path.length - 1; j++) {
            const seg = path[j].distanceTo(path[j + 1]);
            if (d <= seg || j === path.length - 2) {
              pulse.position.lerpVectors(path[j], path[j + 1], Math.min(1, d / seg));
              return;
            }
            d -= seg;
          }
        }
        d -= lengths[s];
      }
    });
  }

  private hit(e: MouseEvent): InfrastructureId | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const visible = this.state?.visible ?? SELECTABLE;
    for (const h of this.raycaster.intersectObjects(this.pickables, true)) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.pick) o = o.parent;
      const id = o?.userData.pick as InfrastructureId | undefined;
      if (id && visible.includes(id)) return id;
    }
    return null;
  }

  private pick(e: MouseEvent) {
    const id = this.hit(e);
    if (id) this.opts.onSelect(id);
  }

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Re-frame the current bookmark for the new shape unless the learner is orbiting freely.
    if (!this.controls.enabled && this.camT >= 1) {
      this.camTo = this.fit(BOOKMARKS[this.bookmark]);
      this.applyCamera(this.camTo);
    }
  }

  private placeHotspots() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const p = new THREE.Vector3();
    for (const id of SELECTABLE) {
      p.copy(ANCHORS[id]).project(this.camera);
      const onScreen = p.z < 1 && p.x > -1.05 && p.x < 1.05 && p.y > -1.05 && p.y < 1.1;
      this.hotspots.place(id, onScreen ? { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h } : null);
    }
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    this.clock.update();
    const dt = Math.min(0.1, this.clock.getDelta());
    if (this.camT < 1) {
      // Re-fit every frame: the stage can change shape mid-move (e.g. the lesson panel opening on Start).
      this.camTo = this.fit(BOOKMARKS[this.bookmark]);
      this.camT = Math.min(1, this.camT + dt / 1.1);
      const t = this.camT < 0.5 ? 2 * this.camT * this.camT : 1 - (-2 * this.camT + 2) ** 2 / 2;
      this.applyCamera({
        position: this.camFrom.position.clone().lerp(this.camTo.position, t),
        target: this.camFrom.target.clone().lerp(this.camTo.target, t),
      });
    } else if (this.controls.enabled) {
      this.controls.update();
    }
    if (!this.shift.equals(this.shiftTo)) {
      this.shift.lerp(this.shiftTo, Math.min(1, dt * 4));
      if (this.shift.distanceTo(this.shiftTo) < 0.002) this.shift.copy(this.shiftTo);
    }
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    if (this.shift.lengthSq() > 0) this.camera.setViewOffset(w, h, -this.shift.x * w, this.shift.y * h, w, h);
    else this.camera.clearViewOffset();
    if (this.flowOn() && !this.reducedMotion) {
      this.flowT = (this.flowT + dt * 0.06) % 1;
      this.updatePulses();
    }
    this.placeHotspots();
    this.renderer.render(this.scene, this.camera);
  };
}

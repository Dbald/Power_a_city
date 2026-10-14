/**
 * CityScene — the authored neighborhood in three.js. Low-poly but
 * recognisable versions of the real infrastructure (models.ts) with
 * generated surface textures (textures.ts), daylight and evening lighting,
 * and a little background life: traffic, birds, clouds, steam and swaying
 * trees, all paused by reduced motion. It frames camera bookmarks, handles
 * picking and shows the state the app hands it. No lesson rules live here.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { InfrastructureId } from '../content/types.ts';
import { HotspotLayer } from './hotspots.ts';
import { Kit, v } from './models.ts';
import * as T from './textures.ts';
import { SELECTABLE, type Bookmark, type CityView, type ViewOptions, type ViewState } from './view.ts';

interface CamView {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

/** Bookmarks are framed for a 16:9 stage; narrower stages pull the camera back (see `fit`). */
const BOOKMARKS: Record<Bookmark, CamView> = {
  overview: { position: v(1.5, 19, 24), target: v(1.5, 0, -1) },
  generation: { position: v(-11, 7, 11), target: v(-15.5, 2.2, -1) },
  transmission: { position: v(-6, 9, 15), target: v(-7, 4, -1) },
  substation: { position: v(5, 8, 11), target: v(3.5, 1, -3) },
  street: { position: v(13, 8, 16), target: v(13, 1, 3) },
  /** Solar, battery and the homes together, so each run's effect is visible. */
  experiment: { position: v(10.5, 12, 15.5), target: v(10.5, 0, 0) },
};

/** Where each hotspot label floats, in world space. */
const ANCHORS: Record<InfrastructureId, THREE.Vector3> = {
  generation: v(-17, 6.4, -1),
  transmission: v(-7, 8.2, -1),
  substation: v(1, 3.4, -1),
  solar: v(3.5, 1.9, -6.5),
  battery: v(8, 2.6, -6),
  distribution: v(8, 4.4, 2.2),
  buildings: v(13, 4.4, 7),
};

/** Ground position and radius of the selection ring for each part. */
const RINGS: Record<InfrastructureId, [number, number, number]> = {
  generation: [-16.8, -1, 3.8],
  transmission: [-7, -1, 4.4],
  substation: [1, -1, 3.2],
  solar: [3.5, -6.5, 2.8],
  battery: [8, -6, 1.8],
  distribution: [12, 2.2, 8.5],
  buildings: [14, 5.5, 7.5],
};

/** Add ?stats to the URL to log draw calls and frame rate (for checking classroom hardware). */
const STATS = typeof location !== 'undefined' && new URLSearchParams(location.search).has('stats');

/**
 * Quality: 'high' renders shadows at up to 1.75× pixel density; 'low' drops
 * shadows and renders at 1×. Software renderers start low; any machine that
 * measures under ~22 fps steps down once. Learning content never changes
 * (PRD §12). Override with ?quality=high or ?quality=low.
 */
type Quality = 'high' | 'low';
const QUALITY_PARAM = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('quality') : null;

function softwareRenderer(renderer: THREE.WebGLRenderer) {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}

const ROAD_Z = 3.8;
const POLE_XS = [4, 8, 12, 16, 20];
const LAMP_XS = [6, 10, 14, 18];

const LINE_OFF = new THREE.Color('#3b3f45');
const LINE_ON = new THREE.Color('#ffc93c');

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch {
    return false;
  }
}

/**
 * Bakes every mesh under `group` into one mesh per material (except anything
 * marked `userData.keep`, which still animates). Dozens of lattice members
 * become a handful of draw calls.
 */
function mergeStatic(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const remove: THREE.Object3D[] = [];
  group.traverse((o) => {
    if (o.userData.keep) return;
    let p = o.parent;
    while (p && p !== group) {
      if (p.userData.keep) return;
      p = p.parent;
    }
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()) as THREE.BufferGeometry;
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const list = buckets.get(o.material) ?? [];
    list.push(g);
    buckets.set(o.material, list);
    remove.push(o);
  });
  for (const o of remove) {
    o.removeFromParent();
    (o as THREE.Mesh).geometry.dispose();
  }
  // Drop empty sub-groups left behind.
  for (const child of [...group.children]) if (child instanceof THREE.Group && child.children.length === 0 && !child.userData.keep) child.removeFromParent();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (merged) group.add(new THREE.Mesh(merged, mat));
  }
  return group;
}

interface Mover {
  obj: THREE.Object3D;
  speed: number;
  dir: 1 | -1;
}

export class CityScene implements CityView {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 400);
  private controls: OrbitControls;
  private hotspots: HotspotLayer;
  private container: HTMLElement;
  private opts: ViewOptions;
  private kit = new Kit();
  private pickables: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private ring: THREE.Mesh;
  private hemi = new THREE.HemisphereLight('#dceeff', '#6b7f5a', 1.25);
  private sun = new THREE.DirectionalLight('#fff2d6', 2.6);
  private skyDay = T.sky(false);
  private skyEvening = T.sky(true);
  private sunSprite!: THREE.Sprite;
  private moonSprite!: THREE.Sprite;
  private stars!: THREE.Points;
  /** Route segments: 0 plant→towers, 1 towers→substation, 2 substation→street poles, 3 service drops. */
  private segments: THREE.MeshStandardMaterial[] = [];
  private segmentPaths: THREE.Vector3[][] = [];
  private pulses: THREE.Mesh[] = [];
  private lampLights: THREE.PointLight[] = [];
  private lampPools: THREE.Mesh[] = [];
  private batteryFill!: THREE.Mesh;
  private batteryLed = new THREE.MeshStandardMaterial({ color: '#2b3440', emissive: '#3ad17a', emissiveIntensity: 0 });
  private clouds: THREE.Sprite[] = [];
  private birds: THREE.Group[] = [];
  private cars: Mover[] = [];
  private steam: THREE.Sprite[] = [];
  private trees: THREE.Group[] = [];
  private flag!: THREE.Mesh;
  private flagBase!: Float32Array;
  private state: ViewState | null = null;
  private selected: InfrastructureId | null = null;
  private reducedMotion: boolean;
  private camFrom: CamView = { position: v(0, 0, 0), target: v(0, 0, 0) };
  private camTo: CamView = BOOKMARKS.overview;
  private bookmark: Bookmark = 'overview';
  private camT = 1;
  private raf = 0;
  private clock = new THREE.Timer();
  private time = 0;
  private flowT = 0;
  /** Screen-space shift (fractions of the stage) that keeps the selected part clear of the info card. */
  private shift = new THREE.Vector2();
  private shiftTo = new THREE.Vector2();
  private resizeObserver: ResizeObserver;
  private quality: Quality = 'high';
  private perf = { frames: 0, elapsed: 0, decided: QUALITY_PARAM === 'high' || QUALITY_PARAM === 'low' };

  constructor(container: HTMLElement, opts: ViewOptions) {
    this.container = container;
    this.opts = opts;
    this.reducedMotion = opts.reducedMotion;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffe066' }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.scene.add(this.ring);

    this.buildSky();
    this.buildWorld();
    this.buildLife();
    this.enableShadows();
    const start: Quality = QUALITY_PARAM === 'low' || QUALITY_PARAM === 'high' ? QUALITY_PARAM : softwareRenderer(this.renderer) ? 'low' : 'high';
    if (start === 'low') this.perf.decided = true;
    this.applyQuality(start);

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

  private applyQuality(q: Quality) {
    this.quality = q;
    // With no light casting shadows, three.js skips the whole shadow pass.
    this.sun.castShadow = q === 'high';
    // Every lit pixel pays for every point light, so low quality keeps only the painted pools of light under the lamps.
    this.lampLights.forEach((l) => (l.visible = q === 'high'));
    // Anisotropic filtering sharpens textures at grazing angles but multiplies texture reads.
    this.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const map = (o.material as THREE.MeshStandardMaterial).map;
      if (map && map.anisotropy !== (q === 'high' ? 4 : 1)) {
        map.anisotropy = q === 'high' ? 4 : 1;
        map.needsUpdate = true;
      }
    });
    this.renderer.setPixelRatio(q === 'high' ? Math.min(window.devicePixelRatio, 1.75) : 1);
    this.resize();
  }

  /** Steps down to low quality once if this machine can't keep a smooth frame rate. */
  private watchPerformance(rawDt: number) {
    if (this.perf.decided) return;
    this.perf.elapsed += rawDt;
    if (this.perf.elapsed < 3) return; // let shaders compile and the first camera move finish
    this.perf.frames++;
    if (this.perf.elapsed < 6) return;
    const fps = this.perf.frames / (this.perf.elapsed - 3);
    this.perf.decided = true;
    if (fps < 22) this.applyQuality('low');
  }

  // ── Sky and light ────────────────────────────────────────────────────────

  private buildSky() {
    this.scene.background = this.skyDay;
    this.scene.fog = new THREE.Fog('#d4e8f4', 55, 150);
    this.sun.position.set(-18, 30, 16);
    this.sun.target.position.set(0, 0, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -32;
    sc.right = 32;
    sc.top = 20;
    sc.bottom = -20;
    sc.near = 5;
    sc.far = 90;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.softDot('rgba(255,248,220,1)', 'rgba(255,230,160,0)'), fog: false, depthWrite: false }));
    this.sunSprite.position.set(-70, 55, -110);
    this.sunSprite.scale.setScalar(26);
    this.moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.softDot('rgba(235,240,255,1)', 'rgba(200,210,255,0)'), fog: false, depthWrite: false }));
    this.moonSprite.position.set(60, 48, -110);
    this.moonSprite.scale.setScalar(10);
    this.scene.add(this.sunSprite, this.moonSprite);

    const starPos: number[] = [];
    for (let i = 0; i < 500; i++) {
      const a = Math.random() * Math.PI * 2;
      const e = 0.15 + Math.random() * 1.2;
      starPos.push(Math.cos(a) * Math.cos(e) * 160, Math.sin(e) * 160, Math.sin(a) * Math.cos(e) * 160 - 30);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
    this.scene.add(this.stars);
  }

  // ── World ────────────────────────────────────────────────────────────────

  private group(id: InfrastructureId, ...children: THREE.Object3D[]) {
    const g = new THREE.Group();
    g.add(...children);
    g.userData.pick = id;
    this.pickables.push(g);
    this.scene.add(g);
    return g;
  }

  private buildWorld() {
    const k = this.kit;
    const m = k.m;

    // Ground, roads and sidewalks.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 120), m.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.userData.receiveOnly = true;
    this.scene.add(ground);
    const flat = (w: number, d: number, mat: THREE.Material, x: number, z: number, y = 0.02) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, y, z);
      p.userData.receiveOnly = true;
      this.scene.add(p);
      return p;
    };
    flat(48, 2, m.road, 1, ROAD_Z);
    const curb = (z: number) => {
      const s = k.box(48, 0.07, 0.8, m.sidewalk, 1, 0.035, z);
      s.userData.receiveOnly = true;
      this.scene.add(s);
    };
    curb(ROAD_Z - 1.4);
    curb(ROAD_Z + 1.4);
    for (const hx of [9, 13, 17]) flat(0.9, 0.6, m.concrete, hx + (hx === 17 ? -0.55 : 0.55), 5.75, 0.025);
    flat(5, 1.6, m.asphalt, 15.2, 0.9, 0.022); // school drop-off lot
    flat(7, 5, m.concrete, -17.2, -1.2, 0.022); // plant yard

    // Distant hills for a horizon.
    for (const [x, z, w, h, d] of [
      [-45, -60, 32, 7, 16],
      [-5, -66, 38, 9, 16],
      [38, -58, 30, 6, 15],
      [-66, -5, 16, 5, 32],
      [66, 0, 16, 7, 32],
      [-32, 48, 26, 4, 12],
      [34, 50, 26, 5, 12],
    ])
      this.scene.add(k.hill(x, z, w, h, d));

    // ── Generation: gas power plant, stacks and step-up transformer.
    const plant = new THREE.Group();
    plant.add(k.box(3.8, 2.4, 3.0, m.hall, -18.2, 1.2, -1.2));
    plant.add(k.box(3.9, 0.12, 3.1, m.flatRoof, -18.2, 2.46, -1.2));
    plant.add(k.box(1.7, 3.4, 2.2, m.hall, -15.6, 1.7, -1.6));
    plant.add(k.box(1.8, 0.12, 2.3, m.flatRoof, -15.6, 3.46, -1.6));
    for (let i = 0; i < 5; i++) plant.add(k.windowPane(0.45, 0.3, -19.7 + i * 0.75, 1.7, 0.32));
    plant.add(k.box(0.9, 1.4, 0.05, m.steel, -17.0, 0.7, 0.32));
    for (const sx of [-16.1, -15.1]) {
      plant.add(k.cyl(0.28, 0.36, 6.2, m.stack, sx, 3.1, -3.1, 16));
      plant.add(k.cyl(0.32, 0.32, 0.15, m.steel, sx, 6.2, -3.1, 16));
    }
    plant.add(k.beam(v(-15.6, 2.6, -2.7), v(-15.6, 2.6, -3.0), 0.25, m.steel, 8));
    const stepUp = k.transformer(-14.3, -0.2, 1.15, Math.PI / 2);
    plant.add(stepUp);
    this.group('generation', mergeStatic(plant));

    // ── Transmission: two lattice towers.
    const t1 = k.latticeTower(-10, -1);
    const t2 = k.latticeTower(-4, -1);
    this.group('transmission', mergeStatic(t1.group), mergeStatic(t2.group));

    // ── Substation: gravel yard, chain-link fence, gantries, two transformers.
    const sub = new THREE.Group();
    const yard = k.box(4.8, 0.06, 3.8, m.gravel, 1, 0.03, -1);
    yard.userData.receiveOnly = true;
    sub.add(yard);
    const fence = (w: number, x: number, z: number, rot: number) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.1), m.fence);
      p.position.set(x, 0.58, z);
      p.rotation.y = rot;
      sub.add(p);
    };
    fence(4.8, 1, -2.9, 0);
    fence(4.8, 1, 0.9, 0);
    fence(3.8, -1.4, -1, Math.PI / 2);
    fence(3.8, 3.4, -1, Math.PI / 2);
    for (const [px, pz] of [
      [-1.4, -2.9],
      [3.4, -2.9],
      [-1.4, 0.9],
      [3.4, 0.9],
      [1, -2.9],
      [1, 0.9],
    ])
      sub.add(k.cyl(0.03, 0.03, 1.2, m.galvanized, px, 0.6, pz, 6));
    const gantry = (x: number, y: number) => {
      sub.add(k.beam(v(x, 0, -1.1), v(x, y, -1.1), 0.06, m.galvanized, 6));
      sub.add(k.beam(v(x, 0, 0.7), v(x, y, 0.7), 0.06, m.galvanized, 6));
      sub.add(k.beam(v(x, y, -1.2), v(x, y, 0.8), 0.05, m.galvanized, 4));
      return [-0.7, -0.2, 0.3].map((dz) => {
        sub.add(k.insulatorString(v(x, y, dz), 4));
        return v(x, y - 0.35, dz);
      });
    };
    const inGantry = gantry(-0.8, 3.0);
    const outGantry = gantry(2.8, 2.5);
    sub.add(k.transformer(0.4, -1.9, 0.85));
    sub.add(k.transformer(1.6, -1.9, 0.85));
    // Busbars from the incoming gantry over the transformers to the outgoing gantry.
    for (const [i, dz] of [-0.7, -0.2, 0.3].entries()) {
      sub.add(k.beam(inGantry[i].clone().setY(2.2), outGantry[i].clone().setY(2.2), 0.025, m.aluminium, 4));
      sub.add(k.beam(v(-0.8, 2.2, dz), v(-0.8, 2.65, dz), 0.02, m.aluminium, 4));
    }
    this.group('substation', mergeStatic(sub));

    // ── Solar farm.
    const solar = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const x = 1.8 + i * 1.6;
        const z = -7.3 + j * 1.3;
        const panel = k.box(1.4, 0.05, 0.95, m.solar, x, 0.72, z);
        panel.rotation.x = -0.5;
        solar.add(panel);
        const frame = k.box(1.46, 0.03, 1.0, m.aluminium, x, 0.69, z);
        frame.rotation.x = -0.5;
        solar.add(frame);
        solar.add(k.cyl(0.035, 0.035, 0.75, m.steel, x - 0.55, 0.37, z, 6), k.cyl(0.035, 0.035, 0.75, m.steel, x + 0.55, 0.37, z, 6));
      }
    }
    solar.add(k.box(0.5, 0.6, 0.35, m.steel, 6.0, 0.3, -6.0)); // inverter
    this.group('solar', mergeStatic(solar));

    // ── Battery storage: two containers, cooling units, status lights and a stored-energy meter.
    const bat = new THREE.Group();
    for (const cz of [-6.55, -5.45]) {
      bat.add(k.box(2.4, 1.3, 0.9, m.container, 8, 0.7, cz));
      bat.add(k.box(2.45, 0.08, 0.95, m.concrete, 8, 0.04, cz));
      bat.add(k.box(0.35, 0.7, 0.6, m.steel, 9.4, 0.55, cz));
      bat.add(k.box(2.0, 0.06, 0.02, this.batteryLed, 7.9, 1.2, cz + 0.46));
    }
    bat.add(k.box(0.36, 1.0, 0.04, new THREE.MeshStandardMaterial({ color: '#2b3440' }), 8.75, 0.72, -4.98));
    this.batteryFill = k.box(0.26, 0.9, 0.05, new THREE.MeshStandardMaterial({ color: '#3ad17a', emissive: '#3ad17a', emissiveIntensity: 0.5 }), 8.75, 0.25, -4.95);
    this.batteryFill.userData.keep = true;
    bat.add(this.batteryFill);
    this.group('battery', mergeStatic(bat));

    // ── Distribution: wooden poles along the street, one with a pole-top transformer.
    const dist = new THREE.Group();
    const poles = POLE_XS.map((x) => k.pole(x, 2.2, 3.4, x === 12));
    poles.forEach((p) => dist.add(p.group));
    this.group('distribution', mergeStatic(dist));

    // ── Buildings: three homes, the school, the shop and the streetlights.
    const homes = [
      k.house(9, 7.0, m.sidingCream, m.shingles, 0),
      k.house(13, 7.0, m.sidingBlue, m.shinglesGray, 1),
      k.house(17, 7.0, m.sidingSage, m.shingles, 2),
    ];
    const school = k.school(12, -1.6);
    this.flag = school.flag;
    this.flag.userData.keep = true;
    this.flagBase = Float32Array.from((this.flag.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array);
    const shop = k.shop(18, -1.4);
    const lamps = LAMP_XS.map((x) => k.streetlight(x, 5.2));
    const bldg = new THREE.Group();
    bldg.add(...homes.map((h) => mergeStatic(h)), mergeStatic(school.group), mergeStatic(shop), ...lamps.map((l) => mergeStatic(l.group)));
    this.group('buildings', bldg);
    // Light from each street lamp, and a soft pool of light on the road beneath it.
    const poolTex = T.softDot('rgba(255,226,150,0.9)', 'rgba(255,226,150,0)');
    for (const l of lamps) {
      const light = new THREE.PointLight('#ffd98a', 0, 7, 1.6);
      light.position.copy(l.head);
      this.scene.add(light);
      this.lampLights.push(light);
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(l.head.x, 0.05, l.head.z + 0.2);
      this.scene.add(pool);
      this.lampPools.push(pool);
    }

    // ── Trees around the neighborhood.
    const treeSpots: [number, number, number][] = [
      [11, 7.8, 1.1], [15, 8.0, 1.2], [7, 8.6, 1.0], [19.6, 8.2, 1.25], [21.5, 6.4, 0.9], [10, 9.6, 1.3], [16, 9.8, 1.1],
      [9.6, -4.4, 1.2], [14.6, -4.0, 1.0], [20.6, -3.0, 1.1], [22.6, 1.2, 1.0], [-21.5, 2.2, 1.2], [-12.8, -4.6, 1.1],
      [-7.6, -4.4, 1.0], [-2.2, -5.0, 1.2], [-6.2, 5.6, 1.3], [-12.2, 5.4, 1.1], [-18.6, 5.8, 1.2], [0.4, 6.2, 1.0],
      [4.8, -10.4, 1.3], [10.2, -9.6, 1.2], [15.2, -8.6, 1.1], [20.2, -7.2, 1.3], [-23.4, -4.4, 1.2], [-3.6, 7.6, 1.2],
      [23.6, 8.4, 1.1], [-15, 9.0, 1.3], [5.6, 8.8, 1.0],
    ];
    treeSpots.forEach(([x, z, s], i) => {
      const t = k.tree(x, z, s, i + 1);
      t.userData.crown.userData.keep = true;
      this.trees.push(t);
      this.scene.add(t);
    });

    // ── Route wires, which light up when the route is connected.
    this.segments = [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: LINE_OFF, emissive: LINE_ON, emissiveIntensity: 0, roughness: 0.4, metalness: 0.6 }));
    const span = (a: THREE.Vector3[], b: THREE.Vector3[], droop: number, seg: number, r = 0.03) => {
      const mid: THREE.Vector3[][] = [];
      for (let i = 0; i < a.length; i++) {
        const pts = Kit.sag(a[i], b[i], droop);
        this.scene.add(k.wire(pts, r, this.segments[seg]));
        mid.push(pts);
      }
      return mid[Math.floor(mid.length / 2)];
    };
    // Step-up transformer bushings (rotated a quarter turn, so they line up across z).
    const bushings = [0.35, 0, -0.35].map((dz) => v(-14.3 + 0.17, 1.95, -0.2 + dz)).reverse();
    const p0 = span(bushings, t1.attach, 0.6, 0);
    const p1a = span(t1.attach, t2.attach, 0.9, 1);
    const p1b = span(t2.attach, inGantry, 0.7, 1);
    const p2: THREE.Vector3[] = [...span(outGantry, poles[0].attach, 0.3, 2, 0.022)];
    for (let i = 0; i < poles.length - 1; i++) p2.push(...span(poles[i].attach, poles[i + 1].attach, 0.35, 2, 0.022).slice(1));
    // Service drops from the poles to each building.
    const mid = (i: number) => poles[i].attach[1];
    const drops: [THREE.Vector3, THREE.Vector3][] = [
      [mid(1), v(9.4, 1.65, 6.0)],
      [mid(2), v(13.4, 1.65, 6.0)],
      [mid(3), v(16.6, 1.65, 6.0)],
      [mid(2), v(12.6, 2.2, -0.3)],
      [mid(4), v(18.6, 1.9, -0.2)],
    ];
    for (const [a, b] of drops) this.scene.add(k.wire(Kit.sag(a, b, 0.25, 8), 0.016, this.segments[3]));
    this.segmentPaths = [p0, [...p1a, ...p1b.slice(1)], p2];

    const pulseMat = new THREE.MeshBasicMaterial({ color: '#fff7c2' });
    for (let i = 0; i < 28; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), pulseMat);
      p.visible = false;
      this.scene.add(p);
      this.pulses.push(p);
    }
  }

  // ── Background life ──────────────────────────────────────────────────────

  private buildLife() {
    const k = this.kit;
    // Cars in both lanes.
    const lanes: [number, 1 | -1][] = [
      [ROAD_Z + 0.45, 1],
      [ROAD_Z - 0.45, -1],
    ];
    [-18, 2, 14].forEach((x, i) => {
      const [z, dir] = lanes[i % 2];
      const car = mergeStatic(k.car(i));
      car.position.set(x, 0.03, z);
      car.rotation.y = dir === 1 ? 0 : Math.PI;
      this.scene.add(car);
      this.cars.push({ obj: car, speed: 2.2 + i * 0.4, dir });
    });
    // Clouds.
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.cloud(100 + i), transparent: true, depthWrite: false, opacity: 0.9 }));
      c.position.set(-70 + i * 19, 20 + (i % 3) * 4, -45 - (i % 4) * 9);
      c.scale.set(22, 11, 1);
      this.clouds.push(c);
      this.scene.add(c);
    }
    // Birds.
    const birdMat = new THREE.MeshBasicMaterial({ color: '#2b2f36', side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Group();
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.08), birdMat);
        wing.position.x = s * 0.17;
        wing.userData.side = s;
        b.add(wing);
      }
      b.userData.phase = i * 1.1;
      b.userData.radius = 9 + (i % 3) * 2.5;
      this.birds.push(b);
      this.scene.add(b);
    }
    // Steam rising from the plant's stacks.
    const steamTex = T.softDot('rgba(245,245,245,0.75)', 'rgba(245,245,245,0)');
    for (const sx of [-16.1, -15.1]) {
      for (let i = 0; i < 7; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false }));
        s.userData.base = v(sx, 6.4, -3.1);
        s.userData.offset = i / 7;
        this.steam.push(s);
        this.scene.add(s);
      }
    }
    this.animateLife(0);
  }

  private enableShadows() {
    this.scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const mat = o.material as THREE.Material;
      if (mat.transparent || o === this.ring || this.pulses.includes(o)) return;
      o.receiveShadow = true;
      o.castShadow = !o.userData.receiveOnly;
    });
  }

  private animateLife(dt: number) {
    const t = this.time;
    const evening = this.state?.period === 'evening';
    for (const c of this.cars) {
      c.obj.position.x += c.dir * c.speed * dt;
      if (c.obj.position.x > 25) c.obj.position.x = -23;
      if (c.obj.position.x < -23) c.obj.position.x = 25;
    }
    for (const c of this.clouds) {
      c.position.x += dt * 0.6;
      if (c.position.x > 85) c.position.x = -85;
    }
    this.birds.forEach((b) => {
      const a = t * 0.25 + b.userData.phase;
      const r = b.userData.radius;
      b.position.set(Math.cos(a) * r + 2, 9 + Math.sin(a * 2) * 0.6, Math.sin(a) * r - 6);
      b.rotation.y = -a;
      const flap = Math.sin(t * 9 + b.userData.phase) * 0.5;
      b.children.forEach((w) => (w.rotation.z = w.userData.side * flap));
      b.visible = !evening;
    });
    for (const s of this.steam) {
      const f = (s.userData.offset + t * 0.08) % 1;
      s.position.copy(s.userData.base).add(v(f * 1.6, f * 3.2, f * 0.4));
      s.scale.setScalar(0.6 + f * 2.2);
      (s.material as THREE.SpriteMaterial).opacity = (1 - f) * (evening ? 0.35 : 0.6);
    }
    for (const tr of this.trees) {
      const crown = tr.userData.crown as THREE.Object3D;
      crown.rotation.z = Math.sin(t * 0.9 + tr.userData.phase) * 0.025;
      crown.rotation.x = Math.cos(t * 0.7 + tr.userData.phase) * 0.02;
    }
    // Flag ripple.
    const pos = this.flag.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = this.flagBase[i * 3];
      pos.setZ(i, Math.sin(x * 6 - t * 5) * 0.06 * x);
    }
    pos.needsUpdate = true;
  }

  // ── State ────────────────────────────────────────────────────────────────

  setState(state: ViewState) {
    this.state = state;
    const evening = state.period === 'evening';
    this.scene.background = evening ? this.skyEvening : this.skyDay;
    (this.scene.fog as THREE.Fog).color.set(evening ? '#3c3555' : '#d4e8f4');
    this.hemi.intensity = evening ? 0.75 : 1.25;
    this.hemi.color.set(evening ? '#8d97d6' : '#dceeff');
    this.sun.intensity = evening ? 0.7 : 2.6;
    this.sun.color.set(evening ? '#8fa2ff' : '#fff2d6');
    this.sun.position.set(evening ? 20 : -18, evening ? 24 : 30, 16);
    this.sunSprite.visible = !evening;
    this.moonSprite.visible = evening;
    this.stars.visible = evening;
    this.clouds.forEach((c) => {
      (c.material as THREE.SpriteMaterial).color.set(evening ? '#6a5a7a' : '#ffffff');
      (c.material as THREE.SpriteMaterial).opacity = evening ? 0.55 : 0.9;
    });
    this.kit.m.solar.color.set(evening ? '#4a5266' : '#ffffff');
    this.kit.headlight.emissiveIntensity = evening ? 3 : 0.2;
    this.kit.taillight.emissiveIntensity = evening ? 2 : 0.2;

    this.segments.forEach((m, k) => {
      const lit = state.routeLit >= k + 2;
      m.color.copy(lit ? LINE_ON : LINE_OFF);
      m.emissiveIntensity = lit ? (evening ? 1.1 : 0.55) : 0;
    });

    // Illustrative only: a shortfall dims the whole neighborhood evenly rather
    // than predicting which real buildings would lose power (PRD §5).
    const level = state.supply === 'full' || state.supply === 'ready' ? 1 : state.supply === 'short' ? 0.4 : 0;
    this.kit.window.emissiveIntensity = level * (evening ? 2.2 : 0.35);
    const lamp = evening ? level : 0;
    this.kit.lamp.emissiveIntensity = lamp * 3;
    this.lampLights.forEach((l) => (l.intensity = lamp * 7));
    this.lampPools.forEach((p) => ((p.material as THREE.MeshBasicMaterial).opacity = lamp * 0.55));

    const led = state.battery === 'charge' ? '#3ad17a' : state.battery === 'discharge' ? '#ffb02e' : '#7d8da6';
    this.batteryLed.emissive.set(led);
    this.batteryLed.emissiveIntensity = state.supply === 'off' ? 0 : 1.4;
    const frac = state.capacity ? state.stored / state.capacity : 0;
    this.batteryFill.scale.y = Math.max(0.001, frac);
    this.batteryFill.position.y = 0.27 + (0.9 * frac) / 2;
    this.updatePulses();
    this.hotspots.update(state.visible, state.visited, this.selected);
  }

  setSelected(id: InfrastructureId | null) {
    this.selected = id;
    if (id) {
      const [x, z, r] = RINGS[id];
      this.ring.position.set(x, 0.08, z);
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
    const textures = new Set<THREE.Texture>([this.skyDay, this.skyEvening]);
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Sprite || o instanceof THREE.Points) {
        o.geometry.dispose();
        for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const val of Object.values(mat)) if (val instanceof THREE.Texture) textures.add(val);
          mat.dispose();
        }
      }
    });
    textures.forEach((t) => t.dispose());
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
    const paths = this.segmentPaths;
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
    const rawDt = this.clock.getDelta();
    const dt = Math.min(0.1, rawDt);
    this.watchPerformance(rawDt);
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
    // Background life pauses entirely with reduced motion.
    if (!this.reducedMotion) {
      this.time += dt;
      this.animateLife(dt);
    }
    if (this.flowOn() && !this.reducedMotion) {
      this.flowT = (this.flowT + dt * 0.05) % 1;
      this.updatePulses();
    }
    this.placeHotspots();
    this.renderer.render(this.scene, this.camera);
    if (STATS && this.time - this.lastStats > 2) {
      this.lastStats = this.time;
      const r = this.renderer.info.render;
      console.info(`[power-a-city] quality ${this.quality}, draw calls ${r.calls}, triangles ${r.triangles}, ~${Math.round(1 / Math.max(rawDt, 0.001))} fps`);
    }
  };
  private lastStats = 0;
}

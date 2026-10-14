/**
 * Model kit for the neighborhood: low-poly but recognisable versions of the
 * real things — lattice transmission towers, transformers with cooling fins,
 * wooden poles with insulators, gable-roofed houses, a brick school, a corner
 * shop, trees and cars. Materials are shared so the scene stays light enough
 * for classroom hardware.
 */
import * as THREE from 'three';
import * as T from './textures.ts';

export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const UP = new THREE.Vector3(0, 1, 0);

export class Kit {
  readonly m = {
    grass: new THREE.MeshStandardMaterial({ map: T.grass([40, 30]), roughness: 1 }),
    road: new THREE.MeshStandardMaterial({ map: T.asphalt([12, 1], true), roughness: 0.95 }),
    asphalt: new THREE.MeshStandardMaterial({ map: T.asphalt([4, 4]), roughness: 0.95 }),
    sidewalk: new THREE.MeshStandardMaterial({ map: T.concrete([24, 1]), roughness: 0.9 }),
    concrete: new THREE.MeshStandardMaterial({ map: T.concrete([2, 2], false), roughness: 0.9 }),
    gravel: new THREE.MeshStandardMaterial({ map: T.gravel([3, 3]), roughness: 1 }),
    brick: new THREE.MeshStandardMaterial({ map: T.brick([3, 1.5]), roughness: 0.9 }),
    sidingCream: new THREE.MeshStandardMaterial({ map: T.siding('#efe1bd', [2, 2]), roughness: 0.85 }),
    sidingBlue: new THREE.MeshStandardMaterial({ map: T.siding('#a9c6dc', [2, 2]), roughness: 0.85 }),
    sidingSage: new THREE.MeshStandardMaterial({ map: T.siding('#b9cba5', [2, 2]), roughness: 0.85 }),
    shingles: new THREE.MeshStandardMaterial({ map: T.shingles('#5b4a42', [3, 3]), roughness: 0.95 }),
    shinglesGray: new THREE.MeshStandardMaterial({ map: T.shingles('#5d636b', [3, 3]), roughness: 0.95 }),
    flatRoof: new THREE.MeshStandardMaterial({ color: '#6c6f73', roughness: 0.95 }),
    hall: new THREE.MeshStandardMaterial({ map: T.corrugated('#c3ccd4', [6, 1]), roughness: 0.6, metalness: 0.2 }),
    container: new THREE.MeshStandardMaterial({ map: T.corrugated('#eef0f1', [6, 1]), roughness: 0.55, metalness: 0.15 }),
    stack: new THREE.MeshStandardMaterial({ map: T.stackBands(), roughness: 0.8 }),
    steel: new THREE.MeshStandardMaterial({ color: '#8a939b', roughness: 0.5, metalness: 0.6 }),
    galvanized: new THREE.MeshStandardMaterial({ color: '#a4adb5', roughness: 0.45, metalness: 0.7 }),
    transformer: new THREE.MeshStandardMaterial({ color: '#7d8a85', roughness: 0.55, metalness: 0.35 }),
    insulator: new THREE.MeshStandardMaterial({ color: '#7a5640', roughness: 0.25, metalness: 0.1 }),
    insulatorWhite: new THREE.MeshStandardMaterial({ color: '#e8e4dc', roughness: 0.3 }),
    wood: new THREE.MeshStandardMaterial({ map: T.wood([1, 2]), roughness: 0.9 }),
    solar: new THREE.MeshStandardMaterial({ map: T.solarCells(), roughness: 0.25, metalness: 0.5 }),
    aluminium: new THREE.MeshStandardMaterial({ color: '#c7ccd2', roughness: 0.35, metalness: 0.8 }),
    trim: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.7 }),
    door: new THREE.MeshStandardMaterial({ color: '#7a3b2e', roughness: 0.7 }),
    darkGlass: new THREE.MeshStandardMaterial({ color: '#2a3542', roughness: 0.15, metalness: 0.5 }),
    trunk: new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 1 }),
    leaves: ['#4f7f3a', '#5f8f42', '#3f6e34', '#6c9a48'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true })),
    hedge: new THREE.MeshStandardMaterial({ color: '#4a7537', roughness: 1, flatShading: true }),
    hill: new THREE.MeshStandardMaterial({ color: '#7fa36a', roughness: 1, flatShading: true }),
    fence: new THREE.MeshStandardMaterial({ map: T.chainLink([10, 2]), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.5 }),
    awning: new THREE.MeshStandardMaterial({ map: T.stripes('#c0504d', '#f4efe6'), roughness: 0.8, side: THREE.DoubleSide }),
    tire: new THREE.MeshStandardMaterial({ color: '#1d1f22', roughness: 0.9 }),
    flag: new THREE.MeshStandardMaterial({ color: '#2f6fb3', roughness: 0.8, side: THREE.DoubleSide }),
    carPaint: ['#c8402f', '#2f6fb3', '#e6e2d6', '#3d8a5a', '#f0b429'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: 0.4 })),
  };

  /** Emissive materials whose glow the scene changes between day and evening. */
  readonly window = new THREE.MeshStandardMaterial({ color: '#33404f', emissive: '#ffcf7a', emissiveIntensity: 0, roughness: 0.2, metalness: 0.3 });
  readonly lamp = new THREE.MeshStandardMaterial({ color: '#f3efe2', emissive: '#ffe7a6', emissiveIntensity: 0 });
  readonly headlight = new THREE.MeshStandardMaterial({ color: '#f5f3ea', emissive: '#fff4cc', emissiveIntensity: 0.2 });
  readonly taillight = new THREE.MeshStandardMaterial({ color: '#7a1a14', emissive: '#ff2a1a', emissiveIntensity: 0.2 });

  box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  cyl(rTop: number, rBottom: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, seg = 12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  /** A thin round member between two points (lattice bracing, arms, wires). */
  beam(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material, seg = 5) {
    const len = a.distanceTo(b);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
    return mesh;
  }

  /** A string of insulator discs hanging down from `top`. */
  insulatorString(top: THREE.Vector3, discs: number, mat = this.m.insulator) {
    const g = new THREE.Group();
    for (let i = 0; i < discs; i++) g.add(this.cyl(0.07, 0.07, 0.04, mat, top.x, top.y - 0.06 - i * 0.07, top.z, 10));
    return g;
  }

  /**
   * A lattice transmission tower (along x the wires run; arms along z).
   * Returns the tower and the three conductor attachment points.
   */
  latticeTower(x: number, z: number, height = 6.8): { group: THREE.Group; attach: THREE.Vector3[] } {
    const g = new THREE.Group();
    const m = this.m.galvanized;
    const base = 0.85;
    const waist = 0.28;
    const waistY = height * 0.72;
    const corner = (sx: number, sz: number, y: number) => {
      const half = y <= waistY ? base + (waist - base) * (y / waistY) : waist;
      return v(x + sx * half, y, z + sz * half);
    };
    const corners: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    const levels = [0, waistY * 0.25, waistY * 0.5, waistY * 0.75, waistY, height];
    // Legs.
    for (const [sx, sz] of corners) for (let i = 0; i < levels.length - 1; i++) g.add(this.beam(corner(sx, sz, levels[i]), corner(sx, sz, levels[i + 1]), 0.045, m));
    // Horizontal ties and X bracing on each face.
    for (let i = 0; i < levels.length - 1; i++) {
      for (let f = 0; f < 4; f++) {
        const [ax, az] = corners[f];
        const [bx, bz] = corners[(f + 1) % 4];
        g.add(this.beam(corner(ax, az, levels[i + 1]), corner(bx, bz, levels[i + 1]), 0.025, m, 4));
        g.add(this.beam(corner(ax, az, levels[i]), corner(bx, bz, levels[i + 1]), 0.02, m, 4));
        g.add(this.beam(corner(bx, bz, levels[i]), corner(ax, az, levels[i + 1]), 0.02, m, 4));
      }
    }
    // Two cross-arms and a peak for the earth wire.
    const armY = [height - 0.9, height - 0.2];
    const attach: THREE.Vector3[] = [];
    armY.forEach((y, k) => {
      const reach = k === 0 ? 1.55 : 1.0;
      g.add(this.beam(v(x, y, z - reach), v(x, y, z + reach), 0.05, m, 4));
      g.add(this.beam(v(x, y - 0.35, z - waist), v(x, y, z - reach), 0.025, m, 4));
      g.add(this.beam(v(x, y - 0.35, z + waist), v(x, y, z + reach), 0.025, m, 4));
    });
    // Conductors hang from the lower arm tips and the upper arm's middle.
    for (const [ay, dz] of [
      [armY[0], -1.45],
      [armY[1], 0],
      [armY[0], 1.45],
    ] as const) {
      const top = v(x, ay, z + dz);
      g.add(this.insulatorString(top, 6));
      attach.push(v(x, ay - 0.5, z + dz));
    }
    g.add(this.beam(v(x, height, z), v(x, height + 0.5, z), 0.03, m, 4));
    return { group: g, attach };
  }

  /** A power transformer: tank with cooling fins, conservator tank and three bushings. */
  transformer(x: number, z: number, scale = 1, rotY = 0) {
    const g = new THREE.Group();
    const m = this.m.transformer;
    g.add(this.box(1.1, 1.0, 0.8, m, 0, 0.6, 0));
    g.add(this.box(1.2, 0.1, 0.9, this.m.concrete, 0, 0.05, 0));
    for (let i = 0; i < 7; i++) {
      g.add(this.box(0.03, 0.75, 0.32, m, -0.42 + i * 0.14, 0.58, 0.58));
      g.add(this.box(0.03, 0.75, 0.32, m, -0.42 + i * 0.14, 0.58, -0.58));
    }
    const cons = this.cyl(0.13, 0.13, 0.9, m, 0, 1.38, -0.2, 12);
    cons.rotation.z = Math.PI / 2;
    g.add(cons);
    for (const bx of [-0.35, 0, 0.35]) {
      g.add(this.cyl(0.035, 0.035, 0.5, this.m.steel, bx, 1.35, 0.15, 8));
      for (let i = 0; i < 4; i++) g.add(this.cyl(0.08, 0.08, 0.04, this.m.insulator, bx, 1.18 + i * 0.1, 0.15, 10));
    }
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    g.scale.setScalar(scale);
    return g;
  }

  /** A wooden distribution pole with a cross-arm across the line (along z) and three insulators. */
  pole(x: number, z: number, height = 3.4, withTransformer = false): { group: THREE.Group; attach: THREE.Vector3[] } {
    const g = new THREE.Group();
    g.add(this.cyl(0.09, 0.12, height, this.m.wood, x, height / 2, z, 10));
    const armY = height - 0.25;
    g.add(this.box(0.1, 0.1, 1.3, this.m.wood, x, armY, z));
    g.add(this.beam(v(x, armY - 0.35, z), v(x, armY, z - 0.4), 0.02, this.m.steel, 4));
    g.add(this.beam(v(x, armY - 0.35, z), v(x, armY, z + 0.4), 0.02, this.m.steel, 4));
    const attach: THREE.Vector3[] = [];
    for (const dz of [-0.55, 0, 0.55]) {
      g.add(this.cyl(0.035, 0.05, 0.14, this.m.insulatorWhite, x, armY + 0.12, z + dz, 8));
      attach.push(v(x, armY + 0.2, z + dz));
    }
    if (withTransformer) {
      g.add(this.cyl(0.2, 0.2, 0.5, this.m.transformer, x + 0.28, armY - 0.75, z, 12));
      g.add(this.cyl(0.21, 0.21, 0.04, this.m.steel, x + 0.28, armY - 0.48, z, 12));
    }
    return { group: g, attach };
  }

  /** Sagging wire between two points (a catenary approximated by a parabola), as sampled points. */
  static sag(a: THREE.Vector3, b: THREE.Vector3, droop: number, n = 10) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = a.clone().lerp(b, t);
      p.y -= droop * 4 * t * (1 - t);
      pts.push(p);
    }
    return pts;
  }

  wire(points: THREE.Vector3[], r: number, mat: THREE.Material) {
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 2), r, 5, false), mat);
  }

  /** A gable roof: a triangular prism `w` wide (x), `d` deep (z) and `h` tall. */
  gableRoof(w: number, d: number, h: number, mat: THREE.Material) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 - 0.15, 0);
    shape.lineTo(0, h);
    shape.lineTo(w / 2 + 0.15, 0);
    shape.lineTo(-w / 2 - 0.15, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d + 0.3, bevelEnabled: false });
    geo.translate(0, 0, -(d + 0.3) / 2);
    // Project shingles across the slopes.
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getZ(i) * 0.6, (pos.getY(i) + Math.abs(pos.getX(i))) * 0.6);
    return new THREE.Mesh(geo, mat);
  }

  /** A window with a white frame, lit at night via the shared window material. Faces +z. */
  windowPane(w: number, h: number, x: number, y: number, z: number, rotY = 0) {
    const g = new THREE.Group();
    g.add(this.box(w + 0.08, h + 0.08, 0.04, this.m.trim, 0, 0, 0));
    g.add(this.box(w, h, 0.05, this.window, 0, 0, 0.01));
    g.add(this.box(0.03, h, 0.06, this.m.trim, 0, 0, 0.02));
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    return g;
  }

  /** A house facing -z (towards the street). */
  house(x: number, z: number, siding: THREE.Material, roof: THREE.Material, variant: number) {
    const g = new THREE.Group();
    const w = 2.4;
    const d = 2.0;
    const h = 1.7;
    g.add(this.box(w, h, d, siding, 0, h / 2, 0));
    g.add(this.box(w + 0.1, 0.12, d + 0.1, this.m.concrete, 0, 0.06, 0));
    const roofMesh = this.gableRoof(w, d, 0.9, roof);
    roofMesh.rotation.y = Math.PI / 2;
    roofMesh.position.y = h;
    if (variant === 1) roofMesh.rotation.y = 0;
    g.add(roofMesh);
    g.add(this.box(0.3, 0.8, 0.3, this.m.brick, 0.6, h + 0.55, 0.35));
    // Front (facing -z): door, porch, two windows.
    const front = -d / 2 - 0.02;
    g.add(this.box(0.45, 0.85, 0.05, this.m.door, variant === 2 ? -0.55 : 0.55, 0.47, front));
    g.add(this.box(1.0, 0.06, 0.5, this.m.concrete, variant === 2 ? -0.55 : 0.55, 0.12, front - 0.25));
    const wx = variant === 2 ? 0.45 : -0.55;
    g.add(this.windowPane(0.5, 0.45, wx, 1.05, front, Math.PI));
    g.add(this.windowPane(0.5, 0.45, wx + (variant === 2 ? 0.75 : -0.6), 1.05, front, Math.PI));
    // Side and back windows so the house glows from every angle (the overview camera sees the backs).
    g.add(this.windowPane(0.45, 0.4, -0.6, 1.05, d / 2 + 0.02, 0));
    g.add(this.windowPane(0.45, 0.4, 0.6, 1.05, d / 2 + 0.02, 0));
    g.add(this.box(0.4, 0.75, 0.05, this.m.door, 0, 0.42, d / 2 + 0.02));
    g.add(this.windowPane(0.45, 0.4, w / 2 + 0.02, 1.05, 0, Math.PI / 2));
    g.add(this.windowPane(0.45, 0.4, -w / 2 - 0.02, 1.05, 0, -Math.PI / 2));
    // Front-yard hedge.
    g.add(this.box(0.9, 0.35, 0.3, this.m.hedge, variant === 2 ? 0.7 : -0.7, 0.18, front - 0.45));
    g.position.set(x, 0, z);
    return g;
  }

  /** The brick school, facing +z (towards the street), with a flag. Returns the flag for animation. */
  school(x: number, z: number): { group: THREE.Group; flag: THREE.Mesh } {
    const g = new THREE.Group();
    const w = 5;
    const h = 2.3;
    const d = 2.6;
    g.add(this.box(w, h, d, this.m.brick, 0, h / 2, 0));
    g.add(this.box(w + 0.1, 0.1, d + 0.1, this.m.flatRoof, 0, h + 0.05, 0));
    g.add(this.box(w + 0.15, 0.2, 0.12, this.m.trim, 0, h + 0.1, d / 2));
    const front = d / 2 + 0.02;
    for (const wx of [-1.9, -1.1, 1.1, 1.9]) {
      g.add(this.windowPane(0.6, 0.5, wx, 1.55, front));
      g.add(this.windowPane(0.6, 0.5, wx, 0.75, front));
    }
    g.add(this.box(0.9, 1.0, 0.06, this.m.darkGlass, 0, 0.55, front));
    g.add(this.box(1.4, 0.1, 0.6, this.m.trim, 0, 1.15, front + 0.25));
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: T.sign('SCHOOL', '#1f4e79', '#ffffff'), roughness: 0.6 }));
    signMesh.position.set(0, 1.85, front + 0.01);
    g.add(signMesh);
    for (const wx of [-1.5, 0, 1.5]) g.add(this.windowPane(0.6, 0.5, wx, 1.5, -d / 2 - 0.02, Math.PI));
    // Flagpole.
    g.add(this.cyl(0.03, 0.04, 3.4, this.m.aluminium, 2.9, 1.7, front + 0.6, 8));
    const flagGeo = new THREE.PlaneGeometry(0.8, 0.5, 8, 1);
    flagGeo.translate(0.4, 0, 0);
    const flag = new THREE.Mesh(flagGeo, this.m.flag);
    flag.position.set(2.92, 3.1, front + 0.6);
    g.add(flag);
    g.position.set(x, 0, z);
    return { group: g, flag };
  }

  /** The corner shop, facing +z, with awning and sign. */
  shop(x: number, z: number) {
    const g = new THREE.Group();
    const w = 3;
    const h = 2;
    const d = 2.4;
    g.add(this.box(w, h, d, this.m.sidingSage, 0, h / 2, 0));
    g.add(this.box(w + 0.1, 0.3, 0.12, this.m.trim, 0, h + 0.05, d / 2));
    g.add(this.box(w + 0.1, 0.08, d + 0.1, this.m.flatRoof, 0, h + 0.04, 0));
    const front = d / 2 + 0.02;
    g.add(this.box(1.1, 1.0, 0.05, this.window, -0.75, 0.85, front));
    g.add(this.box(1.1, 1.0, 0.05, this.window, 0.85, 0.85, front));
    g.add(this.box(0.55, 1.1, 0.06, this.m.door, 0.05, 0.55, front));
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.8), this.m.awning);
    awning.rotation.x = -Math.PI / 3;
    awning.position.set(0, 1.6, front + 0.32);
    g.add(awning);
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.42), new THREE.MeshStandardMaterial({ map: T.sign('CORNER MARKET', '#7a2e2a', '#fff4d6'), roughness: 0.6 }));
    signMesh.position.set(0, 2.25, front + 0.08);
    g.add(signMesh);
    g.position.set(x, 0, z);
    return g;
  }

  tree(x: number, z: number, size: number, seed: number) {
    const g = new THREE.Group();
    const trunkH = 0.7 * size;
    g.add(this.cyl(0.07 * size, 0.1 * size, trunkH, this.m.trunk, 0, trunkH / 2, 0, 6));
    const crown = new THREE.Group();
    crown.position.y = trunkH;
    const r = (n: number) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    for (let i = 0; i < 3; i++) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry((0.45 + r(i) * 0.25) * size, 0), this.m.leaves[(seed + i) % this.m.leaves.length]);
      blob.position.set((r(i + 3) - 0.5) * 0.5 * size, (0.35 + i * 0.28) * size, (r(i + 6) - 0.5) * 0.5 * size);
      blob.rotation.set(r(i + 9) * 3, r(i + 12) * 3, 0);
      crown.add(blob);
    }
    g.add(crown);
    g.position.set(x, 0, z);
    g.userData.crown = crown;
    g.userData.phase = r(20) * Math.PI * 2;
    return g;
  }

  /** A small car pointing along +x. */
  car(paint: number) {
    const g = new THREE.Group();
    const body = this.m.carPaint[paint % this.m.carPaint.length];
    g.add(this.box(1.1, 0.3, 0.52, body, 0, 0.27, 0));
    g.add(this.box(0.6, 0.24, 0.48, body, -0.05, 0.53, 0));
    g.add(this.box(0.04, 0.2, 0.42, this.m.darkGlass, 0.26, 0.53, 0));
    g.add(this.box(0.04, 0.2, 0.42, this.m.darkGlass, -0.36, 0.53, 0));
    g.add(this.box(0.5, 0.18, 0.5, this.m.darkGlass, -0.05, 0.54, 0));
    for (const [wx, wz] of [
      [0.33, 0.26],
      [-0.33, 0.26],
      [0.33, -0.26],
      [-0.33, -0.26],
    ]) {
      const wheel = this.cyl(0.13, 0.13, 0.08, this.m.tire, wx, 0.13, wz, 12);
      wheel.rotation.x = Math.PI / 2;
      g.add(wheel);
    }
    g.add(this.box(0.03, 0.07, 0.12, this.headlight, 0.56, 0.3, 0.17));
    g.add(this.box(0.03, 0.07, 0.12, this.headlight, 0.56, 0.3, -0.17));
    g.add(this.box(0.03, 0.06, 0.12, this.taillight, -0.56, 0.3, 0.17));
    g.add(this.box(0.03, 0.06, 0.12, this.taillight, -0.56, 0.3, -0.17));
    return g;
  }

  /** A street light whose arm reaches out over the road (towards -z). Returns the lamp head position. */
  streetlight(x: number, z: number): { group: THREE.Group; head: THREE.Vector3 } {
    const g = new THREE.Group();
    g.add(this.cyl(0.05, 0.07, 2.8, this.m.steel, x, 1.4, z, 8));
    g.add(this.beam(v(x, 2.75, z), v(x, 2.85, z - 0.8), 0.035, this.m.steel, 6));
    g.add(this.box(0.22, 0.08, 0.42, this.m.steel, x, 2.86, z - 0.95));
    g.add(this.box(0.18, 0.03, 0.34, this.lamp, x, 2.81, z - 0.95));
    return { group: g, head: v(x, 2.78, z - 0.95) };
  }

  hill(x: number, z: number, w: number, h: number, d: number) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), this.m.hill);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, -0.05, z);
    return mesh;
  }
}

// @ts-nocheck
// Bire bir taşınan çizim motoru (v11). Tip güvenliği 2. aşamada kademeli eklenecek.
import { themes } from './themes';

export interface AmbientHandle {
  init: (themeKey: string) => void;
  resize: () => void;
  destroy: () => void;
}

export function createAmbient(ambientCanvas: HTMLCanvasElement, getThemeKey: () => string): AmbientHandle {
  let rafId = 0;
  let destroyed = false;
  const ambientCtx = ambientCanvas.getContext('2d')!;
  
  // ── Wind system ──────────────────────────────────────────────
  let wind = {
    x: 0.28, y: 0,
    baseX: 0.28,
    noiseT: 0,
    gustTimer: 0, gustDuration: 0,
    gustX: 0, gustY: 0,
    gustActive: false
  };
  
  function updateWind(dt) {
    wind.noiseT += 0.004 * dt;
    // Slow sinusoidal base drift
    wind.baseX = 0.28 + Math.sin(wind.noiseT) * 0.14 + Math.sin(wind.noiseT * 2.3) * 0.07;
  
    if (wind.gustActive) {
      wind.gustTimer += dt;
      const gustProgress = wind.gustTimer / wind.gustDuration;
      const envelope = gustProgress < 0.25
        ? gustProgress / 0.25
        : gustProgress < 0.7
          ? 1
          : 1 - (gustProgress - 0.7) / 0.3;
      wind.x = wind.baseX + wind.gustX * envelope;
      wind.y = wind.gustY * envelope;
      if (wind.gustTimer >= wind.gustDuration) {
        wind.gustActive = false;
        wind.gustTimer = 0;
      }
    } else {
      wind.x = wind.baseX;
      wind.y = 0;
      // Schedule next gust (every 8–18 s at 60fps → every 480–1080 frames)
      if (Math.random() < 0.0012 * dt) {
        wind.gustActive = true;
        wind.gustTimer = 0;
        wind.gustDuration = 80 + Math.random() * 140;
        wind.gustX = (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 1.2);
        wind.gustY = (Math.random() - 0.5) * 0.3;
      }
    }
  }
  
  // Wind state for rain/storm (stronger, variable angle)
  let rainWind = { angle: 0, targetAngle: 0, timer: 0 };
  function updateRainWind(dt, isStorm) {
    rainWind.timer += dt;
    if (rainWind.timer > 90 + Math.random() * 60) {
      rainWind.timer = 0;
      const spread = isStorm ? 0.22 : 0.10;
      rainWind.targetAngle = (isStorm ? 1.20 : 1.33) + (Math.random() - 0.5) * spread;
    }
    rainWind.angle += (rainWind.targetAngle - rainWind.angle) * 0.025 * dt;
  }
  
  // ── Particle arrays ──────────────────────────────────────────
  let ambientParticles = [];
  let ambientClouds = [];
  let lightningState = {
    active: false, brightness: 0, timer: 0,
    nextStrike: 320 + Math.floor(Math.random() * 450), phase: 0,
    boltSegs: []
  };
  
  // ── Canvas setup ─────────────────────────────────────────────
  function resizeAmbientCanvas() {
    const main = document.querySelector('.main');
    const w = main ? main.clientWidth : window.innerWidth;
    const h = main ? main.clientHeight : window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ambientCanvas.width = w * dpr;
    ambientCanvas.height = h * dpr;
    ambientCtx.resetTransform();
    ambientCtx.scale(dpr, dpr);
  }
  
  // ── Environment initializer ───────────────────────────────────
  function initEnvironment(themeKey) {
    ambientParticles = [];
    ambientClouds = [];
    lightningState.active = false;
    lightningState.brightness = 0;
    lightningState.timer = 0;
    lightningState.nextStrike = 300 + Math.floor(Math.random() * 500);
    lightningState.boltSegs = [];
    wind.noiseT = Math.random() * 100;
    wind.gustActive = false;
  
    const main = document.querySelector('.main');
    const w = main ? main.clientWidth : window.innerWidth;
    const h = main ? main.clientHeight : window.innerHeight;
  
    const t = themes[themeKey] || themes.sakura;
    const mode = t.mode || 'sakura';
  
    if (mode === 'rain' || mode === 'storm') {
      // ── Layered clouds ──
      const cloudCount = mode === 'storm' ? 9 : 6;
      for (let i = 0; i < cloudCount; i++) {
        ambientClouds.push({
          x: Math.random() * (w + 300) - 150,
          y: Math.random() * (h * 0.4) - 25,
          radiusX: 160 + Math.random() * 240,
          radiusY: 60 + Math.random() * 80,
          speed: 0.08 + Math.random() * 0.22,
          opacity: mode === 'storm'
            ? (0.5 + Math.random() * 0.4)
            : (0.14 + Math.random() * 0.18)
        });
      }
      rainWind.angle = mode === 'storm' ? 1.22 : 1.34;
      rainWind.targetAngle = rainWind.angle;
  
      // ── Dense rain (3 depth layers) ──
      const layerDefs = mode === 'storm'
        ? [
            { count: 90, zMin: 100, zMax: 350, speedMul: 1.4, lenMul: 1.3, thickMin: 1.2, thickMax: 2.2, opMin: 0.35, opMax: 0.85 },
            { count: 90, zMin: -80, zMax: 100, speedMul: 1.0, lenMul: 1.0, thickMin: 0.8, thickMax: 1.5, opMin: 0.25, opMax: 0.65 },
            { count: 60, zMin: -250, zMax: -80, speedMul: 0.65, lenMul: 0.7, thickMin: 0.4, thickMax: 0.9, opMin: 0.12, opMax: 0.38 }
          ]
        : [
            { count: 60, zMin: 80, zMax: 300, speedMul: 1.3, lenMul: 1.2, thickMin: 1.0, thickMax: 1.8, opMin: 0.3, opMax: 0.75 },
            { count: 70, zMin: -60, zMax: 80, speedMul: 1.0, lenMul: 1.0, thickMin: 0.7, thickMax: 1.3, opMin: 0.2, opMax: 0.55 },
            { count: 50, zMin: -220, zMax: -60, speedMul: 0.6, lenMul: 0.65, thickMin: 0.35, thickMax: 0.75, opMin: 0.1, opMax: 0.3 }
          ];
  
      for (const ld of layerDefs) {
        const baseSpeed = mode === 'storm' ? 21 : 14;
        for (let i = 0; i < ld.count; i++) {
          const z = ld.zMin + Math.random() * (ld.zMax - ld.zMin);
          ambientParticles.push({
            type: 'rain',
            x: Math.random() * (w + 300) - 150,
            y: Math.random() * (h + 120) - 60,
            z,
            speed: (baseSpeed + Math.random() * 10) * ld.speedMul,
            baseLength: (20 + Math.random() * 28) * ld.lenMul,
            length: (20 + Math.random() * 28) * ld.lenMul,
            angle: rainWind.angle,
            opacity: ld.opMin + Math.random() * (ld.opMax - ld.opMin),
            thickness: ld.thickMin + Math.random() * (ld.thickMax - ld.thickMin),
            turbX: (Math.random() - 0.5) * 1.5,
            turbY: 0
          });
        }
      }
  
    } else if (mode === 'snow') {
      // ── Blizzard snow (crystal / grain / dust) ──
      const count = 245;
      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        const flakeType = roll < 0.24 ? 'crystal' : (roll < 0.58 ? 'star' : 'bokeh');
        const z = Math.random() * 500 - 200;
        const baseSize = flakeType === 'crystal'
          ? 8 + Math.random() * 9
          : flakeType === 'star'
            ? 4 + Math.random() * 6
            : 2 + Math.random() * 6;
        ambientParticles.push({
          type: 'snow',
          flakeType,
          x: Math.random() * (w + 80) - 40,
          y: Math.random() * (h + 80) - 40,
          z,
          size: baseSize,
          // physics
          vx: (Math.random() - 0.5) * 0.72,
          vy: 0.55 + Math.random() * 1.05,
          mass: 0.5 + Math.random() * 0.5,
          drag: 0.96 + Math.random() * 0.025,
          windResponse: 0.55 + Math.random() * 0.95,
          upheaval: Math.random() < 0.12, // occasional upward drift
          upheavalPhase: Math.random() * Math.PI * 2,
          phase: Math.random() * Math.PI * 2,
          drift: 20 + Math.random() * 48,
          rotZ: Math.random() * Math.PI * 2,
          spinSpeed: (Math.random() - 0.5) * 0.018,
          rotY: Math.random() * Math.PI,
          flipSpeed: (Math.random() - 0.5) * 0.012,
          opacity: flakeType === 'bokeh'
            ? 0.12 + Math.random() * 0.22
            : 0.38 + Math.random() * 0.42,
          screenX: 0, screenY: 0
        });
      }
  
    } else {
      // ── 3D Organic Petals & Leaves (45–55 particles) ──
      const countMap = { leaves: 48, rose: 44, nemophila: 42, autumn: 48, sakura: 50 };
      const count = countMap[mode] || 45;
  
      for (let i = 0; i < count; i++) {
        const z = Math.random() * 500 - 220;
        const sizeBase = {
          leaves:   { w: 17 + Math.random() * 19, arh: 1.55 + Math.random() * 0.55 },
          rose:     { w: 20 + Math.random() * 19, arh: 1.18 + Math.random() * 0.48 },
          nemophila:{ w: 15 + Math.random() * 15, arh: 0.95 + Math.random() * 0.48 },
          autumn:   { w: 19 + Math.random() * 19, arh: 1.35 + Math.random() * 0.60 },
          sakura:   { w: 15 + Math.random() * 15, arh: 1.05 + Math.random() * 0.65 }
        }[mode] || { w: 15 + Math.random() * 12, arh: 1.38 };
  
        const pw = sizeBase.w * (0.84 + Math.random() * 0.34);
        const ph = pw * sizeBase.arh * (0.88 + Math.random() * 0.24);
  
        // Unique per-particle physics
        const mass = 0.5 + Math.random() * 0.8;
        const drag = 0.975 + Math.random() * 0.015;
        const windResponse = 0.06 + Math.random() * 0.22;
  
        ambientParticles.push({
          type: mode,
          shapeVariant: Math.floor(Math.random() * (mode === 'leaves' ? 5 : mode === 'autumn' ? 5 : mode === 'sakura' ? 5 : mode === 'rose' ? 4 : 5)),
          x: Math.random() * (w + 120) - 60,
          y: Math.random() * (h + 120) - 60,
          z,
          w: pw, h: ph,
          // physics
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0.4 + Math.random() * 0.9,
          vz: (Math.random() - 0.5) * 0.08,
          mass, drag, windResponse,
          // rotation & deformation
          rotX: Math.random() * Math.PI * 2,
          rotY: Math.random() * Math.PI * 2,
          rotZ: Math.random() * Math.PI * 2,
          wx: (Math.random() - 0.5) * 0.028,
          wy: (Math.random() - 0.5) * 0.038,
          wz: (Math.random() - 0.5) * 0.022,
          curlPhase: Math.random() * Math.PI * 2,
          curlAmp: 0.06 + Math.random() * 0.14,
          shapeWidth: 0.72 + Math.random() * 0.56,
          upheaval: Math.random() < 0.08,
          upheavalCooldown: Math.floor(Math.random() * 200),
          opacity: 0.68 + Math.random() * 0.32,
          screenX: 0, screenY: 0
        });
      }
    }
  }
  
  // ── Helpers: 3D rotation + perspective project ────────────────
  const FOV = 520;
  
  function rotateXY(vx, vy, vz, rx, ry, rz) {
    // Intrinsic ZXY rotation
    let x = vx, y = vy, z = vz;
    // Z
    let cx = Math.cos(rz), sx = Math.sin(rz);
    let nx = x * cx - y * sx, ny = x * sx + y * cx;
    x = nx; y = ny;
    // X
    let cy = Math.cos(rx), sy = Math.sin(rx);
    let nz = y * sy + z * cy, ny2 = y * cy - z * sy;
    y = ny2; z = nz;
    // Y
    let cz = Math.cos(ry), sz = Math.sin(ry);
    let nx2 = x * cz + z * sz, nz2 = -x * sz + z * cz;
    return { x: nx2, y, z: nz2 };
  }
  
  function perspProject(x3d, y3d, z3d, camZ) {
    const dz = camZ - z3d;
    const scale = dz > 0 ? FOV / dz : 0.001;
    return { sx: x3d * scale, sy: y3d * scale, scale };
  }
  
  // Compute face normal for lighting
  function faceNormal(pts) {
    const ax = pts[1].x - pts[0].x, ay = pts[1].y - pts[0].y, az = pts[1].z - pts[0].z;
    const bx = pts[2].x - pts[0].x, by = pts[2].y - pts[0].y, bz = pts[2].z - pts[0].z;
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    return { x: nx / len, y: ny / len, z: nz / len };
  }
  
  const LIGHT = { x: 0.32, y: -0.72, z: 0.61 }; // normalized light direction
  
  function ndotl(normal) {
    return Math.max(0, normal.x * LIGHT.x + normal.y * LIGHT.y + normal.z * LIGHT.z);
  }
  
  // ── Draw functions ────────────────────────────────────────────
  
  // Sample a 3D Bezier petal surface at (u,v) with curl deformation
  function samplePetalSurface(u, v, hw, hh, curlAmt, type, shapeVariant = 0) {
    // Species-specific silhouettes: the edge profile changes the actual outline,
    // not merely the particle colour. u runs from stem/base to tip; v is the width.
    const across = Math.abs(v);
    const baseProfile = Math.sin(Math.PI * Math.pow(u, 0.82));
    let widthProfile = baseProfile;
    let edgeFactor = 1;
    let asymmetry = 0;
  
    if (type === 'sakura') {
      // Soft, broad cherry-blossom petal with a tiny split at its rounded tip.
      const round = Math.pow(Math.sin(Math.PI * u), 0.72);
      widthProfile = round * (0.90 + 0.10 * Math.sin(u * Math.PI));
      edgeFactor = 1 - 0.055 * Math.pow(across, 5) * Math.max(0, (u - 0.78) / 0.22);
      asymmetry = 0.025 * Math.sin(u * 5.2 + shapeVariant) * u;
    } else if (type === 'leaves') {
      // Five distinct botanical leaf families: oval, heart, serrated, narrow and lobed.
      const variants = [
        Math.pow(Math.sin(Math.PI*u), 0.78) * (0.94 - 0.10*u),
        Math.pow(Math.sin(Math.PI*u), 0.62) * (0.78 + 0.25*Math.sin(Math.PI*u)),
        Math.pow(Math.sin(Math.PI*u), 0.88) * (0.90 + 0.08*Math.sin(u* Math.PI*2)),
        Math.pow(Math.sin(Math.PI*u), 1.08) * (1.12 - 0.24*u),
        Math.pow(Math.sin(Math.PI*u), 0.70) * (0.82 + 0.18*Math.cos(u*Math.PI*2))
      ];
      widthProfile = variants[shapeVariant % variants.length];
      // Fine serration on the edge; strongest on the serrated and lobed variants.
      const serration = shapeVariant === 2 ? 0.075 : shapeVariant === 4 ? 0.045 : 0.018;
      edgeFactor = 1 + serration * Math.sin(u * 34 * Math.PI) * Math.pow(across, 2.2);
      asymmetry = 0.045 * Math.sin(u * 6.5 + shapeVariant) * u;
    } else if (type === 'autumn') {
      // Maple leaf: five pointed lobes with deep concave notches between them.
      const maple = Math.pow(Math.sin(Math.PI*u), 0.58) * (0.82 + 0.18*Math.sin(u*Math.PI*2));
      widthProfile = maple;
      const lobeWave = Math.cos(u * Math.PI * 5.0);
      edgeFactor = 1 + 0.22 * lobeWave * Math.pow(across, 1.7);
      asymmetry = 0.035 * Math.sin(u * 9 + shapeVariant) * u;
    } else if (type === 'nemophila') {
      // Broad, softly scalloped blue flower petal, unlike a pointed leaf.
      widthProfile = Math.pow(Math.sin(Math.PI*u), 0.52) * (0.94 + 0.06*Math.sin(u*Math.PI));
      edgeFactor = 1 + 0.105 * Math.sin(u * Math.PI * 7 + shapeVariant * 0.7) * Math.pow(across, 2.5);
      asymmetry = 0.018 * Math.sin(u * 8 + shapeVariant);
    } else if (type === 'rose') {
      // Rose petal: narrow attachment, broad rounded blade and a visibly folded,
      // irregular cup rim. Each petal gets a different rim rhythm and lean.
      const cup = Math.pow(Math.sin(Math.PI * u), 0.48);
      const shoulders = 0.72 + 0.34 * Math.sin(Math.PI * Math.pow(u, 0.72));
      widthProfile = cup * shoulders;
      const rim = Math.max(0, (u - 0.58) / 0.42);
      const wave = Math.sin(u * (13 + (shapeVariant % 3) * 2) + shapeVariant * 1.7);
      edgeFactor = 1 + (0.10 + 0.025 * (shapeVariant % 3)) * wave * Math.pow(across, 1.7) * (0.35 + rim);
      asymmetry = (0.07 * Math.sin(u * 5.4 + shapeVariant * 1.3) + 0.025 * Math.sin(u * 13)) * u;
    }
  
    const lx = (v * hw * widthProfile * edgeFactor) + asymmetry * hw;
    const ly = (u - 0.5) * hh * 2;
    const curvatureZ = 0.18 * hw * Math.sin(u * Math.PI) * (1 - across * 0.6);
    const tipCurl = curlAmt * hw * Math.pow(u, 2.5) * Math.cos(v * Math.PI * 0.5);
    const edgeCurl = curlAmt * hw * 0.35 * across * Math.pow(u, 1.2);
    return { x: lx, y: ly, z: curvatureZ + tipCurl + edgeCurl };
  }
  
  // Project petal mesh onto canvas
  function drawPetalMesh(ctx, p, camZ, colorFn) {
    // Render each petal/leaf as ONE continuous silhouette. The previous tiled
    // quad grid exposed internal cell borders, making the surface look sliced.
    const hw = p.w * 0.5, hh = p.h * 0.5;
    const curlAmt = p.curlAmp * (1 + 0.5 * Math.sin(p.curlPhase));
    const steps = 28;
    const outline = [];
  
    // Right edge: base -> tip
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const pt = samplePetalSurface(u, 1, hw, hh, curlAmt, p.type, p.shapeVariant);
      const r = rotateXY(pt.x, pt.y, pt.z, p.rotX, p.rotY, p.rotZ);
      const q = perspProject(r.x, r.y, r.z, camZ - p.z);
      outline.push({ x: q.sx + p.screenX, y: q.sy + p.screenY, z: r.z });
    }
    // Left edge: tip -> base
    for (let i = steps; i >= 0; i--) {
      const u = i / steps;
      const pt = samplePetalSurface(u, -1, hw, hh, curlAmt, p.type, p.shapeVariant);
      const r = rotateXY(pt.x, pt.y, pt.z, p.rotX, p.rotY, p.rotZ);
      const q = perspProject(r.x, r.y, r.z, camZ - p.z);
      outline.push({ x: q.sx + p.screenX, y: q.sy + p.screenY, z: r.z });
    }
  
    const depthScale = Math.max(0.35, Math.min(2.2, FOV / (CAM_Z - p.z)));
    const frontFacing = Math.cos(p.rotX) * Math.cos(p.rotY) >= 0;
    const base = colorFn(0.12, 0.4, 1, { z: frontFacing ? 0.8 : -0.5 });
    const middle = colorFn(0.58, 0.15, 1, { z: frontFacing ? 0.8 : -0.5 });
    const edge = colorFn(1, 0.85, 1, { z: frontFacing ? 0.8 : -0.5 });
  
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.beginPath();
    outline.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
    ctx.closePath();
  
    // Clip all shading to the same uninterrupted shape: no internal polygon seams.
    ctx.clip();
    const minX = Math.min(...outline.map(pt => pt.x));
    const maxX = Math.max(...outline.map(pt => pt.x));
    const minY = Math.min(...outline.map(pt => pt.y));
    const maxY = Math.max(...outline.map(pt => pt.y));
    const grad = ctx.createLinearGradient(minX, minY, maxX, maxY);
    grad.addColorStop(0, edge);
    grad.addColorStop(0.48, middle);
    grad.addColorStop(1, base);
    ctx.fillStyle = grad;
    ctx.fillRect(minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4);
  
    // Soft central highlight gives a curved, dimensional surface without dividing it.
    const cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5;
    const sheen = ctx.createRadialGradient(cx - depthScale * 3, cy - depthScale * 5, 1, cx, cy, Math.max(8, (maxX-minX)*0.75));
    sheen.addColorStop(0, 'rgba(255,255,255,0.24)');
    sheen.addColorStop(0.55, 'rgba(255,255,255,0.06)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.16)');
    ctx.fillStyle = sheen;
    ctx.fillRect(minX - 2, minY - 2, maxX - minX + 4, maxY - minY + 4);
  
    // Minimal botanical detail: one faint midrib and two short side veins.
    // Kept very subtle so the particles remain clean rather than striped.
    if (p.type === 'leaves' || p.type === 'autumn') {
      ctx.globalAlpha = p.opacity * 0.22;
      ctx.strokeStyle = 'rgba(245,255,239,0.78)';
      ctx.lineWidth = Math.max(0.45, depthScale * 0.42);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, minY + (maxY-minY)*0.88);
      ctx.quadraticCurveTo(cx + (p.type === 'leaves' ? 1 : -1) * (maxX-minX)*0.08, cy, cx, minY + (maxY-minY)*0.12);
      ctx.moveTo(cx, cy + (maxY-minY)*0.08);
      ctx.quadraticCurveTo(cx-(maxX-minX)*0.16, cy-(maxY-minY)*0.04, minX+(maxX-minX)*0.22, cy-(maxY-minY)*0.24);
      ctx.moveTo(cx, cy - (maxY-minY)*0.06);
      ctx.quadraticCurveTo(cx+(maxX-minX)*0.15, cy-(maxY-minY)*0.16, maxX-(maxX-minX)*0.22, cy-(maxY-minY)*0.28);
      ctx.stroke();
    } else if (p.type === 'rose' || p.type === 'sakura' || p.type === 'nemophila') {
      ctx.globalAlpha = p.opacity * 0.13;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(0.4, depthScale * 0.35);
      ctx.beginPath();
      ctx.moveTo(cx, maxY - (maxY-minY)*0.12);
      ctx.quadraticCurveTo(cx-(maxX-minX)*0.08, cy, cx+(maxX-minX)*0.02, minY+(maxY-minY)*0.16);
      ctx.stroke();
    }
    ctx.restore();
  
    // A soft outer contour only; never draw internal mesh lines.
    ctx.save();
    ctx.globalAlpha = p.opacity * 0.18;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    outline.forEach((pt, i) => i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  
  // ── Sakura petal color function ──
  function sakuraColor(u, v, bright, norm) {
    const r = Math.round(Math.min(255, (184 + 71 * u) * bright));
    const g = Math.round(Math.min(255, (68 + 130 * u) * bright));
    const b = Math.round(Math.min(255, (120 + 135 * u) * bright));
    return `rgb(${r},${g},${b})`;
  }
  
  // ── Rose petal color function ──
  function roseColor(u, v, bright, norm) {
    const inside = norm.z > 0;
    const rb = inside ? [74, 12, 18] : [130, 22, 38];
    const rt = inside ? [224, 58, 85] : [247, 116, 136];
    const r = Math.round((rb[0] + (rt[0] - rb[0]) * u) * bright);
    const g = Math.round((rb[1] + (rt[1] - rb[1]) * u) * bright);
    const b = Math.round((rb[2] + (rt[2] - rb[2]) * u) * bright);
    return `rgb(${Math.min(255,r)},${Math.min(255,g)},${Math.min(255,b)})`;
  }
  
  // ── Nemophila petal color function ──
  function nemophilaColor(u, v, bright, norm) {
    const r = Math.round(Math.min(255, (255 - 213 * u) * bright));
    const g = Math.round(Math.min(255, (247 - 105 * u) * bright));
    const b = Math.round(Math.min(255, (255 - 25 * u) * bright));
    return `rgb(${r},${g},${b})`;
  }
  
  // ── Green leaf color function ──
  function leafColor(u, v, bright, norm) {
    const dorsal = norm.z > 0;
    if (dorsal) {
      const r = Math.round(Math.min(255, (28 + 80 * v) * bright));
      const g = Math.round(Math.min(255, (88 + 130 * u) * bright));
      const b = Math.round(Math.min(255, (49 + 80 * v * u) * bright));
      return `rgb(${r},${g},${b})`;
    } else {
      const r = Math.round(Math.min(255, (54 + 66 * v) * bright));
      const g = Math.round(Math.min(255, (108 + 110 * u) * bright));
      const b = Math.round(Math.min(255, (72 + 62 * v * u) * bright));
      return `rgb(${r},${g},${b})`;
    }
  }
  
  // ── Autumn leaf color function ──
  function autumnColor(u, v, bright, norm) {
    const dorsal = norm.z > 0;
    const baseR = dorsal ? 130 : 102;
    const baseG = dorsal ? 72 : 55;
    const r = Math.round(Math.min(255, (baseR + 120 * u) * bright));
    const g = Math.round(Math.min(255, (baseG + 112 * u) * bright));
    const b = Math.round(Math.min(255, (14 + 22 * u) * bright));
    return `rgb(${r},${g},${b})`;
  }
  
  // ── Dispatch draw by mode ──
  const colorFnMap = {
    sakura: sakuraColor,
    rose: roseColor,
    nemophila: nemophilaColor,
    leaves: leafColor,
    autumn: autumnColor
  };
  
  // Sakura cleft notch silhouette drawn over mesh as outline
  function drawSakuraCleft(ctx, p, camZ) {
    const hw = p.w * 0.5, hh = p.h * 0.5;
    // Draw cleft notch detail at tip using projected points
    const tipBase = samplePetalSurface(0.92, 0.1, hw, hh, p.curlAmp, 'sakura');
    const tipR = rotateXY(tipBase.x, tipBase.y, tipBase.z, p.rotX, p.rotY, p.rotZ);
    const tipP = perspProject(tipR.x, tipR.y, tipR.z, camZ - p.z);
  
    const tipBase2 = samplePetalSurface(0.92, -0.1, hw, hh, p.curlAmp, 'sakura');
    const tipR2 = rotateXY(tipBase2.x, tipBase2.y, tipBase2.z, p.rotX, p.rotY, p.rotZ);
    const tipP2 = perspProject(tipR2.x, tipR2.y, tipR2.z, camZ - p.z);
  
    ctx.save();
    ctx.globalAlpha = p.opacity * 0.55;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(tipP.sx + p.screenX, tipP.sy + p.screenY);
    ctx.lineTo(tipP2.sx + p.screenX, tipP2.sy + p.screenY);
    ctx.stroke();
    ctx.restore();
  }
  
  // Add visible leaf vein overlay
  function drawLeafVeins(ctx, p, camZ) {
    const hw = p.w * 0.5, hh = p.h * 0.5;
  
    const midPts = [0.1, 0.3, 0.5, 0.7, 0.9].map(u => {
      const lp = samplePetalSurface(u, 0, hw, hh, p.curlAmp * 0.3, 'leaves');
      const rp = rotateXY(lp.x, lp.y, lp.z, p.rotX, p.rotY, p.rotZ);
      const pr = perspProject(rp.x, rp.y, rp.z, camZ - p.z);
      return { x: pr.sx + p.screenX, y: pr.sy + p.screenY };
    });
  
    ctx.save();
    ctx.globalAlpha = p.opacity * 0.38;
    ctx.strokeStyle = 'rgba(170,245,195,0.85)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    midPts.forEach((pt, i) => i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
    ctx.stroke();
  
    // Side veins at 3 points
    [0.25, 0.50, 0.72].forEach(u => {
      const ctr = samplePetalSurface(u, 0, hw, hh, p.curlAmp * 0.3, 'leaves');
      const lv  = samplePetalSurface(u, 0.7, hw, hh, p.curlAmp * 0.3, 'leaves');
      const rv  = samplePetalSurface(u, -0.7, hw, hh, p.curlAmp * 0.3, 'leaves');
      const projectPt = lp => {
        const rp = rotateXY(lp.x, lp.y, lp.z, p.rotX, p.rotY, p.rotZ);
        const pr = perspProject(rp.x, rp.y, rp.z, camZ - p.z);
        return { x: pr.sx + p.screenX, y: pr.sy + p.screenY };
      };
      const pc = projectPt(ctr), pl = projectPt(lv), pr2 = projectPt(rv);
      ctx.beginPath();
      ctx.moveTo(pc.x, pc.y); ctx.lineTo(pl.x, pl.y);
      ctx.moveTo(pc.x, pc.y); ctx.lineTo(pr2.x, pr2.y);
      ctx.stroke();
    });
    ctx.restore();
  }
  
  // ── Snowflake drawing (unchanged, already good) ──────────────
  function drawSnowflake(ctx, p, depthScale) {
    ctx.save();
    ctx.translate(p.screenX, p.screenY);
  
    if (p.flakeType === 'bokeh') {
      const rad = p.size * depthScale;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      grad.addColorStop(0, `rgba(255,255,255,${p.opacity})`);
      grad.addColorStop(0.55, `rgba(220,235,255,${p.opacity * 0.45})`);
      grad.addColorStop(1, 'rgba(210,230,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
  
    ctx.rotate(p.rotZ);
    ctx.scale(depthScale, depthScale * Math.cos(p.rotY));
  
    const r = p.size;
    ctx.strokeStyle = `rgba(240,248,255,${p.opacity})`;
    ctx.fillStyle   = `rgba(255,255,255,${p.opacity})`;
  
    if (p.flakeType === 'star') {
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = i * Math.PI / 3;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        ctx.moveTo(0, 0);
        ctx.lineTo(ca * r, sa * r);
        const spR = r * 0.55, spL = r * 0.28;
        ctx.moveTo(ca * spR, sa * spR);
        ctx.lineTo(ca * spR - sa * spL, sa * spR + ca * spL);
        ctx.moveTo(ca * spR, sa * spR);
        ctx.lineTo(ca * spR + sa * spL, sa * spR - ca * spL);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
  
    // Dendritic crystal
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      ctx.moveTo(0, 0);
      ctx.lineTo(ca * r, sa * r);
      const b1 = r * 0.42, l1 = r * 0.30;
      const a1L = ang + Math.PI / 3, a1R = ang - Math.PI / 3;
      ctx.moveTo(ca * b1, sa * b1);
      ctx.lineTo(ca * b1 + Math.cos(a1L) * l1, sa * b1 + Math.sin(a1L) * l1);
      ctx.moveTo(ca * b1, sa * b1);
      ctx.lineTo(ca * b1 + Math.cos(a1R) * l1, sa * b1 + Math.sin(a1R) * l1);
      const b2 = r * 0.70, l2 = r * 0.20;
      ctx.moveTo(ca * b2, sa * b2);
      ctx.lineTo(ca * b2 + Math.cos(a1L) * l2, sa * b2 + Math.sin(a1L) * l2);
      ctx.moveTo(ca * b2, sa * b2);
      ctx.lineTo(ca * b2 + Math.cos(a1R) * l2, sa * b2 + Math.sin(a1R) * l2);
    }
    ctx.stroke();
  
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      const hx = Math.cos(ang) * r * 0.20, hy = Math.sin(ang) * r * 0.20;
      i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(228,244,255,${p.opacity * 0.75})`;
    ctx.fill();
    ctx.restore();
  }
  
  // ── Raindrop (improved with shared angle) ────────────────────
  function drawRaindrop(ctx, p, isStorm, lightningFlash) {
    ctx.save();
    const ang = p.angle;
    const dx = Math.cos(ang) * p.length;
    const dy = Math.sin(ang) * p.length;
  
    const grad = ctx.createLinearGradient(p.x, p.y, p.x + dx, p.y + dy);
    if (isStorm && lightningFlash > 0.06) {
      grad.addColorStop(0, `rgba(160,200,255,${0.08 * p.opacity})`);
      grad.addColorStop(0.75, `rgba(220,240,255,${(0.7 * p.opacity + lightningFlash * 0.3)})`);
      grad.addColorStop(1, `rgba(255,255,255,${0.95 * p.opacity})`);
    } else if (isStorm) {
      grad.addColorStop(0, 'rgba(100,140,200,0)');
      grad.addColorStop(0.82, `rgba(148,182,228,${0.38 * p.opacity})`);
      grad.addColorStop(1, `rgba(200,225,255,${0.68 * p.opacity})`);
    } else {
      grad.addColorStop(0, 'rgba(140,175,210,0)');
      grad.addColorStop(0.78, `rgba(175,205,235,${0.32 * p.opacity})`);
      grad.addColorStop(1, `rgba(230,245,255,${0.68 * p.opacity})`);
    }
  
    ctx.strokeStyle = grad;
    ctx.lineWidth = p.thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + dx, p.y + dy);
    ctx.stroke();
    ctx.restore();
  }
  
  // ── Cloud rendering ───────────────────────────────────────────
  function drawClouds(ctx, w, h, isStorm, lightningFlash) {
    ambientClouds.forEach(c => {
      c.x += c.speed;
      if (c.x - c.radiusX > w) c.x = -c.radiusX;
  
      const grad = ctx.createRadialGradient(c.x, c.y, c.radiusX * 0.08, c.x, c.y, c.radiusX);
      if (isStorm) {
        if (lightningFlash > 0.04) {
          const lit = lightningFlash;
          grad.addColorStop(0, `rgba(90,120,185,${0.5 * c.opacity + lit * 0.4})`);
          grad.addColorStop(0.45, `rgba(48,68,118,${0.38 * c.opacity + lit * 0.28})`);
          grad.addColorStop(1, 'rgba(15,24,52,0)');
        } else {
          grad.addColorStop(0, `rgba(22,30,50,${0.55 * c.opacity})`);
          grad.addColorStop(0.55, `rgba(14,20,34,${0.32 * c.opacity})`);
          grad.addColorStop(1, 'rgba(8,12,22,0)');
        }
      } else {
        grad.addColorStop(0, `rgba(158,182,208,${0.17 * c.opacity})`);
        grad.addColorStop(0.58, `rgba(132,157,182,${0.09 * c.opacity})`);
        grad.addColorStop(1, 'rgba(110,135,162,0)');
      }
  
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.radiusX, c.radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  // ── Lightning bolt generator ──────────────────────────────────
  function generateBolt(x1, y1, x2, y2, roughness, depth) {
    if (depth === 0) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    const mx = (x1 + x2) * 0.5 + (Math.random() - 0.5) * roughness;
    const my = (y1 + y2) * 0.5 + (Math.random() - 0.5) * roughness * 0.4;
    const left  = generateBolt(x1, y1, mx, my, roughness * 0.58, depth - 1);
    const right = generateBolt(mx, my, x2, y2, roughness * 0.58, depth - 1);
    return [...left.slice(0, -1), ...right];
  }
  
  function updateLightning(ctx, w, h) {
    lightningState.timer++;
    if (!lightningState.active && lightningState.timer >= lightningState.nextStrike) {
      lightningState.active = true;
      lightningState.phase = 0;
      lightningState.timer = 0;
      // Generate bolt geometry
      const sx = w * (0.2 + Math.random() * 0.6);
      const ex = sx + (Math.random() - 0.5) * w * 0.35;
      lightningState.boltSegs = generateBolt(sx, 0, ex, h * (0.55 + Math.random() * 0.35), w * 0.25, 6);
    }
  
    if (lightningState.active) {
      lightningState.phase++;
      const f = lightningState.phase;
      if (f <= 2)       lightningState.brightness = 0.4 * (f / 2);
      else if (f <= 5)  lightningState.brightness = 0.08;
      else if (f <= 9)  lightningState.brightness = 0.85 - ((f - 6) / 3) * 0.25;
      else if (f <= 14) lightningState.brightness = 0.50 - ((f - 10) / 4) * 0.22;
      else if (f <= 32) lightningState.brightness = 0.28 * Math.pow(0.83, f - 15);
      else {
        lightningState.active = false;
        lightningState.brightness = 0;
        lightningState.timer = 0;
        lightningState.nextStrike = 280 + Math.floor(Math.random() * 520);
        lightningState.boltSegs = [];
      }
  
      if (lightningState.brightness > 0.01) {
        // Ambient flash
        ctx.fillStyle = `rgba(115,155,230,${lightningState.brightness * 0.38})`;
        ctx.fillRect(0, 0, w, h);
  
        // Draw the actual bolt
        if (f >= 5 && f <= 14 && lightningState.boltSegs.length > 1) {
          const segs = lightningState.boltSegs;
          ctx.save();
          ctx.strokeStyle = `rgba(220,240,255,${lightningState.brightness * 0.92})`;
          ctx.lineWidth = 1.5 + lightningState.brightness * 2.5;
          ctx.shadowColor = `rgba(140,180,255,${lightningState.brightness})`;
          ctx.shadowBlur = 18;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(segs[0].x, segs[0].y);
          for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y);
          ctx.stroke();
          // Core bright center
          ctx.strokeStyle = `rgba(255,255,255,${lightningState.brightness * 0.7})`;
          ctx.lineWidth = 0.8;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.moveTo(segs[0].x, segs[0].y);
          for (let i = 1; i < segs.length; i++) ctx.lineTo(segs[i].x, segs[i].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }
  
  // ── Main animation loop ───────────────────────────────────────
  const CAM_Z = 600;
  let lastAmbientTime = 0;
  
  function animateAmbient(now) {
    const dt = Math.min((now - lastAmbientTime) / 16.67 || 1, 2.5);
    lastAmbientTime = now;
  
    const main = document.querySelector('.main');
    const w = main ? main.clientWidth : window.innerWidth;
    const h = main ? main.clientHeight : window.innerHeight;
  
    ambientCtx.clearRect(0, 0, w, h);
  
    const t = themes[getThemeKey()] || themes.sakura;
    const mode = t.mode || 'sakura';
  
    if (mode === 'rain' || mode === 'storm') {
      // ── Rain / Storm ──
      drawClouds(ambientCtx, w, h, mode === 'storm', lightningState.brightness);
      if (mode === 'storm') updateLightning(ambientCtx, w, h);
      updateRainWind(dt, mode === 'storm');
  
      ambientParticles.forEach(p => {
        // Apply shared rain wind angle smoothly
        p.angle += (rainWind.angle - p.angle) * 0.01 * dt;
        // Turbulence
        p.turbX += (Math.random() - 0.5) * 0.08 * dt;
        p.turbX *= 0.96;
  
        const windAngle = p.angle + p.turbX * 0.05;
        p.x += Math.cos(windAngle) * p.speed * dt;
        p.y += Math.sin(windAngle) * p.speed * dt;
  
        // Adjust length with depth
        const depthScale = Math.max(0.3, (CAM_Z + 100) / (CAM_Z + 100 - p.z));
        p.length = p.baseLength * depthScale;
  
        if (p.y > h + 60 || p.x > w + 100 || p.x < -100) {
          p.y = -60 - Math.random() * 50;
          p.x = Math.random() * (w + 200) - 100;
          p.z = p.z; // keep same depth layer
        }
  
        drawRaindrop(ambientCtx, p, mode === 'storm', lightningState.brightness);
      });
  
    } else if (mode === 'snow') {
      // ── Snow / Blizzard ──
      updateWind(dt);
  
      ambientParticles.forEach(p => {
        // Wind force
        p.vx += (wind.x * p.windResponse * 1.55 - p.vx * (1 - p.drag)) * dt;
        p.vy += (0.028 * p.mass - p.vy * 0.008) * dt; // gentle gravity + air drag
        p.vy *= p.drag;
        p.vx *= p.drag;
  
        // Upheaval: occasional upward swirl
        if (p.upheaval) {
          const uph = Math.sin(p.upheavalPhase) * 0.5;
          p.vy += uph * 0.04 * dt;
          p.upheavalPhase += 0.04 * dt;
        }
  
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotZ += p.spinSpeed * dt;
        p.rotY += p.flipSpeed * dt;
        p.phase += 0.02 * dt;
  
        const depthScale = Math.max(0.25, (CAM_Z + 200) / (CAM_Z + 200 - p.z));
        p.screenX = p.x + Math.sin(p.phase) * p.drift * depthScale * 0.5;
        p.screenY = p.y;
  
        if (p.y > h + 40) {
          p.y = -40 - Math.random() * 60;
          p.x = Math.random() * (w + 60) - 30;
          p.vx = (Math.random() - 0.5) * 0.4;
          p.vy = 0.35 + Math.random() * 0.85;
        }
        if (p.x > w + 50) p.x = -50;
        if (p.x < -50)    p.x = w + 50;
  
        drawSnowflake(ambientCtx, p, depthScale);
      });
  
    } else {
      // ── 3D Organic Petals & Leaves ──
      updateWind(dt);
  
      // Sort by z for correct painter's depth (back first)
      ambientParticles.sort((a, b) => a.z - b.z);
  
      ambientParticles.forEach(p => {
        // Physics update
        p.vx += (wind.x * p.windResponse * 1.1 - p.vx * (1 - p.drag)) * dt;
        p.vy += (0.028 * p.mass - p.vy * 0.006) * dt;
        p.vy *= p.drag;
        p.vx *= p.drag;
  
        // Upheaval (brief lift on wind gusts)
        if (p.upheaval && p.upheavalCooldown <= 0) {
          p.vy -= 0.12 * dt;
          if (p.vy < -1.5) p.upheavalCooldown = 180 + Math.random() * 120;
        } else {
          p.upheavalCooldown = Math.max(0, p.upheavalCooldown - dt);
          if (p.upheavalCooldown === 0 && Math.random() < 0.0008 * dt) {
            p.upheaval = true;
          }
        }
  
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
  
        // Angular velocity — fluttering driven by wind response & curl
        p.wx += (Math.sin(p.curlPhase) * p.curlAmp * 0.018
                 + wind.x * p.windResponse * 0.012) * dt;
        p.wy += (Math.cos(p.curlPhase * 0.7) * p.curlAmp * 0.022
                 + wind.y * p.windResponse * 0.008) * dt;
        p.wx *= 0.96;
        p.wy *= 0.96;
        p.wz *= 0.96;
  
        p.rotX += p.wx * dt;
        p.rotY += p.wy * dt;
        p.rotZ += p.wz * dt;
        p.curlPhase += 0.028 * dt;
  
        const depthScale = Math.max(0.28, CAM_Z / (CAM_Z - p.z));
        p.screenX = p.x;
        p.screenY = p.y;
  
        // Wrap / recycle
        if (p.y > h + 80) {
          p.y = -60 - Math.random() * 100;
          p.x = Math.random() * (w + 80) - 40;
          p.z = Math.random() * 500 - 220;
          p.vx = (Math.random() - 0.5) * 0.3;
          p.vy = 0.4 + Math.random() * 0.9;
          p.upheaval = false;
          p.upheavalCooldown = Math.floor(Math.random() * 200);
        }
        if (p.x > w + 70) p.x = -70;
        if (p.x < -70)    p.x = w + 70;
        if (p.z > 500)    p.z = -220;
        if (p.z < -220)   p.z = 500;
  
        const colorFn = colorFnMap[mode] || sakuraColor;
        drawPetalMesh(ambientCtx, p, CAM_Z, colorFn);
  
        // Keep each particle visually unified: no internal mesh seams or heavy vein lines.
        // A faint natural midrib is intentionally omitted at this scale to avoid a sliced look.
      });
    }
  
    rafId = requestAnimationFrame(animateAmbient);
  }

  const onResize = () => resizeAmbientCanvas();
  window.addEventListener('resize', onResize);
  resizeAmbientCanvas();
  initEnvironment(getThemeKey());
  rafId = requestAnimationFrame(animateAmbient);

  return {
    init: initEnvironment,
    resize: resizeAmbientCanvas,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    }
  };
}

import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { PARTS, GROUPS, LATINO } from './data.js';

const $ = (s) => document.querySelector(s);
const byId = Object.fromEntries(PARTS.map((p) => [p.id, p]));
const LOBES = ['frontale', 'parietale', 'temporale', 'occipitale'];

// ---------- scena ----------
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.localClippingEnabled = true;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1824);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
const HOME = new THREE.Vector3(-3.6, 1.3, 2.4);
const TARGET = new THREE.Vector3(0, -0.25, -0.1);
camera.position.copy(HOME);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(TARGET);
controls.enableDamping = true;
controls.minDistance = 2.5;
controls.maxDistance = 9;
controls.autoRotateSpeed = 1.4;

scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(3, 4, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0x9fc4ff, 0.6);
fill.position.set(-4, -1, -3);
scene.add(fill);

const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -0.04); // tiene x <= -0.04
const mats = [];
const material = (color, opts = {}) => {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...opts });
  mats.push(m);
  return m;
};

// ---------- corteccia (forma anatomica semplificata, solchi ombreggiati) ----------
const cortexMeshes = [];
const cortexMat = material(0xffffff, { vertexColors: true, roughness: 0.75 });
const BRAIN_C = new THREE.Vector3(0, -0.05, -0.1);
const anchors = { frontale: [], parietale: [], temporale: [], occipitale: [] };
const ridge = (v) => 1 - Math.abs(Math.sin(v));

function hemisphere(side) {
  const g = new THREE.SphereGeometry(1, 160, 112);
  const p = g.attributes.position, n = p.count;
  const reg = new Uint8Array(n), shade = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // lobi: occipitale, temporale (sotto la scissura laterale), frontale (davanti al solco centrale), parietale
    reg[i] = z < -0.55 ? 3 : y < -0.2 - 0.25 * z && z < 0.62 ? 2 : z > 0.12 - 0.15 * y ? 0 : 1;
    const gy = ridge(11 * x + 3 * y + 2 * z) * ridge(9 * y - 4 * x + 5 * z) + 0.6 * ridge(17 * z + 6 * y) * ridge(14 * x + 5 * z);
    shade[i] = Math.min(1, gy / 1.2);
    const d = 1 + 0.05 * (gy - 0.7);
    let sx = Math.max(x * side, 0); // parete mediale piatta, lato laterale arrotondato
    let sy = y < 0 ? y * 0.6 : y; // base appiattita
    const temp = Math.exp(-(((z - 0.1) / 0.5) ** 2)) * Math.max(-y, 0); // rigonfiamento temporale
    sx *= 1 + 0.12 * temp;
    sy -= 0.2 * temp;
    if (z > 0.3) sx *= 1 - 0.3 * (z - 0.3); // polo frontale piu stretto
    if (z < -0.5) { sx *= 1 + 0.2 * (z + 0.5); sy *= 1 + 0.2 * (z + 0.5); }
    p.setXYZ(i, side * (0.03 + sx * 0.95 * d), sy * 0.78 * d, z * 1.2 * d);
  }
  g.computeVertexNormals();
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  // punto sulla superficie di ogni lobo dove ancorare l'etichetta
  const v = new THREE.Vector3();
  for (let r = 0; r < 4; r++) {
    const c = new THREE.Vector3();
    let k = 0;
    for (let i = 0; i < n; i++) if (reg[i] === r && Math.abs(p.getX(i)) > 0.25) { c.add(v.fromBufferAttribute(p, i)); k++; }
    c.divideScalar(k || 1);
    const dir = c.clone().sub(BRAIN_C).normalize();
    let best = -1e9, bv = c;
    for (let i = 0; i < n; i++) if (reg[i] === r) {
      v.fromBufferAttribute(p, i);
      const sc = v.clone().sub(BRAIN_C).dot(dir);
      if (sc > best) { best = sc; bv = v.clone(); }
    }
    anchors[LOBES[r]].push(bv);
  }
  const m = new THREE.Mesh(g, cortexMat);
  m.userData = { cortex: true, reg, shade };
  cortexMeshes.push(m);
  scene.add(m);
}
hemisphere(-1);
hemisphere(1);

function paint(sel) {
  const lobeSel = LOBES.includes(sel);
  const cols = LOBES.map((id) => new THREE.Color(byId[id].colore));
  const grey = new THREE.Color(0x56606c);
  for (const m of cortexMeshes) {
    const c = m.geometry.attributes.color, { reg, shade } = m.userData;
    for (let i = 0; i < reg.length; i++) {
      const on = !lobeSel || LOBES[reg[i]] === sel;
      const col = (on ? cols[reg[i]] : grey).clone().multiplyScalar((on && lobeSel ? 1.25 : 1) * (0.62 + 0.38 * shade[i]));
      c.setXYZ(i, col.r, col.g, col.b);
    }
    c.needsUpdate = true;
  }
}

// ---------- strutture profonde, tronco, cervelletto ----------
const picks = [...cortexMeshes];
const partMeshes = {};

function add(id, geom, pos, scale = [1, 1, 1], rot = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geom, material(byId[id].colore, { emissive: byId[id].colore, emissiveIntensity: 0, transparent: true }));
  mesh.position.set(...pos);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rot);
  mesh.userData.id = id;
  mesh.updateMatrixWorld();
  mesh.userData.center = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  scene.add(mesh);
  picks.push(mesh);
  (partMeshes[id] ||= []).push(mesh);
  return mesh;
}
const ball = () => new THREE.SphereGeometry(1, 40, 28);
const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 40, r, 14, false);

for (const s of [-1, 1]) {
  add('talamo', ball(), [s * 0.16, 0.02, -0.1], [0.12, 0.11, 0.2]);
  add('gangli', ball(), [s * 0.36, 0.1, 0.22], [0.13, 0.16, 0.28]);
  add('amigdala', ball(), [s * 0.42, -0.4, 0.3], [0.09, 0.09, 0.09]);
  add('ippocampo', tube([[s * 0.38, -0.38, 0.1], [s * 0.4, -0.42, -0.2], [s * 0.38, -0.3, -0.5], [s * 0.3, -0.1, -0.72]], 0.045), [0, 0, 0]);
}
add('ipotalamo', ball(), [0, -0.24, 0.12], [0.09, 0.08, 0.1]);
add('corpo_calloso', tube([[0, 0.14, 0.65], [0, 0.3, 0.45], [0, 0.37, 0.1], [0, 0.34, -0.4], [0, 0.18, -0.72]], 0.05), [0, 0, 0], [3, 1, 1]);

add('mesencefalo', new THREE.CylinderGeometry(0.13, 0.15, 0.3, 28), [0, -0.5, -0.28]);
add('ponte', ball(), [0, -0.76, -0.3], [0.24, 0.17, 0.2]);
add('bulbo', new THREE.CylinderGeometry(0.15, 0.09, 0.55, 28), [0, -1.1, -0.4], [1, 1, 1], [0.2, 0, 0]);

const cb = new THREE.SphereGeometry(1, 96, 64);
const cp = cb.attributes.position;
for (let i = 0; i < cp.count; i++) {
  const d = 1 + 0.05 * Math.sin(cp.getY(i) * 32);
  cp.setXYZ(i, cp.getX(i) * d, cp.getY(i), cp.getZ(i) * d);
}
cb.computeVertexNormals();
add('cervelletto', cb, [0, -0.72, -0.85], [0.6, 0.26, 0.36]);

// ---------- stato e interfaccia ----------
const state = { sel: null, cut: false };
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text; // solo textContent: nessun innerHTML
  return e;
};

function setOpacity(v) {
  cortexMat.opacity = v;
  cortexMat.transparent = v < 0.99;
  cortexMat.depthWrite = v > 0.9;
  cortexMat.needsUpdate = true;
  $('#op').value = v;
}

const notes = {};
let remote = true, timer;
async function saveNotes(st) {
  st.textContent = 'Salvataggio…';
  try {
    if (remote) {
      const r = await fetch('/api/notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notes) });
      if (!r.ok) throw new Error();
    } else localStorage.setItem('notes', JSON.stringify(notes));
    st.textContent = remote ? 'Salvato nel cloud' : 'Salvato solo su questo dispositivo';
  } catch { st.textContent = 'Errore di salvataggio: riprova'; }
}
async function loadNotes() {
  try {
    const r = await fetch('/api/notes');
    if (!r.ok) throw new Error();
    Object.assign(notes, await r.json());
  } catch {
    remote = false;
    try { Object.assign(notes, JSON.parse(localStorage.getItem('notes') || '{}')); } catch {}
  }
  if (state.sel) showInfo(byId[state.sel]);
}

function showInfo(p) {
  const box = $('#info');
  const ta = el('textarea', 'note');
  ta.value = notes[p.id] || '';
  ta.maxLength = 5000;
  ta.placeholder = 'Scrivi qui i tuoi appunti su questa struttura';
  ta.setAttribute('aria-label', 'Appunti su ' + p.nome);
  const st = el('p', 'hint', '');
  ta.addEventListener('input', () => {
    notes[p.id] = ta.value;
    st.textContent = 'Modifica in corso…';
    clearTimeout(timer);
    timer = setTimeout(() => saveNotes(st), 800);
  });
  box.replaceChildren(
    el('span', 'tag', GROUPS.find((g) => g.id === p.gruppo).nome),
    el('h2', '', p.nome),
    el('p', 'tag', LATINO[p.id]),
    el('h3', '', 'Funzione'), el('p', '', p.funzione),
    el('h3', '', 'Anatomia e dettagli'), el('p', '', p.dettagli),
    el('h3', '', 'Clinica e storia della ricerca'), el('p', '', p.clinica),
    el('h3', '', 'I miei appunti'), ta, st,
    el('p', 'src', 'Terminologia: Terminologia Anatomica. Per approfondire: Kandel et al., Principi di neuroscienze; Purves et al., Neuroscience.'),
  );
  box.style.setProperty('--c', p.colore);
  box.scrollTop = 0;
}

function select(id) {
  const p = byId[id];
  if (!p) return;
  state.sel = id;
  paint(id);
  styleParts(id);
  if (p.deep && cortexMat.opacity > 0.5) setOpacity(0.15);
  if (!state.cut) focusOn(id);
  setTag(p);
  document.querySelectorAll('.item').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
  showInfo(p);
}

// elenco laterale
const items = $('#items');
for (const g of GROUPS) {
  items.append(el('div', 'grp', g.nome));
  for (const p of PARTS.filter((x) => x.gruppo === g.id)) {
    const b = el('button', 'item');
    b.type = 'button';
    b.dataset.id = p.id;
    b.style.setProperty('--c', p.colore);
    const dot = el('span', 'dot');
    dot.style.background = p.colore;
    b.append(dot, el('span', '', p.nome));
    b.addEventListener('click', () => select(p.id));
    items.append(b);
  }
}
$('#q').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.item').forEach((b) => (b.hidden = q && !byId[b.dataset.id].nome.toLowerCase().includes(q)));
});

// comandi
$('#op').addEventListener('input', (e) => setOpacity(Number(e.target.value)));
$('#rot').addEventListener('click', (e) => {
  controls.autoRotate = !controls.autoRotate;
  e.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate));
});
$('#cut').addEventListener('click', (e) => {
  state.cut = !state.cut;
  e.currentTarget.setAttribute('aria-pressed', String(state.cut));
  for (const m of mats) {
    m.clippingPlanes = state.cut ? [cutPlane] : [];
    m.side = state.cut ? THREE.DoubleSide : THREE.FrontSide;
    m.needsUpdate = true;
  }
  if (state.cut) camera.position.set(3.6, 0.5, 1.2); // guarda la faccia tagliata
  else camera.position.copy(HOME);
  controls.target.copy(TARGET);
});
$('#reset').addEventListener('click', () => {
  camera.position.copy(HOME);
  controls.target.copy(TARGET);
});

// selezione con click/tap (ignora i trascinamenti)
const ray = new THREE.Raycaster();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  for (const h of ray.intersectObjects(picks, false)) {
    if (state.cut && h.point.x > -0.04) continue; // parte tagliata: invisibile
    const o = h.object;
    if (o.userData.cortex) {
      if (cortexMat.opacity < 0.5) continue; // corteccia trasparente: non selezionabile
      select(LOBES[o.userData.reg[h.face.a]]);
    } else select(o.userData.id);
    return;
  }
});

// dimensioni e ciclo di rendering
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

paint(null);
loadNotes();
const tag = el('div', 'tag3d');
tag.hidden = true;
$('#view').append(tag);
function setTag(p) {
  tag.replaceChildren(el('b', '', p.nome), el('span', '', LATINO[p.id]));
  tag.style.setProperty('--c', p.colore);
  tag.hidden = false;
}
const nearest = (pts) => pts.reduce((a, b) => (a.distanceTo(camera.position) < b.distanceTo(camera.position) ? a : b));
const pointsOf = (id) => (LOBES.includes(id) ? anchors[id] : partMeshes[id].map((m) => m.userData.center));

// la parte scelta resta visibile anche attraverso la corteccia, le altre si attenuano
function styleParts(sel) {
  const partSel = sel && !LOBES.includes(sel);
  for (const [pid, arr] of Object.entries(partMeshes)) {
    for (const m of arr) {
      const on = pid === sel, mt = m.material;
      mt.opacity = partSel && !on ? 0.18 : 1;
      mt.depthWrite = mt.opacity === 1;
      mt.depthTest = !on;
      mt.emissiveIntensity = 0;
      m.renderOrder = on ? 10 : 0;
    }
  }
}

let fly = null;
controls.addEventListener('start', () => (fly = null));
function focusOn(id) {
  const t = nearest(pointsOf(id)).clone();
  const sign = camera.position.x >= 0 ? 1 : -1;
  const dir = t.clone().sub(BRAIN_C);
  let dist = 4.2, tgt = t.clone().lerp(BRAIN_C, 0.5);
  if (!LOBES.includes(id)) { dir.set(sign * 0.9, dir.y * 0.4 + 0.25, dir.z * 0.3); dist = 3.4; tgt = t; }
  fly = { pos: t.clone().add(dir.normalize().multiplyScalar(dist)), tgt };
}

const v3 = new THREE.Vector3();
renderer.setAnimationLoop((now) => {
  if (fly) {
    camera.position.lerp(fly.pos, 0.07);
    controls.target.lerp(fly.tgt, 0.07);
    if (camera.position.distanceTo(fly.pos) < 0.02) fly = null;
  }
  controls.update();
  const s = state.sel;
  if (s && partMeshes[s]) for (const m of partMeshes[s]) m.material.emissiveIntensity = 0.45 + 0.3 * Math.sin(now / 250);
  if (s) {
    v3.copy(nearest(pointsOf(s))).project(camera);
    tag.style.left = (v3.x * 0.5 + 0.5) * stage.clientWidth + 'px';
    tag.style.top = (-v3.y * 0.5 + 0.5) * stage.clientHeight + 'px';
  }
  renderer.render(scene, camera);
});

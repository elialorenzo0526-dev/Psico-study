import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { PARTS, GROUPS, LATINO } from './data.js';

const $ = (s) => document.querySelector(s);
const byId = Object.fromEntries(PARTS.map((p) => [p.id, p]));
const isLobe = (id) => byId[id]?.gruppo === 'cortex';
const mobile = () => matchMedia('(max-width:900px)').matches;
let LOBES = [];

// ---------- scena ----------
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer:coarse)').matches ? 1.5 : 2));
renderer.localClippingEnabled = true;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1824);
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
const HOME = new THREE.Vector3(-3.3, 1.2, 2.6);
const C0 = new THREE.Vector3(0, 0, 0);
camera.position.copy(HOME);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 1.6;
controls.maxDistance = 9;
controls.autoRotateSpeed = 1.4;
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(3, 4, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0x9fc4ff, 0.6);
fill.position.set(-4, -1, -3);
scene.add(fill);

const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0); // tiene x <= 0
const mats = [];
const cortexMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
const cortexMeshes = [], partMeshes = {}, picks = [], anchors = {};

// ---------- modello reale (cortex fsaverage + strutture da atlante FreeSurfer) ----------
async function load() {
  const [man, buf] = await Promise.all([fetch('/model/brain.json').then((r) => r.json()), fetch('/model/brain.bin').then((r) => r.arrayBuffer())]);
  LOBES = man.lobes;
  for (const it of man.items) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, it.off, it.nv * 3), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, it.off + it.nv * 12, it.nf * 3), 1));
    g.computeVertexNormals();
    if (it.kind === 'cortex') {
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(it.nv * 3), 3));
      const m = new THREE.Mesh(g, cortexMat);
      m.userData = { cortex: true, side: it.side, reg: new Uint8Array(buf, it.ex[0], it.nv), sulc: new Uint8Array(buf, it.ex[1], it.nv) };
      cortexMeshes.push(m); picks.push(m); scene.add(m);
    } else {
      const mt = new THREE.MeshStandardMaterial({ color: byId[it.id].colore, emissive: byId[it.id].colore, emissiveIntensity: 0, roughness: 0.5, transparent: true });
      mats.push(mt);
      const m = new THREE.Mesh(g, mt);
      m.userData = { id: it.id, side: it.side };
      scene.add(m); m.updateMatrixWorld();
      m.userData.center = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
      (partMeshes[it.id] ||= []).push(m); picks.push(m);
    }
  }
  // punto di superficie di ogni lobo, dove ancorare l'etichetta
  const v = new THREE.Vector3();
  for (const m of cortexMeshes) {
    const p = m.geometry.attributes.position, reg = m.userData.reg;
    LOBES.forEach((name, r) => {
      const c = new THREE.Vector3(); let k = 0;
      for (let i = 0; i < reg.length; i++) if (reg[i] === r) { c.add(v.fromBufferAttribute(p, i)); k++; }
      c.divideScalar(k || 1);
      const dir = c.clone().normalize();
      let best = -1e9, bv = c;
      for (let i = 0; i < reg.length; i++) if (reg[i] === r) { v.fromBufferAttribute(p, i); const sc = v.dot(dir); if (sc > best) { best = sc; bv = v.clone(); } }
      (anchors[name] ||= []).push(bv);
    });
  }
  paint(state.sel);
  $('#info .hint')?.replaceChildren('Tocca una zona del cervello nel modello o scegli una voce dall\'elenco.');
}

function paint(sel) {
  const lobeSel = isLobe(sel);
  const cols = LOBES.map((id) => new THREE.Color(byId[id].colore));
  const grey = new THREE.Color(0x56606c);
  for (const m of cortexMeshes) {
    const c = m.geometry.attributes.color, { reg, sulc } = m.userData;
    for (let i = 0; i < reg.length; i++) {
      const on = !lobeSel || LOBES[reg[i]] === sel;
      const k = (on && lobeSel ? 1.25 : 1) * (0.5 + 0.5 * (1 - sulc[i] / 255)); // solchi piu scuri
      const col = (on ? cols[reg[i]] : grey).clone().multiplyScalar(k);
      c.setXYZ(i, col.r, col.g, col.b);
    }
    c.needsUpdate = true;
  }
}

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

let plane = 'sagittale';
function gallery(p) {
  const box = el('div', 'gal'), img = el('img'), bar = el('div', 'gtabs');
  const set = (pl) => {
    plane = pl;
    img.src = `/img/${p.id}_${pl}.jpg`;
    img.alt = `Sezione ${pl} di risonanza magnetica con ${p.nome} evidenziata`;
    bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pl === pl)));
  };
  for (const pl of ['sagittale', 'coronale', 'assiale']) {
    const b = el('button', '', pl[0].toUpperCase() + pl.slice(1));
    b.type = 'button';
    b.dataset.pl = pl;
    b.addEventListener('click', () => set(pl));
    bar.append(b);
  }
  img.addEventListener('click', () => { const d = $('#zoom'); d.querySelector('img').src = img.src; d.showModal(); });
  box.append(img, bar, el('p', 'cap', 'Risonanza magnetica di un cervello standard con la struttura in colore. S = sinistra, D = destra, A = anteriore, P = posteriore. Tocca l\'immagine per ingrandirla.'));
  set(plane);
  return box;
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
    gallery(p),
    el('h3', '', 'Funzione'), el('p', '', p.funzione),
    el('h3', '', 'Anatomia e dettagli'), el('p', '', p.dettagli),
    el('h3', '', 'Clinica e storia della ricerca'), el('p', '', p.clinica),
    el('h3', '', 'I miei appunti'), ta, st,
    el('p', 'src', 'Terminologia: Terminologia Anatomica. Immagini: template MRI MNI152 (ICBM 2009) con atlante Desikan-Killiany. Modello 3D ricostruito da dati di neuroimaging (superficie FreeSurfer fsaverage, atlante Desikan-Killiany); ipotalamo e suddivisione del tronco encefalico sono approssimati. Per approfondire: Kandel et al., Principi di neuroscienze; Purves et al., Neuroscience.'),
  );
  box.style.setProperty('--c', p.colore);
  box.scrollTop = 0;
}

function select(id, fromList) {
  const p = byId[id];
  if (!p) return;
  state.sel = id;
  paint(id);
  styleParts(id);
  if ((p.deep || id === 'insula' || id === 'cingolato') && cortexMat.opacity > 0.5) setOpacity(p.deep ? 0.15 : 0.3);
  if (!state.cut) focusOn(id);
  setTag(p);
  document.querySelectorAll('.item').forEach((b) => b.setAttribute('aria-current', String(b.dataset.id === id)));
  showInfo(p);
  if (fromList && mobile()) $('#info').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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
    b.addEventListener('click', () => select(p.id, true));
    items.append(b);
  }
}
$('#q').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll('.item').forEach((b) => (b.hidden = q && !byId[b.dataset.id].nome.toLowerCase().includes(q)));
});

// ---------- evidenziazione, etichetta 3D, camera ----------
const tag = el('div', 'tag3d');
tag.hidden = true;
$('#view').append(tag);
function setTag(p) {
  tag.replaceChildren(el('b', '', p.nome), el('span', '', LATINO[p.id]));
  tag.style.setProperty('--c', p.colore);
  tag.hidden = false;
}
const visible = (arr) => arr.filter((m) => m.visible !== false);
const pointsOf = (id) => (isLobe(id) ? (anchors[id] || []).filter((_, i) => !state.cut || cortexMeshes[i].visible) : visible(partMeshes[id] || []).map((m) => m.userData.center));
const nearest = (pts) => pts.reduce((a, b) => (a.distanceTo(camera.position) < b.distanceTo(camera.position) ? a : b), pts[0] || C0);

function styleParts(sel) {
  const partSel = sel && !isLobe(sel);
  for (const [pid, arr] of Object.entries(partMeshes)) for (const m of arr) {
    const on = pid === sel, mt = m.material;
    mt.opacity = partSel && !on ? 0.18 : 1;
    mt.depthWrite = mt.opacity === 1;
    mt.depthTest = !on;
    mt.emissiveIntensity = 0;
    m.renderOrder = on ? 10 : 0;
  }
}
let fly = null;
controls.addEventListener('start', () => (fly = null));
function focusOn(id) {
  const t = nearest(pointsOf(id)).clone();
  const sign = camera.position.x >= 0 ? 1 : -1;
  const dir = t.clone();
  let dist = 4, tgt = t.clone().multiplyScalar(0.5);
  if (!isLobe(id)) { dir.set(sign * 0.9, dir.y * 0.4 + 0.25, dir.z * 0.3); dist = 2.8; tgt = t; }
  fly = { pos: t.clone().add(dir.normalize().multiplyScalar(dist)), tgt };
}

// ---------- comandi ----------
$('#op').addEventListener('input', (e) => setOpacity(Number(e.target.value)));
$('#rot').addEventListener('click', (e) => {
  controls.autoRotate = !controls.autoRotate;
  e.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate));
});
$('#cut').addEventListener('click', () => {
  state.cut = !state.cut;
  $('#cut').setAttribute('aria-pressed', String(state.cut));
  for (const m of [...cortexMeshes, ...Object.values(partMeshes).flat()]) if (m.userData.side > 0) m.visible = !state.cut;
  for (const mt of mats) { mt.clippingPlanes = state.cut ? [cutPlane] : []; mt.side = state.cut ? THREE.DoubleSide : THREE.FrontSide; mt.needsUpdate = true; }
  fly = { pos: state.cut ? new THREE.Vector3(3.4, 0.4, 0.8) : HOME.clone(), tgt: C0.clone() };
});
$('#reset').addEventListener('click', () => { fly = { pos: HOME.clone(), tgt: C0.clone() }; });

$('#views').addEventListener('change', (e) => {
  const d = { l: [1, 0, 0], r: [-1, 0, 0], t: [0, 1, 0.001], b: [0, -1, 0.001], f: [0, 0, 1], p: [0, 0, -1] }[e.target.value];
  if (d) fly = { pos: new THREE.Vector3(...d).multiplyScalar(4.2), tgt: C0.clone() };
  e.target.value = '';
});
$('#zoom').addEventListener('click', () => $('#zoom').close());
const ray = new THREE.Raycaster();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  for (const h of ray.intersectObjects(picks, false)) {
    const o = h.object;
    if (!o.visible || (state.cut && !o.userData.cortex && h.point.x > 0.001)) continue;
    if (o.userData.cortex) {
      if (cortexMat.opacity < 0.5) continue;
      const lobe = LOBES[o.userData.reg[h.face.a]];
      if (lobe) select(lobe);
    } else select(o.userData.id);
    return;
  }
});

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

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
  if (s && !tag.hidden) {
    const pts = pointsOf(s);
    if (pts.length) {
      v3.copy(nearest(pts)).project(camera);
      tag.style.left = Math.min(Math.max((v3.x * 0.5 + 0.5) * stage.clientWidth, 70), stage.clientWidth - 70) + 'px';
      tag.style.top = Math.max((-v3.y * 0.5 + 0.5) * stage.clientHeight, 60) + 'px';
    }
  }
  renderer.render(scene, camera);
});

$('#info .hint').textContent = 'Caricamento del modello…';
load().catch(() => { $('#info .hint').textContent = 'Impossibile caricare il modello 3D. Ricarica la pagina.'; });
loadNotes();

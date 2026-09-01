import * as THREE from 'three';
import { COLORS, READING_NOOK } from './config.js';
import { createLabel } from './label.js';

// ---------------------------------------------------------------------------
// Construtores de obstáculos (todos retornam um grupo centrado na origem; a
// posição/rotação é aplicada por buildScenarioObstacles a partir do cenário).
// ---------------------------------------------------------------------------

// Pessoa em pé simplificada.
function standingPerson() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x8b95a1, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.5, 4, 8), mat);
  torso.position.y = 1.05;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), mat);
  head.position.y = 1.58;
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.75, 8), mat);
  legs.position.y = 0.42;
  group.add(torso, head, legs);
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

// Mesa de estudo em madeira, com livros sobre o tampo (como no vídeo de
// referência da biblioteca).
function studyDesk() {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.75 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.7), woodMat);
  top.position.y = 0.74;
  group.add(top);

  const legGeo = new THREE.BoxGeometry(0.06, 0.72, 0.06);
  [[0.42, -0.29], [-0.42, -0.29], [0.42, 0.29], [-0.42, 0.29]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(x, 0.36, z);
    group.add(leg);
  });

  // Livros sobre o tampo
  const bookA = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.05, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x2f4858, roughness: 0.8 })
  );
  bookA.position.set(-0.18, 0.79, 0.05);
  bookA.rotation.y = 0.25;
  const bookB = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.07, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x8c3b3b, roughness: 0.8 })
  );
  bookB.position.set(0.2, 0.8, -0.08);
  bookB.rotation.y = -0.35;
  group.add(bookA, bookB);

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

// Duas pessoas lado a lado, conversando.
function personPair() {
  const group = new THREE.Group();
  const a = standingPerson();
  a.position.set(-0.45, 0, 0.05);
  a.rotation.y = 0.5;
  const b = standingPerson();
  b.position.set(0.45, 0, -0.05);
  b.rotation.y = -0.6;
  group.add(a, b);
  return group;
}

// Caixa de papelão no chão.
function cardboardBox() {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.5, 0.55),
    new THREE.MeshStandardMaterial({ color: COLORS.obstacleWood, roughness: 0.85 })
  );
  box.position.y = 0.25;
  box.rotation.y = 0.25;
  box.castShadow = true;
  box.receiveShadow = true;
  const group = new THREE.Group();
  group.add(box);
  return group;
}

// Cadeira simples de madeira.
function chair() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.obstacleWood, roughness: 0.8 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), mat);
  seat.position.y = 0.45;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.05), mat);
  back.position.set(0, 0.7, -0.2);
  group.add(seat, back);
  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6);
  [[0.18, -0.18], [-0.18, -0.18], [0.18, 0.18], [-0.18, 0.18]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, mat);
    leg.position.set(x, 0.225, z);
    group.add(leg);
  });
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

// Carrinho (estrutura em barras finas + rodas), tipo carrinho de transporte.
function cart() {
  const group = new THREE.Group();
  const barMat = new THREE.MeshStandardMaterial({ color: COLORS.obstacleMetal, roughness: 0.4, metalness: 0.6 });

  const w = 0.55, h = 0.5, d = 0.8, y0 = 0.55;
  const edges = [
    [[-w / 2, y0, -d / 2], [-w / 2, y0 + h, -d / 2]],
    [[w / 2, y0, -d / 2], [w / 2, y0 + h, -d / 2]],
    [[-w / 2, y0, d / 2], [-w / 2, y0 + h, d / 2]],
    [[w / 2, y0, d / 2], [w / 2, y0 + h, d / 2]],
    [[-w / 2, y0 + h, -d / 2], [w / 2, y0 + h, -d / 2]],
    [[w / 2, y0 + h, -d / 2], [w / 2, y0 + h, d / 2]],
    [[w / 2, y0 + h, d / 2], [-w / 2, y0 + h, d / 2]],
    [[-w / 2, y0 + h, d / 2], [-w / 2, y0 + h, -d / 2]],
    [[-w / 2, y0, -d / 2], [w / 2, y0, -d / 2]],
    [[w / 2, y0, -d / 2], [w / 2, y0, d / 2]],
    [[w / 2, y0, d / 2], [-w / 2, y0, d / 2]],
    [[-w / 2, y0, d / 2], [-w / 2, y0, -d / 2]],
  ];
  const points = [];
  edges.forEach(([a, b]) => points.push(new THREE.Vector3(...a), new THREE.Vector3(...b)));
  const basket = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: COLORS.obstacleMetal })
  );
  group.add(basket);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, w, 8), barMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, y0 + h + 0.15, d / 2 + 0.1);
  group.add(handle);
  [-w / 2, w / 2].forEach((x) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8), barMat);
    post.position.set(x, y0 + h + 0.05, d / 2 + 0.1);
    group.add(post);
  });

  const wheelGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.03, 12);
  [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].forEach(([x, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, new THREE.MeshStandardMaterial({ color: 0x2b2f33 }));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.07, z);
    wheel.castShadow = true;
    group.add(wheel);
  });
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

// --- Objetos típicos de supermercado ---------------------------------------

// Expositor promocional (ilha de produtos no meio do corredor).
function promoDisplay() {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xb8452f, roughness: 0.8 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.7), baseMat);
  base.position.y = 0.375;
  group.add(base);

  // Placa de preço no topo
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.3, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xe8c33f, roughness: 0.7 })
  );
  sign.position.set(0, 1.35, 0);
  group.add(sign);

  const signPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.4, 8),
    new THREE.MeshStandardMaterial({ color: COLORS.obstacleMetal, metalness: 0.5 })
  );
  signPost.position.set(0, 1.0, 0);
  group.add(signPost);

  // Produtos empilhados sobre a base
  const prodMats = COLORS.productColors.slice(0, 4).map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 })
  );
  let n = 0;
  [-0.22, 0.22].forEach((x) => {
    [-0.15, 0.15].forEach((z) => {
      const item = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.22), prodMats[n % 4]);
      item.position.set(x, 0.84, z);
      group.add(item);
      n++;
    });
  });

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

// Palete de reposição com caixas empilhadas.
function restockPallet() {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x9a7b52, roughness: 0.9 });
  const boxMat = new THREE.MeshStandardMaterial({ color: COLORS.obstacleWood, roughness: 0.85 });

  // Estrado
  [-0.32, 0, 0.32].forEach((z) => {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.16), woodMat);
    plank.position.set(0, 0.04, z);
    group.add(plank);
  });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.8), woodMat);
  deck.position.y = 0.1;
  group.add(deck);

  // Caixas empilhadas em duas fileiras
  const layout = [
    [-0.24, 0.26, -0.18], [0.24, 0.26, -0.18],
    [-0.24, 0.26, 0.2], [0.24, 0.26, 0.2],
    [-0.1, 0.58, 0], [0.26, 0.58, 0.05],
  ];
  layout.forEach(([x, y, z]) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.36), boxMat);
    box.position.set(x, y, z);
    box.rotation.y = (Math.random() - 0.5) * 0.2;
    group.add(box);
  });

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

// --- Objetos típicos de via pública (ambiente externo) ---------------------

// Lixeira pública sobre suporte.
function trashBin() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.binBody, roughness: 0.7 });
  const metalMat = new THREE.MeshStandardMaterial({ color: COLORS.obstacleMetal, roughness: 0.5, metalness: 0.5 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.7, 14), bodyMat);
  body.position.y = 0.62;
  group.add(body);

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 14), metalMat);
  lid.position.y = 1.0;
  group.add(lid);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), metalMat);
  post.position.y = 0.15;
  group.add(post);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10), metalMat);
  base.position.y = 0.02;
  group.add(base);

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

// Bicicleta estacionada (vista simplificada, de perfil).
function bicycle() {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: COLORS.bikeFrame, roughness: 0.45, metalness: 0.4 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x22262a, roughness: 0.8 });

  const wheelGeo = new THREE.TorusGeometry(0.33, 0.035, 8, 20);
  [-0.52, 0.52].forEach((z) => {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0.33, z);
    group.add(wheel);
  });

  // Quadro: barras ligando os eixos ao selim/guidão
  const barGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 8);
  const bars = [
    { pos: [0, 0.55, 0], rot: [Math.PI / 2, 0, 0], len: 0.95 },   // barra superior
    { pos: [0, 0.36, 0.1], rot: [1.15, 0, 0], len: 0.72 },        // diagonal
    { pos: [0, 0.5, 0.45], rot: [0.35, 0, 0], len: 0.5 },         // tubo do guidão
    { pos: [0, 0.48, -0.4], rot: [-0.4, 0, 0], len: 0.42 },       // tubo do selim
  ];
  bars.forEach(({ pos, rot, len }) => {
    const bar = new THREE.Mesh(barGeo, frameMat);
    bar.scale.y = len;
    bar.position.set(...pos);
    bar.rotation.set(...rot);
    group.add(bar);
  });

  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8), frameMat);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, 0.7, 0.55);
  group.add(handlebar);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.24), tireMat);
  seat.position.set(0, 0.68, -0.48);
  group.add(seat);

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

// Placa de sinalização/rua sobre poste.
function streetSign() {
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: COLORS.signPost, roughness: 0.5, metalness: 0.5 });

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 10), postMat);
  post.position.y = 1.05;
  group.add(post);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.06, 12), postMat);
  base.position.y = 0.03;
  group.add(base);

  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.3, 0.03),
    new THREE.MeshStandardMaterial({ color: COLORS.signPlate, roughness: 0.5 })
  );
  plate.position.y = 1.95;
  group.add(plate);

  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.54, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xf0efe9, roughness: 0.7 })
  );
  stripe.position.set(0, 1.95, 0.018);
  group.add(stripe);

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

// Conjunto de cones de obra com uma barra de sinalização.
function trafficCones() {
  const group = new THREE.Group();
  const coneMat = new THREE.MeshStandardMaterial({ color: COLORS.coneOrange, roughness: 0.7 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf0efe9, roughness: 0.7 });

  [-0.45, 0.1, 0.55].forEach((x, i) => {
    const cone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.55, 12), coneMat);
    body.position.y = 0.3;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), coneMat);
    base.position.y = 0.02;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.096, 0.115, 0.09, 12), stripeMat);
    stripe.position.y = 0.32;
    cone.add(body, base, stripe);
    cone.position.set(x, 0, (i % 2) * 0.35 - 0.17);
    group.add(cone);
  });

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return group;
}

// Banca / quiosque de rua: balcão com toldo.
function kiosk() {
  const group = new THREE.Group();
  const structMat = new THREE.MeshStandardMaterial({ color: COLORS.obstacleMetal, roughness: 0.5, metalness: 0.4 });
  const counterMat = new THREE.MeshStandardMaterial({ color: COLORS.obstacleWood, roughness: 0.8 });
  const canvasMat = new THREE.MeshStandardMaterial({ color: COLORS.kioskCanvas, roughness: 0.85 });

  // Balcão
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.6), counterMat);
  counter.position.y = 0.95;
  group.add(counter);

  const front = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 0.05), counterMat);
  front.position.set(0, 0.48, 0.28);
  group.add(front);

  // Postes e toldo
  [-0.6, 0.6].forEach((x) => {
    [-0.25, 0.25].forEach((z) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 8), structMat);
      post.position.set(x, 1.05, z);
      group.add(post);
    });
  });

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.85), canvasMat);
  canopy.position.y = 2.12;
  canopy.rotation.x = 0.06;
  group.add(canopy);

  // Caixas de mercadoria sobre o balcão
  [-0.35, 0.25].forEach((x, i) => {
    const item = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.16, 0.24),
      new THREE.MeshStandardMaterial({ color: i ? 0x3b5a6b : 0x7a4b6b, roughness: 0.8 })
    );
    item.position.set(x, 1.06, -0.05);
    group.add(item);
  });

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

// Mapeia o id do tipo (ver OBSTACLE_TYPES em config.js) para o construtor.
const OBSTACLE_BUILDERS = {
  mesa: studyDesk,
  'duas-pessoas': personPair,
  pessoa: standingPerson,
  caixa: cardboardBox,
  cadeira: chair,
  carrinho: cart,
  expositor: promoDisplay,
  palete: restockPallet,
  banca: kiosk,
  lixeira: trashBin,
  bicicleta: bicycle,
  placa: streetSign,
  cones: trafficCones,
};

// Constrói os obstáculos de um cenário dentro do grupo dado.
export function buildScenarioObstacles(group, scenario) {
  (scenario.obstacles || []).forEach((spec) => {
    const builder = OBSTACLE_BUILDERS[spec.type];
    if (!builder) return;
    const obj = builder();
    obj.position.set(...spec.pos);
    obj.rotation.y = spec.rotY || 0;
    group.add(obj);

    if (spec.label) {
      const label = createLabel(spec.label, 'muted');
      label.position.set(0, 1.75, 0);
      obj.add(label);
    }
  });
}

// ---------------------------------------------------------------------------
// Decoração fixa do ambiente (fora da faixa dos cenários): banquinho de
// madeira e recanto de leitura junto à janela, como no vídeo de referência.
// ---------------------------------------------------------------------------

function createLatticeTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#' + COLORS.stoolWood.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(60,40,20,0.55)';
  ctx.lineWidth = 3;
  const step = size / 6;
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function stool() {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.stoolWood, roughness: 0.8 });
  const topMats = [woodMat, woodMat, woodMat, woodMat,
    new THREE.MeshStandardMaterial({ map: createLatticeTexture(), roughness: 0.9 }),
    woodMat,
  ];
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.36), topMats);
  top.position.y = 0.4;
  top.castShadow = true;
  group.add(top);

  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8);
  [[0.14, -0.14], [-0.14, -0.14], [0.14, 0.14], [-0.14, 0.14]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(x, 0.19, z);
    leg.castShadow = true;
    group.add(leg);
  });
  return group;
}

// Banco/mesa tubular vermelho do recanto de leitura junto à janela.
function tubeBench({ isTable = false } = {}) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: COLORS.furnitureRed, roughness: 0.35, metalness: 0.4 });
  const topW = isTable ? 0.6 : 0.85, topD = isTable ? 0.6 : 0.42;
  const seatY = 0.42;

  const top = new THREE.Mesh(new THREE.BoxGeometry(topW, 0.04, topD), frameMat);
  top.position.y = seatY;
  top.castShadow = true;
  group.add(top);

  if (!isTable) {
    const back = new THREE.Mesh(new THREE.BoxGeometry(topW, 0.32, 0.04), frameMat);
    back.position.set(0, seatY + 0.18, -topD / 2);
    back.rotation.x = -0.15;
    back.castShadow = true;
    group.add(back);
  }

  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, seatY, 10);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const leg = new THREE.Mesh(legGeo, frameMat);
    leg.position.set((sx * topW) / 2 - sx * 0.05, seatY / 2, (sz * topD) / 2 - sz * 0.05);
    leg.castShadow = true;
    group.add(leg);
  });
  return group;
}

function seatedPerson() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2f3b44, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.36, 4, 8), mat);
  torso.position.y = 0.78;
  torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), mat);
  head.position.y = 1.24;
  head.castShadow = true;
  group.add(torso, head);

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.28, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x1c2128, roughness: 0.8 })
  );
  backpack.position.set(-0.3, 0.55, 0.05);
  backpack.castShadow = true;
  group.add(backpack);
  return group;
}

function readingNook({ pos, rotY = 0 }) {
  const group = new THREE.Group();
  const table = tubeBench({ isTable: true });
  group.add(table);

  const benchA = tubeBench({ isTable: false });
  benchA.position.set(0, 0, 0.55);
  benchA.rotation.y = Math.PI;
  group.add(benchA);

  const benchB = tubeBench({ isTable: false });
  benchB.position.set(0, 0, -0.55);
  group.add(benchB);

  const person = seatedPerson();
  person.position.set(0, 0, -0.5);
  group.add(person);

  group.position.set(...pos);
  group.rotation.y = rotY;
  return group;
}

// Decoração da biblioteca (não participa dos cenários; fica fora da faixa de
// caminhada). Recebe o grupo do ambiente para ser removida junto com ele.
export function buildDecor(parent) {
  const stoolObj = stool();
  stoolObj.position.set(-1.7, 0, 30);
  stoolObj.rotation.y = 0.4;
  parent.add(stoolObj);

  const nookObj = readingNook(READING_NOOK);
  parent.add(nookObj);
}

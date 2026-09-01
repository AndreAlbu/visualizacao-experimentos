import * as THREE from 'three';
import {
  COLORS,
  DIM,
  DOORS_LEFT_Z,
  DOORS_RIGHT_Z,
  CEILING_LIGHTS_Z,
} from './config.js';
import { buildDecor } from './obstacles.js';

// ---------------------------------------------------------------------------
// Ambientes do experimento. Todos compartilham a mesma largura útil de
// caminhada (DIM.corridorWidth) e o mesmo comprimento, de modo que os
// cenários, trajetórias e obstáculos funcionam igualmente em qualquer um:
//
//   biblioteca -> corredor entre estantes (vídeo de referência)
//   corredor   -> corredor institucional de paredes lisas (escola/prédio)
//   calcada    -> ambiente externo, calçada com fachada e rua
// ---------------------------------------------------------------------------

function hex(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

// Textura procedural de grade (piso em placas, calçada em lajotas...).
function createGridTexture(baseColor, lineColor, tiles, repeatX, repeatY, lineWidth = 2) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = hex(baseColor);
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = hex(lineColor);
  ctx.lineWidth = lineWidth;
  const step = size / tiles;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Textura sutil de laje/deck metálico corrugado para o teto da biblioteca.
function createRibbedTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = hex(COLORS.ceiling);
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = hex(COLORS.ceilingRib);
  ctx.lineWidth = 3;
  const ribs = 14;
  for (let i = 0; i < ribs; i++) {
    const x = (i / ribs) * size;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, DIM.corridorLength / 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Porta de passagem embutida na parede/estante.
function addDoor(group, x, z, facing, height = DIM.shelfHeight) {
  const doorGroup = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: COLORS.doorFrame, roughness: 0.8 });
  const panelMat = new THREE.MeshStandardMaterial({ color: COLORS.doorPanel, roughness: 0.6 });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, height + 0.15, 1.3), frameMat);
  frame.position.set(x, (height + 0.15) / 2, z);
  doorGroup.add(frame);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.05, height - 0.05, 1.1), panelMat);
  panel.position.set(x + facing * 0.05, (height - 0.05) / 2, z);
  doorGroup.add(panel);

  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshStandardMaterial({ color: COLORS.obstacleMetal })
  );
  handle.position.set(x + facing * 0.08, 1.05, z + 0.45);
  doorGroup.add(handle);

  group.add(doorGroup);
}

// Luminária de teto em tubo + luz pontual.
function addCeilingLight(group, z, { width = DIM.corridorWidth * 0.7, y = DIM.corridorHeight - 0.08, castShadow = false } = {}) {
  const fixture = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.06, 0.16),
    new THREE.MeshStandardMaterial({
      color: COLORS.fixture,
      emissive: COLORS.fixture,
      emissiveIntensity: 0.8,
      roughness: 0.4,
    })
  );
  fixture.position.set(0, y, z);
  group.add(fixture);

  const light = new THREE.PointLight(0xfff6df, 6, 9, 2);
  light.position.set(0, y - 0.22, z);
  light.castShadow = castShadow;
  if (castShadow) {
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 15;
  }
  group.add(light);
}

// Iluminação interna comum aos ambientes fechados.
function addIndoorLighting(group) {
  const shadowZ = CEILING_LIGHTS_Z[Math.floor(CEILING_LIGHTS_Z.length / 2)];
  CEILING_LIGHTS_Z.forEach((z) => addCeilingLight(group, z, { castShadow: z === shadowZ }));
  group.add(new THREE.AmbientLight(0xffffff, 0.5));
  group.add(new THREE.HemisphereLight(0xeef0ec, 0x2a2e33, 0.4));
}

// ---------------------------------------------------------------------------
// Ambiente 1: biblioteca (corredor entre estantes)
// ---------------------------------------------------------------------------

// Calcula os trechos contínuos (sem porta) ao longo do corredor para um lado.
function computeSegments(length, doorZs, gapHalfWidth = 0.8, margin = 0.4) {
  const cuts = doorZs.map((z) => [z - gapHalfWidth, z + gapHalfWidth]).sort((a, b) => a[0] - b[0]);
  const segments = [];
  let cursor = margin;
  cuts.forEach(([a, b]) => {
    if (a > cursor) segments.push([cursor, a]);
    cursor = Math.max(cursor, b);
  });
  if (cursor < length - margin) segments.push([cursor, length - margin]);
  return segments;
}

// Estante de um lado do corredor: prateleiras + montantes + livros.
function buildShelfSide(group, side, doorZs) {
  const isOrange = side === -1;
  const frameColor = isOrange ? COLORS.shelfOrangeFrame : COLORS.shelfWhiteFrame;
  const boardColor = isOrange ? COLORS.shelfOrangeBoard : COLORS.shelfWhiteBoard;
  const halfW = DIM.corridorWidth / 2;
  const shelfDepth = 0.34;
  const centerX = side * (halfW - 0.03 - shelfDepth / 2);
  const levels = [0.05, 0.62, 1.19, 1.76, DIM.shelfHeight];

  const boardMat = new THREE.MeshStandardMaterial({ color: boardColor, roughness: 0.7 });
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.55 });

  const segments = computeSegments(DIM.corridorLength, doorZs);
  const bookGeo = new THREE.BoxGeometry(0.11, 1, 0.24);
  const bookMaterials = COLORS.bookColors.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })
  );
  const bookInstances = [];

  segments.forEach(([z0, z1]) => {
    const segLen = z1 - z0;
    const segCenterZ = (z0 + z1) / 2;

    levels.forEach((y) => {
      const board = new THREE.Mesh(new THREE.BoxGeometry(shelfDepth, 0.04, segLen), boardMat);
      board.position.set(centerX, y, segCenterZ);
      board.castShadow = true;
      board.receiveShadow = true;
      group.add(board);
    });

    const postCount = Math.max(2, Math.round(segLen / 2.1) + 1);
    for (let i = 0; i < postCount; i++) {
      const z = z0 + (segLen * i) / (postCount - 1);
      const post = new THREE.Mesh(new THREE.BoxGeometry(shelfDepth, DIM.shelfHeight, 0.05), frameMat);
      post.position.set(centerX, DIM.shelfHeight / 2, z);
      post.castShadow = true;
      group.add(post);
    }

    [1, 2, 3].forEach((li) => {
      const y = levels[li] + 0.09;
      const bookCount = Math.round(segLen / 0.16);
      for (let i = 0; i < bookCount; i++) {
        const z = z0 + 0.1 + i * 0.16 + (Math.random() - 0.5) * 0.03;
        if (z > z1 - 0.1) continue;
        bookInstances.push({
          x: centerX + (Math.random() - 0.5) * 0.06,
          y: y + Math.random() * 0.12,
          z,
          scaleY: 0.7 + Math.random() * 0.5,
          rotY: (Math.random() - 0.5) * 0.15,
          mat: Math.floor(Math.random() * bookMaterials.length),
        });
      }
    });
  });

  bookMaterials.forEach((mat, matIndex) => {
    const items = bookInstances.filter((b) => b.mat === matIndex);
    if (!items.length) return;
    const mesh = new THREE.InstancedMesh(bookGeo, mat, items.length);
    mesh.castShadow = true;
    const dummy = new THREE.Object3D();
    items.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0, b.rotY, 0);
      dummy.scale.set(1, b.scaleY, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });
}

// Parede-janela ao final do corredor da biblioteca.
function buildWindowWall(group) {
  const z = DIM.corridorLength + 0.05;
  const spanHalf = DIM.corridorWidth / 2 + 1.1;
  const colors = [COLORS.mullionWhite, COLORS.mullionPink, COLORS.mullionOrange, COLORS.mullionWhite, COLORS.mullionPink];
  const panes = colors.length;
  const paneWidth = (spanHalf * 2) / panes;

  const glassMat = new THREE.MeshStandardMaterial({
    color: COLORS.glass, transparent: true, opacity: 0.35,
    roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide,
  });

  for (let i = 0; i < panes; i++) {
    const x = -spanHalf + paneWidth * (i + 0.5);
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(paneWidth - 0.08, DIM.corridorHeight, 0.12),
      new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.7 })
    );
    pillar.position.set(x, DIM.corridorHeight / 2, z);
    pillar.castShadow = true;
    group.add(pillar);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(paneWidth - 0.2, DIM.corridorHeight - 0.3), glassMat);
    glass.position.set(x, DIM.corridorHeight / 2, z + 0.07);
    group.add(glass);
  }
  for (let i = 0; i <= panes; i++) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, DIM.corridorHeight, 0.1),
      new THREE.MeshStandardMaterial({ color: COLORS.mullionWhite, roughness: 0.6 })
    );
    post.position.set(-spanHalf + paneWidth * i, DIM.corridorHeight / 2, z);
    group.add(post);
  }

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(spanHalf * 2 + 6, 14),
    new THREE.MeshStandardMaterial({ color: COLORS.skyOutside, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0.02, z + 7);
  group.add(ground);

  const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: COLORS.foliage, roughness: 0.85 });
  [-3.5, -1, 2, 4.5].forEach((x, i) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 6), trunkMat);
    trunk.position.set(x, 0.7, z + 4 + (i % 2) * 1.5);
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 0.3, 8, 8), foliageMat);
    foliage.position.set(trunk.position.x, 2.0, trunk.position.z);
    group.add(trunk, foliage);
  });

  [0xb7c4cc, 0x8a3b3b, 0x3b4a5c].forEach((c, i) => {
    const car = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.5, 0.7),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.3 })
    );
    car.position.set(-3 + i * 2.4, 0.28, z + 10);
    group.add(car);
  });
}

function buildLibrary(group, scene) {
  scene.background = new THREE.Color(COLORS.wall);
  scene.fog = new THREE.Fog(COLORS.wall, 22, 58);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorWidth, DIM.corridorLength),
    new THREE.MeshStandardMaterial({
      map: createGridTexture(COLORS.floor, COLORS.floorGrid, 8, DIM.corridorWidth / 2, DIM.corridorLength / 2),
      roughness: 0.85,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, DIM.corridorLength / 2);
  floor.receiveShadow = true;
  group.add(floor);

  buildShelfSide(group, -1, DOORS_LEFT_Z);
  buildShelfSide(group, 1, DOORS_RIGHT_Z);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorWidth, DIM.corridorLength),
    new THREE.MeshStandardMaterial({ map: createRibbedTexture(), roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, DIM.corridorHeight, DIM.corridorLength / 2);
  ceiling.receiveShadow = true;
  group.add(ceiling);

  const halfW = DIM.corridorWidth / 2;
  DOORS_LEFT_Z.forEach((z) => addDoor(group, -halfW + 0.02, z, 1));
  DOORS_RIGHT_Z.forEach((z) => addDoor(group, halfW - 0.02, z, -1));

  addIndoorLighting(group);
  buildWindowWall(group);
  buildDecor(group); // banquinho + recanto de leitura junto à janela

  return { ceiling };
}

// ---------------------------------------------------------------------------
// Ambiente 2: corredor institucional (escola / prédio público)
// Paredes lisas e IGUAIS dos dois lados — sem referências visuais laterais.
// ---------------------------------------------------------------------------

function buildCorridorWall(group, side) {
  const halfW = DIM.corridorWidth / 2;
  const x = side * halfW;
  const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.corridorWall, roughness: 0.95 });
  const wainscotMat = new THREE.MeshStandardMaterial({ color: COLORS.corridorWainscot, roughness: 0.85 });
  const baseMat = new THREE.MeshStandardMaterial({ color: COLORS.corridorBaseboard, roughness: 0.8 });

  // Parede principal
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorLength, DIM.corridorHeight),
    wallMat
  );
  wall.position.set(x, DIM.corridorHeight / 2, DIM.corridorLength / 2);
  wall.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
  wall.receiveShadow = true;
  group.add(wall);

  // Faixa pintada inferior (wainscot) — típica de escolas e prédios públicos
  const wainscot = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 1.1, DIM.corridorLength),
    wainscotMat
  );
  wainscot.position.set(x - side * 0.02, 0.7, DIM.corridorLength / 2);
  wainscot.receiveShadow = true;
  group.add(wainscot);

  // Rodapé
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, DIM.corridorLength), baseMat);
  base.position.set(x - side * 0.02, 0.07, DIM.corridorLength / 2);
  group.add(base);
}

function buildCorridor(group, scene) {
  scene.background = new THREE.Color(COLORS.corridorWall);
  scene.fog = new THREE.Fog(COLORS.corridorWall, 24, 60);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorWidth, DIM.corridorLength),
    new THREE.MeshStandardMaterial({
      map: createGridTexture(COLORS.corridorFloor, COLORS.corridorFloorGrid, 6, DIM.corridorWidth / 1.5, DIM.corridorLength / 1.5),
      roughness: 0.7,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, DIM.corridorLength / 2);
  floor.receiveShadow = true;
  group.add(floor);

  buildCorridorWall(group, -1);
  buildCorridorWall(group, 1);

  // Teto liso claro (forro)
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorWidth, DIM.corridorLength),
    new THREE.MeshStandardMaterial({ color: COLORS.corridorCeiling, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, DIM.corridorHeight, DIM.corridorLength / 2);
  ceiling.receiveShadow = true;
  group.add(ceiling);

  // Portas alternadas nos dois lados (salas de aula / escritórios)
  const halfW = DIM.corridorWidth / 2;
  const doorHeight = 2.1;
  [6, 14, 22, 30, 38].forEach((z) => addDoor(group, -halfW + 0.03, z, 1, doorHeight));
  [10, 18, 26, 34, 42].forEach((z) => addDoor(group, halfW - 0.03, z, -1, doorHeight));

  // Parede de fundo com porta dupla
  const endWall = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorWidth, DIM.corridorHeight),
    new THREE.MeshStandardMaterial({ color: COLORS.corridorWall, roughness: 0.95 })
  );
  endWall.position.set(0, DIM.corridorHeight / 2, DIM.corridorLength);
  endWall.rotation.y = Math.PI;
  group.add(endWall);

  const endDoor = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 2.2, 0.08),
    new THREE.MeshStandardMaterial({ color: COLORS.doorPanel, roughness: 0.6 })
  );
  endDoor.position.set(0, 1.1, DIM.corridorLength - 0.05);
  group.add(endDoor);

  addIndoorLighting(group);
  return { ceiling };
}

// ---------------------------------------------------------------------------
// Ambiente 3: supermercado — corredor entre gôndolas carregadas de produtos
// ---------------------------------------------------------------------------

const GONDOLA_HEIGHT = 2.05;
const GONDOLA_DEPTH = 0.5;

// Placa de corredor suspensa, com o número da seção.
function createAisleSignTexture(number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = hex(COLORS.marketSign);
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 74px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), 128, 62);
  ctx.fillRect(28, 108, 200, 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const GONDOLA_LEVELS = [0.2, 0.62, 1.04, 1.46, 1.88]; // alturas das prateleiras

// Materiais compartilhados por todas as gôndolas de um ambiente.
function createGondolaMaterials() {
  return {
    metal: new THREE.MeshStandardMaterial({ color: COLORS.marketGondola, roughness: 0.55, metalness: 0.25 }),
    back: new THREE.MeshStandardMaterial({ color: COLORS.marketGondolaBack, roughness: 0.8 }),
    plinth: new THREE.MeshStandardMaterial({ color: COLORS.marketPlinth, roughness: 0.7 }),
    strip: new THREE.MeshStandardMaterial({ color: COLORS.marketPriceStrip, roughness: 0.6 }),
    products: COLORS.productColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 })),
  };
}

// Uma face de gôndola voltada para o corredor: rodapé, prateleiras, faixas de
// preço, montantes e produtos. `frontX` é o plano da face aberta e `dir` a
// direção para onde os produtos apontam (+1 para +x, -1 para -x).
// Os produtos são acumulados em `products` para virarem InstancedMesh depois.
function addGondolaRun(group, { frontX, dir, z0, z1, mats, products }) {
  const centerX = frontX - dir * (GONDOLA_DEPTH / 2);
  const segLen = z1 - z0;
  const segCenterZ = (z0 + z1) / 2;

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(GONDOLA_DEPTH, 0.2, segLen), mats.plinth);
  plinth.position.set(centerX, 0.1, segCenterZ);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  GONDOLA_LEVELS.forEach((y, i) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(GONDOLA_DEPTH, 0.035, segLen), mats.metal);
    shelf.position.set(centerX, y, segCenterZ);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    group.add(shelf);

    if (i < GONDOLA_LEVELS.length - 1) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, segLen), mats.strip);
      strip.position.set(frontX + dir * 0.01, y + 0.04, segCenterZ);
      group.add(strip);
    }
  });

  const postCount = Math.max(2, Math.round(segLen / 1.4) + 1);
  for (let i = 0; i < postCount; i++) {
    const z = z0 + (segLen * i) / (postCount - 1);
    const post = new THREE.Mesh(new THREE.BoxGeometry(GONDOLA_DEPTH, GONDOLA_HEIGHT, 0.04), mats.metal);
    post.position.set(centerX, GONDOLA_HEIGHT / 2, z);
    group.add(post);
  }

  GONDOLA_LEVELS.slice(0, -1).forEach((y) => {
    const count = Math.round(segLen / 0.12);
    for (let i = 0; i < count; i++) {
      const z = z0 + 0.08 + i * 0.12;
      if (z > z1 - 0.08) continue;
      products.push({
        x: centerX + (Math.random() - 0.5) * 0.12,
        y: y + 0.02,
        z,
        scaleY: 0.18 + Math.random() * 0.14,
        mat: Math.floor(Math.random() * mats.products.length),
      });
    }
  });
}

// Converte os produtos acumulados em InstancedMesh (um por cor).
function flushProducts(group, mats, products) {
  const geo = new THREE.BoxGeometry(0.1, 1, 0.16);
  mats.products.forEach((mat, matIndex) => {
    const items = products.filter((p) => p.mat === matIndex);
    if (!items.length) return;
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.castShadow = true;
    const dummy = new THREE.Object3D();
    items.forEach((p, i) => {
      // A geometria tem altura 1 e origem no centro: sobe metade da escala
      dummy.position.set(p.x, p.y + p.scaleY / 2, p.z);
      dummy.scale.set(1, p.scaleY, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });
}

// Gôndola encostada na parede, de um lado do corredor único.
function buildGondolaSide(group, side, doorZs, mats, products) {
  const halfW = DIM.corridorWidth / 2;
  const frontX = side * (halfW - GONDOLA_DEPTH);

  // Painel de fundo contínuo (fecha o corredor visualmente)
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorLength, GONDOLA_HEIGHT),
    mats.back
  );
  back.position.set(side * halfW - side * 0.01, GONDOLA_HEIGHT / 2, DIM.corridorLength / 2);
  back.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
  back.receiveShadow = true;
  group.add(back);

  computeSegments(DIM.corridorLength, doorZs).forEach(([z0, z1]) => {
    addGondolaRun(group, { frontX, dir: -side, z0, z1, mats, products });
  });
}

// Ilha de gôndolas: duas faces costa a costa, servindo os corredores dos dois
// lados. `x0`/`x1` são as faces abertas do bloco.
function buildGondolaBlock(group, x0, x1, z0, z1, mats, products) {
  addGondolaRun(group, { frontX: x0, dir: -1, z0, z1, mats, products });
  addGondolaRun(group, { frontX: x1, dir: 1, z0, z1, mats, products });

  // Tampas nas pontas do bloco
  [z0, z1].forEach((z) => {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(x1 - x0, GONDOLA_HEIGHT, 0.05),
      mats.back
    );
    cap.position.set((x0 + x1) / 2, GONDOLA_HEIGHT / 2, z);
    cap.castShadow = true;
    group.add(cap);
  });
}

// Placas de seção penduradas no teto ao longo do corredor.
function buildAisleSigns(group) {
  [6, 16, 26, 36].forEach((z, i) => {
    const tex = createAisleSignTexture(i + 1);
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.55, 0.04),
      [
        new THREE.MeshStandardMaterial({ color: COLORS.marketSign, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: COLORS.marketSign, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: COLORS.marketSign, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ color: COLORS.marketSign, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
      ]
    );
    const signY = 3.05;
    const signTop = signY + 0.275;
    plate.position.set(0, signY, z);
    plate.castShadow = true;
    group.add(plate);

    // Hastes ligando o topo da placa ao teto
    const rodLength = DIM.corridorHeight - signTop;
    [-0.45, 0.45].forEach((x) => {
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, rodLength, 6),
        new THREE.MeshStandardMaterial({ color: COLORS.obstacleMetal, metalness: 0.6 })
      );
      rod.position.set(x, signTop + rodLength / 2, z);
      group.add(rod);
    });
  });
}

function buildSupermarket(group, scene) {
  scene.background = new THREE.Color(COLORS.marketCeiling);
  scene.fog = new THREE.Fog(COLORS.marketCeiling, 26, 62);

  // Piso claro e polido
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorWidth, DIM.corridorLength),
    new THREE.MeshStandardMaterial({
      map: createGridTexture(COLORS.marketFloor, COLORS.marketFloorGrid, 5, DIM.corridorWidth / 1.2, DIM.corridorLength / 1.2),
      roughness: 0.45,
      metalness: 0.05,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, DIM.corridorLength / 2);
  floor.receiveShadow = true;
  group.add(floor);

  const mats = createGondolaMaterials();
  const products = [];
  buildGondolaSide(group, -1, DOORS_LEFT_Z, mats, products);
  buildGondolaSide(group, 1, DOORS_RIGHT_Z, mats, products);
  flushProducts(group, mats, products);

  // Teto claro
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorWidth, DIM.corridorLength),
    new THREE.MeshStandardMaterial({ color: COLORS.marketCeiling, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, DIM.corridorHeight, DIM.corridorLength / 2);
  ceiling.receiveShadow = true;
  group.add(ceiling);

  buildAisleSigns(group);

  // Parede de fundo com ilha de refrigeradores
  const endWall = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorWidth, DIM.corridorHeight),
    new THREE.MeshStandardMaterial({ color: COLORS.marketGondolaBack, roughness: 0.9 })
  );
  endWall.position.set(0, DIM.corridorHeight / 2, DIM.corridorLength);
  endWall.rotation.y = Math.PI;
  group.add(endWall);

  for (let i = 0; i < 4; i++) {
    const cooler = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 2.1, 0.5),
      new THREE.MeshStandardMaterial({
        color: COLORS.marketCooler, roughness: 0.25, metalness: 0.15,
        emissive: 0x213038, emissiveIntensity: 0.25,
      })
    );
    cooler.position.set(-2.1 + i * 1.4, 1.05, DIM.corridorLength - 0.3);
    cooler.castShadow = true;
    group.add(cooler);
  }

  // Iluminação: supermercados são bem mais claros que os demais ambientes
  const shadowZ = CEILING_LIGHTS_Z[Math.floor(CEILING_LIGHTS_Z.length / 2)];
  CEILING_LIGHTS_Z.forEach((z) => {
    addCeilingLight(group, z, { width: DIM.corridorWidth * 0.85, castShadow: z === shadowZ });
  });
  group.add(new THREE.AmbientLight(0xffffff, 0.72));
  group.add(new THREE.HemisphereLight(0xf4f6f7, 0x9aa0a4, 0.5));

  return { ceiling };
}

// ---------------------------------------------------------------------------
// Ambiente 4: supermercado complexo — malha de corredores
//
// Planta: corredores longitudinais (em z) nos eixos x = 0, ±4 e ±8, cortados
// por dois corredores transversais. As ilhas de gôndola ocupam o miolo. É essa
// grade que permite o percurso com várias curvas do cenário "Múltiplos desvios".
// ---------------------------------------------------------------------------
const STORE_HALF_X = 10.5;
const STORE_Z = 34;
// Faces abertas de cada ilha (x0, x1) e trechos em z entre os transversais
const STORE_BLOCK_X = [[1.5, 2.5], [-2.5, -1.5], [5.5, 6.5], [-6.5, -5.5]];
const STORE_BLOCK_Z = [[3, 12], [15, 24], [27, 32]];
const STORE_AISLE_X = [0, 4, -4, 8, -8]; // eixos dos corredores longitudinais

function buildComplexSupermarket(group, scene) {
  scene.background = new THREE.Color(COLORS.marketCeiling);
  scene.fog = new THREE.Fog(COLORS.marketCeiling, 30, 70);

  // Piso da loja inteira
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(STORE_HALF_X * 2, STORE_Z),
    new THREE.MeshStandardMaterial({
      map: createGridTexture(COLORS.marketFloor, COLORS.marketFloorGrid, 5, STORE_HALF_X * 2 / 1.2, STORE_Z / 1.2),
      roughness: 0.45,
      metalness: 0.05,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, STORE_Z / 2);
  floor.receiveShadow = true;
  group.add(floor);

  // Ilhas de gôndola
  const mats = createGondolaMaterials();
  const products = [];
  STORE_BLOCK_X.forEach(([x0, x1]) => {
    STORE_BLOCK_Z.forEach(([z0, z1]) => {
      buildGondolaBlock(group, x0, x1, z0, z1, mats, products);
    });
  });
  flushProducts(group, mats, products);

  // Paredes externas e teto
  const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.marketGondolaBack, roughness: 0.9 });
  [-1, 1].forEach((side) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(STORE_Z, DIM.corridorHeight), wallMat);
    wall.position.set(side * STORE_HALF_X, DIM.corridorHeight / 2, STORE_Z / 2);
    wall.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    wall.receiveShadow = true;
    group.add(wall);
  });
  [[0, Math.PI], [STORE_Z, 0]].forEach(([z, rotY]) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(STORE_HALF_X * 2, DIM.corridorHeight), wallMat);
    wall.position.set(0, DIM.corridorHeight / 2, z);
    wall.rotation.y = rotY;
    group.add(wall);
  });

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(STORE_HALF_X * 2, STORE_Z),
    new THREE.MeshStandardMaterial({ color: COLORS.marketCeiling, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, DIM.corridorHeight, STORE_Z / 2);
  ceiling.receiveShadow = true;
  group.add(ceiling);

  // Ilha de refrigeradores na parede do fundo
  for (let i = 0; i < 6; i++) {
    const cooler = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 2.1, 0.5),
      new THREE.MeshStandardMaterial({
        color: COLORS.marketCooler, roughness: 0.25, metalness: 0.15,
        emissive: 0x213038, emissiveIntensity: 0.25,
      })
    );
    cooler.position.set(-3.75 + i * 1.5, 1.05, STORE_Z - 0.35);
    cooler.castShadow = true;
    group.add(cooler);
  }

  // Placas numeradas sobre cada corredor longitudinal
  STORE_AISLE_X.forEach((x, i) => {
    const tex = createAisleSignTexture(i + 1);
    const faceMat = new THREE.MeshStandardMaterial({ color: COLORS.marketSign, roughness: 0.7 });
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.55, 0.04),
      [faceMat, faceMat, faceMat, faceMat,
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })]
    );
    const signY = 3.05;
    plate.position.set(x, signY, 8);
    plate.castShadow = true;
    group.add(plate);

    const rodLength = DIM.corridorHeight - (signY + 0.275);
    [-0.45, 0.45].forEach((dx) => {
      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, rodLength, 6),
        new THREE.MeshStandardMaterial({ color: COLORS.obstacleMetal, metalness: 0.6 })
      );
      rod.position.set(x + dx, signY + 0.275 + rodLength / 2, 8);
      group.add(rod);
    });
  });

  // Iluminação: luminárias sobre os corredores + luz zenital para as sombras
  [6, 13.5, 20, 25.5, 31].forEach((z) => {
    [0, 4, -4, 8, -8].forEach((x) => {
      const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.06, 0.16),
        new THREE.MeshStandardMaterial({
          color: COLORS.fixture, emissive: COLORS.fixture, emissiveIntensity: 0.8, roughness: 0.4,
        })
      );
      fixture.position.set(x, DIM.corridorHeight - 0.08, z);
      group.add(fixture);
    });
  });
  // Poucas luzes pontuais (custo por luz é alto); o volume vem de ambiente + zenital
  [[0, 9], [0, 25], [4, 17], [-4, 17]].forEach(([x, z]) => {
    const light = new THREE.PointLight(0xfff6df, 4.5, 14, 2);
    light.position.set(x, DIM.corridorHeight - 0.4, z);
    group.add(light);
  });

  const overhead = new THREE.DirectionalLight(0xffffff, 0.9);
  overhead.position.set(3, 14, 12);
  overhead.target.position.set(0, 0, 16);
  overhead.castShadow = true;
  overhead.shadow.mapSize.set(2048, 2048);
  overhead.shadow.camera.near = 1;
  overhead.shadow.camera.far = 40;
  overhead.shadow.camera.left = -14;
  overhead.shadow.camera.right = 14;
  overhead.shadow.camera.top = 22;
  overhead.shadow.camera.bottom = -22;
  overhead.shadow.bias = -0.0005;
  group.add(overhead, overhead.target);

  group.add(new THREE.AmbientLight(0xffffff, 0.68));
  group.add(new THREE.HemisphereLight(0xf4f6f7, 0x9aa0a4, 0.5));

  // A loja é bem maior que um corredor: a visão superior sobe para enquadrá-la
  return {
    ceiling,
    topView: { pos: [0, 40, STORE_Z / 2], target: [0, 0, STORE_Z / 2] },
  };
}

// ---------------------------------------------------------------------------
// Ambiente 5: calçada (externo) — sem teto, com fachada de um lado e rua do outro
//
// A calçada é mais larga que o corredor interno: a fachada fica no limite
// esquerdo (-3) e o meio-fio é empurrado para +4,2, de modo que postes e
// árvores fiquem fora da faixa útil de caminhada (o participante chega no
// máximo a x ~ 2,35 no pico do desvio).
// ---------------------------------------------------------------------------
const SIDEWALK_LEFT = -DIM.corridorWidth / 2; // fachada
const SIDEWALK_RIGHT = 4.2;                   // meio-fio
const SIDEWALK_WIDTH = SIDEWALK_RIGHT - SIDEWALK_LEFT;
const SIDEWALK_CENTER = (SIDEWALK_LEFT + SIDEWALK_RIGHT) / 2;

function buildFacade(group) {
  const x = SIDEWALK_LEFT;
  const height = 7;
  const facadeMat = new THREE.MeshStandardMaterial({ color: COLORS.facade, roughness: 0.9 });
  const windowMat = new THREE.MeshStandardMaterial({
    color: COLORS.facadeWindow, roughness: 0.2, metalness: 0.3,
  });

  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, height, DIM.corridorLength), facadeMat);
  wall.position.set(x - 0.2, height / 2, DIM.corridorLength / 2);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  // Faixas de janelas em dois pavimentos
  [2.6, 4.8].forEach((y) => {
    for (let z = 2; z < DIM.corridorLength - 1; z += 3.2) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 1.9), windowMat);
      win.position.set(x + 0.02, y, z);
      group.add(win);
    }
  });

  // Portas de acesso ao nível da calçada
  [8, 20, 32].forEach((z) => {
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2.2, 1.3),
      new THREE.MeshStandardMaterial({ color: COLORS.doorPanel, roughness: 0.6 })
    );
    door.position.set(x + 0.02, 1.1, z);
    group.add(door);
  });
}

function buildStreet(group) {
  // Meio-fio
  const curb = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.16, DIM.corridorLength),
    new THREE.MeshStandardMaterial({ color: COLORS.curb, roughness: 0.9 })
  );
  curb.position.set(SIDEWALK_RIGHT - 0.15, 0.08, DIM.corridorLength / 2);
  curb.receiveShadow = true;
  group.add(curb);

  // Asfalto
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(9, DIM.corridorLength),
    new THREE.MeshStandardMaterial({ color: COLORS.asphalt, roughness: 0.95 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(SIDEWALK_RIGHT + 4.5, 0, DIM.corridorLength / 2);
  road.receiveShadow = true;
  group.add(road);

  // Faixa central tracejada
  const lineMat = new THREE.MeshStandardMaterial({ color: COLORS.roadLine, roughness: 0.8 });
  for (let z = 1; z < DIM.corridorLength; z += 3) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 1.6), lineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(SIDEWALK_RIGHT + 4.5, 0.01, z);
    group.add(dash);
  }

  // Carros estacionados junto ao meio-fio
  [0xb7c4cc, 0x7d3f3f, 0x3b4a5c, 0x8a8f7a].forEach((c, i) => {
    const car = new THREE.Group();
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.62, 4.1),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.35 })
    );
    bodyMesh.position.y = 0.62;
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.5, 2.1),
      new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.3, metalness: 0.4 })
    );
    cabin.position.set(0, 1.15, -0.2);
    car.add(bodyMesh, cabin);
    const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x22262a });
    [[-0.8, 1.4], [0.8, 1.4], [-0.8, -1.4], [0.8, -1.4]].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.32, wz);
      car.add(wheel);
    });
    car.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    car.position.set(SIDEWALK_RIGHT + 1.6, 0, 6 + i * 9);
    group.add(car);
  });
}

// Postes de iluminação e árvores junto ao meio-fio — fora da faixa de caminhada.
function buildStreetFurniture(group) {
  const lineX = SIDEWALK_RIGHT - 0.6; // eixo do mobiliário urbano
  const postMat = new THREE.MeshStandardMaterial({ color: COLORS.lampPost, roughness: 0.6, metalness: 0.4 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: COLORS.foliage, roughness: 0.85 });

  [5, 17, 29, 41].forEach((z) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 10), postMat);
    post.position.set(lineX, 2.3, z);
    post.castShadow = true;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), postMat);
    arm.position.set(lineX - 0.35, 4.55, z);
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.24),
      new THREE.MeshStandardMaterial({ color: COLORS.fixture, emissive: COLORS.fixture, emissiveIntensity: 0.25 })
    );
    lamp.position.set(lineX - 0.67, 4.46, z);
    group.add(post, arm, lamp);
  });

  // Árvores em canteiros na calçada
  [11, 23, 35].forEach((z) => {
    const pit = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.04, 0.9),
      new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 1 })
    );
    pit.position.set(lineX, 0.02, z);
    group.add(pit);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 2.2, 8), trunkMat);
    trunk.position.set(lineX, 1.1, z);
    trunk.castShadow = true;
    // Copa acima da altura da cabeça, para não obstruir a caminhada
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 10), foliageMat);
    foliage.position.set(lineX, 3.0, z);
    foliage.scale.y = 0.85;
    foliage.castShadow = true;
    group.add(trunk, foliage);
  });
}

function buildSidewalk(group, scene) {
  scene.background = new THREE.Color(COLORS.sky);
  scene.fog = new THREE.Fog(COLORS.sky, 30, 75);

  // Calçada em lajotas (mais larga que o corredor interno)
  const paving = new THREE.Mesh(
    new THREE.PlaneGeometry(SIDEWALK_WIDTH, DIM.corridorLength),
    new THREE.MeshStandardMaterial({
      map: createGridTexture(COLORS.sidewalkPaving, COLORS.sidewalkJoint, 6, SIDEWALK_WIDTH / 1.2, DIM.corridorLength / 1.2, 3),
      roughness: 0.95,
    })
  );
  paving.rotation.x = -Math.PI / 2;
  paving.position.set(SIDEWALK_CENTER, 0, DIM.corridorLength / 2);
  paving.receiveShadow = true;
  group.add(paving);

  buildFacade(group);
  buildStreet(group);
  buildStreetFurniture(group);

  // Iluminação diurna: sol direcional + céu
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.1);
  sun.position.set(-12, 20, 6);
  sun.target.position.set(0, 0, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.0005;
  group.add(sun, sun.target);

  group.add(new THREE.AmbientLight(0xffffff, 0.55));
  group.add(new THREE.HemisphereLight(COLORS.sky, 0x9a9384, 0.75));

  return { ceiling: null }; // ambiente externo: não há teto para ocultar
}

// ---------------------------------------------------------------------------
// Gerenciador de ambientes
// ---------------------------------------------------------------------------

const BUILDERS = {
  biblioteca: buildLibrary,
  corredor: buildCorridor,
  supermercado: buildSupermarket,
  'supermercado-complexo': buildComplexSupermarket,
  calcada: buildSidewalk,
};

// Remove o ambiente anterior liberando geometrias, materiais, texturas e
// mapas de sombra das luzes.
function disposeGroup(scene, group) {
  group.traverse((obj) => {
    if (obj.isLight && obj.shadow && obj.shadow.map) obj.shadow.map.dispose();
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
  scene.remove(group);
}

// Constrói o ambiente escolhido num grupo próprio, substituindo o anterior.
// Retorna `{ ceiling }` — nulo em ambientes externos.
export function createEnvironmentManager(scene) {
  let currentGroup = null;

  function load(envId) {
    const builder = BUILDERS[envId] || BUILDERS.biblioteca;
    if (currentGroup) disposeGroup(scene, currentGroup);
    currentGroup = new THREE.Group();
    currentGroup.name = `environment-${envId}`;
    const result = builder(currentGroup, scene);
    scene.add(currentGroup);
    return result;
  }

  return { load };
}

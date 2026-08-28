import * as THREE from 'three';
import {
  COLORS,
  DIM,
  DOORS_LEFT_Z,
  DOORS_RIGHT_Z,
  CEILING_LIGHTS_Z,
} from './config.js';

// Ambiente inspirado na estrutura do vídeo de referência do experimento:
// corredor de biblioteca entre estantes (laranja de um lado, branca do outro),
// piso escuro, laje de concreto aparente e, ao final, uma parede-janela com
// mainéis coloridos dando para uma área externa arborizada.

function createFloorTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#' + COLORS.floor.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#' + COLORS.floorGrid.toString(16).padStart(6, '0');
  ctx.lineWidth = 2;
  const tiles = 8;
  const step = size / tiles;
  for (let i = 0; i <= tiles; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(DIM.corridorWidth / 2, DIM.corridorLength / 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Textura sutil de laje/deck metálico corrugado para o teto.
function createCeilingTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#' + COLORS.ceiling.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#' + COLORS.ceilingRib.toString(16).padStart(6, '0');
  ctx.lineWidth = 3;
  const ribs = 14;
  for (let i = 0; i < ribs; i++) {
    const x = (i / ribs) * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, DIM.corridorLength / 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addDoor(scene, x, z, facing) {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: COLORS.doorFrame, roughness: 0.8 });
  const panelMat = new THREE.MeshStandardMaterial({ color: COLORS.doorPanel, roughness: 0.6 });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, DIM.shelfHeight + 0.15, 1.3), frameMat);
  frame.position.set(x, (DIM.shelfHeight + 0.15) / 2, z);
  group.add(frame);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.05, DIM.shelfHeight - 0.05, 1.1), panelMat);
  panel.position.set(x + facing * 0.05, (DIM.shelfHeight - 0.05) / 2, z);
  group.add(panel);

  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshStandardMaterial({ color: COLORS.obstacleMetal })
  );
  handle.position.set(x + facing * 0.08, 1.1, z + 0.45);
  group.add(handle);

  scene.add(group);
}

// Tubo fluorescente fino embutido na laje, como no vídeo de referência.
function addCeilingLight(scene, z) {
  const fixture = new THREE.Mesh(
    new THREE.BoxGeometry(DIM.corridorWidth * 0.7, 0.06, 0.16),
    new THREE.MeshStandardMaterial({
      color: COLORS.fixture,
      emissive: COLORS.fixture,
      emissiveIntensity: 0.8,
      roughness: 0.4,
    })
  );
  fixture.position.set(0, DIM.corridorHeight - 0.08, z);
  scene.add(fixture);

  const light = new THREE.PointLight(0xfff6df, 6, 9, 2);
  light.position.set(0, DIM.corridorHeight - 0.3, z);
  light.castShadow = z === CEILING_LIGHTS_Z[Math.floor(CEILING_LIGHTS_Z.length / 2)];
  if (light.castShadow) {
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 15;
  }
  scene.add(light);
}

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

// Constrói a estante de um lado do corredor: prateleiras + montantes + livros.
function buildShelfSide(scene, side, doorZs) {
  const isOrange = side === -1;
  const frameColor = isOrange ? COLORS.shelfOrangeFrame : COLORS.shelfWhiteFrame;
  const boardColor = isOrange ? COLORS.shelfOrangeBoard : COLORS.shelfWhiteBoard;
  const halfW = DIM.corridorWidth / 2;
  const shelfDepth = 0.34;
  const faceX = side * (halfW - 0.03);
  const centerX = side * (halfW - 0.03 - shelfDepth / 2);
  const levels = [0.05, 0.62, 1.19, 1.76, DIM.shelfHeight];

  const boardMat = new THREE.MeshStandardMaterial({ color: boardColor, roughness: 0.7 });
  const frameMat = new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.55 });

  const segments = computeSegments(DIM.corridorLength, doorZs);
  const bookGeo = new THREE.BoxGeometry(0.11, 1, 0.24);
  const bookMaterials = COLORS.bookColors.map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })
  );
  const bookInstances = []; // { level, transforms: [] }

  segments.forEach(([z0, z1]) => {
    const segLen = z1 - z0;
    const segCenterZ = (z0 + z1) / 2;

    // Prateleiras (tábuas horizontais)
    levels.forEach((y) => {
      const board = new THREE.Mesh(new THREE.BoxGeometry(shelfDepth, 0.04, segLen), boardMat);
      board.position.set(centerX, y, segCenterZ);
      board.castShadow = true;
      board.receiveShadow = true;
      scene.add(board);
    });

    // Montantes verticais (a cada ~2.1m dentro do trecho, incluindo as extremidades)
    const postStep = 2.1;
    const postCount = Math.max(2, Math.round(segLen / postStep) + 1);
    for (let i = 0; i < postCount; i++) {
      const z = z0 + (segLen * i) / (postCount - 1);
      const post = new THREE.Mesh(new THREE.BoxGeometry(shelfDepth, DIM.shelfHeight, 0.05), frameMat);
      post.position.set(centerX, DIM.shelfHeight / 2, z);
      post.castShadow = true;
      scene.add(post);
    }

    // Livros (posições para InstancedMesh, nos 3 níveis intermediários)
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

  // Painel frontal (topo da estante) fechando o vão acima do último nível
  bookMaterials.forEach((mat, matIndex) => {
    const group = bookInstances.filter((b) => b.mat === matIndex);
    if (!group.length) return;
    const mesh = new THREE.InstancedMesh(bookGeo, mat, group.length);
    mesh.castShadow = true;
    const dummy = new THREE.Object3D();
    group.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0, b.rotY, 0);
      dummy.scale.set(1, b.scaleY, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  });

  return { faceX };
}

// Parede-janela ao final do corredor: mainéis coloridos + vidro + área externa.
function buildWindowWall(scene) {
  const z = DIM.corridorLength + 0.05;
  const spanHalf = DIM.corridorWidth / 2 + 1.1;
  const colors = [COLORS.mullionWhite, COLORS.mullionPink, COLORS.mullionOrange, COLORS.mullionWhite, COLORS.mullionPink];
  const panes = colors.length;
  const paneWidth = (spanHalf * 2) / panes;

  const glassMat = new THREE.MeshStandardMaterial({
    color: COLORS.glass,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < panes; i++) {
    const x = -spanHalf + paneWidth * (i + 0.5);
    const pillarMat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.7 });
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(paneWidth - 0.08, DIM.corridorHeight, 0.12), pillarMat);
    pillar.position.set(x, DIM.corridorHeight / 2, z);
    pillar.castShadow = true;
    scene.add(pillar);

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(paneWidth - 0.2, DIM.corridorHeight - 0.3), glassMat);
    glass.position.set(x, DIM.corridorHeight / 2, z + 0.07);
    scene.add(glass);
  }
  // Montantes verticais finos entre os vidros
  for (let i = 0; i <= panes; i++) {
    const x = -spanHalf + paneWidth * i;
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, DIM.corridorHeight, 0.1),
      new THREE.MeshStandardMaterial({ color: COLORS.mullionWhite, roughness: 0.6 })
    );
    post.position.set(x, DIM.corridorHeight / 2, z);
    scene.add(post);
  }

  // Área externa simplificada: vegetação e alguns carros ao longe
  const groundOutside = new THREE.Mesh(
    new THREE.PlaneGeometry(spanHalf * 2 + 6, 14),
    new THREE.MeshStandardMaterial({ color: COLORS.skyOutside, roughness: 1 })
  );
  groundOutside.rotation.x = -Math.PI / 2;
  groundOutside.position.set(0, 0.02, z + 7);
  scene.add(groundOutside);

  const trunkMat = new THREE.MeshStandardMaterial({ color: COLORS.trunk, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: COLORS.foliage, roughness: 0.85 });
  [-3.5, -1, 2, 4.5].forEach((x, i) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.4, 6), trunkMat);
    trunk.position.set(x, 0.7, z + 4 + (i % 2) * 1.5);
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 0.3, 8, 8), foliageMat);
    foliage.position.set(trunk.position.x, 2.0, trunk.position.z);
    scene.add(trunk, foliage);
  });

  const carColors = [0xb7c4cc, 0x8a3b3b, 0x3b4a5c];
  carColors.forEach((c, i) => {
    const car = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.5, 0.7),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.3 })
    );
    car.position.set(-3 + i * 2.4, 0.28, z + 10);
    scene.add(car);
  });
}

// Constrói o ambiente: piso, estantes laterais, teto, portas, iluminação e a
// parede-janela ao final. Retorna referências úteis para o restante da cena
// (ex.: o teto, escondido na visão superior para não obstruir a leitura).
export function buildEnvironment(scene) {
  // Piso
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorWidth, DIM.corridorLength),
    new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.85 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, DIM.corridorLength / 2);
  floor.receiveShadow = true;
  scene.add(floor);

  // Estantes laterais (substituem as paredes lisas): laranja à esquerda, branca à direita
  buildShelfSide(scene, -1, DOORS_LEFT_Z);
  buildShelfSide(scene, 1, DOORS_RIGHT_Z);

  // Teto em laje de concreto aparente
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(DIM.corridorWidth, DIM.corridorLength),
    new THREE.MeshStandardMaterial({ map: createCeilingTexture(), roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, DIM.corridorHeight, DIM.corridorLength / 2);
  ceiling.receiveShadow = true;
  scene.add(ceiling);

  // Portas (vãos de passagem na estante)
  const halfW = DIM.corridorWidth / 2;
  DOORS_LEFT_Z.forEach((z) => addDoor(scene, -halfW + 0.02, z, 1));
  DOORS_RIGHT_Z.forEach((z) => addDoor(scene, halfW - 0.02, z, -1));

  // Iluminação de teto
  CEILING_LIGHTS_Z.forEach((z) => addCeilingLight(scene, z));

  // Parede-janela ao final do corredor
  buildWindowWall(scene);

  // Luz ambiente geral suave
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const hemi = new THREE.HemisphereLight(0xeef0ec, 0x2a2e33, 0.4);
  scene.add(hemi);

  // Neblina sutil para reforçar profundidade do corredor
  scene.fog = new THREE.Fog(COLORS.wall, 22, 58);

  return { ceiling };
}

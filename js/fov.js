import * as THREE from 'three';
import { COLORS } from './config.js';
import { createLabel } from './label.js';

// Constrói o frustum (pirâmide) de campo de visão da câmera egocêntrica.
// A geometria é montada manualmente para permitir FOV horizontal/vertical distintos.
function createFrustumGeometry(hFovDeg, vFovDeg, distance) {
  const hHalf = Math.tan(THREE.MathUtils.degToRad(hFovDeg / 2)) * distance;
  const vHalf = Math.tan(THREE.MathUtils.degToRad(vFovDeg / 2)) * distance;

  const apex = new THREE.Vector3(0, 0, 0);
  const corners = [
    new THREE.Vector3(-hHalf, -vHalf, distance),
    new THREE.Vector3(hHalf, -vHalf, distance),
    new THREE.Vector3(hHalf, vHalf, distance),
    new THREE.Vector3(-hHalf, vHalf, distance),
  ];

  const positions = [];
  // 4 faces laterais (triângulos apex -> aresta da base)
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    positions.push(apex.x, apex.y, apex.z, a.x, a.y, a.z, b.x, b.y, b.z);
  }
  // face da base (quad -> 2 triângulos)
  positions.push(
    corners[0].x, corners[0].y, corners[0].z,
    corners[2].x, corners[2].y, corners[2].z,
    corners[1].x, corners[1].y, corners[1].z,
    corners[0].x, corners[0].y, corners[0].z,
    corners[3].x, corners[3].y, corners[3].z,
    corners[2].x, corners[2].y, corners[2].z
  );

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

// Cria o grupo do campo de visão, já orientado ao longo de +Z (direção da caminhada).
// Deve ser adicionado como filho do dispositivo de câmera para acompanhar sua pose.
export function createFOVCone({ hFov = 62, vFov = 46, distance = 7 } = {}) {
  const group = new THREE.Group();
  group.name = 'fov-cone';

  const geo = createFrustumGeometry(hFov, vFov, distance);

  const mat = new THREE.MeshBasicMaterial({
    color: COLORS.fov,
    transparent: true,
    opacity: 0.13,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 20),
    new THREE.LineBasicMaterial({ color: COLORS.fov, transparent: true, opacity: 0.45 })
  );
  group.add(edges);

  const label = createLabel('Campo de visão da câmera', 'blue');
  label.position.set(0, vFov / 60, distance * 0.55);
  group.add(label);

  return group;
}

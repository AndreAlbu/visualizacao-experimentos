import * as THREE from 'three';
import { COLORS } from './config.js';
import { createLabel } from './label.js';
import { createFOVCone } from './fov.js';

// Cria o dispositivo de gravação (estilo câmera de ação / action-cam) preso
// ao peito do participante, já com o cone de campo de visão anexado como filho
// -- assim ele acompanha automaticamente a posição/orientação do participante.
export function createCameraDevice() {
  const group = new THREE.Group();
  group.name = 'camera-device';

  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.cameraBody, roughness: 0.4, metalness: 0.3 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: COLORS.cameraAccent,
    roughness: 0.3,
    metalness: 0.2,
    emissive: COLORS.cameraAccent,
    emissiveIntensity: 0.15,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.09), bodyMat);
  body.castShadow = true;
  group.add(body);

  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16), accentMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0, 0.065);
  group.add(lens);

  const strap = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.02, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x2b2f33 })
  );
  strap.position.set(0, 0.07, 0);
  group.add(strap);

  const label = createLabel('Câmera RGB / Visão Egocêntrica', 'blue');
  label.position.set(0, 0.16, 0);
  group.add(label);

  // Campo de visão, anexado ao dispositivo (herda pose automaticamente)
  const fov = createFOVCone({ distance: 7 });
  fov.position.set(0, 0, 0.07);
  group.add(fov);

  return group;
}

import * as THREE from 'three';
import { COLORS } from './config.js';
import { createLabel } from './label.js';
import { createCameraDevice } from './cameraDevice.js';

// Cria a figura simplificada do participante (boneco abstrato, sem detalhes
// realistas) em postura de caminhada, orientado para +Z. Retorna o grupo raiz
// e referências às articulações usadas no ciclo de caminhada da animação.
export function createParticipant() {
  const group = new THREE.Group();
  group.name = 'participant';

  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.participantBody, roughness: 0.6 });
  const headMat = new THREE.MeshStandardMaterial({ color: COLORS.participantHead, roughness: 0.5 });

  // Torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.5, 4, 8), bodyMat);
  torso.position.set(0, 1.08, 0);
  torso.castShadow = true;
  group.add(torso);

  // Cabeça
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), headMat);
  head.position.set(0, 1.62, 0);
  head.castShadow = true;
  group.add(head);

  // Pernas (pivôs no quadril para permitir balanço de caminhada)
  const legGeo = new THREE.CapsuleGeometry(0.07, 0.55, 4, 8);
  function makeLeg(sideX) {
    const pivot = new THREE.Group();
    pivot.position.set(sideX, 0.78, 0);
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(0, -0.28, 0);
    leg.castShadow = true;
    pivot.add(leg);
    group.add(pivot);
    return pivot;
  }
  const legL = makeLeg(-0.1);
  const legR = makeLeg(0.1);

  // Braços (pivôs no ombro)
  const armGeo = new THREE.CapsuleGeometry(0.05, 0.42, 4, 8);
  function makeArm(sideX) {
    const pivot = new THREE.Group();
    pivot.position.set(sideX, 1.28, 0);
    const arm = new THREE.Mesh(armGeo, bodyMat);
    arm.position.set(0, -0.22, 0);
    arm.castShadow = true;
    pivot.add(arm);
    group.add(pivot);
    return pivot;
  }
  const armL = makeArm(-0.24);
  const armR = makeArm(0.24);

  // Leve inclinação inicial de pernas/braços sugerindo passada em andamento
  legL.rotation.x = 0.3;
  legR.rotation.x = -0.3;
  armL.rotation.x = -0.3;
  armR.rotation.x = 0.3;

  // Rótulo de identificação
  const label = createLabel('Participante / Operador', 'default');
  label.position.set(0, 2.0, 0);
  group.add(label);

  // Dispositivo de gravação + campo de visão, presos ao peito
  const cameraDevice = createCameraDevice();
  cameraDevice.position.set(0, 1.32, 0.2);
  group.add(cameraDevice);

  return { group, legL, legR, armL, armR };
}

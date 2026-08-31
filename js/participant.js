import * as THREE from 'three';
import { COLORS } from './config.js';
import { createLabel } from './label.js';
import { createCameraDevice, GIMBAL_CAMERA_HEIGHT } from './cameraDevice.js';

// Ângulos do braço que segura o gimbal (rotação em X, em radianos).
// O braço fica dobrado: úmero para frente e para baixo, antebraço subindo
// à frente do corpo — a postura típica de quem filma com estabilizador.
const SHOULDER_ANGLE = -0.9;  // rotação do úmero (a partir do braço pendente)
const FOREARM_ANGLE = -2.2;   // rotação TOTAL do antebraço no espaço do corpo
const ELBOW_ANGLE = FOREARM_ANGLE - SHOULDER_ANGLE; // rotação local do cotovelo

const SHOULDER_POS = new THREE.Vector3(0.22, 1.3, 0);
const UPPER_ARM_LEN = 0.28;
const FOREARM_LEN = 0.26;

// Direção de um segmento pendente (-Y) girado em X pelo ângulo dado.
function limbDirection(angle) {
  return new THREE.Vector3(0, -Math.cos(angle), -Math.sin(angle));
}

// Posição da câmera do celular relativa à origem do participante.
// Usada pela visão egocêntrica para colocar a câmera exatamente onde o
// dispositivo grava (na ponta do gimbal, e não no centro do corpo).
export const CAMERA_OFFSET = SHOULDER_POS.clone()
  .addScaledVector(limbDirection(SHOULDER_ANGLE), UPPER_ARM_LEN)
  .addScaledVector(limbDirection(FOREARM_ANGLE), FOREARM_LEN)
  .add(new THREE.Vector3(0, GIMBAL_CAMERA_HEIGHT, 0.02));

// Cria a figura simplificada do participante (boneco abstrato, sem detalhes
// realistas) em postura de caminhada, orientado para +Z, segurando um gimbal
// com smartphone. Retorna o grupo raiz e as articulações usadas no ciclo de
// caminhada da animação.
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

  // Braço livre (balança durante a caminhada)
  function makeFreeArm(sideX) {
    const pivot = new THREE.Group();
    pivot.position.set(sideX, 1.28, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), bodyMat);
    arm.position.set(0, -0.22, 0);
    arm.castShadow = true;
    pivot.add(arm);
    group.add(pivot);
    return pivot;
  }
  const armFree = makeFreeArm(-0.24);

  // Braço que segura o gimbal: dobrado, com o dispositivo à frente do corpo.
  // Fica fixo durante a caminhada (o operador mantém o enquadramento estável).
  const armGimbal = new THREE.Group();
  armGimbal.position.copy(SHOULDER_POS);
  armGimbal.rotation.x = SHOULDER_ANGLE;
  group.add(armGimbal);

  const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, UPPER_ARM_LEN - 0.08, 4, 8), bodyMat);
  upperArm.position.y = -UPPER_ARM_LEN / 2;
  upperArm.castShadow = true;
  armGimbal.add(upperArm);

  const elbow = new THREE.Group();
  elbow.position.y = -UPPER_ARM_LEN;
  elbow.rotation.x = ELBOW_ANGLE;
  armGimbal.add(elbow);

  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, FOREARM_LEN - 0.08, 4, 8), bodyMat);
  forearm.position.y = -FOREARM_LEN / 2;
  forearm.castShadow = true;
  elbow.add(forearm);

  // Mão fechada empunhando o cabo do gimbal
  const hand = new THREE.Group();
  hand.position.y = -FOREARM_LEN;
  elbow.add(hand);

  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 12), headMat);
  fist.castShadow = true;
  hand.add(fist);

  // Dispositivo de gravação (gimbal + celular) + campo de visão, na mão.
  // A contra-rotação mantém o conjunto sempre nivelado e apontado para a
  // frente, independentemente da pose do braço — que é justamente o que um
  // estabilizador faz.
  const cameraDevice = createCameraDevice();
  cameraDevice.rotation.x = -FOREARM_ANGLE;
  hand.add(cameraDevice);

  // Leve inclinação inicial de pernas/braço livre sugerindo passada em andamento
  legL.rotation.x = 0.3;
  legR.rotation.x = -0.3;
  armFree.rotation.x = -0.3;

  // Rótulo de identificação
  const label = createLabel('Participante / Operador', 'default');
  label.position.set(0, 2.0, 0);
  group.add(label);

  return { group, legL, legR, armFree, armGimbal };
}

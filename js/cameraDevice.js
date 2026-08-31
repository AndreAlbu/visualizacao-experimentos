import * as THREE from 'three';
import { COLORS } from './config.js';
import { createLabel } from './label.js';
import { createFOVCone } from './fov.js';

// Altura da câmera do celular em relação à base do cabo do gimbal.
// Exportada porque o participante usa esse valor para posicionar o rótulo e
// para saber onde o campo de visão nasce.
export const GIMBAL_CAMERA_HEIGHT = 0.3;

// Cria o dispositivo de gravação: um estabilizador (gimbal) de mão com um
// smartphone acoplado, como o utilizado nas gravações do experimento.
// O grupo tem origem na MÃO (base do cabo) e cresce para cima; o campo de
// visão nasce na câmera do celular, apontando para +Z (frente do participante).
export function createCameraDevice() {
  const group = new THREE.Group();
  group.name = 'camera-device';

  const bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.cameraBody, roughness: 0.45, metalness: 0.25 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: COLORS.cameraAccent,
    roughness: 0.3,
    metalness: 0.2,
    emissive: COLORS.cameraAccent,
    emissiveIntensity: 0.15,
  });

  // --- Cabo do gimbal (empunhadura) -----------------------------------------
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.1, 4, 10), bodyMat);
  grip.position.y = 0.075;
  group.add(grip);

  // Pequeno joystick/controle na frente do cabo
  const joystick = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), accentMat);
  joystick.position.set(0, 0.11, 0.028);
  group.add(joystick);

  // --- Haste e motores do estabilizador -------------------------------------
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 10), bodyMat);
  stem.position.y = 0.175;
  group.add(stem);

  // Motor de rotação (pan) no topo da haste
  const panMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.035, 12), bodyMat);
  panMotor.position.y = 0.228;
  group.add(panMotor);

  // Braço lateral que sustenta o berço do celular
  const yokeArm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.016, 0.016), bodyMat);
  yokeArm.position.set(-0.03, 0.258, 0);
  group.add(yokeArm);

  // Motor de inclinação (tilt), na lateral do celular
  const tiltMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 12), bodyMat);
  tiltMotor.rotation.z = Math.PI / 2;
  tiltMotor.position.set(-0.085, 0.258, 0);
  group.add(tiltMotor);

  // --- Smartphone (orientação paisagem, como nas gravações) ------------------
  const phone = new THREE.Group();
  phone.position.set(0, GIMBAL_CAMERA_HEIGHT, 0);
  group.add(phone);

  const phoneBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.076, 0.009),
    new THREE.MeshStandardMaterial({ color: 0x14181d, roughness: 0.35, metalness: 0.4 })
  );
  phone.add(phoneBody);

  // Tela voltada para o participante (-Z), levemente luminosa
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.138, 0.066),
    new THREE.MeshStandardMaterial({
      color: 0xbcd6e4,
      emissive: 0x6f97ad,
      emissiveIntensity: 0.45,
      roughness: 0.2,
    })
  );
  screen.position.z = -0.005;
  screen.rotation.y = Math.PI;
  phone.add(screen);

  // Câmera traseira (+Z): é daqui que sai o campo de visão
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.006, 12), accentMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(-0.055, 0.02, 0.006);
  phone.add(lens);

  // Berço/garras que prendem o celular ao gimbal
  const clampMat = new THREE.MeshStandardMaterial({ color: 0x2b3138, roughness: 0.6 });
  [-1, 1].forEach((side) => {
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.026), clampMat);
    clamp.position.set(side * 0.076, 0, 0);
    phone.add(clamp);
  });

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // Rótulo acima do conjunto
  const label = createLabel('Câmera RGB / Visão Egocêntrica', 'blue');
  label.position.set(0, GIMBAL_CAMERA_HEIGHT + 0.12, 0);
  group.add(label);

  // Campo de visão, nascendo na câmera do celular
  const fov = createFOVCone({ distance: 7 });
  fov.position.set(0, GIMBAL_CAMERA_HEIGHT, 0.02);
  group.add(fov);

  return group;
}

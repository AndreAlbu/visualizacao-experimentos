import * as THREE from 'three';
import { CAMERA_OFFSET } from './participant.js';

const Y_AXIS = new THREE.Vector3(0, 1, 0);

// Presets de câmera. `target` é o ponto observado; `pos` é a posição da câmera.
// `egocentric` é uma função: é recalculada a cada quadro para que a câmera
// sempre acompanhe a pose atual do participante durante a caminhada, em vez
// de enquadrar uma única vez e "ficar para trás".
function presets(participantGroup, egoLook) {
  return {
    // Enquadra a zona dos cenários (START -> obstáculo -> END, z ~ 2..23).
    top: {
      pos: new THREE.Vector3(0.2, 32, 12.5),
      target: new THREE.Vector3(0.2, 0, 12.5),
    },
    // Câmera posicionada exatamente onde o celular do gimbal grava. A direção
    // do olhar parte da orientação da caminhada e soma os offsets de yaw/pitch
    // controlados pelo arraste do mouse (permite girar 360° e olhar os
    // obstáculos de lado sem sair do ponto de vista do participante).
    egocentric: () => {
      const p = participantGroup.position;
      const facing = (participantGroup.userData.facing || new THREE.Vector3(0, 0, 1)).clone().normalize();
      const baseYaw = Math.atan2(facing.x, facing.z);
      const yaw = baseYaw + egoLook.yaw;
      const cosP = Math.cos(egoLook.pitch);
      const dir = new THREE.Vector3(Math.sin(yaw) * cosP, Math.sin(egoLook.pitch), Math.cos(yaw) * cosP);
      // Offset do dispositivo (mão/gimbal) girado para a orientação do corpo
      const offset = CAMERA_OFFSET.clone().applyAxisAngle(Y_AXIS, baseYaw);
      const pos = new THREE.Vector3(p.x + offset.x, offset.y, p.z + offset.z);
      return {
        pos,
        target: pos.clone().addScaledVector(dir, 6.5),
      };
    },
  };
}

// Visões que ficam "presas" ao participante e devem continuar acompanhando
// sua pose quadro a quadro mesmo depois da transição inicial (tween).
const FOLLOW_VIEWS = new Set(['egocentric']);

// Configura os botões de alternância de visão (egocêntrica / superior) com
// transição suave (tween) entre poses de câmera. Na visão egocêntrica a
// câmera segue o participante continuamente e arrastar o mouse gira o olhar
// em 360° (yaw) e para cima/baixo (pitch) a partir do ponto de vista do
// operador.
export function setupViewControls({
  camera, controls, buttons, participantGroup, ceiling = null, onViewChange = () => {},
}) {
  // Offsets de olhar da visão egocêntrica, controlados pelo arraste do mouse.
  const egoLook = { yaw: 0, pitch: 0 };
  const VIEWS = presets(participantGroup, egoLook);
  let tween = null;
  let activeView = 'top';

  function resolvePreset(name) {
    return typeof VIEWS[name] === 'function' ? VIEWS[name]() : VIEWS[name];
  }

  function goTo(name) {
    if (name === 'egocentric') {
      // Recomeça olhando para a direção da caminhada.
      egoLook.yaw = 0;
      egoLook.pitch = 0;
    }
    const preset = resolvePreset(name);
    activeView = name;
    tween = {
      fromPos: camera.position.clone(),
      toPos: preset.pos.clone(),
      fromTarget: controls.target.clone(),
      toTarget: preset.target.clone(),
      t: 0,
      duration: name === 'egocentric' ? 1.4 : 1.1,
    };
    // Na visão egocêntrica o OrbitControls fica desligado: a pose vem do
    // arraste em primeira pessoa.
    controls.enabled = !FOLLOW_VIEWS.has(name);
    // O teto fica oculto apenas na visão superior, para não obstruir a leitura.
    if (ceiling) ceiling.visible = name !== 'top';
    // Cursor indica que a visão egocêntrica aceita arraste para olhar ao redor.
    controls.domElement.style.cursor = name === 'egocentric' ? 'grab' : '';

    Object.values(buttons).forEach((b) => b.classList.remove('active'));
    buttons[name] && buttons[name].classList.add('active');

    onViewChange(name);
  }

  Object.entries(buttons).forEach(([name, btn]) => {
    btn.addEventListener('click', () => goTo(name));
  });

  // --- Arraste em primeira pessoa (apenas na visão egocêntrica) --------------
  const el = controls.domElement;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  el.addEventListener('pointerdown', (e) => {
    if (activeView !== 'egocentric') return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging || activeView !== 'egocentric') return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    egoLook.yaw -= dx * 0.005; // sem limite: permite girar 360°
    egoLook.pitch = THREE.MathUtils.clamp(egoLook.pitch - dy * 0.003, -1.2, 1.2);
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    if (activeView === 'egocentric') el.style.cursor = 'grab';
  };
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);

  function update(delta) {
    if (tween) {
      tween.t = Math.min(1, tween.t + delta / tween.duration);
      const e = tween.t < 1 ? 1 - Math.pow(1 - tween.t, 3) : 1; // ease-out cúbico
      camera.position.lerpVectors(tween.fromPos, tween.toPos, e);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, e);
      if (tween.t >= 1) tween = null;
      return;
    }

    // Após a transição, a visão egocêntrica continua recalculando a pose a
    // cada quadro para sempre ficar à frente do operador enquanto ele caminha.
    if (FOLLOW_VIEWS.has(activeView)) {
      const preset = resolvePreset(activeView);
      const followSpeed = Math.min(1, delta * 8);
      camera.position.lerp(preset.pos, followSpeed);
      // O olhar responde ao mouse imediatamente, sem suavização, para o
      // giro 360° não parecer "borrachudo".
      controls.target.copy(preset.target);
    }
  }

  // Troca o teto acompanhado (ao mudar de ambiente). Ambientes externos
  // passam `null`; nesse caso não há nada para ocultar na visão superior.
  function setCeiling(newCeiling) {
    ceiling = newCeiling;
    if (ceiling) ceiling.visible = activeView !== 'top';
  }

  // Inicia na visão superior (leitura clara do cenário completo)
  camera.position.copy(VIEWS.top.pos);
  controls.target.copy(VIEWS.top.target);
  if (ceiling) ceiling.visible = false;
  buttons.top && buttons.top.classList.add('active');

  return { update, goTo, setCeiling };
}

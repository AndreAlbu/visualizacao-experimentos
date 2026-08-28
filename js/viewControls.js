import * as THREE from 'three';

// Presets de câmera. `target` é o ponto observado; `pos` é a posição da câmera.
// `egocentric` e `lateral` são funções: são recalculadas a cada quadro para
// que a câmera sempre acompanhe a pose atual do participante durante a
// caminhada, em vez de enquadrar uma única vez e "ficar para trás".
function presets(participantGroup, egoLook) {
  return {
    // Enquadra a zona dos cenários (START -> obstáculo -> END, z ~ 2..23).
    overview: {
      pos: new THREE.Vector3(12, 10.5, -5),
      target: new THREE.Vector3(0, 1, 12),
    },
    top: {
      pos: new THREE.Vector3(0.2, 32, 12.5),
      target: new THREE.Vector3(0.2, 0, 12.5),
    },
    // Acompanha a posição atual do participante para sempre enquadrar
    // participante + câmera + cone de visão em perfil, onde quer que estejam.
    lateral: () => {
      const p = participantGroup.position;
      return {
        pos: new THREE.Vector3(p.x + 8.5, 2.1, p.z - 1),
        target: new THREE.Vector3(p.x, 1.1, p.z + 3.5),
      };
    },
    // Câmera presa à frente do operador, na altura do dispositivo. A direção
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
      const pos = new THREE.Vector3(p.x + facing.x * 0.55, 1.55, p.z + facing.z * 0.55);
      return {
        pos,
        target: pos.clone().addScaledVector(dir, 6.5),
      };
    },
  };
}

// Visões que ficam "presas" ao participante e devem continuar acompanhando
// sua pose quadro a quadro mesmo depois da transição inicial (tween).
const FOLLOW_VIEWS = new Set(['egocentric', 'lateral']);

// Configura os botões de alternância de visão (geral / egocêntrica / superior /
// lateral) com transição suave (tween) entre poses de câmera. Para as visões
// "presas" ao participante, após o tween a câmera passa a seguir o
// participante continuamente a cada quadro (ver FOLLOW_VIEWS). Na visão
// egocêntrica, arrastar o mouse gira o olhar em 360° (yaw) e para cima/baixo
// (pitch) a partir do ponto de vista do operador.
export function setupViewControls({ camera, controls, buttons, participantGroup, ceiling }) {
  // Offsets de olhar da visão egocêntrica, controlados pelo arraste do mouse.
  const egoLook = { yaw: 0, pitch: 0 };
  const VIEWS = presets(participantGroup, egoLook);
  let tween = null;
  let activeView = 'overview';

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
    // Nas visões presas ao participante o OrbitControls fica desligado: a
    // pose vem do código (lateral) ou do arraste em primeira pessoa (egocêntrica).
    controls.enabled = !FOLLOW_VIEWS.has(name);
    // O teto fica oculto apenas na visão superior, para não obstruir a leitura.
    if (ceiling) ceiling.visible = name !== 'top';
    // Cursor indica que a visão egocêntrica aceita arraste para olhar ao redor.
    controls.domElement.style.cursor = name === 'egocentric' ? 'grab' : '';

    Object.values(buttons).forEach((b) => b.classList.remove('active'));
    buttons[name] && buttons[name].classList.add('active');
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

    // Após a transição, visões presas ao participante continuam
    // recalculando a pose a cada quadro para sempre ficar à frente/ao lado
    // do operador enquanto ele caminha.
    if (FOLLOW_VIEWS.has(activeView)) {
      const preset = resolvePreset(activeView);
      const followSpeed = Math.min(1, delta * 8);
      camera.position.lerp(preset.pos, followSpeed);
      if (activeView === 'egocentric') {
        // O olhar responde ao mouse imediatamente, sem suavização, para o
        // giro 360° não parecer "borrachudo".
        controls.target.copy(preset.target);
      } else {
        controls.target.lerp(preset.target, followSpeed);
      }
    }
  }

  // Inicia na visão geral (composição isométrica ~45°)
  camera.position.copy(VIEWS.overview.pos);
  controls.target.copy(VIEWS.overview.target);
  buttons.overview && buttons.overview.classList.add('active');

  return { update, goTo };
}

import { COLORS, SLOW_SPEED, SLOW_RADIUS } from './config.js';

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// Controla a linha do tempo da caminhada do cenário ativo: posiciona o
// participante ao longo da curva, anima o ciclo de passada e sincroniza o
// destaque da zona de risco com o progresso. O cenário (curva, zona de risco,
// velocidade) é trocado em tempo de execução via setScenario().
//
// Perfil de velocidade: o avanço é feito em metros/segundo. Longe do
// obstáculo o participante anda em `baseSpeed`; ao entrar no raio de
// influência da zona de risco, desacelera suavemente (smoothstep) até
// SLOW_SPEED, e reacelera ao se afastar — reproduzindo a cautela natural
// de aproximação registrada nos experimentos.
export function setupAnimationController({ participant, ui }) {
  let curve = null;
  let curveLength = 1;
  let riskZone = null;
  let baseSpeed = 1.15;
  let stopAtEnd = false;

  let progress = 0;
  let playing = false;
  let walkClock = 0;

  // Velocidade instantânea em função da distância ao centro da zona de risco.
  function speedAt(point) {
    if (!riskZone) return baseSpeed;
    const d = point.distanceTo(riskZone.center);
    if (d >= SLOW_RADIUS) return baseSpeed;
    const t = 1 - d / SLOW_RADIUS; // 0 (borda) .. 1 (centro)
    const s = t * t * (3 - 2 * t); // smoothstep
    return baseSpeed + (SLOW_SPEED - baseSpeed) * s;
  }

  function setProgress(p) {
    if (!curve) return;
    progress = clamp01(p);
    const point = curve.getPointAt(progress);
    const tangent = curve.getTangentAt(progress);
    tangent.y = 0;
    participant.group.position.set(point.x, 0, point.z);
    if (tangent.lengthSq() > 1e-6) {
      tangent.normalize();
      participant.group.rotation.y = Math.atan2(tangent.x, tangent.z);
      participant.group.userData.facing = tangent.clone();
    }

    // Destaca a zona de risco quando o participante está próximo dela
    if (riskZone) {
      const distToRisk = point.distanceTo(riskZone.center);
      const inRisk = distToRisk < 3.5;
      riskZone.disc.material.opacity = inRisk ? 0.3 : 0.16;
      riskZone.ring.material.color.set(inRisk ? 0xff5a1f : COLORS.riskZone);
    }

    ui.slider.value = String(Math.round(progress * 1000));
    ui.timeLabel.textContent = `${(progress * 100).toFixed(0)}%`;
  }

  // Apenas o braço livre balança: o braço que segura o gimbal permanece
  // firme, mantendo o enquadramento estável durante a gravação.
  function walkingPose() {
    participant.legL.rotation.x = 0.3;
    participant.legR.rotation.x = -0.3;
    participant.armFree.rotation.x = -0.3;
  }

  // Postura neutra, usada quando o participante para diante do bloqueio.
  function standingPose() {
    participant.legL.rotation.x = 0;
    participant.legR.rotation.x = 0;
    participant.armFree.rotation.x = 0;
  }

  function update(delta) {
    if (!playing || !curve) return;

    const point = curve.getPointAt(progress);
    const speed = speedAt(point);

    // Avanço proporcional à velocidade instantânea (m/s -> fração da curva)
    setProgress(progress + (speed * delta) / curveLength);

    // A cadência da passada acompanha a velocidade: passos mais lentos
    // durante a aproximação cautelosa, mais rápidos no ritmo normal.
    walkClock += delta * 5.5 * speed;
    const swing = Math.sin(walkClock) * 0.5;
    participant.legL.rotation.x = swing;
    participant.legR.rotation.x = -swing;
    participant.armFree.rotation.x = -swing;

    if (progress >= 1) {
      playing = false;
      ui.playBtn.textContent = '▶ Reproduzir';
      // Ao final do trajeto (especialmente na parada diante do bloqueio),
      // o participante fica em pé, parado.
      if (stopAtEnd) standingPose();
    }
  }

  // Troca o cenário ativo: nova curva, zona de risco e velocidade; reinicia tudo.
  function setScenario({ curve: newCurve, riskZone: newRiskZone, speed, stop }) {
    curve = newCurve;
    curveLength = newCurve.getLength();
    riskZone = newRiskZone;
    baseSpeed = speed;
    stopAtEnd = Boolean(stop);
    playing = false;
    walkClock = 0;
    ui.playBtn.textContent = '▶ Reproduzir';
    walkingPose();
    setProgress(0);
  }

  ui.playBtn.addEventListener('click', () => {
    if (progress >= 1) setProgress(0);
    playing = !playing;
    ui.playBtn.textContent = playing ? '⏸ Pausar' : '▶ Reproduzir';
  });
  ui.resetBtn.addEventListener('click', () => {
    playing = false;
    walkClock = 0;
    ui.playBtn.textContent = '▶ Reproduzir';
    walkingPose();
    setProgress(0);
  });
  ui.slider.addEventListener('input', (e) => {
    playing = false;
    ui.playBtn.textContent = '▶ Reproduzir';
    setProgress(Number(e.target.value) / 1000);
  });

  return { update, setProgress, setScenario, isPlaying: () => playing };
}

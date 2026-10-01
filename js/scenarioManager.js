import * as THREE from 'three';
import { buildTrajectory } from './trajectory.js';
import { buildRiskZone } from './riskZone.js';
import { buildScenarioObstacles } from './obstacles.js';

// Remove um grupo da cena liberando geometrias/materiais e os elementos HTML
// dos rótulos CSS2D (que não são removidos automaticamente do DOM).
function disposeGroup(scene, group) {
  group.traverse((obj) => {
    if (obj.isCSS2DObject && obj.element && obj.element.parentNode) {
      obj.element.parentNode.removeChild(obj.element);
    }
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

// Aplica as opções do usuário sobre a definição base do cenário:
// - `start.x` desloca lateralmente a FAIXA inteira do experimento (trajetória,
//   linha-fantasma, zona de risco, obstáculos e marcadores): o participante
//   sempre caminha reto à frente a partir de onde começa, com o obstáculo no
//   seu caminho, e então desvia;
// - `start.z` ajusta apenas a distância do ponto de partida até o obstáculo;
// - `types` (ids de OBSTACLE_TYPES) preenche os slots de obstáculo do cenário.
function effectiveScenario(scenario, options = {}) {
  // Percursos presos à malha de corredores ignoram o deslocamento lateral
  const laneX = options.start && !scenario.fixedLane ? options.start.x : 0;

  // Toda a geometria base é definida na faixa central (x = 0) e transladada
  // lateralmente por laneX.
  const path = scenario.path.map((p) => [p[0] + laneX, p[1], p[2]]);
  let markers = scenario.markers.map((m) => ({ ...m, pos: [m.pos[0] + laneX, m.pos[1], m.pos[2]] }));
  const ghost = scenario.ghost
    ? scenario.ghost.map((p) => [p[0] + laneX, p[1], p[2]])
    : undefined;
  const risk = scenario.risk
    ? { ...scenario.risk, center: [scenario.risk.center[0] + laneX, scenario.risk.center[1], scenario.risk.center[2]] }
    : undefined;

  if (options.start) {
    const { z } = options.start;
    path[0] = [laneX, 0, z];
    markers = markers.map((m) => (m.id === 'START' ? { ...m, pos: [laneX, 0, z] } : m));
  }

  let obstacles = [];
  if (scenario.obstacleSlots && risk && options.types && options.types.length) {
    const [cx, , cz] = risk.center;
    obstacles = options.types.slice(0, scenario.obstacleSlots.length).map((type, i) => {
      const [dx, dz] = scenario.obstacleSlots[i];
      return {
        type,
        pos: [cx + dx, 0, cz + dz],
        rotY: (i * 1.3) % 1.6 - 0.8, // leve variação de orientação por slot
        label: i === 0 ? (scenario.obstacleLabel || 'Obstáculo') : undefined,
      };
    });
  }

  return { ...scenario, path, markers, ghost, risk, obstacles };
}

// Gerencia o cenário ativo: constrói trajetória, zona de risco e obstáculos
// num grupo próprio e o substitui por completo a cada troca de cenário ou
// alteração das opções (obstáculos selecionados / posição inicial).
export function createScenarioManager(scene) {
  let currentGroup = null;

  function load(scenario, options) {
    if (currentGroup) disposeGroup(scene, currentGroup);
    currentGroup = new THREE.Group();
    currentGroup.name = `scenario-${scenario.id}`;

    const resolved = effectiveScenario(scenario, options);
    const { curve } = buildTrajectory(currentGroup, resolved);
    const riskZone = resolved.risk ? buildRiskZone(currentGroup, resolved.risk) : null;
    buildScenarioObstacles(currentGroup, resolved);

    scene.add(currentGroup);
    return { curve, riskZone };
  }

  return { load };
}

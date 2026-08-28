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
// - `start` ({x, z}) substitui o primeiro ponto do trajeto e o marcador START;
// - `types` (ids de OBSTACLE_TYPES) preenche os slots de obstáculo do cenário.
function effectiveScenario(scenario, options = {}) {
  const path = scenario.path.map((p) => [...p]);
  let markers = scenario.markers;

  if (options.start) {
    const { x, z } = options.start;
    path[0] = [x, 0, z];
    markers = markers.map((m) => (m.id === 'START' ? { ...m, pos: [x, 0, z] } : m));
  }

  let obstacles = [];
  if (scenario.obstacleSlots && scenario.risk && options.types && options.types.length) {
    const [cx, , cz] = scenario.risk.center;
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

  return { ...scenario, path, markers, obstacles };
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

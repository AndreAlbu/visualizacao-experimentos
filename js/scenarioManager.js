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

// Gerencia o cenário ativo: constrói trajetória, zona de risco e obstáculos
// num grupo próprio e o substitui por completo a cada troca de cenário.
export function createScenarioManager(scene) {
  let currentGroup = null;

  function load(scenario) {
    if (currentGroup) disposeGroup(scene, currentGroup);
    currentGroup = new THREE.Group();
    currentGroup.name = `scenario-${scenario.id}`;

    const { curve } = buildTrajectory(currentGroup, scenario);
    const riskZone = scenario.risk ? buildRiskZone(currentGroup, scenario.risk) : null;
    buildScenarioObstacles(currentGroup, scenario);

    scene.add(currentGroup);
    return { curve, riskZone };
  }

  return { load };
}

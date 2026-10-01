import * as THREE from 'three';
import { buildTrajectory } from './trajectory.js';
import { buildRiskZone } from './riskZone.js';
import { buildScenarioObstacles } from './obstacles.js';
import {
  OBSTACLE_TYPES, STEP_LATERAL, MIN_DETOUR_STEPS, MAX_DETOUR_STEPS,
  BODY_HALF_WIDTH, DETOUR_MARGIN, MAX_LATERAL_ABS,
} from './config.js';

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

// Quantos passos laterais o participante precisa dar para passar pelo maior
// dos obstáculos selecionados, com folga para o próprio corpo.
function detourSteps(types) {
  const halfWidth = types.reduce((max, id) => {
    const type = OBSTACLE_TYPES.find((t) => t.id === id);
    return Math.max(max, type ? type.halfWidth : 0.35);
  }, 0);
  const needed = BODY_HALF_WIDTH + halfWidth + DETOUR_MARGIN;
  const steps = Math.ceil(needed / STEP_LATERAL);
  return Math.min(Math.max(steps, MIN_DETOUR_STEPS), MAX_DETOUR_STEPS);
}

// Gera a trajetória do desvio seguindo a geometria do protocolo:
//
//   START --- 5 m --- T1 --- 1,5 m --- obstáculo --- 1,5 m --- T2 --- END
//
// O desvio começa em T1 ("begin the detour just before the obstacle") e se
// completa em T2. O que varia é a AMPLITUDE: um número inteiro de passos
// laterais, conforme o tamanho do objeto. A transição usa perfil smoothstep,
// que sai e chega alinhada ao corredor, sem quina nas pontas.
function buildDetourGeometry(scenario, { laneX, startZ, types }) {
  const { side, obstacleZ, endZ } = scenario.detour;
  const gap = scenario.detour.markerGap === undefined ? 1.5 : scenario.detour.markerGap;
  const steps = detourSteps(types);
  // Não ultrapassa a faixa útil do corredor, seja qual for o obstáculo
  const lateral = Math.min(steps * STEP_LATERAL, MAX_LATERAL_ABS - Math.abs(laneX));
  const targetX = laneX + side * lateral;

  const t1Z = obstacleZ - gap; // início do desvio
  const t2Z = obstacleZ + gap; // desvio completo

  const path = [];
  // Distribui pontos a cada ~1,5 m; `skipFirst` evita repetir a emenda
  const pushStraight = (x, fromZ, toZ, skipFirst) => {
    const count = Math.max(2, Math.round(Math.abs(toZ - fromZ) / 1.5));
    for (let i = skipFirst ? 1 : 0; i <= count; i++) {
      path.push([x, 0, fromZ + (toZ - fromZ) * (i / count)]);
    }
  };

  // 1) aproximação reta até T1
  pushStraight(laneX, startZ, t1Z, false);
  // 2) desvio suave de T1 a T2
  const shiftPoints = 16;
  for (let i = 1; i <= shiftPoints; i++) {
    const t = i / shiftPoints;
    const s = t * t * (3 - 2 * t);
    path.push([laneX + side * lateral * s, 0, t1Z + (t2Z - t1Z) * t]);
  }
  // 3) segue reto na nova faixa (não retorna ao centro)
  pushStraight(targetX, t2Z, endZ, true);

  const markers = [
    { id: 'START', pos: [laneX, 0, startZ] },
    { id: 'T1', pos: [laneX, 0, t1Z] },
    { id: 'T2', pos: [targetX, 0, t2Z] },
    { id: 'END', pos: [targetX, 0, endZ] },
  ];

  return {
    path,
    markers,
    // Curso original, que seguiria reto por cima do obstáculo
    ghost: [[laneX, 0, t1Z], [laneX, 0, obstacleZ + 2.5]],
    detourZ: [t1Z, t2Z],
    detourInfo: { steps, lateral },
  };
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
  const types = options.types || [];

  const risk = scenario.risk
    ? { ...scenario.risk, center: [scenario.risk.center[0] + laneX, scenario.risk.center[1], scenario.risk.center[2]] }
    : undefined;

  let path;
  let markers;
  let ghost;
  let detourZ = scenario.detourZ;
  let detourInfo;

  if (scenario.detour) {
    // Cenários de desvio têm a trajetória gerada: o deslocamento lateral
    // depende do tamanho do obstáculo escolhido.
    const startZ = options.start ? options.start.z : scenario.detour.startZ;
    const geo = buildDetourGeometry(scenario, { laneX, startZ, types });
    ({ path, markers, ghost, detourZ, detourInfo } = geo);
  } else {
    // Demais cenários usam a geometria declarada, transladada por laneX
    path = scenario.path.map((p) => [p[0] + laneX, p[1], p[2]]);
    markers = scenario.markers.map((m) => ({ ...m, pos: [m.pos[0] + laneX, m.pos[1], m.pos[2]] }));
    ghost = scenario.ghost ? scenario.ghost.map((p) => [p[0] + laneX, p[1], p[2]]) : undefined;

    if (options.start) {
      const { z } = options.start;
      path[0] = [laneX, 0, z];
      markers = markers.map((m) => (m.id === 'START' ? { ...m, pos: [laneX, 0, z] } : m));
    }
  }

  let obstacles = [];
  if (scenario.obstacleSlots && risk && types.length) {
    const [cx, , cz] = risk.center;
    obstacles = types.slice(0, scenario.obstacleSlots.length).map((type, i) => {
      const [dx, dz] = scenario.obstacleSlots[i];
      return {
        type,
        pos: [cx + dx, 0, cz + dz],
        rotY: (i * 1.3) % 1.6 - 0.8, // leve variação de orientação por slot
        label: i === 0 ? (scenario.obstacleLabel || 'Obstáculo') : undefined,
      };
    });
  }

  return { ...scenario, path, markers, ghost, detourZ, risk, obstacles, detourInfo };
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
    return { curve, riskZone, detourInfo: resolved.detourInfo };
  }

  return { load };
}

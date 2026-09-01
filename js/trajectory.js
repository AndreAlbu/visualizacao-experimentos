import * as THREE from 'three';
import { COLORS } from './config.js';
import { createLabel } from './label.js';

function vec3Array(points) {
  return points.map((p) => new THREE.Vector3(...p));
}

function makeArrowMarker(position, direction, color) {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.28, 12),
    new THREE.MeshBasicMaterial({ color })
  );
  cone.position.copy(position);
  cone.position.y = 0.03;
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  cone.quaternion.copy(quat);
  cone.rotateX(Math.PI / 2);
  return cone;
}

// Constrói a trajetória de um cenário dentro do grupo dado: linha principal
// (percorrida), o segmento "fantasma" (curso original que levaria à colisão,
// quando houver), o trecho de desvio destacado, setas de direção e os
// marcadores do protocolo (START / T1 / T2 / END / PARADA).
// Retorna a curva paramétrica usada pela animação para mover o participante.
export function buildTrajectory(group, scenario) {
  const curve = new THREE.CatmullRomCurve3(vec3Array(scenario.path), false, 'catmullrom', 0.4);
  const samples = curve.getPoints(240);

  // Linha principal (trajetória percorrida)
  const mainGeo = new THREE.BufferGeometry().setFromPoints(
    samples.map((p) => new THREE.Vector3(p.x, 0.02, p.z))
  );
  const mainLine = new THREE.Line(
    mainGeo,
    new THREE.LineDashedMaterial({ color: COLORS.trajectory, dashSize: 0.35, gapSize: 0.2 })
  );
  mainLine.computeLineDistances();
  group.add(mainLine);

  const labelAnchor = curve.getPointAt(0.3);
  const mainLabel = createLabel('Trajetória do participante', 'blue');
  mainLabel.position.set(labelAnchor.x, 0.05, labelAnchor.z);
  group.add(mainLabel);

  // Trechos de desvio destacados em verde. `detourZ` define uma faixa de z
  // (percursos retos); `detourT` define frações do percurso, usado quando a
  // trajetória muda de direção e o z sozinho não identifica a manobra.
  const detourRanges = [];
  if (scenario.detourZ) {
    const [z0, z1] = scenario.detourZ;
    detourRanges.push(samples.filter((p) => p.z > z0 && p.z < z1));
  }
  if (scenario.detourT) {
    scenario.detourT.forEach(([t0, t1]) => {
      const i0 = Math.floor(t0 * (samples.length - 1));
      const i1 = Math.ceil(t1 * (samples.length - 1));
      detourRanges.push(samples.slice(i0, i1 + 1));
    });
  }

  detourRanges.forEach((avoidPts, index) => {
    if (avoidPts.length < 2) return;
    const avoidGeo = new THREE.BufferGeometry().setFromPoints(
      avoidPts.map((p) => new THREE.Vector3(p.x, 0.025, p.z))
    );
    group.add(new THREE.Line(avoidGeo, new THREE.LineBasicMaterial({ color: COLORS.avoidance })));

    // Um único rótulo, no primeiro trecho, para não poluir a cena
    if (index === 0) {
      const mid = avoidPts[Math.floor(avoidPts.length / 2)];
      const avoidLabel = createLabel('Trajetória de desvio', 'green');
      avoidLabel.position.set(mid.x, 0.05, mid.z);
      group.add(avoidLabel);
    }
  });

  // Linha-fantasma: curso original em linha reta que atravessaria o obstáculo
  if (scenario.ghost) {
    const ghostGeo = new THREE.BufferGeometry().setFromPoints(
      vec3Array(scenario.ghost).map((p) => new THREE.Vector3(p.x, 0.015, p.z))
    );
    const ghostLine = new THREE.Line(
      ghostGeo,
      new THREE.LineDashedMaterial({ color: COLORS.trajectoryGhost, dashSize: 0.15, gapSize: 0.15, transparent: true, opacity: 0.8 })
    );
    ghostLine.computeLineDistances();
    group.add(ghostLine);
  }

  // Setas de direção: uma a cada ~2,5 m percorridos
  const length = curve.getLength();
  const arrowCount = Math.max(2, Math.floor(length / 2.5));
  for (let i = 1; i < arrowCount; i++) {
    const t = i / arrowCount;
    const p = curve.getPointAt(t);
    const dir = curve.getTangentAt(t);
    dir.y = 0;
    group.add(makeArrowMarker(new THREE.Vector3(p.x, 0, p.z), dir, COLORS.trajectory));
  }

  // Marcadores do protocolo (START / T1 / T2 / END / PARADA)
  scenario.markers.forEach((m) => {
    const isStop = m.id === 'PARADA';
    const color = isStop ? COLORS.riskZone : COLORS.trajectory;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.02, 24),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 })
    );
    disc.position.set(m.pos[0], 0.03, m.pos[2]);
    group.add(disc);

    const label = createLabel(m.id, isStop ? 'red' : 'marker');
    label.position.set(m.pos[0], 0.35, m.pos[2]);
    group.add(label);
  });

  return { curve };
}

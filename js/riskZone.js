import * as THREE from 'three';
import { COLORS } from './config.js';
import { createLabel } from './label.js';

// Constrói a região de risco de colisão de um cenário: disco translúcido +
// anel tracejado, visualmente distinto das demais marcações da trajetória.
// `risk` = { center: [x,y,z], radius }.
export function buildRiskZone(group, risk) {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(risk.radius, 40),
    new THREE.MeshBasicMaterial({
      color: COLORS.riskZone,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(risk.center[0], 0.018, risk.center[2]);
  group.add(disc);

  // Anel de contorno tracejado
  const ringPts = [];
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    ringPts.push(new THREE.Vector3(
      risk.center[0] + Math.cos(a) * risk.radius,
      0.02,
      risk.center[2] + Math.sin(a) * risk.radius
    ));
  }
  const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
  const ring = new THREE.Line(
    ringGeo,
    new THREE.LineDashedMaterial({ color: COLORS.riskZone, dashSize: 0.25, gapSize: 0.15 })
  );
  ring.computeLineDistances();
  group.add(ring);

  const label = createLabel('Zona de risco de colisão', 'red');
  label.position.set(risk.center[0], 0.05, risk.center[2] - risk.radius - 0.3);
  group.add(label);

  return { disc, ring, center: new THREE.Vector3(...risk.center) };
}

import { COLORS } from './config.js';

const ITEMS = [
  { color: COLORS.participantBody, label: 'Participante' },
  { color: COLORS.cameraAccent, label: 'Câmera egocêntrica' },
  { color: COLORS.fov, label: 'Campo de visão' },
  { color: COLORS.trajectory, label: 'Trajetória' },
  { color: COLORS.obstacleWood, label: 'Obstáculo' },
  { color: COLORS.riskZone, label: 'Zona de risco de colisão' },
  { color: COLORS.avoidance, label: 'Trajetória de desvio' },
];

function hex(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

// Constrói a legenda científica fixa no canto da interface.
export function buildLegend(container) {
  container.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = 'Legenda';
  container.appendChild(title);

  ITEMS.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'legend-row';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = hex(item.color);
    const text = document.createElement('span');
    text.textContent = item.label;
    row.appendChild(swatch);
    row.appendChild(text);
    container.appendChild(row);
  });
}

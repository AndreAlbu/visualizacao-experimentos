import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

import { COLORS, SCENARIOS, OBSTACLE_TYPES, START_LIMITS, START_DEFAULT } from './config.js';
import { buildEnvironment } from './environment.js';
import { createParticipant } from './participant.js';
import { buildDecor } from './obstacles.js';
import { createScenarioManager } from './scenarioManager.js';
import { buildLegend } from './legend.js';
import { setupViewControls } from './viewControls.js';
import { setupAnimationController } from './animationController.js';

// --- Setup básico de cena, câmeras e renderizadores -------------------------
const container = document.getElementById('scene-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.wall);

const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(container.clientWidth, container.clientHeight);
labelRenderer.domElement.className = 'css2d-layer';
container.appendChild(labelRenderer.domElement);

// Importante: os controles escutam eventos no canvas WebGL, não na camada de
// rótulos (que tem pointer-events: none para não bloquear o mouse).
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2;
controls.maxDistance = 55;
controls.maxPolarAngle = Math.PI * 0.495;

// --- Construção da cena -----------------------------------------------------
const { ceiling } = buildEnvironment(scene);
buildDecor(scene);

const participant = createParticipant();
scene.add(participant.group);

const scenarioManager = createScenarioManager(scene);

// --- Painéis de interface (DOM) ---------------------------------------------
buildLegend(document.getElementById('legend-panel'));

const viewButtons = {
  overview: document.getElementById('btn-view-overview'),
  egocentric: document.getElementById('btn-view-egocentric'),
  top: document.getElementById('btn-view-top'),
  lateral: document.getElementById('btn-view-lateral'),
};
const viewControls = setupViewControls({ camera, controls, buttons: viewButtons, participantGroup: participant.group, ceiling });

const animationApi = setupAnimationController({
  participant,
  ui: {
    playBtn: document.getElementById('btn-play'),
    resetBtn: document.getElementById('btn-reset'),
    slider: document.getElementById('progress-slider'),
    timeLabel: document.getElementById('progress-label'),
  },
});

// --- Menu de cenários, obstáculos e posição inicial ---------------------------
const scenarioPanel = document.getElementById('scenario-panel');
const scenarioTitle = document.createElement('div');
scenarioTitle.className = 'panel-title';
scenarioTitle.textContent = 'Cenário de navegação';
scenarioPanel.appendChild(scenarioTitle);

const scenarioButtons = new Map();
SCENARIOS.forEach((s, i) => {
  const btn = document.createElement('button');
  btn.className = 'scenario-btn';
  btn.textContent = `${i + 1}. ${s.label}`;
  btn.addEventListener('click', () => selectScenario(s.id));
  scenarioPanel.appendChild(btn);
  scenarioButtons.set(s.id, btn);
});

// Seleção de obstáculos, memorizada por cenário (inicia com o padrão de cada um)
const obstacleSelections = new Map(
  SCENARIOS.map((s) => [s.id, new Set(s.defaultObstacles || [])])
);
let currentScenarioId = SCENARIOS[0].id;

const obstacleTitle = document.createElement('div');
obstacleTitle.className = 'panel-subtitle';
obstacleTitle.textContent = 'Obstáculos do cenário';
scenarioPanel.appendChild(obstacleTitle);

const obstacleChecks = new Map();
OBSTACLE_TYPES.forEach((type) => {
  const row = document.createElement('label');
  row.className = 'obstacle-check';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.addEventListener('change', () => {
    const selection = obstacleSelections.get(currentScenarioId);
    if (input.checked) selection.add(type.id);
    else selection.delete(type.id);
    rebuildScenario();
  });
  const text = document.createElement('span');
  text.textContent = type.label;
  row.appendChild(input);
  row.appendChild(text);
  scenarioPanel.appendChild(row);
  obstacleChecks.set(type.id, input);
});

// Controles de posição inicial do participante
const startPos = { ...START_DEFAULT };

const startTitle = document.createElement('div');
startTitle.className = 'panel-subtitle';
startTitle.textContent = 'Posição inicial do participante';
scenarioPanel.appendChild(startTitle);

function makeStartSlider(labelText, axis, [min, max]) {
  const row = document.createElement('div');
  row.className = 'start-slider';
  const label = document.createElement('span');
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = '0.1';
  input.value = String(startPos[axis]);
  const updateLabel = () => {
    label.textContent = `${labelText}: ${Number(startPos[axis]).toFixed(1)} m`;
  };
  input.addEventListener('input', () => {
    startPos[axis] = Number(input.value);
    updateLabel();
    rebuildScenario();
  });
  updateLabel();
  row.appendChild(label);
  row.appendChild(input);
  scenarioPanel.appendChild(row);
}

makeStartSlider('Lateral', 'x', START_LIMITS.x);
makeStartSlider('Distância', 'z', START_LIMITS.z);

// Sincroniza os checkboxes com a seleção do cenário ativo; cenários sem
// slots de obstáculo (caminhada livre) têm o seletor desabilitado.
function syncObstacleChecks(scenario) {
  const selection = obstacleSelections.get(scenario.id);
  const enabled = Boolean(scenario.obstacleSlots);
  obstacleChecks.forEach((input, typeId) => {
    input.checked = selection.has(typeId);
    input.disabled = !enabled;
    input.parentElement.classList.toggle('disabled', !enabled);
  });
}

// Reconstrói o cenário ativo com as opções atuais (obstáculos + posição inicial).
function rebuildScenario() {
  const scenario = SCENARIOS.find((s) => s.id === currentScenarioId);
  if (!scenario) return;
  const selection = obstacleSelections.get(scenario.id);
  // A ordem de OBSTACLE_TYPES define a prioridade de preenchimento dos slots.
  const types = OBSTACLE_TYPES.filter((t) => selection.has(t.id)).map((t) => t.id);
  const { curve, riskZone } = scenarioManager.load(scenario, {
    types,
    start: startPos,
  });
  animationApi.setScenario({
    curve,
    riskZone,
    speed: scenario.speed,
    stop: scenario.stop,
  });
}

function selectScenario(id) {
  const scenario = SCENARIOS.find((s) => s.id === id);
  if (!scenario) return;
  currentScenarioId = id;
  syncObstacleChecks(scenario);
  rebuildScenario();
  scenarioButtons.forEach((btn, key) => btn.classList.toggle('active', key === id));
}

// Cenário inicial
selectScenario(SCENARIOS[0].id);

// Handle de depuração (console): permite inspecionar câmera/participante e
// avançar quadros manualmente com __debugScene.step(dt).
window.__debugScene = {
  camera, controls, viewControls, animationApi, renderer, labelRenderer, scene, participant,
  step(dt = 0.05) {
    animationApi.update(dt);
    viewControls.update(dt);
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  },
};

// --- Loop de renderização ----------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);

  animationApi.update(delta);
  viewControls.update(delta);
  controls.update();

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

// --- Responsividade -----------------------------------------------------------
function onResize() {
  const w = container.clientWidth, h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
